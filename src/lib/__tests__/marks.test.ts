import { describe, it, expect } from "vitest";
import { markedIndexes, addMark, LOOKBACK_S } from "../marks";
import type { Segment } from "../types";

const seg = (start: number, end: number, text = "x"): Segment => ({ start, end, text });

describe("markedIndexes", () => {
  // Lo esencial: se pulsa DESPUÉS de oír la frase, así que la marca mira atrás.
  it("señala lo que se acababa de decir, no lo que viene después", () => {
    const segments = [
      seg(0, 10, "relleno"),
      seg(10, 25, "la cita buena"),
      seg(25, 40, "lo que vino luego"),
    ];
    // Pulsa en el segundo 26, justo al terminar la cita.
    const marcados = markedIndexes(segments, [26]);
    expect(marcados.has(1)).toBe(true);
    expect(marcados.has(2)).toBe(false);
  });

  it("coge el bloque que cruza el límite del tramo", () => {
    // El bloque empieza antes de la ventana y termina dentro: la frase buena
    // suele cruzar el borde, y perderla por un segundo es el fallo a evitar.
    const segments = [seg(0, 45, "una frase larga que empezó mucho antes")];
    expect(markedIndexes(segments, [50], 20).has(0)).toBe(true);
  });

  it("no señala el bloque siguiente por rozar el borde", () => {
    // Caso real que falló en el E2E: el bloque empieza dos segundos antes de
    // pulsar y sigue veinte más. Es lo que vino DESPUÉS, no lo que se marcó.
    const segments = [seg(20, 40, "la cita"), seg(40, 60, "lo que vino luego")];
    const marcados = markedIndexes(segments, [42], 20);
    expect(marcados.has(0)).toBe(true);
    expect(marcados.has(1)).toBe(false);
  });

  it("no señala nada fuera de la ventana", () => {
    const segments = [seg(0, 5), seg(100, 105)];
    expect(markedIndexes(segments, [110], 20).has(0)).toBe(false);
  });

  it("no se sale por abajo si se marca en los primeros segundos", () => {
    const segments = [seg(0, 4)];
    expect(markedIndexes(segments, [3], 20).has(0)).toBe(true);
  });

  it("varias marcas acumulan bloques sin repetirlos", () => {
    const segments = [seg(0, 10), seg(10, 20), seg(20, 30)];
    const marcados = markedIndexes(segments, [10, 12, 25], 20);
    expect([...marcados].sort()).toEqual([0, 1, 2]);
  });

  it("sin marcas no señala nada", () => {
    expect(markedIndexes([seg(0, 10)], []).size).toBe(0);
  });

  it("ignora marcas inválidas en vez de romper", () => {
    expect(markedIndexes([seg(0, 10)], [Number.NaN, Infinity]).size).toBe(0);
  });

  it("la ventana por defecto son 20 segundos", () => {
    expect(LOOKBACK_S).toBe(20);
  });
});

describe("addMark", () => {
  it("añade una marca nueva", () => {
    expect(addMark([10], 40)).toEqual([10, 40]);
  });

  it("dos pulsaciones seguidas señalan el mismo tramo: se queda la última", () => {
    // El botón es grande y se usa sin mirar; el doble toque es habitual.
    expect(addMark([10], 11)).toEqual([11]);
  });

  it("la primera marca entra siempre", () => {
    expect(addMark([], 2)).toEqual([2]);
  });
});
