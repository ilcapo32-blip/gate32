import { describe, expect, it } from "vitest";
import { looksEmpty, soundActivity, SOUND_FOR_SPEECH } from "../sanity";

// El 12/11 la app de Android transcribió 55 s de voz como «[Música]». Estas
// pruebas cubren lo que separa un audio sin voz de un cálculo que salió mal.

const seg = (text: string) => ({ start: 0, end: 1, text });

function tone(seconds: number, amp: number, rate = 16000): Float32Array {
  const out = new Float32Array(seconds * rate);
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * 220 * i) / rate);
  return out;
}

describe("sanity · ¿suena el audio?", () => {
  it("el silencio no tiene actividad", () => {
    expect(soundActivity(new Float32Array(16000 * 5))).toBe(0);
  });

  it("una voz a volumen normal sí", () => {
    expect(soundActivity(tone(5, 0.2))).toBeGreaterThan(SOUND_FOR_SPEECH);
  });

  it("el ruido de fondo de una grabación muda no cuenta como sonido", () => {
    expect(soundActivity(tone(5, 0.003))).toBe(0);
  });

  it("mide la proporción: medio audio con voz, medio en silencio", () => {
    const half = new Float32Array(16000 * 4);
    half.set(tone(2, 0.2), 0);
    expect(soundActivity(half)).toBeCloseTo(0.5, 1);
  });
});

describe("sanity · ¿el resultado está vacío?", () => {
  it("«[Música]» solo es un resultado vacío", () => {
    expect(looksEmpty([seg("[Música]")])).toBe(true);
    expect(looksEmpty([seg(" [MÚSICA]. ")])).toBe(true);
    expect(looksEmpty([seg("[Música]"), seg("(aplausos)"), seg("♪")])).toBe(true);
  });

  it("los cierres de subtítulo inventados también", () => {
    expect(looksEmpty([seg("Subtítulos realizados por la comunidad de Amara.org")])).toBe(true);
    expect(looksEmpty([seg("Thanks for watching!")])).toBe(true);
  });

  it("nada en absoluto, también", () => {
    expect(looksEmpty([])).toBe(true);
    expect(looksEmpty([seg("   ")])).toBe(true);
  });

  it("una sola frase real ya no es vacío", () => {
    expect(looksEmpty([seg("[Música]"), seg("Hola, ¿qué tal?")])).toBe(false);
  });

  it("una frase entre corchetes que no es etiqueta tampoco se descarta", () => {
    expect(looksEmpty([seg("Y entonces dijo [inaudible] que vendría")])).toBe(false);
  });
});
