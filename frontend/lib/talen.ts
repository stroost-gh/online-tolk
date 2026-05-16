export type TaalCode =
  | "nl"
  | "en"
  | "de"
  | "pl"
  | "ar"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "uk";

export interface Taal {
  code: TaalCode;
  naam: string;
  rtl: boolean;
}

export const TALEN: Taal[] = [
  { code: "nl", naam: "Nederlands", rtl: false },
  { code: "en", naam: "Engels", rtl: false },
  { code: "de", naam: "Duits", rtl: false },
  { code: "pl", naam: "Pools", rtl: false },
  { code: "ar", naam: "Arabisch", rtl: true },
  { code: "fr", naam: "Frans", rtl: false },
  { code: "es", naam: "Spaans", rtl: false },
  { code: "pt", naam: "Portugees", rtl: false },
  { code: "it", naam: "Italiaans", rtl: false },
  { code: "uk", naam: "Oekraïens", rtl: false },
];

export function taalNaam(code: string): string {
  return TALEN.find((t) => t.code === code)?.naam ?? code;
}

export function isRtl(code: string): boolean {
  return TALEN.find((t) => t.code === code)?.rtl ?? false;
}
