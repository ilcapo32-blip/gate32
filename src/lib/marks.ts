// Momentos marcados durante la grabación.
//
// Sale de un hilo de r/Journalism (52 comentarios) donde cinco personas
// describen, por separado, el mismo apaño hecho a mano: anotar la hora mientras
// entrevistan, cuando oyen algo que servirá de cita, para no tener que
// transcribir y releer la entrevista entera después. Special-Edna-K lo resume:
// «no necesitas transcribirlo todo si ya sabes dónde están las citas».
//
// Y uno de ellos, Specialist_Pepper734, pide que alguien recuerde el nombre de
// una aplicación de Android de hace diez años que hacía justo esto: un botón
// grande que al pulsarlo marcaba el momento **y retrocedía 30 segundos**.
// Nadie se lo supo decir.
//
// Ese retroceso es la parte lista y la que hay que copiar. Nadie pulsa a la vez
// que oye la frase buena: la reconoce **cuando ya ha terminado de decirla**. Un
// marcador puntual apuntaría al silencio posterior. Por eso una marca no es un
// instante sino el tramo que acaba de pasar.

import type { Segment } from "./types";

/**
 * Cuántos segundos hacia atrás cubre una marca.
 *
 * La aplicación que describían usaba 30 y dejaba configurarlo. Aquí se usan 20:
 * una cita aprovechable rara vez pasa de esa duración, y alargarlo señala
 * bloques de más, que es lo que convierte una marca en ruido.
 */
export const LOOKBACK_S = 20;

/**
 * Solape mínimo para que un bloque cuente como marcado.
 *
 * Con solape simple bastaba un segundo de contacto para señalar el bloque
 * siguiente entero — el que empieza justo antes de que la persona pulse y sigue
 * hablando de otra cosa. Exigir tres segundos deja fuera ese roce y
 * conserva la frase que cruza el límite, que es la que interesa. Se subió de
 * dos a tres porque con dos un bloque de veinte segundos entraba por rozar el
 * borde exacto, que es un 10 % de su duración.
 */
const MIN_OVERLAP_S = 3;

/**
 * Índices de los bloques que caen dentro de alguna marca.
 *
 * Un bloque cuenta si comparte un tramo real con la ventana, no si está
 * contenido en ella: la frase buena suele empezar mucho antes del momento en
 * que se pulsa, y perderla sería justo el fallo que esto viene a evitar. Los
 * bloques más cortos que el mínimo se juzgan por su propia duración, para que
 * una frase de un segundo pueda marcarse igual.
 */
export function markedIndexes(
  segments: Segment[],
  marks: number[],
  lookback = LOOKBACK_S,
): Set<number> {
  const out = new Set<number>();
  for (const mark of marks) {
    if (!Number.isFinite(mark)) continue;
    const from = Math.max(0, mark - lookback);
    segments.forEach((seg, i) => {
      const overlap = Math.min(seg.end, mark) - Math.max(seg.start, from);
      const dura = Math.max(0, seg.end - seg.start);
      if (overlap >= Math.min(MIN_OVERLAP_S, dura) && overlap > 0) out.add(i);
    });
  }
  return out;
}

/**
 * Descarta marcas repetidas casi en el mismo punto.
 *
 * Pulsar dos veces seguidas es fácil —el botón es grande y se usa sin mirar— y
 * dos marcas separadas por dos segundos señalan el mismo tramo. Se guarda la
 * última, que es la que cubre más de lo que la persona acababa de oír.
 */
export function addMark(marks: number[], seconds: number, minGap = 3): number[] {
  const last = marks[marks.length - 1];
  if (last !== undefined && seconds - last < minGap) {
    return [...marks.slice(0, -1), seconds];
  }
  return [...marks, seconds];
}
