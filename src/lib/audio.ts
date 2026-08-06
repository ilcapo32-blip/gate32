// Decodificación de audio/vídeo a mono 16 kHz, todo en el navegador.

import { t } from "./i18n";

export interface DecodedAudio {
  audio: Float32Array;
  duration: number; // segundos
}

const TARGET_RATE = 16000;

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

  const ctx = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf);
  } catch {
    throw new Error(t("decode_error"));
  } finally {
    void ctx.close();
  }

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
  "audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.m4a,.ogg,.oga,.opus,.flac,.aac,.mp4,.webm,.mov,.mkv";

/** Aviso para archivos muy largos (memoria del navegador). */
export const LONG_FILE_WARN_MIN = 90;
