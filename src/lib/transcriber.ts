// Cliente del worker: API tipada con callbacks para la UI.
// La capa de IA queda aislada aquí: sustituir el motor (otro modelo, un
// servidor futuro) no debe tocar nada por encima de esta interfaz.

import type { ModelQuality, Segment, WorkerRequest, WorkerResponse } from "./types";

export interface TranscribeCallbacks {
  onDevice?(device: "webgpu" | "wasm"): void;
  onLoadProgress?(progress: number, file: string): void;
  onReady?(cached: boolean, seconds: number): void;
  onWindowProgress?(done: number, total: number, partial: Segment[]): void;
  onDone(segments: Segment[], seconds: number): void;
  onError(stage: "load" | "transcribe", message: string): void;
}

export class Transcriber {
  private worker: Worker | null = null;
  private callbacks: TranscribeCallbacks | null = null;
  private partial: Segment[] = [];

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.addEventListener("message", (e: MessageEvent<WorkerResponse>) =>
        this.handle(e.data),
      );
    }
    return this.worker;
  }

  private handle(msg: WorkerResponse): void {
    const cb = this.callbacks;
    if (!cb) return;
    switch (msg.type) {
      case "device":
        cb.onDevice?.(msg.device);
        break;
      case "load-progress":
        cb.onLoadProgress?.(msg.progress, msg.file);
        break;
      case "ready":
        cb.onReady?.(msg.cached, msg.seconds);
        break;
      case "window-start":
        break;
      case "window-done":
        this.partial = this.partial.concat(msg.segments);
        cb.onWindowProgress?.(msg.index + 1, msg.total, this.partial);
        break;
      case "done":
        cb.onDone(msg.segments, msg.seconds);
        break;
      case "error":
        cb.onError(msg.stage, msg.message);
        break;
    }
  }

  load(quality: ModelQuality, callbacks: TranscribeCallbacks): void {
    this.callbacks = callbacks;
    const req: WorkerRequest = { type: "load", quality };
    this.ensureWorker().postMessage(req);
  }

  transcribe(audio: Float32Array, language: string, callbacks: TranscribeCallbacks): void {
    this.callbacks = callbacks;
    this.partial = [];
    const req: WorkerRequest = { type: "transcribe", audio, language };
    // el buffer se transfiere para no duplicar memoria
    this.ensureWorker().postMessage(req, [audio.buffer]);
  }

  /** Mata el worker (p. ej. para cancelar una transcripción en curso). */
  reset(): void {
    this.worker?.terminate();
    this.worker = null;
    this.partial = [];
  }
}
