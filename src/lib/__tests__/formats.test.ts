import { describe, expect, it } from "vitest";
import {
  chunksToSegments,
  clock,
  exportName,
  mergeWindows,
  timecode,
  toMD,
  toCues,
  toSRT,
  toTXT,
  toVTT,
  wrapLines,
  ATTRIBUTION_LINE,
} from "../formats";
import type { RawChunk, Segment } from "../types";

const seg = (start: number, end: number, text: string): Segment => ({ start, end, text });

describe("timecode", () => {
  it("formatea SRT con coma y VTT con punto", () => {
    expect(timecode(0)).toBe("00:00:00,000");
    expect(timecode(61.5, ",")).toBe("00:01:01,500");
    expect(timecode(3661.042, ".")).toBe("01:01:01.042");
  });
  it("no produce tiempos negativos", () => {
    expect(timecode(-5)).toBe("00:00:00,000");
  });
});

describe("clock", () => {
  it("muestra MM:SS y H:MM:SS", () => {
    expect(clock(75)).toBe("01:15");
    expect(clock(3675)).toBe("1:01:15");
  });
});

describe("chunksToSegments", () => {
  it("aplica el desplazamiento de la ventana", () => {
    const chunks: RawChunk[] = [{ timestamp: [1, 3], text: " hola " }];
    const out = chunksToSegments(chunks, 25, 30);
    expect(out).toEqual([{ start: 26, end: 28, text: "hola" }]);
  });
  it("repara el timestamp final nulo con la duración de la ventana", () => {
    const chunks: RawChunk[] = [{ timestamp: [28, null], text: "final" }];
    const out = chunksToSegments(chunks, 0, 30);
    expect(out[0]?.end).toBe(30);
  });
  it("descarta chunks vacíos y repara tiempos invertidos", () => {
    const chunks: RawChunk[] = [
      { timestamp: [5, 2], text: "invertido" },
      { timestamp: [0, 1], text: "   " },
    ];
    const out = chunksToSegments(chunks, 0, 30);
    expect(out).toHaveLength(1);
    expect(out[0]?.end).toBeGreaterThan(out[0]?.start ?? 0);
  });
});

describe("mergeWindows", () => {
  it("elimina duplicados del solapamiento por punto medio", () => {
    // ventana 0 cubre 0-30, ventana 1 cubre 25-55; solape 25-30, corte en 27.5
    const w0 = {
      offset: 0,
      segments: [seg(0, 5, "a"), seg(24, 27, "repetida"), seg(28, 30, "cola")],
    };
    const w1 = {
      offset: 25,
      segments: [seg(24.5, 27, "repetida"), seg(28, 31, "cola"), seg(31, 36, "b")],
    };
    const merged = mergeWindows([w0, w1]);
    const texts = merged.map((s) => s.text);
    expect(texts).toEqual(["a", "repetida", "cola", "b"]);
  });
  it("mantiene todo con una sola ventana", () => {
    const merged = mergeWindows([{ offset: 0, segments: [seg(0, 2, "x"), seg(2, 4, "y")] }]);
    expect(merged).toHaveLength(2);
  });
  it("repara solapes menores tras la fusión", () => {
    // "a" pertenece a la ventana 0 (punto medio < 27.5) y "b" a la 1 (≥ 27.5),
    // pero sus tiempos se solapan ligeramente: la fusión debe repararlo.
    const merged = mergeWindows([
      { offset: 0, segments: [seg(26, 28.5, "a")] },
      { offset: 25, segments: [seg(27, 30, "b")] },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[1]?.start).toBeGreaterThanOrEqual(merged[0]?.end ?? 0);
  });
});

describe("exports", () => {
  const segs = [seg(0, 2.5, "Hola mundo."), seg(2.5, 5, "Segunda frase.")];

  it("TXT con y sin atribución", () => {
    expect(toTXT(segs, false)).toBe("Hola mundo.\n\nSegunda frase.\n");
    expect(toTXT(segs, true)).toContain(ATTRIBUTION_LINE);
  });

  it("SRT numera y formatea", () => {
    const srt = toSRT(segs);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:02,500\nHola mundo.");
    expect(srt).toContain("2\n00:00:02,500 --> 00:00:05,000\nSegunda frase.");
  });

  it("VTT lleva cabecera y puntos decimales", () => {
    const vtt = toVTT(segs);
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:02.500");
  });

  it("MD incluye título y marcas de tiempo", () => {
    const md = toMD(segs, "entrevista.mp3", false);
    expect(md).toContain("# entrevista.mp3");
    expect(md).toContain("**[00:00]** Hola mundo.");
  });
});

describe("formato de subtítulos", () => {
  it("no parte palabras al ajustar la línea", () => {
    const lines = wrapLines("Esto es una frase razonablemente larga de prueba", 20);
    expect(lines.every((l) => l.length <= 20)).toBe(true);
    expect(lines.join(" ")).toBe("Esto es una frase razonablemente larga de prueba");
  });

  it("deja sola una palabra más larga que el límite en vez de cortarla", () => {
    expect(wrapLines("hola electroencefalografista adiós", 10)).toEqual([
      "hola",
      "electroencefalografista",
      "adiós",
    ]);
  });

  it("agrupa en rótulos de dos líneas y reparte el tiempo", () => {
    const long = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce";
    const cues = toCues([{ start: 0, end: 12, text: long }], { maxChars: 20, maxLines: 2 });
    expect(cues.length).toBeGreaterThan(1);
    // el último rótulo termina donde terminaba el segmento original
    expect(cues[cues.length - 1]?.end).toBe(12);
    // los rótulos son contiguos y crecientes
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]?.start).toBe(cues[i - 1]?.end);
      expect(cues[i]?.end).toBeGreaterThan(cues[i]?.start ?? 0);
    }
    // ninguna línea excede el límite y ninguna cue pasa de dos líneas
    for (const c of cues) {
      const ls = c.text.split("\n");
      expect(ls.length).toBeLessThanOrEqual(2);
      expect(ls.every((l) => l.length <= 20)).toBe(true);
    }
    // el texto completo se conserva
    expect(cues.map((c) => c.text.replace(/\n/g, " ")).join(" ")).toBe(long);
  });

  it("alarga un rótulo demasiado corto sobre el silencio siguiente", () => {
    const cues = toCues(
      [
        { start: 0, end: 0.4, text: "Sí." },
        { start: 5, end: 7, text: "Y entonces se fue." },
      ],
      { maxChars: 40, minDuration: 1 },
    );
    expect(cues[0]?.end).toBe(1); // 0,4 s → 1 s, sobre el silencio
    expect(cues[1]?.start).toBe(5); // el siguiente no se toca
  });

  it("no invade el rótulo siguiente cuando el habla es continua", () => {
    const cues = toCues(
      [
        { start: 0, end: 0.4, text: "Sí." },
        { start: 0.4, end: 3, text: "Y entonces se fue." },
      ],
      { maxChars: 40, minDuration: 1 },
    );
    expect(cues[0]?.end).toBe(0.4);
    expect(cues[1]?.start).toBe(0.4);
  });

  it("sin límite devuelve los segmentos intactos", () => {
    const input = [{ start: 0, end: 3, text: "Una frase larguísima sin cortar" }];
    expect(toCues(input, { maxChars: 0 })).toEqual(input);
  });

  it("SRT respeta la longitud de línea pedida", () => {
    const srt = toSRT([{ start: 0, end: 4, text: "uno dos tres cuatro cinco seis" }], {
      maxChars: 12,
      maxLines: 2,
    });
    const textLines = srt
      .split("\n")
      .filter((l) => l && !/^\d+$/.test(l) && !l.includes("-->"));
    expect(textLines.every((l) => l.length <= 12)).toBe(true);
  });

  it("VTT mantiene la cabecera al reformatear", () => {
    const vtt = toVTT([{ start: 0, end: 4, text: "uno dos tres cuatro cinco seis" }], {
      maxChars: 12,
    });
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
  });
});

describe("exportName", () => {
  it("sustituye la extensión y sanea el nombre", () => {
    expect(exportName("Mi Entrevista (final).mp3", "srt")).toBe("Mi-Entrevista-final-.srt");
    expect(exportName("äudio ñoño.wav", "txt")).toBe("äudio-ñoño.txt");
  });
  it("usa un nombre por defecto si queda vacío", () => {
    expect(exportName(".mp3", "txt")).toBe("transcripcion.txt");
  });
});
