// Berichtenprotocol tussen frontend en de lokale tolk-dienst.
// De Python-kant (backend/server.py) spiegelt deze structuur.

export type Spreker = "A" | "B";

// spreekkamer = een microfoon in de ruimte; videocall = microfoon plus het
// geluid van de gedeelde videocall-tab als twee aparte sprekers.
export type Modus = "spreekkamer" | "videocall";

export interface StartBericht {
  type: "start";
  taalA: string;
  taalB: string;
  modus: Modus;
}

export interface StopBericht {
  type: "stop";
}

export interface KoppelBericht {
  type: "koppel";
  code: string;
}

export type ClientBericht = StartBericht | StopBericht | KoppelBericht;

export interface StatusBericht {
  type: "status";
  staat: "verbonden";
}

export interface KoppelcodeBericht {
  type: "koppelcode";
  code: string;
}

export interface KoppelOkBericht {
  type: "koppel_ok";
}

export interface KoppelFoutBericht {
  type: "koppel_fout";
}

export interface SessieBericht {
  type: "sessie";
  taalA: string;
  taalB: string;
  modus: Modus;
  actief: boolean;
}

export interface OndertitelBericht {
  type: "ondertitel";
  id: string;
  spreker: Spreker;
  bronTaal: string;
  doelTaal: string;
  tekst: string;
  vertaling: string;
  definitief: boolean;
}

export type ServerBericht =
  | StatusBericht
  | KoppelcodeBericht
  | KoppelOkBericht
  | KoppelFoutBericht
  | SessieBericht
  | OndertitelBericht;
