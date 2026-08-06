// Tipos compartidos entre la UI, el cliente del worker y el worker.

export type ModelQuality = "fast" | "balanced" | "accurate";

export interface ModelSpec {
  id: string;
  fallbackId: string;
  label: string;
  sizeLabel: string;
}

export const MODELS: Record<ModelQuality, ModelSpec> = {
  fast: {
    id: "onnx-community/whisper-tiny",
    fallbackId: "Xenova/whisper-tiny",
    label: "Rápido",
    sizeLabel: "~50 MB",
  },
  balanced: {
    id: "onnx-community/whisper-base",
    fallbackId: "Xenova/whisper-base",
    label: "Equilibrado",
    sizeLabel: "~80 MB",
  },
  accurate: {
    id: "onnx-community/whisper-small",
    fallbackId: "Xenova/whisper-small",
    label: "Preciso",
    sizeLabel: "~250 MB",
  },
};

/** Segmento de transcripción con tiempos en segundos. */
export interface Segment {
  start: number;
  end: number;
  text: string;
}

/** Ventana transcrita por el worker, con su desplazamiento temporal. */
export interface WindowResult {
  offset: number;
  chunks: RawChunk[];
}

/** Chunk tal y como lo devuelve transformers.js (el fin puede ser null). */
export interface RawChunk {
  timestamp: [number, number | null];
  text: string;
}

// ── protocolo del worker ──

export type WorkerRequest =
  | { type: "load"; quality: ModelQuality }
  | {
      type: "transcribe";
      audio: Float32Array;
      language: string; // "auto" o código ISO ("es", "en", ...)
    };

export type WorkerResponse =
  | { type: "device"; device: "webgpu" | "wasm" }
  | { type: "load-progress"; progress: number; file: string }
  | { type: "ready"; cached: boolean; seconds: number }
  | { type: "window-start"; index: number; total: number }
  | { type: "window-done"; index: number; total: number; segments: Segment[] }
  | { type: "done"; segments: Segment[]; seconds: number }
  | { type: "error"; stage: "load" | "transcribe"; message: string };
