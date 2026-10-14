import { describe, it, expect } from "vitest";
import { readMp4Audio, mp4ChunkRanges, looksLikeMp4, readEsds } from "../mp4";

// De los 41 errores de descodificación medidos entre el 30/07 y el 13/10, 31
// eran contenedores de la familia MP4. El troceador de MP3 devuelve `null` ante
// uno, así que el archivo entero caía en `decodeAudioData` y reventaba por
// memoria. Esto comprueba el índice que permite trocearlo.
//
// El MP4 se construye aquí a mano: así la prueba es aritmética pura, corre sin
// navegador y no depende de un binario guardado en el repositorio.

function box(type: string, ...parts: (Uint8Array | number[])[]): Uint8Array {
  const payload = parts.flatMap((p) => Array.from(p));
  const size = 8 + payload.length;
  const head = [
    (size >>> 24) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 8) & 0xff,
    size & 0xff,
    ...[...type].map((c) => c.charCodeAt(0)),
  ];
  return new Uint8Array([...head, ...payload]);
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const u16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];
const str = (t: string) => [...t].map((c) => c.charCodeAt(0));

/** AudioSpecificConfig de AAC-LC a 44,1 kHz estéreo: perfil 2. */
const ASC = [0x12, 0x10];

function esds(): Uint8Array {
  const dsi = [0x05, ASC.length, ...ASC];
  const dcd = [0x04, 13 + dsi.length, 0x40, 0x15, ...[0, 0, 0], ...u32(0), ...u32(0), ...dsi];
  const es = [0x03, 3 + dcd.length, ...u16(1), 0x00, ...dcd];
  return box("esds", [0, 0, 0, 0], es);
}

function mp4a(): Uint8Array {
  return box(
    "mp4a",
    [0, 0, 0, 0, 0, 0], // reservado
    u16(1), // índice de referencia
    [0, 0, 0, 0, 0, 0, 0, 0], // versión, revisión, proveedor
    u16(2), // canales
    u16(16), // bits por muestra
    u16(0),
    u16(0),
    u16(44100), // ritmo en coma fija 16.16: la parte entera va arriba
    u16(0),
    esds(),
  );
}

/**
 * Cuatro muestras de 1024 (≈23,2 ms a 44,1 kHz) repartidas en dos chunks, con
 * tamaños distintos para que un error de aritmética se note.
 */
function sampleMp4(): Uint8Array {
  const stbl = box(
    "stbl",
    box("stsd", [0, 0, 0, 0], u32(1), mp4a()),
    box("stts", [0, 0, 0, 0], u32(1), u32(4), u32(1024)),
    box("stsz", [0, 0, 0, 0], u32(0), u32(4), u32(100), u32(200), u32(300), u32(400)),
    box("stsc", [0, 0, 0, 0], u32(1), u32(1), u32(2), u32(1)),
    box("stco", [0, 0, 0, 0], u32(2), u32(5000), u32(9000)),
  );
  const trak = box(
    "trak",
    box(
      "mdia",
      box("hdlr", [0, 0, 0, 0], u32(0), str("soun"), new Uint8Array(12)),
      box("mdhd", [0, 0, 0, 0], u32(0), u32(0), u32(44100), u32(4096)),
      box("minf", stbl),
    ),
  );
  return new Uint8Array([
    ...box("ftyp", str("isom"), u32(512)),
    ...box("moov", trak),
  ]);
}

describe("mp4 · reconocer el contenedor", () => {
  it("reconoce un MP4 por su ftyp", () => {
    expect(looksLikeMp4(sampleMp4())).toBe(true);
  });

  it("no confunde un MP3 con un MP4", () => {
    // Cabecera de trama MP3: once bits de sincronismo.
    expect(looksLikeMp4(new Uint8Array([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4]))).toBe(false);
  });

  it("no se cuelga con un archivo corrupto", () => {
    // Una caja de tamaño cero que no avanza colgaba el bucle, y con él la
    // pestaña entera: el usuario no veía un error, veía que no pasaba nada.
    const roto = new Uint8Array([0, 0, 0, 0, ...str("moov")]);
    expect(() => readMp4Audio(roto)).not.toThrow();
  });
});

describe("mp4 · la tabla de muestras", () => {
  const track = readMp4Audio(sampleMp4());

  it("encuentra la pista de audio", () => {
    expect(track).not.toBeNull();
    expect(track?.channels).toBe(2);
    expect(track?.sampleRate).toBe(44100);
  });

  it("saca el AudioSpecificConfig, sin el cual AudioDecoder no arranca", () => {
    expect(Array.from(track?.description ?? [])).toEqual(ASC);
    expect(track?.codec).toBe("mp4a.40.2");
  });

  it("calcula dónde está cada muestra a partir de stsc y stco", () => {
    // Dos chunks de dos muestras: 5000+100, y 9000+300.
    expect(track?.samples.map((s) => s.offset)).toEqual([5000, 5100, 9000, 9300]);
    expect(track?.samples.map((s) => s.size)).toEqual([100, 200, 300, 400]);
  });

  it("acumula el tiempo de cada muestra", () => {
    const cada = 1024 / 44100;
    expect(track?.duration).toBeCloseTo(cada * 4, 6);
    expect(track?.samples[2]?.start).toBeCloseTo(cada * 2, 6);
  });
});

describe("mp4 · troceado", () => {
  it("agrupa las muestras en tramos del tamaño pedido", () => {
    const track = readMp4Audio(sampleMp4());
    expect(track).not.toBeNull();
    // Cada muestra dura 23,2 ms: pidiendo tramos de 40 ms salen de dos en dos.
    const ranges = mp4ChunkRanges(track!, 0.04);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({ from: 0, to: 2 });
    expect(ranges[1]).toMatchObject({ from: 2, to: 4 });
  });

  it("no pierde ninguna muestra por el camino", () => {
    const track = readMp4Audio(sampleMp4());
    const ranges = mp4ChunkRanges(track!, 600);
    const total = ranges.reduce((n, r) => n + (r.to - r.from), 0);
    expect(total).toBe(track!.samples.length);
  });
});

describe("mp4 · descriptores del esds", () => {
  it("devuelve null si no hay configuración, en vez de inventarla", () => {
    const vacio = box("esds", [0, 0, 0, 0]);
    expect(readEsds(vacio, 8, vacio.length)).toBeNull();
  });
});

// ── Lo que falló con un MP4 real el 14/10 ──
//
// Un MP4 de una hora salió transcrito como «[Música]». Al reproducirlo con
// ffmpeg salieron tres huecos además del principal (el troceador de MP3 viendo
// tramas falsas): los MP4 fragmentados, que es lo que graba OBS, no tenían
// índice que leer; en un MOV el `esds` vive dentro de `wave` y no se
// encontraba; y sin `esds` se configuraba el decodificador a ciegas.

/** Entrada de audio genérica: versión 0 de MP4 o 1 de QuickTime. */
function soundEntry(type: string, version: 0 | 1, ...children: Uint8Array[]): Uint8Array {
  return box(
    type,
    [0, 0, 0, 0, 0, 0],
    u16(1),
    u16(version),
    [0, 0, 0, 0, 0, 0],
    u16(2),
    u16(16),
    u16(0),
    u16(0),
    u16(48000),
    u16(0),
    version === 1 ? new Array(16).fill(0) : [],
    ...children,
  );
}

function audioTrak(entry: Uint8Array, stblExtra: Uint8Array[] = [], id = 1): Uint8Array {
  const empty = [
    box("stts", [0, 0, 0, 0], u32(0)),
    box("stsc", [0, 0, 0, 0], u32(0)),
    box("stsz", [0, 0, 0, 0], u32(0), u32(0)),
    box("stco", [0, 0, 0, 0], u32(0)),
  ];
  return box(
    "trak",
    box("tkhd", [0, 0, 0, 0], u32(0), u32(0), u32(id), new Array(68).fill(0)),
    box(
      "mdia",
      box("hdlr", [0, 0, 0, 0], u32(0), str("soun"), new Uint8Array(12)),
      box("mdhd", [0, 0, 0, 0], u32(0), u32(0), u32(48000), u32(0)),
      box("minf", box("stbl", box("stsd", [0, 0, 0, 0], u32(1), entry), ...(stblExtra.length ? stblExtra : empty))),
    ),
  );
}

/** Un MP4 fragmentado como el de OBS: `moov` sin muestras y dos `moof`. */
function fragmentedMp4(): { bytes: Uint8Array; offsets: number[] } {
  const moov = box("moov", audioTrak(soundEntry("mp4a", 0, esds())), box("mvex", box("trex", [0, 0, 0, 0], u32(1), u32(1), u32(1024), u32(0), u32(0))));
  const head = new Uint8Array([...box("ftyp", str("iso6"), u32(0)), ...moov]);
  const out: number[] = [...head];
  const offsets: number[] = [];
  const sizes = [[100, 200], [300]];
  let time = 0;
  for (const group of sizes) {
    // trun con desplazamiento de datos y tamaño por muestra; base = el moof.
    const build = (dataOffset: number) =>
      box(
        "moof",
        box("mfhd", [0, 0, 0, 0], u32(1)),
        box(
          "traf",
          box("tfhd", [0, 0x02, 0, 0], u32(1)), // default-base-is-moof
          box("tfdt", [0, 0, 0, 0], u32(time)),
          box("trun", [0, 0, 0x02, 0x01], u32(group.length), u32(dataOffset), ...group.map((s) => u32(s))),
        ),
      );
    const moofLen = build(0).length;
    const moof = build(moofLen + 8);
    const moofAt = out.length;
    out.push(...moof);
    const payload = group.reduce((a, b) => a + b, 0);
    out.push(...box("mdat", new Array(payload).fill(0)));
    let at = moofAt + moofLen + 8;
    for (const s of group) {
      offsets.push(at);
      at += s;
    }
    time += 1024 * group.length;
  }
  return { bytes: new Uint8Array(out), offsets };
}

describe("mp4 · fragmentado (OBS)", () => {
  it("lee las muestras repartidas en los moof", () => {
    const { bytes, offsets } = fragmentedMp4();
    const track = readMp4Audio(bytes);
    expect(track).not.toBeNull();
    expect(track?.samples.map((s) => s.offset)).toEqual(offsets);
    expect(track?.samples.map((s) => s.size)).toEqual([100, 200, 300]);
  });

  it("cada fragmento empieza cuando dice su tfdt", () => {
    const track = readMp4Audio(fragmentedMp4().bytes);
    expect(track?.samples[2]?.start).toBeCloseTo((1024 * 2) / 48000, 6);
    expect(track?.duration).toBeCloseTo((1024 * 3) / 48000, 6);
  });

  it("un MP4 híbrido no cuenta dos veces lo que ya está en el índice", () => {
    // Mismo archivo, pero con el índice completo también en stbl.
    const { bytes, offsets } = fragmentedMp4();
    const [o1, o2, o3] = offsets as [number, number, number];
    const full = [
      box("stts", [0, 0, 0, 0], u32(1), u32(3), u32(1024)),
      box("stsc", [0, 0, 0, 0], u32(1), u32(1), u32(1), u32(1)),
      box("stsz", [0, 0, 0, 0], u32(0), u32(3), u32(100), u32(200), u32(300)),
      box("stco", [0, 0, 0, 0], u32(3), u32(o1), u32(o2), u32(o3)),
    ];
    const moov = box("moov", audioTrak(soundEntry("mp4a", 0, esds()), full), box("mvex", box("trex", [0, 0, 0, 0], u32(1), u32(1), u32(1024), u32(0), u32(0))));
    // Como lo cierra OBS: el moov del principio pasa a ser `free` (mismo
    // tamaño, así que nada se mueve) y el índice completo va al final.
    const hybrid = new Uint8Array([...bytes, ...moov]);
    const firstMoov = box("ftyp", str("iso6"), u32(0)).length + 4;
    hybrid.set(str("free"), firstMoov);
    const track = readMp4Audio(hybrid);
    expect(track?.samples.length).toBe(3);
  });
});

describe("mp4 · MOV y otros códecs", () => {
  it("encuentra el esds dentro de wave, como lo guarda QuickTime", () => {
    const entry = soundEntry("mp4a", 1, box("wave", box("frma", str("mp4a")), esds()));
    const bytes = new Uint8Array([
      ...box("ftyp", str("qt  "), u32(0)),
      ...box("moov", audioTrak(entry, [
        box("stts", [0, 0, 0, 0], u32(1), u32(1), u32(1024)),
        box("stsc", [0, 0, 0, 0], u32(1), u32(1), u32(1), u32(1)),
        box("stsz", [0, 0, 0, 0], u32(0), u32(1), u32(100)),
        box("stco", [0, 0, 0, 0], u32(1), u32(5000)),
      ])),
    ]);
    const track = readMp4Audio(bytes);
    expect(Array.from(track?.description ?? [])).toEqual(ASC);
  });

  it("AAC sin configuración no se intenta: saldría silencio", () => {
    const bytes = new Uint8Array([
      ...box("ftyp", str("isom"), u32(0)),
      ...box("moov", audioTrak(soundEntry("mp4a", 0), [
        box("stts", [0, 0, 0, 0], u32(1), u32(1), u32(1024)),
        box("stsc", [0, 0, 0, 0], u32(1), u32(1), u32(1), u32(1)),
        box("stsz", [0, 0, 0, 0], u32(0), u32(1), u32(100)),
        box("stco", [0, 0, 0, 0], u32(1), u32(5000)),
      ])),
    ]);
    expect(readMp4Audio(bytes)).toBeNull();
  });

  it("Opus: convierte dOps en la cabecera OpusHead que pide AudioDecoder", () => {
    // dOps: versión 0, 2 canales, pre-skip 312, 48 kHz, ganancia 0, familia 0.
    const dops = box("dOps", [0, 2, 0x01, 0x38, 0, 0, 0xbb, 0x80, 0, 0, 0]);
    const bytes = new Uint8Array([
      ...box("ftyp", str("isom"), u32(0)),
      ...box("moov", audioTrak(soundEntry("Opus", 0, dops), [
        box("stts", [0, 0, 0, 0], u32(1), u32(1), u32(960)),
        box("stsc", [0, 0, 0, 0], u32(1), u32(1), u32(1), u32(1)),
        box("stsz", [0, 0, 0, 0], u32(0), u32(1), u32(100)),
        box("stco", [0, 0, 0, 0], u32(1), u32(5000)),
      ])),
    ]);
    const track = readMp4Audio(bytes);
    expect(track?.codec).toBe("opus");
    expect(track?.sampleRate).toBe(48000);
    expect(Array.from(track?.description ?? [])).toEqual([
      ...str("OpusHead"), 1, 2, 0x38, 0x01, 0x80, 0xbb, 0, 0, 0, 0, 0,
    ]);
  });

  it("un códec que no sabemos pasar a AudioDecoder se deja al camino de siempre", () => {
    const bytes = new Uint8Array([
      ...box("ftyp", str("isom"), u32(0)),
      ...box("moov", audioTrak(soundEntry("ac-3", 0), [
        box("stts", [0, 0, 0, 0], u32(1), u32(1), u32(1536)),
        box("stsc", [0, 0, 0, 0], u32(1), u32(1), u32(1), u32(1)),
        box("stsz", [0, 0, 0, 0], u32(0), u32(1), u32(100)),
        box("stco", [0, 0, 0, 0], u32(1), u32(5000)),
      ])),
    ]);
    expect(readMp4Audio(bytes)).toBeNull();
  });
});
