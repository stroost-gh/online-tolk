"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { KOPPEL_INSTRUCTIE } from "../lib/koppelen";
import { isRtl } from "../lib/talen";

function formatteerCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export function KoppelOverlay({
  taalA,
  taalB,
  koppelcode,
  opSluiten,
}: {
  taalA: string;
  taalB: string;
  koppelcode: string;
  opSluiten: () => void;
}) {
  const [qr, setQr] = useState("");
  const [adres, setAdres] = useState("");
  const [lokaal, setLokaal] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setLokaal(host === "localhost" || host === "127.0.0.1");
    const basis = `${window.location.origin}/scherm`;
    setAdres(basis);
    const url = koppelcode ? `${basis}?code=${koppelcode}` : basis;
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [koppelcode]);

  return (
    <div className="overlay">
      <div className="overlay-paneel">
        <h2>Tweede scherm koppelen</h2>
        {qr && <img className="qr" src={qr} alt="QR-code" />}
        <div className="koppelcode-blok">
          <span className="koppelcode-label">Koppelcode</span>
          <span className="koppelcode">
            {koppelcode ? formatteerCode(koppelcode) : "..."}
          </span>
        </div>
        <p className="overlay-url">{adres}</p>
        {lokaal && (
          <p className="melding melding-fout">
            Open de app via het netwerkadres van deze computer (niet localhost),
            anders kan het tweede scherm geen verbinding maken.
          </p>
        )}
        <div className="overlay-instructies">
          {[taalA, taalB].map((t) => (
            <p key={t} dir={isRtl(t) ? "rtl" : "ltr"}>
              {KOPPEL_INSTRUCTIE[t] ?? KOPPEL_INSTRUCTIE.en}
            </p>
          ))}
        </div>
        <button className="knop" onClick={opSluiten}>
          Sluiten
        </button>
      </div>
    </div>
  );
}
