// Verzamelt audio-samples en stuurt ze in blokken van ~100 ms naar de hoofdthread.
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.drempel = 1600; // 100 ms bij 16 kHz
  }

  process(inputs) {
    const kanaal = inputs[0][0];
    if (kanaal) {
      for (let i = 0; i < kanaal.length; i++) {
        this.buffer.push(kanaal[i]);
      }
      if (this.buffer.length >= this.drempel) {
        this.port.postMessage(Float32Array.from(this.buffer));
        this.buffer = [];
      }
    }
    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorklet);
