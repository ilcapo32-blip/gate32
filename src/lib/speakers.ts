// Separación de hablantes por pistas.
//
// Por qué así y no con un modelo. Nuestro público principal lo dijo con todas
// las letras en r/podcasting: *«Whisper, por sí sola, te deja una pared de texto
// sin diferenciar. Una transcripción de entrevista sin marcadores de
// anfitrión/invitado se vuelve casi ilegible. Todos se dan cuenta en el episodio
// dos.»* Otra persona contó que una entrevista a tres voces le salió «un
// desastre» y se cambió de herramienta por eso. Era la carencia más importante
// del producto y la afirmación prohibida número tres: «Gate32 no separa
// hablantes».
//
// La salida la regaló el mismo hilo. Quien graba una entrevista en remoto con
// pistas locales —el «doble-end» de los podcasts— ya tiene a cada persona en su
// propio archivo. Transcribiendo cada uno por separado, cada línea es de esa
// persona **por definición**: no hay nada que adivinar, así que no hay nada que
// fallar. Y la captura de reuniones de Gate32 ya tenía dos pistas —tu micrófono
// y el audio de la pestaña— que hasta ahora se mezclaban en una.
//
// Un modelo de diarización sobre un archivo mezclado adivina, se equivoca en
// los solapamientos y pide otra descarga de cientos de megas. Esto no adivina.
// El precio es que solo sirve cuando las voces vienen separadas, y así hay que
// decirlo: un único archivo con todos mezclados sigue saliendo sin etiquetas.

import type { Segment } from "./types";

/** Pone la misma etiqueta a todos los segmentos de una pista. */
export function labelTrack(segments: Segment[], speaker: string): Segment[] {
  return segments.map((s) => ({ ...s, speaker }));
}

/**
 * Entrelaza varias pistas ya etiquetadas por su momento de inicio.
 *
 * Estable: si dos segmentos empiezan a la vez, queda primero el de la pista que
 * se pasó antes. Sin eso el orden dependería del motor de JavaScript y la misma
 * entrevista podría exportarse distinta dos veces seguidas.
 */
export function interleave(tracks: Segment[][]): Segment[] {
  const tagged = tracks.flatMap((track, t) => track.map((s, i) => ({ s, t, i })));
  tagged.sort((a, b) => a.s.start - b.s.start || a.t - b.t || a.i - b.i);
  return tagged.map((x) => x.s);
}

/** Palabras de un texto sin mayúsculas, tildes ni puntuación. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Cuántas de las palabras de `a` aparecen en `b`, de 0 a 1.
 *
 * Contención y no similitud simétrica, a propósito: el eco que recoge el
 * micrófono es una copia **degradada** de lo que suena por los altavoces, así
 * que suele tener menos palabras que el original. Lo que importa es si lo que
 * dice el micrófono ya está dicho en la pestaña, no al revés.
 */
export function containment(a: string, b: string): number {
  const wa = words(a);
  if (wa.length === 0) return 0;
  const pool = new Map<string, number>();
  for (const w of words(b)) pool.set(w, (pool.get(w) ?? 0) + 1);
  let hits = 0;
  for (const w of wa) {
    const left = pool.get(w) ?? 0;
    if (left > 0) {
      hits++;
      pool.set(w, left - 1);
    }
  }
  return hits / wa.length;
}

export interface EchoOptions {
  /** Margen en segundos: las dos pistas se transcriben por separado y sus marcas no coinciden al milímetro. */
  slack?: number;
  /** A partir de qué proporción de palabras repetidas se considera eco. */
  threshold?: number;
  /** Por debajo de estas palabras no se juzga: un «sí» o un «vale» puede ser tuyo de verdad. */
  minWords?: number;
}

/**
 * Quita del micrófono lo que es eco de la pestaña.
 *
 * Sin auriculares, el micrófono recoge también lo que suena por los altavoces:
 * la voz de los demás aparecería dos veces, una como «Los demás» y otra como
 * «Tú». La cancelación de eco del navegador ayuda, pero no es fiable en todos
 * los equipos.
 *
 * Un segmento del micrófono se descarta si se solapa en el tiempo con lo que
 * dijo la pestaña y la mayor parte de sus palabras ya están ahí. Se compara
 * contra **todo** lo que la pestaña dijo en ese intervalo, no contra un segmento
 * suelto, porque Whisper corta las dos pistas por sitios distintos.
 *
 * Ante la duda, se conserva. Duplicar una frase es un fallo visible y fácil de
 * corregir; borrar algo que dijiste de verdad es un fallo invisible, y lo que
 * alguien ha dicho en una reunión no se pierde (regla 8).
 */
export function dropEcho(mic: Segment[], tab: Segment[], opts: EchoOptions = {}): Segment[] {
  const slack = opts.slack ?? 1.5;
  const threshold = opts.threshold ?? 0.6;
  const minWords = opts.minWords ?? 3;

  return mic.filter((m) => {
    if (words(m.text).length < minWords) return true;
    const heard = tab
      .filter((t) => t.start <= m.end + slack && t.end >= m.start - slack)
      .map((t) => t.text)
      .join(" ");
    if (!heard) return true;
    return containment(m.text, heard) < threshold;
  });
}

/**
 * Junta los segmentos seguidos de una misma persona en un solo turno.
 *
 * Whisper corta cada pocos segundos aunque la persona siga hablando. Para leer
 * una entrevista eso es ruido: cinco líneas seguidas con «Tú:» delante parecen
 * una lista, no una conversación. En texto se lee por turnos; los subtítulos,
 * en cambio, se quedan con sus cortes, que es lo que deben durar en pantalla.
 *
 * `gap` es el silencio máximo, en segundos, para seguir considerándolo el mismo
 * turno: una pausa larga de la misma persona es un turno nuevo.
 */
export function mergeTurns(segments: Segment[], gap = 2): Segment[] {
  const out: Segment[] = [];
  for (const s of segments) {
    const text = s.text.trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.speaker === s.speaker && s.start - last.end <= gap) {
      last.text = `${last.text} ${text}`;
      last.end = Math.max(last.end, s.end);
    } else {
      out.push({ ...s, text });
    }
  }
  return out;
}

/** Si alguna línea lleva etiqueta: decide si los formatos la muestran. */
export function hasSpeakers(segments: Segment[]): boolean {
  return segments.some((s) => Boolean(s.speaker));
}

/**
 * Las dos pistas de una reunión, ya transcritas, convertidas en conversación.
 *
 * El micrófono es tuyo y la pestaña es todos los demás: Gate32 no puede
 * distinguir entre las personas que hablan al otro lado, porque llegan mezcladas
 * por la propia videollamada. Por eso la etiqueta es «Los demás» y no un nombre:
 * prometer más de lo que se sabe es exactamente lo que no hacemos.
 */
export function meetingConversation(
  mic: Segment[],
  tab: Segment[],
  names: { me: string; others: string },
  opts?: EchoOptions,
): Segment[] {
  const clean = dropEcho(mic, tab, opts);
  return interleave([labelTrack(clean, names.me), labelTrack(tab, names.others)]);
}

export type TrackKind = "meeting" | "interview";

/**
 * Convierte las pistas ya transcritas en una sola conversación.
 *
 * En una reunión la primera pista es tu micrófono y la segunda la pestaña, y
 * hay que quitar el eco. En una entrevista a doble pista cada archivo es una
 * persona y no hay eco que quitar: cada uno se grabó en su propio micrófono.
 */
export function combineTracks(
  kind: TrackKind,
  results: { label: string; segments: Segment[] }[],
): Segment[] {
  const [first, second] = results;
  if (kind === "meeting" && first && second && results.length === 2) {
    return meetingConversation(first.segments, second.segments, {
      me: first.label,
      others: second.label,
    });
  }
  return interleave(results.map((r) => labelTrack(r.segments, r.label)));
}

/**
 * Un nombre de hablante sacado del nombre del archivo.
 *
 * En una grabación a doble pista cada archivo suele llevar el nombre de quien
 * habla («ana.wav», «Luis-local.m4a»), y es mejor punto de partida que
 * «Persona 1». Pero un nombre que parece un identificador de sistema —
 * «zoom_0_1729384551» o «audio» sin más— no es un nombre de persona, y ponerlo
 * delante de cada intervención es peor que no poner nada. Ahí va `fallback`.
 */
export function labelFromFileName(name: string, fallback: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base || base.length > 28) return fallback;
  if (!/\p{L}{2,}/u.test(base)) return fallback;
  if (/\d{4,}/.test(base)) return fallback;
  if (/^(audio|track|pista|grabaci[oó]n|recording|record|voice|voz)(\s*\d*)$/i.test(base)) return fallback;
  return base;
}

/** Cambia el nombre de un hablante en todas sus líneas. Devuelve copias. */
export function renameSpeaker(segments: Segment[], from: string, to: string): Segment[] {
  const name = to.trim();
  if (!name || name === from) return segments;
  return segments.map((s) => (s.speaker === from ? { ...s, speaker: name } : s));
}
