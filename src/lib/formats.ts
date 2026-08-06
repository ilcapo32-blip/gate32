// Lógica pura de formatos y fusión de ventanas. Sin dependencias del DOM:
// todo lo de este módulo es testeable de forma aislada.

import type { RawChunk, Segment, WindowResult } from "./types";

/** Ventana de audio que procesa el worker (segundos). */
export const WINDOW_S = 30;
/** Solapamiento entre ventanas consecutivas (segundos). */
export const OVERLAP_S = 5;
/** Paso efectivo entre inicios de ventana. */
export const STEP_S = WINDOW_S - OVERLAP_S;

/**
 * Convierte los chunks crudos de una ventana en segmentos absolutos,
 * reparando timestamps nulos o invertidos.
 */
export function chunksToSegments(
  chunks: RawChunk[],
  offset: number,
  windowDuration: number,
): Segment[] {
  const out: Segment[] = [];
  for (const c of chunks) {
    const text = c.text.trim();
    if (!text) continue;
    let start = typeof c.timestamp[0] === "number" ? c.timestamp[0] : 0;
    let end = typeof c.timestamp[1] === "number" ? (c.timestamp[1] as number) : windowDuration;
    if (!Number.isFinite(start) || start < 0) start = 0;
    if (!Number.isFinite(end) || end <= start) end = Math.min(start + 8, windowDuration);
    out.push({ start: offset + start, end: offset + end, text });
  }
  return out;
}

/**
 * Fusiona ventanas solapadas: cada segmento se asigna a una sola ventana
 * según el punto medio del solapamiento, evitando texto duplicado.
 */
export function mergeWindows(
  windows: { offset: number; segments: Segment[] }[],
  overlap = OVERLAP_S,
  step = STEP_S,
): Segment[] {
  const merged: Segment[] = [];
  const half = overlap / 2;
  windows.forEach((win, i) => {
    const isFirst = i === 0;
    const isLast = i === windows.length - 1;
    // límites absolutos de "propiedad" de esta ventana
    const ownStart = isFirst ? -Infinity : win.offset + half;
    const ownEnd = isLast ? Infinity : win.offset + step + half;
    for (const s of win.segments) {
      const mid = (s.start + s.end) / 2;
      if (mid >= ownStart && mid < ownEnd) merged.push(s);
    }
  });
  merged.sort((a, b) => a.start - b.start);
  // repara solapes menores entre segmentos consecutivos
  for (let i = 1; i < merged.length; i++) {
    const prev = merged[i - 1];
    const cur = merged[i];
    if (prev && cur && cur.start < prev.end) {
      cur.start = prev.end;
      if (cur.end < cur.start) cur.end = cur.start + 0.5;
    }
  }
  return merged;
}

/** Segundos → "MM:SS" o "H:MM:SS" para la UI. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Segundos → "HH:MM:SS,mmm" (SRT) o "HH:MM:SS.mmm" (VTT). */
export function timecode(seconds: number, sep: "," | "." = ","): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms, 3)}`;
}

export const ATTRIBUTION_LINE =
  "Transcrito con Gate32 · https://gate32.autoritasai.com";

export function toTXT(
  segments: Segment[],
  attribution: boolean,
  attributionLine: string = ATTRIBUTION_LINE,
): string {
  const body = segments.map((s) => s.text).join("\n\n");
  return attribution ? `${body}\n\n—\n${attributionLine}\n` : `${body}\n`;
}

export function toMD(
  segments: Segment[],
  title: string,
  attribution: boolean,
  attributionLine: string = ATTRIBUTION_LINE,
): string {
  const lines = [`# ${title}`, ""];
  for (const s of segments) {
    lines.push(`**[${clock(s.start)}]** ${s.text}`, "");
  }
  if (attribution) lines.push("---", `_${attributionLine}_`, "");
  return lines.join("\n");
}

export function toSRT(segments: Segment[]): string {
  return (
    segments
      .map(
        (s, i) =>
          `${i + 1}\n${timecode(s.start, ",")} --> ${timecode(s.end, ",")}\n${s.text}`,
      )
      .join("\n\n") + "\n"
  );
}

export function toVTT(segments: Segment[]): string {
  return (
    "WEBVTT\n\n" +
    segments
      .map(
        (s) => `${timecode(s.start, ".")} --> ${timecode(s.end, ".")}\n${s.text}`,
      )
      .join("\n\n") +
    "\n"
  );
}

export function toJSON(segments: Segment[]): string {
  return JSON.stringify(
    { source: "gate32", segments: segments.map((s) => ({ ...s, text: s.text })) },
    null,
    2,
  );
}

/** Nombre de archivo de export a partir del nombre original. */
export function exportName(original: string, ext: string): string {
  const base = original.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-") || "transcripcion";
  return `${base}.${ext}`;
}
