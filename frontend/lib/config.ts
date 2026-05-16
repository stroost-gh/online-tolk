// Adres van de lokale tolk-dienst. Standaard dezelfde host als waar de pagina
// vandaan komt, zodat een tweede scherm op het LAN automatisch het juiste
// adres gebruikt.
export function wsUrl(): string {
  const expliciet = process.env.NEXT_PUBLIC_TOLK_WS;
  if (expliciet) return expliciet;
  return `ws://${window.location.hostname}:8765`;
}
