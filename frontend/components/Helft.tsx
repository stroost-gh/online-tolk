import { OndertitelBericht } from "../lib/protocol";
import { taalNaam, isRtl } from "../lib/talen";

function tekstVoor(o: OndertitelBericht, leesTaal: string): string {
  return o.bronTaal === leesTaal ? o.tekst : o.vertaling;
}

export function Helft({
  taal,
  ondertitels,
  boven,
  gedraaid,
  rechtsBoven,
}: {
  taal: string;
  ondertitels: OndertitelBericht[];
  boven?: boolean;
  gedraaid?: boolean;
  rechtsBoven?: React.ReactNode;
}) {
  const rtl = isRtl(taal);
  const klassen = ["helft"];
  if (boven) klassen.push("helft-boven");
  if (gedraaid) klassen.push("helft-gedraaid");

  return (
    <section className={klassen.join(" ")}>
      <div className="helft-kop">
        <span>{taalNaam(taal)}</span>
        {rechtsBoven}
      </div>
      <div className="regels">
        {ondertitels
          .filter((o) => tekstVoor(o, taal).length > 0)
          .map((o) => (
            <p
              key={o.id}
              className={o.definitief ? "regel" : "regel regel-voorlopig"}
              dir={rtl ? "rtl" : "ltr"}
            >
              <span className="spreker">spreker {o.spreker}</span>
              {tekstVoor(o, taal)}
            </p>
          ))}
      </div>
    </section>
  );
}
