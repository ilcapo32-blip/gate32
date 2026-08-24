// Marcado de líneas dudosas.
//
// El origen es doble y coincide. Por un lado, dos personas sin producto que
// vender en r/aiToolForBusiness llegaron por separado a la misma conclusión:
// pasado cierto punto todas estas herramientas envuelven los mismos modelos,
// así que el diferenciador no es la precisión, es **cómo manejan la
// incertidumbre**. Un transcrito que marca lo dudoso con su marca de tiempo le
// gana a uno que se inventa una frase limpia que no detectas al revisar.
//
// Por otro, nos ha pasado a nosotros tres veces: "gazpacho" salió "campancho",
// "aceite" salió "acelete" ocho veces, y una nota de voz de 21 segundos salió
// con "te voy a estar despedonando la hora" — una palabra que no existe, dentro
// de una frase con su puntuación y su cadencia, sin nada que dijera dónde
// mirar. El pase de corrección solo sirve **si ya sabes qué está mal**. Esto es
// el paso anterior: decir dónde mirar.
//
// Lo que NO se puede usar: la confianza del modelo. El pipeline de
// transformers.js llama a `model.generate` y se queda solo con los
// identificadores de token; las puntuaciones se descartan ahí mismo. Sacarlas
// exigiría reimplementar el troceado y el cosido que delegamos en la librería a
// propósito, y que cuando lo hacíamos nosotros provocó el fallo de las
// costuras. Así que estas reglas miran solo la salida.
//
// Criterio al elegir umbrales: **una marca falsa sobre texto bueno cuesta más
// que una marca que falta.** Si se marca media transcripción, la marca deja de
// significar nada y el usuario la ignora entera. Todos los umbrales están
// puestos lejos de lo que hace una persona hablando normal.

import type { Segment } from "./types";

export type DoubtReason =
  /** El bloque repite el anterior, o una palabra se repite en bucle dentro de él. */
  | "repeat"
  /** Demasiadas palabras para el tiempo que dura: texto comprimido o inventado. */
  | "fast"
  /** Segundos de audio para casi ninguna palabra: se ha perdido contenido. */
  | "slow"
  /** Frase de subtítulo que Whisper escribe sobre el silencio. */
  | "boilerplate";

/**
 * Frases que Whisper produce cuando no hay voz.
 *
 * Se entrenó con subtítulos de vídeo, así que ante el silencio devuelve el
 * cierre típico de un subtítulo. La de Amara no la dice nadie en voz alta; las
 * de despedida sí puede decirlas alguien de verdad, y en ese caso la marca
 * sobra pero no engaña: lo que se pide es comprobar, no se afirma que esté mal.
 */
const BOILERPLATE = [
  "amara org",
  "subtitulos realizados por",
  "subtitulos por la comunidad",
  "subtitulado por la comunidad",
  "gracias por ver el video",
  "gracias por ver este video",
  "suscribete al canal",
  "no olvides suscribirte",
  "subtitles by the amara org community",
  "thanks for watching",
  "thank you for watching",
  "subscribe to my channel",
  "please subscribe",
];

/** Minúsculas, sin acentos y sin puntuación: para comparar, no para mostrar. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(" ") : [];
}

/** Una palabra repetida seguida cuatro veces o más: el bucle clásico del modelo. */
function loops(list: string[]): boolean {
  let run = 1;
  for (let i = 1; i < list.length; i++) {
    if (list[i] === list[i - 1]) {
      run += 1;
      if (run >= 4) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

// Umbrales apretados el 2026-08-24 porque saltó la alarma escrita en
// VALIDATION.md antes de tener datos: `doubt_shown_muchas / doubt_shown` debía
// quedar por debajo del 40 % y salió al **100 %**. Es decir, a todo el que se
// le marcaba algo se le marcaban cinco líneas o más. Una marca que sale siempre
// no dice nada, que era exactamente el fallo que la alarma vigilaba.
//
// Se aprietan solo las reglas de ritmo, que son las frágiles: dependen de que
// las marcas de tiempo de Whisper reflejen el habla real, y no siempre lo
// hacen. Las otras dos —eco y frase de subtítulo— son concluyentes y se quedan
// como estaban.

/** Palabras por segundo por encima de esto no lo sostiene nadie hablando. */
const FAST_WPS = 7.5;
/** Por debajo de esto, y durando lo suyo, falta texto. */
const SLOW_WPS = 0.3;
/** Con cinco palabras, un límite mal puesto por el modelo ya disparaba la regla. */
const MIN_WORDS_FAST = 8;
/** Ocho segundos con tres palabras es una pausa normal, no un fallo. */
const MIN_SECONDS_SLOW = 12;

/**
 * Proporción de bloques marcados a partir de la cual se desconfía del propio
 * marcado.
 *
 * Si se señala más de una cuarta parte de la transcripción, lo más probable no
 * es que el audio sea un desastre: es que las reglas de ritmo están fallando en
 * bloque, porque las marcas de tiempo de ese archivo no cuadran. En ese caso se
 * conservan solo las dos reglas concluyentes y se tiran las de ritmo.
 */
const MAX_MARKED_RATIO = 0.25;

/**
 * Bloques mínimos para que la proporción signifique algo.
 *
 * En una nota de voz de dos bloques, marcar uno ya es el 50 % y el techo la
 * silenciaría entera. La proporción solo tiene sentido cuando hay transcripción
 * suficiente para que "una cuarta parte" quiera decir algo.
 */
const MIN_SEGMENTS_FOR_RATIO = 8;

/**
 * Devuelve, por índice de bloque, el motivo por el que conviene comprobarlo.
 *
 * Los índices que no aparecen no tienen nada raro. Un bloque solo recibe un
 * motivo: el primero que encaja, en orden de lo más concluyente a lo menos.
 */
export function findDoubts(segments: Segment[]): Map<number, DoubtReason> {
  const out = new Map<number, DoubtReason>();
  /** Reglas concluyentes: no dependen de que los tiempos sean fiables. */
  const firmes = new Map<number, DoubtReason>();

  segments.forEach((seg, i) => {
    const w = words(seg.text);
    if (w.length === 0) return;
    const norm = normalize(seg.text);

    if (BOILERPLATE.some((b) => norm.includes(b))) {
      out.set(i, "boilerplate");
      firmes.set(i, "boilerplate");
      return;
    }

    const prev = segments[i - 1];
    if (w.length >= 2 && prev && normalize(prev.text) === norm) {
      out.set(i, "repeat");
      firmes.set(i, "repeat");
      return;
    }
    if (loops(w)) {
      out.set(i, "repeat");
      firmes.set(i, "repeat");
      return;
    }

    // Marcas de tiempo degeneradas: el modelo las emite de vez en cuando y una
    // división entre cero marcaría el bloque por un motivo que no es.
    const seconds = seg.end - seg.start;
    if (!(seconds > 0)) return;

    const wps = w.length / seconds;
    if (wps > FAST_WPS && w.length >= MIN_WORDS_FAST) {
      out.set(i, "fast");
      return;
    }
    if (wps < SLOW_WPS && seconds >= MIN_SECONDS_SLOW) {
      out.set(i, "slow");
    }
  });

  // Marcar media transcripción no informa de nada: si se pasa del techo, se
  // devuelven solo las reglas que no dependen de los tiempos.
  if (segments.length >= MIN_SEGMENTS_FOR_RATIO && out.size / segments.length > MAX_MARKED_RATIO) {
    return firmes;
  }
  return out;
}
