import { describe, expect, it } from "vitest";
import { LANGUAGES, needsBiggerModel } from "../languages";

describe("idiomas · lista", () => {
  it("cubre bastante más que el puñado que había en el HTML", () => {
    expect(LANGUAGES.length).toBeGreaterThan(40);
  });

  it("incluye el idioma del hilo que destapó el problema", () => {
    // r/notebooklm: clases de horas en vietnamita, y no se podía ni elegir.
    expect(LANGUAGES.map((l) => l.code)).toContain("vi");
  });

  it("no repite códigos y todos tienen nombre en los dos idiomas", () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(LANGUAGES.every((l) => l.es.length > 0 && l.en.length > 0)).toBe(true);
  });
});

describe("idiomas · aviso de modelo pequeño", () => {
  it("avisa en un idioma fuera del núcleo de Whisper con modelo pequeño", () => {
    expect(needsBiggerModel("vi", "fast")).toBe(true);
    expect(needsBiggerModel("th", "balanced")).toBe(true);
    expect(needsBiggerModel("ur", "fast")).toBe(true);
  });

  it("no avisa donde el modelo pequeño ya cumple", () => {
    for (const code of ["es", "en", "de", "fr", "it", "pt", "ja"]) {
      expect(needsBiggerModel(code, "fast")).toBe(false);
    }
  });

  it("no avisa si ya se ha elegido un modelo grande", () => {
    expect(needsBiggerModel("vi", "accurate")).toBe(false);
    expect(needsBiggerModel("vi", "max")).toBe(false);
  });

  // Con detección automática no se sabe qué idioma vendrá, y avisar siempre
  // convertiría el mensaje en ruido que se deja de leer.
  it("con detección automática no dice nada", () => {
    expect(needsBiggerModel("auto", "fast")).toBe(false);
  });
});
