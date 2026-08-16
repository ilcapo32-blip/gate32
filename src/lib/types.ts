// Tipos compartidos entre la UI, el cliente del worker y el worker.

export type ModelQuality = "fast" | "balanced" | "accurate" | "max";

export interface ModelSpec {
  id: string;
  fallbackId: string;
  label: string;
  sizeLabel: string;
  /** Tamaño aproximado de la descarga en bytes, para un progreso real. */
  bytes: number;
}

export const MODELS: Record<ModelQuality, ModelSpec> = {
  fast: {
    id: "onnx-community/whisper-tiny",
    fallbackId: "Xenova/whisper-tiny",
    label: "Rápido",
    sizeLabel: "~50 MB",
    bytes: 50e6,
  },
  balanced: {
    id: "onnx-community/whisper-base",
    fallbackId: "Xenova/whisper-base",
    label: "Equilibrado",
    sizeLabel: "~80 MB",
    bytes: 80e6,
  },
  accurate: {
    id: "onnx-community/whisper-small",
    fallbackId: "Xenova/whisper-small",
    label: "Preciso",
    sizeLabel: "~250 MB",
    bytes: 250e6,
  },
  // Retirado del desplegable: 800 MB suponen más de 20 minutos de descarga en
  // una conexión normal, lo que hace inviable la primera experiencia. Se
  // conserva la definición para reactivarlo si algún día servimos los pesos
  // desde un CDN propio o con descarga reanudable.
  max: {
    id: "onnx-community/whisper-large-v3-turbo",
    fallbackId: "onnx-community/whisper-medium-ONNX",
    label: "Máxima",
    sizeLabel: "~800 MB",
    bytes: 800e6,
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
  | { type: "load-progress"; file: string; loaded: number; total: number }
  | { type: "ready"; cached: boolean; seconds: number }
  | { type: "window-start"; index: number; total: number }
  | { type: "window-done"; index: number; total: number; segments: Segment[] }
  /** `failed` son los bloques de 30 s que el modelo no pudo transcribir. */
  | { type: "done"; segments: Segment[]; seconds: number; failed: number }
  | { type: "error"; stage: "load" | "transcribe"; message: string };
