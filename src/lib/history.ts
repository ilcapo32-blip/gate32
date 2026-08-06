// Historial local de transcripciones (sin cuenta, sin servidor).
// Guarda las últimas transcripciones en localStorage para retomarlas.

import type { Segment } from "./types";

export interface HistoryEntry {
  id: string;
  title: string;
  date: number;
  minutes: number;
  segments: Segment[];
}

const KEY = "g32:history";
const MAX_ENTRIES = 12;
const MAX_BYTES = 2_500_000; // presupuesto aproximado de localStorage

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: HistoryEntry): void {
  try {
    let entries = [entry, ...loadHistory().filter((e) => e.id !== entry.id)];
    entries = entries.slice(0, MAX_ENTRIES);
    let raw = JSON.stringify(entries);
    while (raw.length > MAX_BYTES && entries.length > 1) {
      entries = entries.slice(0, -1);
      raw = JSON.stringify(entries);
    }
    localStorage.setItem(KEY, raw);
  } catch {
    /* storage lleno: el historial es prescindible */
  }
}

export function updateHistorySegments(id: string, segments: Segment[]): void {
  try {
    const entries = loadHistory();
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    entry.segments = segments;
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* ídem */
  }
}
