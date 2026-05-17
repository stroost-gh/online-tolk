"""Lokale tolk-dienst.

WebSocket-protocol (alles lokaal/LAN, niets gaat naar het internet):

Client -> server
  - tekstframe  {"type": "start", "taalA", "taalB", "modus"}
      modus = "spreekkamer" (een microfoon, spreker via taalherkenning) of
      "videocall" (microfoon + het geluid van de videocall als twee aparte
      bronnen; de bron bepaalt dan wie spreekt).
  - binair frame  1 byte bron (0 = A, 1 = B), gevolgd door mono PCM 16-bit, 16 kHz
  - tekstframe  {"type": "stop"}
  - tekstframe  {"type": "koppel", "code": "123456"}

Server -> client
  - {"type": "status", "staat": "verbonden"}
  - {"type": "koppelcode", "code"}
  - {"type": "koppel_ok"} / {"type": "koppel_fout"}
  - {"type": "sessie", "taalA", "taalB", "modus", "actief"}
  - {"type": "ondertitel", "id", "spreker", "bronTaal", "doelTaal",
     "tekst", "vertaling", "definitief"}

Een gesprek is een enkele gedeelde sessie. Het hoofdscherm stuurt audio en
krijgt een koppelcode; extra schermen moeten die code opgeven.
"""

import asyncio
import json
import math
import random

import numpy as np
import websockets

from config import HOST, POORT, SAMPLE_RATE
from segmentatie import Segmentator
from transcriptie import Transcriptie
from vertaling import Vertaling

transcriptie: Transcriptie | None = None
vertaler: Vertaling | None = None

verbindingen: set = set()
gemachtigd: set = set()
sessie = {
    "taalA": "nl",
    "taalB": "ar",
    "modus": "spreekkamer",
    "actief": False,
    "koppelcode": "",
    "teller": {"A": 0, "B": 0},
}


def pcm_naar_float(data: bytes) -> np.ndarray:
    return np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0


def sessie_bericht() -> dict:
    return {
        "type": "sessie",
        "taalA": sessie["taalA"],
        "taalB": sessie["taalB"],
        "modus": sessie["modus"],
        "actief": sessie["actief"],
    }


async def stuur(ws, bericht: dict):
    try:
        await ws.send(json.dumps(bericht))
    except Exception:
        verbindingen.discard(ws)
        gemachtigd.discard(ws)


async def broadcast(bericht: dict):
    for ws in list(gemachtigd):
        await stuur(ws, bericht)


async def stuur_ondertitel(bron: str, nummer: int, audio: np.ndarray, definitief: bool):
    # In videocall-modus is per bron bekend wie spreekt; dan forceren we de taal.
    geforceerd = None
    if sessie["modus"] == "videocall":
        geforceerd = sessie["taalA"] if bron == "A" else sessie["taalB"]

    toegestaan = [sessie["taalA"], sessie["taalB"]]
    tekst, taal = await asyncio.to_thread(
        transcriptie.verwerk, audio, toegestaan, geforceerd
    )
    duur = len(audio) / SAMPLE_RATE
    if not tekst:
        print(f"[{bron}] geen tekst herkend uit {duur:.1f}s audio")
        return
    print(f"[{bron}] herkend ({taal}, {duur:.1f}s): {tekst}")

    if sessie["modus"] == "videocall":
        spreker = bron
    else:
        spreker = "A" if taal == sessie["taalA"] else "B"
    bron_taal = sessie["taalA"] if spreker == "A" else sessie["taalB"]
    doel_taal = sessie["taalB"] if spreker == "A" else sessie["taalA"]

    # Voorlopige (grijze) tekst niet vertalen: dat is wegwerptekst en de
    # vertaling is het traagste deel. De definitieve regel krijgt wel een
    # vertaling, zodra de spreker even pauzeert.
    if definitief:
        vertaling = await asyncio.to_thread(
            vertaler.vertaal, tekst, bron_taal, doel_taal
        )
    else:
        vertaling = ""
    await broadcast(
        {
            "type": "ondertitel",
            "id": f"{bron}-{nummer}",
            "spreker": spreker,
            "bronTaal": bron_taal,
            "doelTaal": doel_taal,
            "tekst": tekst,
            "vertaling": vertaling,
            "definitief": definitief,
        }
    )


async def behandel_verbinding(ws):
    verbindingen.add(ws)
    segmentatoren: dict[str, Segmentator] = {}
    audiotellers: dict[str, int] = {}
    # Het inlezen van audio en het (trage) transcriberen/vertalen draaien
    # gescheiden: de wachtrij wordt door een aparte taak leeggewerkt, zodat
    # binnenkomende audio nooit hoeft te wachten en er niets gemist wordt.
    wachtrij: asyncio.Queue = asyncio.Queue()

    async def verwerker():
        while True:
            bron, nummer, audio, definitief = await wachtrij.get()
            try:
                await stuur_ondertitel(bron, nummer, audio, definitief)
            except Exception as fout:
                print("Fout bij verwerken segment:", fout)
            finally:
                wachtrij.task_done()

    verwerker_taak = asyncio.create_task(verwerker())
    await stuur(ws, {"type": "status", "staat": "verbonden"})
    try:
        async for bericht in ws:
            if isinstance(bericht, bytes):
                if not sessie["actief"] or len(bericht) < 1:
                    continue
                bron = "A" if bericht[0] == 0 else "B"
                if bron not in segmentatoren:
                    segmentatoren[bron] = Segmentator()
                segmentator = segmentatoren[bron]
                monster = pcm_naar_float(bericht[1:])
                aantal = audiotellers.get(bron, 0) + 1
                audiotellers[bron] = aantal
                if aantal == 1 or aantal % 100 == 0:
                    rms = math.sqrt(float(np.mean(monster * monster))) if len(monster) else 0.0
                    print(
                        f"[{bron}] audioframe {aantal} ontvangen "
                        f"({len(monster)} monsters, RMS {rms:.4f})"
                    )
                actie = segmentator.voeg_toe(monster)
                if actie == "interim":
                    # Voorlopige tekst alleen tonen als de verwerker vrij is;
                    # anders overslaan, want de definitieve regel volgt toch.
                    if wachtrij.empty():
                        audio = segmentator.audio()
                        if audio is not None:
                            wachtrij.put_nowait(
                                (bron, sessie["teller"][bron] + 1, audio, False)
                            )
                elif actie == "definitief":
                    sessie["teller"][bron] += 1
                    audio = segmentator.neem_segment()
                    if audio is not None:
                        wachtrij.put_nowait(
                            (bron, sessie["teller"][bron], audio, True)
                        )
                continue

            data = json.loads(bericht)
            soort = data.get("type")

            if soort == "start":
                for oud in list(gemachtigd):
                    if oud is not ws:
                        await stuur(oud, {"type": "koppel_fout"})
                sessie["taalA"] = data.get("taalA", "nl")
                sessie["taalB"] = data.get("taalB", "ar")
                sessie["modus"] = data.get("modus", "spreekkamer")
                sessie["actief"] = True
                sessie["koppelcode"] = f"{random.randint(0, 999999):06d}"
                sessie["teller"] = {"A": 0, "B": 0}
                segmentatoren.clear()
                audiotellers.clear()
                gemachtigd.clear()
                gemachtigd.add(ws)
                print(
                    f"Gesprek gestart: {sessie['taalA']} <-> {sessie['taalB']} "
                    f"(modus {sessie['modus']})"
                )
                await stuur(ws, {"type": "koppelcode", "code": sessie["koppelcode"]})
                await stuur(ws, sessie_bericht())
            elif soort == "stop":
                sessie["actief"] = False
                await broadcast(sessie_bericht())
            elif soort == "koppel":
                if sessie["actief"] and data.get("code") == sessie["koppelcode"]:
                    gemachtigd.add(ws)
                    await stuur(ws, {"type": "koppel_ok"})
                    await stuur(ws, sessie_bericht())
                else:
                    await stuur(ws, {"type": "koppel_fout"})
    finally:
        verwerker_taak.cancel()
        verbindingen.discard(ws)
        gemachtigd.discard(ws)


async def main():
    global transcriptie, vertaler
    print("Whisper-model laden...")
    transcriptie = Transcriptie()
    print("Vertaalmodel laden...")
    vertaler = Vertaling()
    print("Modellen geladen.")
    # ping_timeout uit: zware transcriptie/vertaling kan de event-loop tijdelijk
    # bezet houden; anders verbreekt websockets de verbinding bij een gemiste ping.
    async with websockets.serve(
        behandel_verbinding,
        HOST,
        POORT,
        max_size=None,
        ping_interval=20,
        ping_timeout=None,
    ):
        print(f"Tolk-dienst luistert op poort {POORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
