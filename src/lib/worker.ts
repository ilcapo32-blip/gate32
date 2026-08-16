// Worker de transcripción: carga Whisper (transformers.js) y procesa el audio
// por ventanas solapadas, informando de progreso ventana a ventana.

import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import {
  MODELS,
  type ModelQuality,
  type RawChunk,
  type WorkerRequest,
  type WorkerResponse,
} from "./types";
import {
  WINDOW_S,
  STEP_S,
  chunksToSegments,
  mergeWindows,
} from "./formats";

env.allowLocalModels = false;

// Con aislamiento de origen cruzado hay SharedArrayBuffer y ONNX Runtime puede
// repartir la inferencia entre núcleos. Es lo único que hace tolerable el
// camino WASM; sin esto va a un solo hilo. Se deja un núcleo libre para que la
// interfaz siga respondiendo y se limita a 4: por encima, el reparto de un
// modelo pequeño cuesta más de lo que ahorra.
const isolated = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated;
if (isolated) {
  const cores = (navigator as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? 2;
  const wasmBackend = env.backends.onnx.wasm as { numThreads?: number } | undefined;
  if (wasmBackend) wasmBackend.numThreads = Math.max(1, Math.min(4, cores - 1));
}

// Autoalojamiento: por defecto los pesos se descargan del CDN de Hugging Face,
// pero VITE_MODEL_HOST permite servirlos desde tu propio dominio y ejecutar
// Gate32 sin ninguna llamada externa (ver README, "Autoalojamiento").
const MODEL_HOST = import.meta.env.VITE_MODEL_HOST;
if (MODEL_HOST) env.remoteHost = MODEL_HOST;

// La firma real de pipeline() genera uniones que desbordan al comprobador de
// tipos (TS2590); se fija aquí una firma estrecha para el único uso que hay.
const asrPipeline = pipeline as unknown as (
  task: "automatic-speech-recognition",
  model: string,
  options?: unknown,
) => Promise<AutomaticSpeechRecognitionPipeline>;

const post = (msg: WorkerResponse) => {
  (self as unknown as { postMessage(m: WorkerResponse): void }).postMessage(msg);
};

const SAMPLE_RATE = 16000;

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedQuality: ModelQuality | null = null;
let device: "webgpu" | "wasm" = "wasm";

async function detectDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu && (await gpu.requestAdapter())) return "webgpu";
  } catch {
    /* sin WebGPU */
  }
  return "wasm";
}

async function loadModel(quality: ModelQuality): Promise<void> {
  if (transcriber && loadedQuality === quality) {
    post({ type: "ready", cached: true, seconds: 0 });
    return;
  }
  const t0 = performance.now();
  device = await detectDevice();
  post({ type: "device", device });

  const spec = MODELS[quality];
  let sawDownload = false;
  const progress_callback = (p: unknown) => {
    const info = p as {
      status?: string;
      file?: string;
      loaded?: number;
      total?: number;
    };
    // Se reportan bytes, no porcentajes: promediar porcentajes por fichero
    // daba una barra sin sentido (un tokenizador de 5 KB pesaba lo mismo que
    // un decodificador de 600 MB, y entre ficheros se quedaba en el 100 %).
    if (info.status === "progress" && typeof info.loaded === "number") {
      sawDownload = true;
      post({
        type: "load-progress",
        file: info.file ?? "",
        loaded: info.loaded,
        total: typeof info.total === "number" ? info.total : 0,
      });
    }
  };

  // El tipo de opciones de pipeline() es una unión enorme que desborda a TS
  // (TS2590); se aisla aquí con un cast único y controlado.
  const options = (
    device === "webgpu"
      ? {
          device: "webgpu",
          dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
          progress_callback,
        }
      : { device: "wasm", dtype: "q8", progress_callback }
  ) as never;

  const candidates = [spec.id, spec.fallbackId];
  let lastError: unknown = null;
  for (const id of candidates) {
    try {
      if (transcriber) {
        await transcriber.dispose();
        transcriber = null;
      }
      transcriber = await asrPipeline("automatic-speech-recognition", id, options);
      loadedQuality = quality;
      post({
        type: "ready",
        cached: !sawDownload,
        seconds: (performance.now() - t0) / 1000,
      });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  // último recurso: WASM si WebGPU falló al compilar
  if (device === "webgpu") {
    try {
      device = "wasm";
      post({ type: "device", device });
      transcriber = await asrPipeline("automatic-speech-recognition", spec.id, {
        device: "wasm",
        dtype: "q8",
        progress_callback,
      });
      loadedQuality = quality;
      post({ type: "ready", cached: !sawDownload, seconds: (performance.now() - t0) / 1000 });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  post({
    type: "error",
    stage: "load",
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
}

async function transcribe(audio: Float32Array, language: string): Promise<void> {
  if (!transcriber) {
    post({ type: "error", stage: "transcribe", message: "Modelo no cargado." });
    return;
  }
  const t0 = performance.now();
  const totalSamples = audio.length;
  const windowSamples = WINDOW_S * SAMPLE_RATE;
  const stepSamples = STEP_S * SAMPLE_RATE;
  const total = Math.max(1, Math.ceil(Math.max(0, totalSamples - windowSamples) / stepSamples) + 1);

  const results: { offset: number; segments: ReturnType<typeof chunksToSegments> }[] = [];

  // Un bloque que falla no puede tirar la transcripción entera. Antes el
  // try/catch envolvía el bucle completo, así que un solo fallo en el minuto
  // tres borraba los tres minutos que ya estaban bien. El caso real que lo
  // destapó: `token_ids must be a non-empty array of integers`, que salta en
  // el decodificador de marcas de tiempo cuando el modelo no genera nada para
  // un bloque — normalmente un tramo de silencio.
  let failed = 0;
  let lastError: unknown = null;

  for (let i = 0; i < total; i++) {
    const startSample = i * stepSamples;
    const slice = audio.subarray(startSample, Math.min(startSample + windowSamples, totalSamples));
    const offset = startSample / SAMPLE_RATE;
    post({ type: "window-start", index: i, total });

    const generationOptions: Record<string, unknown> = {
      task: "transcribe",
      return_timestamps: true,
    };
    if (language !== "auto") generationOptions["language"] = language;

    type Output = { text: string; chunks?: RawChunk[] };
    let output: Output | null = null;
    try {
      output = (await transcriber(slice.slice(), generationOptions)) as Output;
    } catch (err) {
      lastError = err;
      // Segundo intento sin marcas de tiempo: es justo la parte que revienta,
      // y un bloque sin tiempos propios sigue valiendo — se le asigna el tramo
      // entero, que para 30 segundos de audio es aproximación suficiente.
      try {
        output = (await transcriber(slice.slice(), {
          ...generationOptions,
          return_timestamps: false,
        })) as Output;
      } catch {
        output = null;
      }
    }

    if (!output) {
      failed++;
      post({ type: "window-done", index: i, total, segments: [] });
      continue;
    }

    const chunks: RawChunk[] =
      output.chunks && output.chunks.length > 0
        ? output.chunks
        : output.text.trim()
          ? [{ timestamp: [0, null], text: output.text }]
          : [];

    const segments = chunksToSegments(chunks, offset, slice.length / SAMPLE_RATE);
    results.push({ offset, segments });
    post({ type: "window-done", index: i, total, segments });
  }

  const merged = mergeWindows(results);

  // Solo se da por fallida la transcripción si no se ha salvado nada. Con
  // texto en la mano, aunque falten bloques, entregarlo es mejor que un error:
  // el usuario ve lo que hay y decide.
  if (merged.length === 0 && failed > 0) {
    post({
      type: "error",
      stage: "transcribe",
      message: lastError instanceof Error ? lastError.message : String(lastError),
    });
    return;
  }

  post({ type: "done", segments: merged, seconds: (performance.now() - t0) / 1000, failed });
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "load") void loadModel(msg.quality);
  else if (msg.type === "transcribe") void transcribe(msg.audio, msg.language);
});
