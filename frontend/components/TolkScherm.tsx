"use client";

import { useCallback, useRef, useState } from "react";
import { TALEN, taalNaam, isRtl } from "../lib/talen";
import { Modus, OndertitelBericht, ServerBericht } from "../lib/protocol";
import { TolkVerbinding } from "../lib/tolkVerbinding";
import {
  AudioBron,
  AudioOpname,
  microfoonStream,
  tabbladStream,
} from "../lib/audio";
import { wsUrl } from "../lib/config";
import { Helft } from "./Helft";
import { Kopbalk } from "./Kopbalk";
import { KoppelOverlay } from "./KoppelOverlay";

type Fase = "instellen" | "actief" | "transcript";

interface TranscriptRegel extends OndertitelBericht {
  tijd: number;
}

function tijdLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("nl-NL");
}

function bouwTranscriptTekst(
  regels: TranscriptRegel[],
  taalA: string,
  taalB: string,
): string {
  const kop = [
    "Online Tolk — transcript",
    `Talen: ${taalNaam(taalA)} <-> ${taalNaam(taalB)}`,
    `Datum: ${new Date().toLocaleString("nl-NL")}`,
    "",
  ];
  const lijst = regels.map((r) =>
    [
      `[${tijdLabel(r.tijd)}] Spreker ${r.spreker} (${taalNaam(r.bronTaal)}): ${r.tekst}`,
      `           Vertaling (${taalNaam(r.doelTaal)}): ${r.vertaling}`,
    ].join("\n"),
  );
  return [...kop, ...lijst].join("\n") + "\n";
}

export default function TolkScherm() {
  const [fase, setFase] = useState<Fase>("instellen");
  const [modus, setModus] = useState<Modus>("spreekkamer");
  const [taalA, setTaalA] = useState("nl");
  const [taalB, setTaalB] = useState("ar");
  const [verbonden, setVerbonden] = useState(false);
  const [aanHetStarten, setAanHetStarten] = useState(false);
  const [koppelOpen, setKoppelOpen] = useState(false);
  const [koppelcode, setKoppelcode] = useState("");
  const [ondertitels, setOndertitels] = useState<OndertitelBericht[]>([]);
  const [transcript, setTranscript] = useState<TranscriptRegel[]>([]);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const verbindingRef = useRef<TolkVerbinding | null>(null);
  const opnamesRef = useRef<AudioOpname[]>([]);
  const koppelcodeRef = useRef("");

  const opBericht = useCallback((bericht: ServerBericht) => {
    if (bericht.type === "koppelcode") {
      koppelcodeRef.current = bericht.code;
      setKoppelcode(bericht.code);
      return;
    }
    if (bericht.type !== "ondertitel") return;
    setOndertitels((huidig) => {
      const zonder = huidig.filter((o) => o.id !== bericht.id);
      return [...zonder, bericht].slice(-30);
    });
    if (bericht.definitief) {
      setTranscript((huidig) => {
        const zonder = huidig.filter((o) => o.id !== bericht.id);
        return [...zonder, { ...bericht, tijd: Date.now() }].sort(
          (a, b) => a.tijd - b.tijd,
        );
      });
    }
  }, []);

  async function ruimOp() {
    for (const opname of opnamesRef.current) {
      await opname.stop();
    }
    opnamesRef.current = [];
    verbindingRef.current?.sluit();
    verbindingRef.current = null;
  }

  async function start() {
    setFoutmelding(null);
    setOndertitels([]);
    setTranscript([]);
    setKoppelcode("");
    koppelcodeRef.current = "";
    setAanHetStarten(true);

    const streams: { stream: MediaStream; bron: AudioBron }[] = [];
    try {
      if (modus === "videocall") {
        streams.push({ stream: await tabbladStream(), bron: "B" });
        streams.push({ stream: await microfoonStream(), bron: "A" });
      } else {
        streams.push({ stream: await microfoonStream(), bron: "A" });
      }

      const verbinding = new TolkVerbinding(
        wsUrl(),
        opBericht,
        setVerbonden,
        () => {
          if (koppelcodeRef.current) {
            verbinding.stuurBericht({
              type: "koppel",
              code: koppelcodeRef.current,
            });
          }
        },
      );
      verbindingRef.current = verbinding;
      await verbinding.verbind();
      verbinding.stuurBericht({ type: "start", taalA, taalB, modus });

      const opnames: AudioOpname[] = [];
      for (const { stream, bron } of streams) {
        const opname = new AudioOpname(stream, bron);
        await opname.start((pcm) => verbinding.stuurAudio(pcm));
        opnames.push(opname);
      }
      opnamesRef.current = opnames;

      setFase("actief");
    } catch {
      setFoutmelding(
        modus === "videocall"
          ? "Kon niet starten. Deel het tabblad met de videocall inclusief geluid en sta de microfoon toe."
          : "Kon niet starten. Draait de lokale tolk-dienst en is de microfoon toegestaan?",
      );
      streams.forEach((s) => s.stream.getTracks().forEach((t) => t.stop()));
      await ruimOp();
    } finally {
      setAanHetStarten(false);
    }
  }

  async function stop() {
    verbindingRef.current?.stuurBericht({ type: "stop" });
    await ruimOp();
    setKoppelOpen(false);
    setFase("transcript");
  }

  function nieuwGesprek() {
    setTranscript([]);
    setOndertitels([]);
    setFoutmelding(null);
    setFase("instellen");
  }

  function downloadTranscript() {
    const tekst = bouwTranscriptTekst(transcript, taalA, taalB);
    const blob = new Blob([tekst], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const stempel = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const anker = document.createElement("a");
    anker.href = url;
    anker.download = `tolk-transcript-${stempel}.txt`;
    anker.click();
    URL.revokeObjectURL(url);
  }

  if (fase === "instellen") {
    const videocall = modus === "videocall";
    return (
      <div className="pagina">
        <Kopbalk />
        <main className="midden">
          <div className="paneel">
            <h1 className="titel">Nieuw gesprek</h1>
            <p className="ondertitel">Kies de modus en de twee gesprekstalen.</p>
            <div className="moduskeuze">
              <button
                className={videocall ? "modusknop" : "modusknop actief"}
                onClick={() => setModus("spreekkamer")}
              >
                Gesprek in de ruimte
              </button>
              <button
                className={videocall ? "modusknop actief" : "modusknop"}
                onClick={() => setModus("videocall")}
              >
                Videocall (Jitsi)
              </button>
            </div>
            <div className="taalkeuze">
              <div className="taalveld">
                <label htmlFor="taalA">
                  {videocall ? "Uw taal" : "Taal onderzijde"}
                </label>
                <select
                  id="taalA"
                  value={taalA}
                  onChange={(e) => setTaalA(e.target.value)}
                >
                  {TALEN.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.naam}
                    </option>
                  ))}
                </select>
              </div>
              <div className="taalveld">
                <label htmlFor="taalB">
                  {videocall ? "Taal gesprekspartner" : "Taal bovenzijde"}
                </label>
                <select
                  id="taalB"
                  value={taalB}
                  onChange={(e) => setTaalB(e.target.value)}
                >
                  {TALEN.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.naam}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {videocall && (
              <p className="hint">
                Bij starten kiest u het tabblad met de videocall; vink
                "tabblad-geluid delen" aan.
              </p>
            )}
            <button
              className="knop"
              onClick={start}
              disabled={taalA === taalB || aanHetStarten}
            >
              {aanHetStarten ? "Verbinden..." : "Gesprek starten"}
            </button>
            {taalA === taalB && (
              <p className="melding">Kies twee verschillende talen.</p>
            )}
            {foutmelding && (
              <p className="melding melding-fout">{foutmelding}</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (fase === "transcript") {
    return (
      <div className="pagina">
        <Kopbalk />
        <main className="transcript">
          <h1>Transcript</h1>
          <p className="melding">
            {transcript.length > 0
              ? `${transcript.length} uitingen — ${taalNaam(taalA)} en ${taalNaam(taalB)}`
              : "Er is geen gesprek opgenomen."}
          </p>
          <div className="transcript-lijst">
            {transcript.map((r) => (
              <div key={r.id} className="transcript-regel">
                <div className="transcript-meta">
                  {tijdLabel(r.tijd)} · spreker {r.spreker} ·{" "}
                  {taalNaam(r.bronTaal)}
                </div>
                <p dir={isRtl(r.bronTaal) ? "rtl" : "ltr"}>{r.tekst}</p>
                <p
                  className="transcript-vertaling"
                  dir={isRtl(r.doelTaal) ? "rtl" : "ltr"}
                >
                  {r.vertaling}
                </p>
              </div>
            ))}
          </div>
          <div className="transcript-acties">
            <button
              className="knop"
              onClick={downloadTranscript}
              disabled={transcript.length === 0}
            >
              Transcript downloaden
            </button>
            <button className="knop knop-secundair" onClick={nieuwGesprek}>
              Nieuw gesprek
            </button>
          </div>
        </main>
      </div>
    );
  }

  const recent = ondertitels.slice(-6);

  return (
    <div className="scherm">
      <Helft
        taal={taalB}
        ondertitels={recent}
        boven
        gedraaid={modus === "spreekkamer"}
      />
      <Helft
        taal={taalA}
        ondertitels={recent}
        rechtsBoven={
          <span className="helft-acties">
            <span>{verbonden ? "verbonden" : "verbinding verbroken..."}</span>
            <button
              className="knop knop-secundair knop-klein"
              onClick={() => setKoppelOpen(true)}
            >
              Tweede scherm
            </button>
            <button className="knop knop-stop knop-klein" onClick={stop}>
              Stoppen
            </button>
          </span>
        }
      />
      {koppelOpen && (
        <KoppelOverlay
          taalA={taalA}
          taalB={taalB}
          koppelcode={koppelcode}
          opSluiten={() => setKoppelOpen(false)}
        />
      )}
    </div>
  );
}
