"use client";

import { useEffect, useRef, useState } from "react";
import { Modus, OndertitelBericht, ServerBericht } from "../lib/protocol";
import { TolkVerbinding } from "../lib/tolkVerbinding";
import { wsUrl } from "../lib/config";
import { Helft } from "./Helft";
import { Kopbalk } from "./Kopbalk";

// Tweede scherm: kijkt alleen mee, stuurt geen audio. Het koppelt met een
// code (handmatig ingevoerd of meegegeven via de QR-code) en toont daarna
// dezelfde ondertitels als het hoofdscherm.
export default function KijkScherm() {
  const [taalA, setTaalA] = useState<string | null>(null);
  const [taalB, setTaalB] = useState<string | null>(null);
  const [modus, setModus] = useState<Modus>("spreekkamer");
  const [actief, setActief] = useState(false);
  const [verbonden, setVerbonden] = useState(false);
  const [gemachtigd, setGemachtigd] = useState(false);
  const [codeInvoer, setCodeInvoer] = useState("");
  const [fout, setFout] = useState(false);
  const [ondertitels, setOndertitels] = useState<OndertitelBericht[]>([]);

  const verbindingRef = useRef<TolkVerbinding | null>(null);
  const codeRef = useRef("");

  useEffect(() => {
    const urlCode = new URLSearchParams(window.location.search).get("code") ?? "";

    function opBericht(bericht: ServerBericht) {
      if (bericht.type === "sessie") {
        setTaalA(bericht.taalA);
        setTaalB(bericht.taalB);
        setModus(bericht.modus);
        setActief(bericht.actief);
        if (bericht.actief) setOndertitels([]);
      } else if (bericht.type === "ondertitel") {
        setOndertitels((huidig) => {
          const zonder = huidig.filter((o) => o.id !== bericht.id);
          return [...zonder, bericht].slice(-30);
        });
      } else if (bericht.type === "koppel_ok") {
        setGemachtigd(true);
        setFout(false);
      } else if (bericht.type === "koppel_fout") {
        setGemachtigd(false);
        setFout(true);
      }
    }

    function opHeropend() {
      if (codeRef.current) {
        verbindingRef.current?.stuurBericht({
          type: "koppel",
          code: codeRef.current,
        });
      }
    }

    const verbinding = new TolkVerbinding(
      wsUrl(),
      opBericht,
      setVerbonden,
      opHeropend,
    );
    verbindingRef.current = verbinding;
    verbinding
      .verbind()
      .then(() => {
        if (urlCode) {
          codeRef.current = urlCode;
          setCodeInvoer(urlCode);
          verbinding.stuurBericht({ type: "koppel", code: urlCode });
        }
      })
      .catch(() => {});

    return () => verbinding.sluit();
  }, []);

  function koppel() {
    const code = codeInvoer.trim();
    if (code.length < 6) return;
    codeRef.current = code;
    verbindingRef.current?.stuurBericht({ type: "koppel", code });
  }

  if (!gemachtigd) {
    return (
      <div className="pagina">
        <Kopbalk />
        <main className="midden">
          <div className="paneel">
            <h1 className="titel">Tweede scherm</h1>
            <p className="ondertitel">
              Voer de koppelcode van het hoofdscherm in.
            </p>
            <input
              className="code-invoer"
              inputMode="numeric"
              value={codeInvoer}
              placeholder="000000"
              onChange={(e) =>
                setCodeInvoer(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <button
              className="knop"
              onClick={koppel}
              disabled={!verbonden || codeInvoer.length < 6}
            >
              Koppelen
            </button>
            {fout && (
              <p className="melding melding-fout">
                Onjuiste code, of er is nog geen gesprek gestart.
              </p>
            )}
            {!verbonden && <p className="melding">Verbinding maken...</p>}
          </div>
        </main>
      </div>
    );
  }

  if (!taalA || !taalB || !actief) {
    return (
      <div className="pagina">
        <Kopbalk />
        <main className="midden">
          <div className="paneel">
            <h1 className="titel">Tweede scherm</h1>
            <p className="ondertitel">Verbonden — wachten op het gesprek...</p>
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
      <Helft taal={taalA} ondertitels={recent} />
    </div>
  );
}
