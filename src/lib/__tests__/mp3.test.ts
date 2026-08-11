import { describe, expect, it } from "vitest";
import { readFrame, skipID3, chunkRanges } from "../mp3";

/** Construye una cabecera de trama MPEG-1 capa III a 128 kbps y 44,1 kHz. */
function frameHeader(bitrateIndex = 9, rateIndex = 0, padding = 0): number[] {
  return [
    0xff,
    0xfb, // MPEG-1, capa III, sin CRC
    (bitrateIndex << 4) | (rateIndex << 2) | (padding << 1),
    0xc0,
  ];
}

/** Genera un MP3 sintético de `frames` tramas idénticas. */
function fakeMp3(frames: number, id3 = 0): Uint8Array {
  const header = frameHeader();
  const length = 417; // 128 kbps a 44,1 kHz sin padding
  const out: number[] = [];
  for (let i = 0; i < id3; i++) out.push(0);
  for (let f = 0; f < frames; f++) {
    out.push(...header);
    for (let i = 4; i < length; i++) out.push(0);
  }
  return new Uint8Array(out);
}

describe("mp3 · lectura de tramas", () => {
  it("calcula la longitud de una trama de 128 kbps a 44,1 kHz", () => {
    const frame = readFrame(fakeMp3(1), 0);
    expect(frame).not.toBeNull();
    expect(frame?.length).toBe(417);
    expect(frame?.samples).toBe(1152);
    expect(frame?.sampleRate).toBe(44100);
  });

  it("suma un byte con el bit de relleno", () => {
    const bytes = new Uint8Array([...frameHeader(9, 0, 1), ...new Array(500).fill(0)]);
    expect(readFrame(bytes, 0)?.length).toBe(418);
  });

  it("rechaza lo que no es una cabecera válida", () => {
    expect(readFrame(new Uint8Array([0, 0, 0, 0]), 0)).toBeNull();
    // bitrate libre (0) y reservado (15) no son utilizables
    expect(readFrame(new Uint8Array([...frameHeader(0), 0, 0]), 0)).toBeNull();
    expect(readFrame(new Uint8Array([...frameHeader(15), 0, 0]), 0)).toBeNull();
    // capa I en vez de capa III
    expect(readFrame(new Uint8Array([0xff, 0xff, 0x90, 0xc0]), 0)).toBeNull();
  });

  it("no se sale del búfer al final del archivo", () => {
    expect(readFrame(new Uint8Array([0xff, 0xfb]), 0)).toBeNull();
  });
});

describe("mp3 · etiqueta ID3", () => {
  it("salta la cabecera ID3v2 con tamaño synchsafe", () => {
    const bytes = new Uint8Array(40);
    bytes.set([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 20], 0); // "ID3", tamaño 20
    expect(skipID3(bytes)).toBe(30);
  });

  it("devuelve cero cuando no hay etiqueta", () => {
    expect(skipID3(fakeMp3(1))).toBe(0);
  });
});

describe("mp3 · troceado", () => {
  it("corta en límites de trama y reparte la duración", () => {
    // 1152 muestras a 44,1 kHz = 26,1 ms por trama; 100 tramas ≈ 2,6 s
    const ranges = chunkRanges(fakeMp3(100), 1);
    expect(ranges).not.toBeNull();
    expect(ranges!.length).toBeGreaterThan(1);
    // los trozos son contiguos y cubren el archivo entero
    expect(ranges![0]?.start).toBe(0);
    for (let i = 1; i < ranges!.length; i++) {
      expect(ranges![i]?.start).toBe(ranges![i - 1]?.end);
    }
    expect(ranges![ranges!.length - 1]?.end).toBe(100 * 417);
    // cada corte cae en un múltiplo del tamaño de trama
    for (const r of ranges!) expect(r.start % 417).toBe(0);
  });

  it("un archivo corto sale en un solo trozo", () => {
    const ranges = chunkRanges(fakeMp3(10), 600);
    expect(ranges).toHaveLength(1);
  });

  it("devuelve null si no es un MP3, para volver al camino de siempre", () => {
    expect(chunkRanges(new Uint8Array(20000))).toBeNull();
  });

  it("la suma de duraciones coincide con la del archivo", () => {
    const ranges = chunkRanges(fakeMp3(200), 1)!;
    const total = ranges.reduce((a, r) => a + r.seconds, 0);
    expect(total).toBeCloseTo((200 * 1152) / 44100, 5);
  });
});
