// ¿El resultado tiene sentido para el audio que se ha dado?
//
// El 12/11 el fundador instaló la app de Android, transcribió una grabación de
// voz de 55 s y obtuvo una sola línea: «[Música]». Es lo que escribe Whisper
// cuando lo que le llega no se parece a nada: silencio, o un cálculo que ha
// salido mal. Y la segunda causa existe: en algunos móviles la tarjeta gráfica
// (WebGPU) ejecuta el modelo con resultados sin sentido, sin dar ningún error.
//
// Desde fuera las dos se ven igual. Lo que las separa es el propio audio: si
// tiene sonido de sobra y el resultado está vacío, el problema no es el audio.
// Aquí vive esa comprobación, sin navegador y por tanto comprobable.

import type { Segment } from "./types";

/**
 * Proporción de tramos de 30 ms con sonido, de 0 a 1.
 *
 * Un tramo cuenta si su volumen medio pasa de -40 dBFS, muy por debajo de una
 * voz normal y muy por encima del ruido de fondo de una grabación en silencio.
 * Una conversación suele quedar por encima de 0,3; un archivo mudo, por debajo
 * de 0,02.
 */
export function soundActivity(audio: Float32Array, rate = 16000): number {
  const frame = Math.max(1, Math.round(rate * 0.03));
  const frames = Math.floor(audio.length / frame);
  if (frames === 0) return 0;
  let active = 0;
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) {
      const v = audio[i] ?? 0;
      sum += v * v;
    }
    if (Math.sqrt(sum / frame) > 0.01) active++;
  }
  return active / frames;
}

/** Etiquetas que Whisper pone en lugar de voz: [Música], (aplausos), ♪… */
const TAG = /^[[(（♪*]+[^\])）]*[\])）♪*]+$|^[♪\s.…]+$/u;

/** Cierres de subtítulo que Whisper inventa ante el silencio. */
const FILLER = [
  "amara org",
  "subtitulos realizados por",
  "subtitulos por la comunidad",
  "subtitulado por la comunidad",
  "gracias por ver el video",
  "thanks for watching",
  "thank you for watching",
  "subtitles by the amara org community",
];

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Si la transcripción no tiene ni una palabra real: todo son etiquetas como
 * «[Música]», cierres de subtítulo inventados, o nada.
 */
export function looksEmpty(segments: Segment[]): boolean {
  return segments.every((s) => {
    // «[Música].» con punto final es la misma etiqueta.
    const text = s.text.trim().replace(/[.!…\s]+$/u, "");
    if (!text || TAG.test(text)) return true;
    const n = norm(text);
    return !n || FILLER.some((f) => n.includes(f));
  });
}

/**
 * Un resultado vacío para un audio con sonido de sobra no es culpa del audio.
 * Por debajo de este umbral se deja estar: puede ser silencio de verdad.
 */
export const SOUND_FOR_SPEECH = 0.15;
