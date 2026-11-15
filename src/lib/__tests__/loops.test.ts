import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collapseLoops, LOOP_MARK } from "../loops";
import { findDoubts } from "../doubt";

// La línea real: app de Android, modelo Rápido, 15/11. «la violencia de» está
// repetido decenas de veces y acaba cortado en «la viol».
const REAL = readFileSync(join(__dirname, "fixtures", "bucle-rapido.txt"), "utf8").trim();

describe("loops · bucles del modelo", () => {
  it("la línea real queda con la frase una vez y la marca del hueco", () => {
    expect(collapseLoops(REAL)).toBe(
      `Conjónado. Y "Aconjónado". Se refiere la violencia de ${LOOP_MARK} forma. El color violeta expresa,`,
    );
  });

  it("un texto sin bucles sale idéntico", () => {
    const t = "Me importa tres cojones, un número muy grande, más, sin difícil encontrarlo. Lo que me costó mil pares de cojones.";
    expect(collapseLoops(t)).toBe(t);
  });

  it("una palabra repetida como la diría una persona se queda", () => {
    const t = "No, no, no, no, eso no es lo que te dije ayer por la tarde en casa";
    expect(collapseLoops(t)).toBe(t);
  });

  it("una palabra sola repetida doce veces sí es un bucle", () => {
    const t = `Y entonces ${"gracias ".repeat(14)}fin`;
    expect(collapseLoops(t)).toBe(`Y entonces gracias ${LOOP_MARK} fin`);
  });

  it("dos palabras: cinco veces se quedan, seis no", () => {
    const five = `dijo ${"muy bien ".repeat(5)}y se fue a su casa`;
    expect(collapseLoops(five)).toBe(five);
    const six = `dijo ${"muy bien ".repeat(6)}y se fue a su casa`;
    expect(collapseLoops(six)).toBe(`dijo muy bien ${LOOP_MARK} y se fue a su casa`);
  });

  it("la misma frase repetida a lo largo del texto, pero no seguida, no es un bucle", () => {
    const t = "los cojones encima de la mesa, los cojones de corbata, los cojones morados y los cojones cuadrados";
    expect(collapseLoops(t)).toBe(t);
  });

  it("la marca del hueco hace que la línea se señale para comprobarla", () => {
    const seg = { start: 0, end: 30, text: collapseLoops(REAL) };
    expect(findDoubts([seg]).get(0)).toBe("repeat");
  });
});
