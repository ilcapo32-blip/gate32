// Decodificación de audio/vídeo a mono 16 kHz, todo en el navegador.

import { t } from "./i18n";
import { chunkRanges } from "./mp3";
import { looksLikeMp4, mp4ChunkRanges, readMp4Audio, type Mp4AudioTrack } from "./mp4";

export interface DecodedAudio {
  audio: Float32Array;
  duration: number; // segundos
  /** Se decodificó por trozos (MP3 grande) en vez de de una sola vez. */
  chunked?: boolean;
  /**
   * Lo leyó el demultiplexor MP4 propio. Va aparte porque es el arreglo de 31
   * de los 41 errores de descodificación medidos, y hay que poder ver si salva
   * esos archivos o no.
   */
  mp4?: boolean;
  /**
   * Por qué un MP4 grande **no** pudo ir por el demultiplexor, si fue así. Sin
   * esto, cuando un MP4 sale mal no hay forma de saber si el problema es el
   * navegador, el códec o el archivo.
   */
  mp4Skip?: Mp4Skip;
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
  /** Si era un MP4 grande, por qué no lo pudo leer el demultiplexor. */
  mp4Skip?: Mp4Skip;
  constructor(bytes: number) {
    const big = bytes > BIG_FILE_BYTES;
    super(big ? t("decode_error_big") : t("decode_error"));
    this.big = big;
    this.name = "DecodeError";
  }
}

/**
 * Motivos por los que un MP4 grande no se lee por tramos: sin `AudioDecoder`
 * (navegador antiguo), sin pista de audio que sepamos leer, códec que el
 * navegador no acepta, o demasiados tramos que no se dejaron descodificar.
 */
export type Mp4Skip = "decoder" | "track" | "codec" | "tramos";

/**
 * Más de un tramo de cada cuatro sin poder leerse ya no es un archivo con un
 * hueco, es un archivo que no se está leyendo. Devolverlo relleno de silencio
 * es lo peor que se puede hacer: Whisper transcribe ese silencio como
 * «[Música]» y la pantalla dice que todo ha ido bien.
 */
const tooManyFailed = (failed: number, total: number) => failed * 4 > total;

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
  let failed = 0;

  for (const range of ranges) {
    const slice = bytes.slice(range.start, range.end);
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(slice.buffer as ArrayBuffer);
    } catch {
      // Un trozo ilegible no debe tirar el archivo entero: se salta su hueco
      // para que los tiempos del resto no se desplacen.
      failed++;
      written += Math.round(range.seconds * TARGET_RATE);
      continue;
    }
    written += mixInto(decoded, out, written);
  }

  if (written === 0 || tooManyFailed(failed, ranges.length)) return null;
  return { audio: out.subarray(0, written), duration: written / TARGET_RATE, chunked: true };
}

/**
 * Decodifica un MP4/M4A/MOV tramo a tramo con WebCodecs.
 *
 * El camino de siempre pide el archivo entero a `decodeAudioData`, que
 * descodifica al ritmo nativo antes de remuestrear: una hora de estéreo a
 * 48 kHz son 1,38 GB en memoria para acabar siendo 115 MB. Por eso fallaban 31
 * de los 41 errores de descodificación medidos, todos de esta familia.
 *
 * `AudioDecoder` recibe las tramas sueltas, así que con la tabla de muestras
 * que da `mp4.ts` se puede ir por tramos y la memoria deja de depender de la
 * duración. Devuelve `null` —en vez de lanzar— siempre que algo no encaje, para
 * que quien llame siga por el camino de siempre: un archivo pequeño que el
 * navegador sabe leer de una pieza no tiene por qué pasar por aquí.
 */
async function decodeMp4(bytes: Uint8Array): Promise<DecodedAudio | Mp4Skip> {
  const Decoder = (globalThis as { AudioDecoder?: typeof AudioDecoder }).AudioDecoder;
  if (!Decoder) return "decoder";

  const track = readMp4Audio(bytes);
  if (!track || track.samples.length === 0) return "track";

  try {
    const config: AudioDecoderConfig = {
      codec: track.codec,
      sampleRate: track.sampleRate,
      numberOfChannels: track.channels,
      ...(track.description ? { description: track.description } : {}),
    };
    const { supported } = await Decoder.isConfigSupported(config);
    if (!supported) return "codec";

    // Tramos de cinco minutos: a 48 kHz son unos 57 MB de pico, frente a los
    // 1,38 GB de pedir una hora entera.
    const ranges = mp4ChunkRanges(track, 300);
    const out = new Float32Array(Math.ceil(track.duration * TARGET_RATE) + TARGET_RATE);
    let written = 0;
    let failed = 0;

    for (const range of ranges) {
      const mono = await decodeRange(Decoder, config, track, bytes, range.from, range.to);
      // Un tramo ilegible no puede llevarse el archivo entero por delante: se
      // deja su hueco en silencio para que los tiempos del resto no se muevan.
      if (!mono) {
        failed++;
        // Si ya no hay manera de que salga bien, no se sigue gastando tiempo.
        if (tooManyFailed(failed, ranges.length)) return "tramos";
        written += Math.round(range.seconds * TARGET_RATE);
        continue;
      }
      const resampled = await toTargetRate(mono.audio, mono.rate);
      const room = Math.min(resampled.length, out.length - written);
      out.set(resampled.subarray(0, room), written);
      written += room;
    }

    if (written === 0) return "tramos";
    return { audio: out.subarray(0, written), duration: written / TARGET_RATE, chunked: true, mp4: true };
  } catch {
    return "codec";
  }
}

/** Un tramo de muestras, decodificado y mezclado a mono a su ritmo nativo. */
async function decodeRange(
  Decoder: typeof AudioDecoder,
  config: AudioDecoderConfig,
  track: Mp4AudioTrack,
  bytes: Uint8Array,
  from: number,
  to: number,
): Promise<{ audio: Float32Array<ArrayBuffer>; rate: number } | null> {
  const pieces: Float32Array[] = [];
  let rate = track.sampleRate;
  let failed = false;

  const decoder = new Decoder({
    output: (data) => {
      // Un error aquí no lo recoge el `try` de abajo —salta fuera, en el
      // decodificador—, así que se anota a mano: si no, la trama se perdía en
      // silencio y el tramo parecía bueno.
      try {
        rate = data.sampleRate;
        const frames = data.numberOfFrames;
        const channels = data.numberOfChannels;
        const mono = new Float32Array(frames);
        const plane = new Float32Array(frames);
        for (let c = 0; c < channels; c++) {
          data.copyTo(plane, { planeIndex: c, format: "f32-planar" });
          for (let i = 0; i < frames; i++) mono[i] = (mono[i] ?? 0) + (plane[i] ?? 0);
        }
        if (channels > 1) for (let i = 0; i < frames; i++) mono[i] = (mono[i] ?? 0) / channels;
        pieces.push(mono);
      } catch {
        failed = true;
      } finally {
        data.close();
      }
    },
    error: () => {
      failed = true;
    },
  });

  try {
    decoder.configure(config);
    for (let i = from; i < to; i++) {
      const sample = track.samples[i];
      if (!sample) continue;
      const end = sample.offset + sample.size;
      // Un índice que apunta fuera del archivo es un MP4 truncado: se para en
      // seco en vez de pedirle al decodificador bytes que no existen.
      if (end > bytes.length) break;
      decoder.decode(
        new EncodedAudioChunk({
          type: "key", // en AAC todas las tramas lo son
          timestamp: Math.round(sample.start * 1e6),
          duration: Math.round(sample.seconds * 1e6),
          data: bytes.subarray(sample.offset, end),
        }),
      );
    }
    await decoder.flush();
  } catch {
    return null;
  } finally {
    try {
      decoder.close();
    } catch {
      /* ya estaba cerrado */
    }
  }

  if (failed || pieces.length === 0) return null;
  let total = 0;
  for (const p of pieces) total += p.length;
  const audio = new Float32Array(total);
  let at = 0;
  for (const p of pieces) {
    audio.set(p, at);
    at += p.length;
  }
  return { audio, rate };
}

/** Remuestrea a 16 kHz con el remuestreador del navegador, que es mejor que uno a mano. */
async function toTargetRate(audio: Float32Array<ArrayBuffer>, rate: number): Promise<Float32Array> {
  if (rate === TARGET_RATE || audio.length === 0) return audio;
  const frames = Math.max(1, Math.round((audio.length / rate) * TARGET_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
  const buffer = offline.createBuffer(1, audio.length, rate);
  buffer.copyToChannel(audio, 0);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
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
  //
  // Cada formato por su lector, y el MP4 **antes** que el MP3: el lector de MP3
  // veía tramas falsas en los datos de vídeo de cualquier MP4 y devolvía una
  // hora de silencio que Whisper transcribía como «[Música]».
  let mp4Skip: Mp4Skip | undefined;
  if (buf.byteLength > BIG_FILE_BYTES) {
    const bytes = new Uint8Array(buf.slice(0));
    if (looksLikeMp4(bytes)) {
      // La familia MP4 —mp4, m4a, mov— era 31 de los 41 errores de
      // descodificación medidos.
      try {
        const demuxed = await decodeMp4(bytes);
        if (typeof demuxed === "string") mp4Skip = demuxed;
        else if (demuxed.duration >= 0.5) {
          void ctx.close();
          return demuxed;
        }
      } catch {
        mp4Skip = "codec";
      }
    } else {
      try {
        const chunked = await decodeChunked(ctx, bytes);
        if (chunked && chunked.duration >= 0.5) {
          void ctx.close();
          return chunked;
        }
      } catch {
        /* si el troceado falla, queda el camino de siempre */
      }
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
      // `file.size` y no el búfer: `decodeAudioData` lo deja vacío, y una
      // grabación grande se avisaba como si fuera un formato raro.
      const err = new DecodeError(file.size);
      if (mp4Skip) err.mp4Skip = mp4Skip;
      throw err;
    }
  }
  void ctx.close();

  if (decoded.duration < 0.5) {
    throw new Error(t("too_short"));
  }

  const skip = mp4Skip ? { mp4Skip } : {};
  if (decoded.sampleRate === TARGET_RATE && decoded.numberOfChannels === 1) {
    return { audio: decoded.getChannelData(0).slice(), duration: decoded.duration, ...skip };
  }

  const length = Math.ceil(decoded.duration * TARGET_RATE);
  const offline = new OfflineAudioContext(1, length, TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { audio: rendered.getChannelData(0).slice(), duration: rendered.duration, ...skip };
}

/** Formatos que aceptamos en el selector de archivos. */
export const ACCEPT =
  "audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.m4a,.ogg,.oga,.opus,.flac,.aac,.mp4,.webm,.mov,.mkv,.json";

/** Aviso para archivos muy largos (memoria del navegador). */
export const LONG_FILE_WARN_MIN = 90;
