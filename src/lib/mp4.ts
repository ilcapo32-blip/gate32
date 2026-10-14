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
  /** Códec en la forma que pide WebCodecs, p. ej. `mp4a.40.2` u `opus`. */
  codec: string;
  sampleRate: number;
  channels: number;
  /**
   * El AudioSpecificConfig del átomo `esds`. `AudioDecoder` lo necesita como
   * `description` para AAC: sin él no sabe ni el perfil ni la frecuencia real.
   * En Opus es la cabecera `OpusHead` reconstruida desde `dOps`.
   */
  description: Uint8Array | null;
  samples: Mp4Sample[];
  duration: number;
}

interface Box {
  type: string;
  /** Primer byte de la caja, cabecera incluida. */
  begin: number;
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
/** El desplazamiento de datos de `trun` puede ser negativo. */
const i32 = (b: Uint8Array, at: number) => u32(b, at) | 0;

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
    out.push({ type, begin: at, start: at + header, end: at + size });
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

/** Lo que hace falta para configurar `AudioDecoder` con una entrada de `stsd`. */
interface SoundEntry {
  codec: string;
  sampleRate: number;
  channels: number;
  description: Uint8Array | null;
}

/**
 * Lee la entrada de audio de `stsd`, o `null` si no es un formato que sepamos
 * pasar a `AudioDecoder`.
 *
 * Antes se daba por hecho que era AAC con la cabecera corta de MP4, y en un MOV
 * eso falla: QuickTime usa versiones de la entrada con 16 o 36 bytes más, y
 * guarda el `esds` dentro de una caja `wave`. Sin `esds` el decodificador se
 * configuraba sin descripción, no descodificaba ni una trama, y el archivo
 * salía entero como silencio.
 */
function readSoundEntry(bytes: Uint8Array, entry: Box): SoundEntry | null {
  // Tras los 8 bytes comunes (reservado y referencia de datos) va la versión:
  // la 0 es la de MP4, la 1 y la 2 son de QuickTime.
  const version = u16(bytes, entry.start + 8);
  const header = version === 1 ? 44 : version === 2 ? 64 : 28;
  let channels = u16(bytes, entry.start + 16);
  let sampleRate = u16(bytes, entry.start + 24);
  if (version === 2) {
    sampleRate = Math.round(new DataView(bytes.buffer, bytes.byteOffset).getFloat64(entry.start + 32));
    channels = u32(bytes, entry.start + 40);
  }
  const children = boxes(bytes, entry.start + header, entry.end);

  if (entry.type === "mp4a") {
    const wave = find(children, "wave");
    const esds =
      find(children, "esds") ?? (wave ? find(boxes(bytes, wave.start, wave.end), "esds") : undefined);
    const description = esds ? readEsds(bytes, esds.start, esds.end) : null;
    // Sin configuración no hay manera de descodificar tramas AAC sueltas: es
    // preferible que quien llame pruebe otro camino a devolver silencio.
    if (!description) return null;
    return {
      codec: codecFrom(description),
      sampleRate: sampleRate || 44100,
      channels: channels || 2,
      description,
    };
  }

  if (entry.type === "Opus") {
    const dops = find(children, "dOps");
    if (!dops) return null;
    return {
      codec: "opus",
      // Opus siempre se descodifica a 48 kHz, diga lo que diga la cabecera.
      sampleRate: 48000,
      channels: bytes[dops.start + 1] || channels || 2,
      description: opusHead(bytes, dops),
    };
  }

  return null;
}

/**
 * Convierte `dOps` (MP4, big-endian) en `OpusHead` (Ogg, little-endian), que es
 * lo que `AudioDecoder` acepta como descripción.
 */
function opusHead(bytes: Uint8Array, dops: Box): Uint8Array {
  const src = dops.start;
  const mapping = bytes[src + 10] ?? 0;
  const table = mapping === 0 ? 0 : 2 + (bytes[src + 1] ?? 0);
  const out = new Uint8Array(19 + table);
  out.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]); // "OpusHead"
  out[8] = 1;
  out[9] = bytes[src + 1] ?? 2;
  out[10] = bytes[src + 3] ?? 0; // pre-skip, al revés
  out[11] = bytes[src + 2] ?? 0;
  for (let i = 0; i < 4; i++) out[12 + i] = bytes[src + 7 - i] ?? 0; // ritmo de entrada
  out[16] = bytes[src + 9] ?? 0; // ganancia, al revés
  out[17] = bytes[src + 8] ?? 0;
  out[18] = mapping;
  for (let i = 0; i < table; i++) out[19 + i] = bytes[src + 11 + i] ?? 0;
  return out;
}

/** Lo que dice `stbl`: las muestras de un MP4 normal, con el índice entero en `moov`. */
function tableSamples(bytes: Uint8Array, parts: Box[], timescale: number): Mp4Sample[] {
  const stts = find(parts, "stts");
  const stsz = find(parts, "stsz");
  const stsc = find(parts, "stsc");
  const stco = find(parts, "stco") ?? find(parts, "co64");
  if (!stts || !stsz || !stsc || !stco) return [];

  // --- stsz: tamaño de cada muestra ------------------------------------
  const uniform = u32(bytes, stsz.start + 4);
  const count = u32(bytes, stsz.start + 8);
  if (!count) return [];
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
  return samples;
}

/**
 * Las muestras de un MP4 **fragmentado**: `moov` solo lleva la descripción y
 * el índice va repartido en cajas `moof`, una por cada pocos segundos.
 *
 * Es el formato que graba OBS por defecto, justamente para no perder la
 * grabación si se corta: al no haber índice final que escribir, lo grabado
 * hasta el corte se puede leer. Sin esto, un MP4 de OBS no tenía ni una
 * muestra en `stbl` y se caía al camino de una pieza.
 */
function fragmentSamples(
  bytes: Uint8Array,
  top: Box[],
  trackId: number,
  timescale: number,
  defaults: { duration: number; size: number },
): Mp4Sample[] {
  const samples: Mp4Sample[] = [];
  let elapsed = 0;
  for (const moof of top) {
    if (moof.type !== "moof") continue;
    for (const traf of boxes(bytes, moof.start, moof.end)) {
      if (traf.type !== "traf") continue;
      const kids = boxes(bytes, traf.start, traf.end);
      const tfhd = find(kids, "tfhd");
      if (!tfhd || u32(bytes, tfhd.start + 4) !== trackId) continue;

      const flags = u32(bytes, tfhd.start) & 0xffffff;
      let at = tfhd.start + 8;
      // Sin desplazamiento explícito, los datos se cuentan desde el `moof`.
      let base = moof.begin;
      if (flags & 0x1) {
        base = u64(bytes, at);
        at += 8;
      }
      if (flags & 0x2) at += 4; // índice de descripción
      let duration = defaults.duration;
      let size = defaults.size;
      if (flags & 0x8) {
        duration = u32(bytes, at);
        at += 4;
      }
      if (flags & 0x10) size = u32(bytes, at);

      // `tfdt` dice cuándo empieza el fragmento: más fiable que ir sumando,
      // porque un fragmento perdido no desplaza a los siguientes.
      const tfdt = find(kids, "tfdt");
      if (tfdt) {
        const time = bytes[tfdt.start] === 1 ? u64(bytes, tfdt.start + 4) : u32(bytes, tfdt.start + 4);
        elapsed = time / timescale;
      }

      let next = base;
      for (const trun of kids) {
        if (trun.type !== "trun") continue;
        const tf = u32(bytes, trun.start) & 0xffffff;
        const n = u32(bytes, trun.start + 4);
        let q = trun.start + 8;
        let offset = next;
        if (tf & 0x1) {
          offset = base + i32(bytes, q);
          q += 4;
        }
        if (tf & 0x4) q += 4; // banderas de la primera muestra
        for (let i = 0; i < n && q <= trun.end; i++) {
          let d = duration;
          let s = size;
          if (tf & 0x100) {
            d = u32(bytes, q);
            q += 4;
          }
          if (tf & 0x200) {
            s = u32(bytes, q);
            q += 4;
          }
          if (tf & 0x400) q += 4;
          if (tf & 0x800) q += 4;
          const seconds = d / timescale;
          samples.push({ offset, size: s, start: elapsed, seconds });
          offset += s;
          elapsed += seconds;
        }
        next = offset;
      }
    }
  }
  return samples;
}

/**
 * Lee la pista de audio de un MP4 y devuelve dónde está cada muestra.
 *
 * Devuelve `null` si no hay pista de audio legible, para que quien llame siga
 * por el camino de siempre en vez de romper. Igual que `chunkRanges`.
 */
export function readMp4Audio(bytes: Uint8Array): Mp4AudioTrack | null {
  const top = boxes(bytes, 0, bytes.length);
  const moov = find(top, "moov");
  if (!moov) return null;
  const inMoov = boxes(bytes, moov.start, moov.end);
  const mvex = find(inMoov, "mvex");

  for (const trak of inMoov.filter((b) => b.type === "trak")) {
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
    if (!stsd) continue;

    // --- stsd: formato y configuración del decodificador -----------------
    const entry = boxes(bytes, stsd.start + 8, stsd.end)[0];
    const sound = entry ? readSoundEntry(bytes, entry) : null;
    if (!sound) continue;

    const samples = tableSamples(bytes, parts, timescale);
    if (mvex) {
      const tkhd = path(bytes, trak, "tkhd");
      const trackId = tkhd
        ? u32(bytes, tkhd.start + ((bytes[tkhd.start] ?? 0) === 1 ? 20 : 12))
        : 0;
      const trex = boxes(bytes, mvex.start, mvex.end).find(
        (b) => b.type === "trex" && u32(bytes, b.start + 4) === trackId,
      );
      const defaults = {
        duration: trex ? u32(bytes, trex.start + 12) : 0,
        size: trex ? u32(bytes, trex.start + 16) : 0,
      };
      // Un MP4 «híbrido» de OBS acaba con un índice completo en `moov` y
      // conserva los fragmentos: sin esto, cada muestra contaría dos veces.
      const seen = new Set(samples.map((s) => s.offset));
      for (const s of fragmentSamples(bytes, top, trackId, timescale, defaults)) {
        if (!seen.has(s.offset)) samples.push(s);
      }
    }

    if (samples.length === 0) continue;
    const last = samples[samples.length - 1];
    return {
      ...sound,
      samples,
      duration: last ? last.start + last.seconds : 0,
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
