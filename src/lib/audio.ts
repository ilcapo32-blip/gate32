// Decodificación de audio/vídeo a mono 16 kHz, todo en el navegador.

import { t } from "./i18n";

export interface DecodedAudio {
  audio: Float32Array;
  duration: number; // segundos
}

const TARGET_RATE = 16000;

/** A partir de aquí lo más probable es que el fallo sea de memoria, no de formato. */
export const BIG_FILE_BYTES = 60e6;

/**
 * Fallo de decodificación que conoce el tamaño del archivo. La causa cambia el
 * mensaje: no es lo mismo un formato que el navegador no entiende que un
 * episodio de dos horas que no le cabe en memoria.
 */
export class DecodeError extends Error {
  readonly big: boolean;
  constructor(bytes: number) {
    const big = bytes > BIG_FILE_BYTES;
    super(big ? t("decode_error_big") : t("decode_error"));
    this.big = big;
    this.name = "DecodeError";
  }
}

/**
 * Decodifica cualquier archivo de audio/vídeo soportado por el navegador y lo
 * remuestrea a mono 16 kHz (lo que espera Whisper). Usa OfflineAudioContext
 * para que el remuestreo sea correcto en todos los navegadores.
 */
export async function decodeToMono16k(file: Blob): Promise<DecodedAudio> {
  const buf = await file.arrayBuffer();
  const AC: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error(t("no_webaudio"));

  // decodeAudioData remuestrea al ritmo del contexto, así que pedirlo a 16 kHz
  // reduce la memoria del audio decodificado casi tres veces. En un episodio de
  // podcast de una hora eso es la diferencia entre 1,2 GB y 460 MB, y explica
  // por qué fallaban archivos largos con un simple "no se pudo leer".
  let ctx: AudioContext;
  try {
    ctx = new AC({ sampleRate: TARGET_RATE });
  } catch {
    ctx = new AC();
  }

  // decodeAudioData vacía el ArrayBuffer que recibe: sin una copia no hay
  // segundo intento posible.
  const retryBuf = buf.slice(0);
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf);
  } catch {
    void ctx.close();
    // Algunos navegadores rechazan ciertos formatos en un contexto con ritmo
    // forzado; se reintenta con el ritmo nativo antes de rendirse.
    try {
      const fallback = new AC();
      try {
        decoded = await fallback.decodeAudioData(retryBuf);
      } finally {
        void fallback.close();
      }
    } catch {
      throw new DecodeError(file instanceof File ? file.size : retryBuf.byteLength);
    }
  }
  void ctx.close();

  if (decoded.duration < 0.5) {
    throw new Error(t("too_short"));
  }

  if (decoded.sampleRate === TARGET_RATE && decoded.numberOfChannels === 1) {
    return { audio: decoded.getChannelData(0).slice(), duration: decoded.duration };
  }

  const length = Math.ceil(decoded.duration * TARGET_RATE);
  const offline = new OfflineAudioContext(1, length, TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { audio: rendered.getChannelData(0).slice(), duration: rendered.duration };
}

/** Formatos que aceptamos en el selector de archivos. */
export const ACCEPT =
  "audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.m4a,.ogg,.oga,.opus,.flac,.aac,.mp4,.webm,.mov,.mkv,.json";

/** Aviso para archivos muy largos (memoria del navegador). */
export const LONG_FILE_WARN_MIN = 90;
