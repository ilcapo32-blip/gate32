import { describe, expect, it } from "vitest";
import { barsSvg, speechBars } from "../speechbars";

const seg = (start: number, end: number, words: number) => ({
  start,
  end,
  text: Array.from({ length: words }, () => "palabra").join(" "),
});

describe("speechbars · la onda de cada reciente", () => {
  it("habla constante: todas las barras iguales y al máximo", () => {
    const bars = speechBars([seg(0, 10, 20), seg(10, 20, 20)], 20, 4);
    bars.forEach((b) => expect(b).toBeCloseTo(1, 5));
  });

  it("habla solo en la primera mitad: la segunda queda al mínimo", () => {
    const bars = speechBars([seg(0, 10, 30)], 20, 4);
    expect(bars[0]).toBeCloseTo(1, 5);
    expect(bars[1]).toBeCloseTo(1, 5);
    expect(bars[2]).toBeCloseTo(0.18, 5);
    expect(bars[3]).toBeCloseTo(0.18, 5);
  });

  it("un tramo que se habla más deprisa sale más alto", () => {
    const bars = speechBars([seg(0, 10, 10), seg(10, 20, 30)], 20, 2);
    expect(bars[1]).toBeCloseTo(1, 5);
    expect(bars[0]).toBeLessThan(bars[1] as number);
  });

  it("sin frases ni duración no rompe: barras al mínimo", () => {
    expect(speechBars([], undefined, 5)).toEqual([0.18, 0.18, 0.18, 0.18, 0.18]);
    expect(speechBars([], 30, 3)).toEqual([0.18, 0.18, 0.18]);
  });

  it("el SVG lleva una barra por tramo", () => {
    const svg = barsSvg(speechBars([seg(0, 5, 10)], 5, 11));
    expect(svg.match(/<rect /g)).toHaveLength(11);
  });
});
