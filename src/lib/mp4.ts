// Demultiplexado de MP4 sin decodificar.
//
// Por qué existe: de los 41 errores de descodificación medidos entre el 30/07 y
// el 13/10, **31 eran contenedores de la familia MP4** —mp4 16, m4a 9, mov 6— y
// 25 de los 41 venían etiquetados como «grande». La causa está en el comentario
// de `decodeParts`: «el troceado que teníamos solo sabe leer MP3». Ante un MP4,
// `chunkRanges` devuelve `null` y el archivo entero cae en `decodeAudioData` de
// una pieza.
//
// Y ahí el problema no es el audio final —una hora a 16 kHz mono son 115 MB—
// sino que el navegador **descodifica al ritmo nativo y remuestrea después**:
// una hora de estéreo a 48 kHz son 1,38 GB antes de convertirse en nada.
//
// La salida es la misma que con MP3: trocear antes de decodificar. Un MP4 no se
// puede cortar por bytes —es un contenedor con índices— así que hay que leer su
// tabla de muestras. Eso es lo único que vive aquí: aritmética sobre átomos,
// sin navegador, y por tanto comprobable con un fichero construido a mano.
//
// No se usa `mp4box.js`: el proyecto tiene una sola dependencia a propósito, ya
// hay un lector de tramas MP3 y otro de Atom escritos a mano, y de esa
// biblioteca haría falta esta fracción.

export interface Mp4Sample {
  /** Desplazamiento en bytes desde el principio del archivo. */
  offset: number;
  size: number;
  /** Momento en que empieza, en segundos. */
  start: number;
  /** Lo que dura, en segundos. */
  seconds: number;
}

export interface Mp4AudioTrack {
  /** Códec en la forma que pide WebCodecs, p. ej. `mp4a.40.2`. */
  codec: string;
  sampleRate: number;
  channels: number;
  /**
   * El AudioSpecificConfig del átomo `esds`. `AudioDecoder` lo necesita como
   * `description` para AAC: sin él no sabe ni el perfil ni la frecuencia real.
   */
  description: Uint8Array | null;
  samples: Mp4Sample[];
  duration: number;
}

interface Box {
  type: string;
  /** Primer byte del contenido, ya pasada la cabecera. */
  start: number;
  /** Primer byte después del contenido. */
  end: number;
}

const ascii = (bytes: Uint8Array, at: number, len: number): string => {
  let out = "";
  for (let i = 0; i < len; i++) out += String.fromCharCode(bytes[at + i] ?? 0);
  return out;
};

const u16 = (b: Uint8Array, at: number) => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);
const u32 = (b: Uint8Array, at: number) =>
  (((b[at] ?? 0) << 24) | ((b[at + 1] ?? 0) << 16) | ((b[at + 2] ?? 0) << 8) | (b[at + 3] ?? 0)) >>>
  0;
/** Los offsets de `co64` y las duraciones largas no caben en 32 bits. */
const u64 = (b: Uint8Array, at: number) => u32(b, at) * 2 ** 32 + u32(b, at + 4);

/**
 * Lista las cajas que hay entre `from` y `to`. Un tamaño de 0 significa «hasta
 * el final», y 1 que el tamaño real va en 64 bits después del tipo.
 */
function boxes(bytes: Uint8Array, from: number, to: number): Box[] {
  const out: Box[] = [];
  let at = from;
  while (at + 8 <= to) {
    let size = u32(bytes, at);
    const type = ascii(bytes, at + 4, 4);
    let header = 8;
    if (size === 1) {
      size = u64(bytes, at + 8);
      header = 16;
    } else if (size === 0) {
      size = to - at;
    }
    // Una caja que no avanza es un archivo corrupto: sin esto, el bucle no
    // termina nunca y la pestaña se queda colgada en vez de dar un error.
    if (size < header || at + size > to) break;
    out.push({ type, start: at + header, end: at + size });
    at += size;
  }
  return out;
}

const find = (list: Box[], type: string) => list.find((b) => b.type === type);

/** Baja por una ruta de cajas anidadas: `path(bytes, moov, "trak", "mdia")`. */
function path(bytes: Uint8Array, box: Box, ...types: string[]): Box | undefined {
  let current: Box | undefined = box;
  for (const type of types) {
    if (!current) return undefined;
    current = find(boxes(bytes, current.start, current.end), type);
  }
  return current;
}

/**
 * Saca el AudioSpecificConfig de un `esds`.
 *
 * El `esds` lleva descriptores anidados con longitud en bytes «de siete bits»:
 * cada byte aporta siete bits y el octavo dice si sigue. Solo interesa el
 * descriptor 0x05, que es la configuración que `AudioDecoder` necesita.
 */
export function readEsds(bytes: Uint8Array, start: number, end: number): Uint8Array | null {
  let at = start + 4; // versión y banderas
  const readLen = (): number => {
    let len = 0;
    for (let i = 0; i < 4; i++) {
      const b = bytes[at++] ?? 0;
      len = (len << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return len;
  };

  while (at < end) {
    const tag = bytes[at++] ?? 0;
    const len = readLen();
    if (len < 0 || at + len > end) return null;
    if (tag === 0x03) {
      // ES_Descriptor: id (2) + banderas (1), y luego los hijos.
      const flags = bytes[at + 2] ?? 0;
      let skip = 3;
      if (flags & 0x80) skip += 2; // depende de otro flujo
      if (flags & 0x40) skip += 1 + (bytes[at + skip] ?? 0); // URL
      if (flags & 0x20) skip += 2; // OCR
      at += skip;
      continue;
    }
    if (tag === 0x04) {
      // DecoderConfigDescriptor: 13 bytes fijos y luego el 0x05.
      at += 13;
      continue;
    }
    if (tag === 0x05) return bytes.slice(at, at + len);
    at += len;
  }
  return null;
}

/** El perfil AAC va en los cinco bits altos del AudioSpecificConfig. */
function codecFrom(description: Uint8Array | null): string {
  const first = description?.[0];
  if (first === undefined) return "mp4a.40.2";
  const profile = first >> 3;
  return `mp4a.40.${profile || 2}`;
}

/** Si los primeros bytes parecen un MP4/MOV/M4A: `ftyp` o `moov` al principio. */
export function looksLikeMp4(bytes: Uint8Array): boolean {
  for (const box of boxes(bytes, 0, Math.min(bytes.length, 64 * 1024))) {
    if (box.type === "ftyp" || box.type === "moov") return true;
    if (box.type !== "free" && box.type !== "skip" && box.type !== "wide") break;
  }
  return false;
}

/**
 * Lee la pista de audio de un MP4 y devuelve dónde está cada muestra.
 *
 * Devuelve `null` si no hay pista de audio legible, para que quien llame siga
 * por el camino de siempre en vez de romper. Igual que `chunkRanges`.
 */
export function readMp4Audio(bytes: Uint8Array): Mp4AudioTrack | null {
  const moov = find(boxes(bytes, 0, bytes.length), "moov");
  if (!moov) return null;

  for (const trak of boxes(bytes, moov.start, moov.end).filter((b) => b.type === "trak")) {
    const mdia = path(bytes, trak, "mdia");
    if (!mdia) continue;
    const hdlr = path(bytes, mdia, "hdlr");
    // En `hdlr` el tipo de manejador va tras versión/banderas y un reservado.
    if (!hdlr || ascii(bytes, hdlr.start + 8, 4) !== "soun") continue;

    const mdhd = path(bytes, mdia, "mdhd");
    if (!mdhd) continue;
    const version = bytes[mdhd.start] ?? 0;
    const timescale = version === 1 ? u32(bytes, mdhd.start + 20) : u32(bytes, mdhd.start + 12);
    if (!timescale) continue;

    const stbl = path(bytes, mdia, "minf", "stbl");
    if (!stbl) continue;
    const parts = boxes(bytes, stbl.start, stbl.end);
    const stsd = find(parts, "stsd");
    const stts = find(parts, "stts");
    const stsz = find(parts, "stsz");
    const stsc = find(parts, "stsc");
    const stco = find(parts, "stco") ?? find(parts, "co64");
    if (!stsd || !stts || !stsz || !stsc || !stco) continue;

    // --- stsd: formato y configuración del decodificador -----------------
    const entry = boxes(bytes, stsd.start + 8, stsd.end)[0];
    if (!entry) continue;
    // La entrada `mp4a` tiene 28 bytes de cabecera antes de sus cajas hijas.
    const channels = u16(bytes, entry.start + 16) || 2;
    const sampleRate = u16(bytes, entry.start + 24) || 44100;
    const esds = find(boxes(bytes, entry.start + 28, entry.end), "esds");
    const description = esds ? readEsds(bytes, esds.start, esds.end) : null;

    // --- stsz: tamaño de cada muestra ------------------------------------
    const uniform = u32(bytes, stsz.start + 4);
    const count = u32(bytes, stsz.start + 8);
    if (!count) continue;
    const sizes = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = uniform || u32(bytes, stsz.start + 12 + i * 4);
    }

    // --- stts: cuánto dura cada muestra ----------------------------------
    const sttsCount = u32(bytes, stts.start + 4);
    const deltas = new Array<number>(count);
    let filled = 0;
    for (let i = 0; i < sttsCount && filled < count; i++) {
      const n = u32(bytes, stts.start + 8 + i * 8);
      const delta = u32(bytes, stts.start + 12 + i * 8);
      for (let j = 0; j < n && filled < count; j++) deltas[filled++] = delta;
    }
    while (filled < count) deltas[filled++] = deltas[filled - 2] ?? 1024;

    // --- stsc + stco: dónde está cada muestra ----------------------------
    // `stsc` no da la posición de cada muestra: da cuántas van en cada grupo
    // de chunks. Hay que expandirlo contra la tabla de offsets.
    const stscCount = u32(bytes, stsc.start + 4);
    const groups: { firstChunk: number; perChunk: number }[] = [];
    for (let i = 0; i < stscCount; i++) {
      groups.push({
        firstChunk: u32(bytes, stsc.start + 8 + i * 12),
        perChunk: u32(bytes, stsc.start + 12 + i * 12),
      });
    }
    const wide = stco.type === "co64";
    const chunkCount = u32(bytes, stco.start + 4);
    const chunkOffset = (i: number) =>
      wide ? u64(bytes, stco.start + 8 + i * 8) : u32(bytes, stco.start + 8 + i * 4);

    const samples: Mp4Sample[] = [];
    let sample = 0;
    let elapsed = 0;
    for (let chunk = 0; chunk < chunkCount && sample < count; chunk++) {
      // El grupo que manda es el último cuyo `firstChunk` ya ha pasado.
      let perChunk = groups[0]?.perChunk ?? 1;
      for (const g of groups) if (chunk + 1 >= g.firstChunk) perChunk = g.perChunk;

      let offset = chunkOffset(chunk);
      for (let i = 0; i < perChunk && sample < count; i++) {
        const size = sizes[sample] ?? 0;
        const seconds = (deltas[sample] ?? 0) / timescale;
        samples.push({ offset, size, start: elapsed, seconds });
        offset += size;
        elapsed += seconds;
        sample++;
      }
    }

    if (samples.length === 0) continue;
    return {
      codec: codecFrom(description),
      sampleRate,
      channels,
      description,
      samples,
      duration: elapsed,
    };
  }

  return null;
}

/**
 * Agrupa las muestras en tramos de `secondsPerChunk`, para decodificar de
 * tramo en tramo y que la memoria no dependa de la duración del archivo.
 */
export function mp4ChunkRanges(
  track: Mp4AudioTrack,
  secondsPerChunk = 600,
): { from: number; to: number; seconds: number }[] {
  const ranges: { from: number; to: number; seconds: number }[] = [];
  let from = 0;
  let seconds = 0;
  for (let i = 0; i < track.samples.length; i++) {
    seconds += track.samples[i]?.seconds ?? 0;
    if (seconds >= secondsPerChunk) {
      ranges.push({ from, to: i + 1, seconds });
      from = i + 1;
      seconds = 0;
    }
  }
  if (from < track.samples.length) {
    ranges.push({ from, to: track.samples.length, seconds });
  }
  return ranges;
}
