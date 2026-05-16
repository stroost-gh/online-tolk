import { ClientBericht, ServerBericht } from "./protocol";

const MAX_WACHT_MS = 8000;

// WebSocket-verbinding met de tolk-dienst. Bij een onbedoelde verbreking
// (bijv. wegvallend wifi) wordt automatisch opnieuw verbonden met oplopende
// wachttijd; een bewuste sluit() stopt dat. Na een herverbinding wordt
// opHeropend aangeroepen, zodat de client zich opnieuw kan koppelen.
export class TolkVerbinding {
  private ws: WebSocket | null = null;
  private bewustGesloten = false;
  private pogingen = 0;

  constructor(
    private url: string,
    private opBericht: (bericht: ServerBericht) => void,
    private opVerbindingsstatus: (verbonden: boolean) => void,
    private opHeropend?: () => void,
  ) {}

  verbind(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = this.maakWebSocket(
        () => {
          this.opVerbindingsstatus(true);
          resolve();
        },
        () => reject(new Error("WebSocket-verbinding mislukt")),
      );
    });
  }

  private maakWebSocket(opOpen: () => void, opFout?: () => void): WebSocket {
    const ws = new WebSocket(this.url);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      this.pogingen = 0;
      opOpen();
    };
    ws.onerror = () => opFout?.();
    ws.onmessage = (e) => {
      if (typeof e.data === "string") {
        this.opBericht(JSON.parse(e.data) as ServerBericht);
      }
    };
    ws.onclose = () => {
      this.opVerbindingsstatus(false);
      if (!this.bewustGesloten) {
        this.herverbind();
      }
    };
    return ws;
  }

  private herverbind() {
    const wacht = Math.min(1000 * 2 ** this.pogingen, MAX_WACHT_MS);
    this.pogingen += 1;
    setTimeout(() => {
      if (this.bewustGesloten) return;
      this.ws = this.maakWebSocket(() => {
        this.opVerbindingsstatus(true);
        this.opHeropend?.();
      });
    }, wacht);
  }

  stuurBericht(bericht: ClientBericht) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(bericht));
    }
  }

  stuurAudio(buffer: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buffer);
    }
  }

  sluit() {
    this.bewustGesloten = true;
    this.ws?.close();
    this.ws = null;
  }
}
