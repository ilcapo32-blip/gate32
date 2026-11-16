// La onda en miniatura de cada transcripción reciente.
//
// En la maqueta del modo app (16/11) cada tarjeta de «Recientes» lleva una
// onda pequeña, y se prometió que sería la de cada audio y no un adorno. El
// audio no se guarda —solo el texto con sus tiempos—, así que la forma sale de
// ahí: cuánto se habla en cada tramo. Una clase con pausas largas se ve
// distinta de una nota de voz sin respiro, y una entrevista que se apaga al
// final, también.

import type { Segment } from "./types";

/** Altura mínima de una barra: un tramo en silencio sigue siendo parte del audio. */
const FLOOR = 0.18;

/**
 * Cuánto se habla en cada uno de `n` tramos iguales del audio, de 0,18 a 1.
 *
 * Las palabras de cada frase se reparten por igual a lo largo de lo que dura,
 * y cada tramo suma las que le caen dentro. Sin frases, todo queda al mínimo.
 */
export function speechBars(segments: Segment[], seconds?: number, n = 11): number[] {
  const end = Math.max(seconds ?? 0, ...segments.map((s) => s.end), 0);
  const words = new Array<number>(n).fill(0);
  if (end <= 0) return words.map(() => FLOOR);
  const step = end / n;

  for (const s of segments) {
    const count = s.text.trim().split(/\s+/).filter(Boolean).length;
    const len = Math.max(0.001, s.end - s.start);
    for (let k = 0; k < n; k++) {
      const overlap = Math.min(s.end, (k + 1) * step) - Math.max(s.start, k * step);
      if (overlap > 0) words[k] = (words[k] ?? 0) + (count * overlap) / len;
    }
  }

  const max = Math.max(...words);
  if (max <= 0) return words.map(() => FLOOR);
  return words.map((w) => FLOOR + (1 - FLOOR) * (w / max));
}

/** Las barras como SVG, del color del texto que las rodea. */
export function barsSvg(bars: number[]): string {
  const h = 26;
  const rects = bars
    .map((v, k) => {
      const bh = Math.max(3, Math.round(v * h));
      return `<rect x="${(k * 3.4).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="2" height="${bh}" rx="1" fill="currentColor"/>`;
    })
    .join("");
  const w = Math.max(2, (bars.length - 1) * 3.4 + 2);
  return `<svg viewBox="0 0 ${w.toFixed(1)} ${h}" aria-hidden="true">${rects}</svg>`;
}
