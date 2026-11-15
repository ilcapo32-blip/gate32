// Bucles del modelo: una frase que se repite sin fin.
//
// El 15/11, en la primera transcripción que salió entera en la app de Android
// (modelo Rápido, 2:30 de audio), una línea traía «la violencia de» repetido
// más de cincuenta veces seguidas. Es el fallo más reconocible de Whisper con
// los modelos pequeños: se engancha en una frase y la repite hasta que se acaba
// el trozo de 30 s. Lo que se dijo de verdad en ese tramo se pierde, y la pared
// de texto repetido hace que el resultado entero parezca roto.
//
// Lo perdido no se puede recuperar desde aquí: eso pide un modelo mayor. Lo que
// sí se puede es no enseñar la pared. Se deja la frase una vez, se marca con
// «[…]» que ahí falta algo, y el marcado de dudas señala la línea para que se
// escuche (ver `doubt.ts`).
//
// Umbrales lejos de lo que hace una persona hablando: una frase de tres
// palabras o más dicha cuatro veces seguidas, una de dos palabras seis veces,
// una palabra sola doce. «No, no, no, no» se queda como está.

/** Lo que queda en el lugar del bucle: aquí falta texto. */
export const LOOP_MARK = "[…]";

/** La frase más larga que se busca repetida, en palabras. */
const MAX_CYCLE = 8;

/** Repeticiones seguidas a partir de las cuales una frase de `n` palabras es un bucle. */
const minReps = (n: number): number => Math.max(4, Math.ceil(12 / n));

/** Para comparar palabras: sin mayúsculas, acentos ni puntuación. */
const key = (word: string): string =>
  word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

function repeatsAt(keys: string[], at: number, cycle: string[]): boolean {
  for (let k = 0; k < cycle.length; k++) {
    if (keys[at + k] !== cycle[k]) return false;
  }
  return true;
}

/**
 * Sustituye cada bucle por una sola vuelta de la frase seguida de `[…]`.
 *
 * Devuelve el mismo texto, sin tocar, si no hay ningún bucle.
 */
export function collapseLoops(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 12) return text;
  const keys = tokens.map(key);
  const out: string[] = [];
  let changed = false;
  let i = 0;

  while (i < tokens.length) {
    let end = -1;
    let n = 1;
    for (; n <= MAX_CYCLE; n++) {
      if (i + n * minReps(n) > tokens.length) break;
      const cycle = keys.slice(i, i + n);
      // Una «palabra» que solo es puntuación no forma frase.
      if (cycle.some((k) => !k)) continue;
      let reps = 1;
      while (i + (reps + 1) * n <= tokens.length && repeatsAt(keys, i + reps * n, cycle)) reps++;
      if (reps < minReps(n)) continue;

      // El bucle suele acabar con media vuelta más, cortada donde se acabó el
      // trozo de audio: «…la violencia de la viol forma». Esa media vuelta
      // también es bucle.
      end = i + reps * n;
      let j = 0;
      while (end < tokens.length && j < n && keys[end] === cycle[j]) {
        end++;
        j++;
      }
      const cut = keys[end];
      const next = cycle[j];
      if (cut && next && j < n && cut.length >= 2 && cut !== next && next.startsWith(cut)) end++;
      break;
    }

    if (end < 0) {
      out.push(tokens[i] as string);
      i++;
      continue;
    }
    out.push(...tokens.slice(i, i + n), LOOP_MARK);
    changed = true;
    i = end;
  }

  return changed ? out.join(" ") : text;
}
