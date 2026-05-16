# Online Tolk

Lokale, realtime tolk voor gesprekken tussen twee personen die elkaars taal niet
spreken — bedoeld voor o.a. een spreekuur tussen een bedrijfsarts en een
werknemer. Alle audio- en tekstverwerking gebeurt **lokaal op het apparaat**;
er gaat niets naar het internet.

## Opzet

- `frontend/` — Next.js-app: gesplitst scherm met live ondertitels, taalkeuze,
  microfoon-opname. Draait op `localhost`.
- `backend/` — Python-dienst: WebSocket-server die audio ontvangt en ondertitels
  terugstuurt. Spraakherkenning (faster-whisper) en vertaling (NLLB-200) draaien
  lokaal; de modellen worden eenmalig gedownload en daarna gecachet.

## Ondersteunde talen

Nederlands, Engels, Duits, Pools, Arabisch, Frans, Spaans, Portugees,
Italiaans, Oekraïens.

## Lokaal draaien

### Snel starten (Windows)

Dubbelklik op `start.bat` in de map `online-tolk`. Dat opent twee vensters
(backend en frontend) en zet de eerste keer alles vanzelf klaar. In het
start-venster verschijnt een menu om het hoofdscherm of een tweede scherm te
openen, of om het netwerkadres voor een tablet of telefoon te tonen.

### Handmatig

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

Frontend (in een tweede terminal):

```bash
cd frontend
npm install
npm run dev
```

Open daarna http://localhost:3000.

## Tweede scherm

Een tablet of telefoon op hetzelfde lokale netwerk kan als tweede (meekijkend)
scherm dienen via de route `/scherm`. Open de app op het hoofdscherm dan wél via
het netwerkadres van de computer (bv. `http://192.168.1.5:3000`) in plaats van
`localhost`. De knop "Tweede scherm" toont een koppelcode en een QR-code met
koppelinstructies in de twee gekozen gesprekstalen. Het tweede scherm koppelt
door de QR-code te scannen of de code handmatig in te voeren; bij elk nieuw
gesprek geldt een nieuwe code.

## Modus

Bij het starten kies je een modus:

- **Gesprek in de ruimte** — een microfoon vangt beide sprekers op; de taal
  bepaalt wie aan het woord is.
- **Videocall (Jitsi)** — bedoeld voor een gesprek via een videocall. De app
  vangt twee bronnen op: de eigen microfoon én het geluid van de gedeelde
  videocall-tab. Bij starten kies je dat tabblad en vink je "tabblad-geluid
  delen" aan. Elke bron is een vaste spreker, dus de vertaling is per kant
  betrouwbaar. De call zelf loopt via Jitsi over het internet; alleen de
  vertaalverwerking blijft lokaal.

## Status

Milestone 7: de volledige pijplijn draait lokaal — microfoon, spraakherkenning
(faster-whisper), vertaling (NLLB-200) en het gesplitste ondertitelscherm, in
zowel spreekkamer- als videocall-modus. Na afloop toont de app een transcript
dat alleen op verzoek lokaal als tekstbestand te downloaden is. Een tweede
scherm kan via een koppelcode (QR of handmatig) meekijken; de verbinding
herstelt zich automatisch na een netwerkonderbreking.
