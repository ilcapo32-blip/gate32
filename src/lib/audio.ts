// Decodificación de audio/vídeo a mono 16 kHz, todo en el navegador.

import { t } from "./i18n";
import { chunkRanges } from "./mp3";

export interface DecodedAudio {
  audio: Float32Array;
  duration: number; // segundos
  /** Se decodificó por trozos (MP3 grande) en vez de de una sola vez. */
  chunked?: boolean;
  /** Trozos de una grabación larga que no se pudieron leer. */
  partsFailed?: number;
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

/** Mezcla los canales de un buffer ya remuestreado y lo escribe en `out`. */
function mixInto(decoded: AudioBuffer, out: Float32Array, offset: number): number {
  const channels = decoded.numberOfChannels;
  const frames = Math.min(decoded.length, out.length - offset);
  if (frames <= 0) return 0;
  const first = decoded.getChannelData(0);
  for (let i = 0; i < frames; i++) out[offset + i] = first[i] ?? 0;
  for (let c = 1; c < channels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < frames; i++) out[offset + i] = (out[offset + i] ?? 0) + (data[i] ?? 0);
  }
  if (channels > 1) {
    for (let i = 0; i < frames; i++) out[offset + i] = (out[offset + i] ?? 0) / channels;
  }
  return frames;
}

/**
 * Decodifica un MP3 largo trozo a trozo, cortando por límites de trama. Evita
 * el pico de memoria que tumbaba uno de cada cuatro archivos: en vez de pedir
 * el episodio entero descomprimido de golpe, se pide de diez en diez minutos.
 *
 * Devuelve `null` si el archivo no se puede trocear, para seguir por el camino
 * de siempre.
 */
async function decodeChunked(
  ctx: AudioContext,
  bytes: Uint8Array,
): Promise<DecodedAudio | null> {
  const ranges = chunkRanges(bytes, 600);
  if (!ranges || ranges.length < 2) return null;

  const totalSeconds = ranges.reduce((a, r) => a + r.seconds, 0);
  // Una sola reserva del tamaño final: concatenar trozos duplicaría memoria
  // justo en el momento en el que no sobra.
  const out = new Float32Array(Math.ceil(totalSeconds * TARGET_RATE) + TARGET_RATE);
  let written = 0;

  for (const range of ranges) {
    const slice = bytes.slice(range.start, range.end);
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(slice.buffer as ArrayBuffer);
    } catch {
      // Un trozo ilegible no debe tirar el archivo entero: se salta su hueco
      // para que los tiempos del resto no se desplacen.
      written += Math.round(range.seconds * TARGET_RATE);
      continue;
    }
    written += mixInto(decoded, out, written);
  }

  if (written === 0) return null;
  return { audio: out.subarray(0, written), duration: written / TARGET_RATE, chunked: true };
}

/**
 * Decodifica cualquier archivo de audio/vídeo soportado por el navegador y lo
 * deja en mono a 16 kHz, que es lo que espera Whisper. Los MP3 grandes van por
 * el camino troceado; el resto, por el de siempre.
 */
/**
 * Decodifica una grabación partida en varios trozos y los concatena.
 *
 * Existe por un desastre real: 1 h 35 min de webinar grabadas en WebM llegaron
 * enteras y `decodeAudioData` no pudo con ellas de una pieza — Opus se
 * decodifica primero a su ritmo nativo, así que hora y media son más de un
 * gigabyte antes de remuestrear. El troceado que teníamos solo sabe leer MP3,
 * de modo que el camino largo era el único disponible y falló. Resultado: una
 * grabación de hora y media perdida entera.
 *
 * La grabación se parte ahora en trozos de pocos minutos, cada uno un WebM
 * completo y válido por su cuenta. Aquí se decodifican de uno en uno, así que
 * la memoria máxima es la de un trozo y no la del archivo entero.
 */
export async function decodeParts(parts: Blob[]): Promise<DecodedAudio> {
  const pieces: Float32Array[] = [];
  let duration = 0;
  let failed = 0;
  for (const part of parts) {
    try {
      const d = await decodeToMono16k(part);
      pieces.push(d.audio);
      duration += d.duration;
    } catch {
      // Un trozo ilegible no puede llevarse los demás por delante: eso es
      // exactamente el error que estamos arreglando, solo que en pequeño.
      failed++;
    }
  }
  if (pieces.length === 0) throw new DecodeError(parts.reduce((n, p) => n + p.size, 0));

  let total = 0;
  for (const p of pieces) total += p.length;
  const audio = new Float32Array(total);
  let at = 0;
  for (const p of pieces) {
    audio.set(p, at);
    at += p.length;
  }
  return { audio, duration, chunked: true, partsFailed: failed };
}

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

  // Los archivos grandes van primero por el camino troceado, que es el único
  // que no depende de que quepa el episodio entero en memoria.
  if (buf.byteLength > BIG_FILE_BYTES) {
    try {
      const chunked = await decodeChunked(ctx, new Uint8Array(buf.slice(0)));
      if (chunked && chunked.duration >= 0.5) {
        void ctx.close();
        return chunked;
      }
    } catch {
      /* si el troceado falla, queda el camino de siempre */
    }
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
