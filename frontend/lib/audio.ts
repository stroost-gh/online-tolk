// Audio-opname. Levert mono PCM 16-bit op 16 kHz aan, in chunks van ~100 ms.
// Elke chunk krijgt een bron-byte vooraan (0 = A, 1 = B) zodat de dienst weet
// van welke spreker de audio komt.

const SAMPLE_RATE = 16000;

export type AudioBron = "A" | "B";

// Microfoon van dit apparaat.
export async function microfoonStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
}

// Geluid van een gedeeld tabblad (de videocall). De gebruiker kiest het
// tabblad en moet "tabblad-geluid delen" aanvinken; de videotrack gooien we weg.
export async function tabbladStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("Geen tabblad-geluid gedeeld");
  }
  stream.getVideoTracks().forEach((t) => t.stop());
  return stream;
}

export class AudioOpname {
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;

  constructor(
    private stream: MediaStream,
    private bron: AudioBron,
  ) {}

  async start(opChunk: (pcm: ArrayBuffer) => void) {
    this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
    await this.context.audioWorklet.addModule("/pcm-worklet.js");

    const ingang = this.context.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.context, "pcm-worklet");
    const bronByte = this.bron === "A" ? 0 : 1;
    this.node.port.onmessage = (e) => {
      opChunk(pakIn(bronByte, e.data as Float32Array));
    };
    ingang.connect(this.node);
  }

  async stop() {
    this.node?.disconnect();
    this.node = null;
    this.stream.getTracks().forEach((t) => t.stop());
    await this.context?.close();
    this.context = null;
  }
}

function pakIn(bronByte: number, samples: Float32Array): ArrayBuffer {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uit = new Uint8Array(1 + pcm.byteLength);
  uit[0] = bronByte;
  uit.set(new Uint8Array(pcm.buffer), 1);
  return uit.buffer;
}
