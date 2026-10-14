// Troceado de MP3 sin decodificar.
//
// `decodeAudioData` necesita el archivo entero en memoria antes de devolver
// nada, y ahí se cae uno de cada cuatro archivos que la gente suelta. Bajar el
// ritmo de muestreo a 16 kHz redujo la memoria casi tres veces y **no bastó**:
// una hora en estéreo sigue pidiendo ~460 MB de golpe.
//
// La salida es partir el archivo antes de decodificar. Un MP3 es una secuencia
// de tramas independientes, cada una con una cabecera de cuatro bytes, así que
// se puede cortar por los límites de trama y decodificar cada trozo por
// separado: la memoria deja de depender de la duración del episodio.
//
// Aquí solo vive el análisis de tramas, que es aritmética pura y por tanto
// comprobable sin navegador.

/** Ritmos de muestreo por índice, para MPEG-1 / MPEG-2 / MPEG-2.5. */
const SAMPLE_RATES: Record<number, [number, number, number]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
};

/** Bitrates en kbps para MPEG-1 capa III, por índice de cabecera. */
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
/** Ídem para MPEG-2 y 2.5, capa III. */
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];

export interface Mp3Frame {
  /** Desplazamiento en bytes desde el principio del archivo. */
  offset: number;
  /** Longitud de la trama en bytes. */
  length: number;
  /** Muestras de audio que contiene. */
  samples: number;
  sampleRate: number;
}

/**
 * Lee la cabecera de una trama en `offset`. Devuelve `null` si ahí no empieza
 * una trama válida, que es lo que permite resincronizar tras basura o etiquetas.
 */
export function readFrame(bytes: Uint8Array, offset: number): Mp3Frame | null {
  const b0 = bytes[offset];
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  const b3 = bytes[offset + 3];
  if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) return null;

  // Sincronismo: once bits a uno.
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null;

  const versionBits = (b1 >> 3) & 0x03;
  if (versionBits === 1) return null; // versión reservada
  const layerBits = (b1 >> 1) & 0x03;
  if (layerBits !== 0x01) return null; // solo capa III

  const bitrateIndex = (b2 >> 4) & 0x0f;
  const rateIndex = (b2 >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;

  const rates = SAMPLE_RATES[versionBits];
  if (!rates) return null;
  const sampleRate = rates[rateIndex];
  if (!sampleRate) return null;

  const isV1 = versionBits === 3;
  const kbps = (isV1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex];
  if (!kbps) return null;

  const padding = (b2 >> 1) & 0x01;
  // MPEG-1 capa III lleva 1152 muestras por trama; MPEG-2 y 2.5, la mitad.
  const samples = isV1 ? 1152 : 576;
  const length = Math.floor((samples / 8) * ((kbps * 1000) / sampleRate)) + padding;
  if (length < 4) return null;

  return { offset, length, samples, sampleRate };
}

/** Salta la etiqueta ID3v2 del principio, si la hay. */
export function skipID3(bytes: Uint8Array): number {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0; // "ID3"
  // Tamaño en cuatro bytes "synchsafe": siete bits útiles por byte.
  const s0 = bytes[6] ?? 0;
  const s1 = bytes[7] ?? 0;
  const s2 = bytes[8] ?? 0;
  const s3 = bytes[9] ?? 0;
  const size = (s0 << 21) | (s1 << 14) | (s2 << 7) | s3;
  return 10 + size;
}

/** Tramas seguidas que hacen falta para creer que ahí empieza un MP3 de verdad. */
const CHAIN = 4;

/**
 * La trama de `pos` si detrás vienen otras `need - 1` encadenadas, del mismo
 * ritmo y tipo. Una cabecera suelta no prueba nada: once bits a uno y unos
 * cuantos valores válidos aparecen por azar en cualquier archivo grande.
 */
function chainAt(bytes: Uint8Array, pos: number, need: number): Mp3Frame | null {
  const first = readFrame(bytes, pos);
  if (!first) return null;
  let at = pos + first.length;
  for (let i = 1; i < need; i++) {
    // Si el archivo se acaba, lo que había hasta ahí cuadraba.
    if (at >= bytes.length - 4) return first;
    const next = readFrame(bytes, at);
    if (!next || next.sampleRate !== first.sampleRate || next.samples !== first.samples) return null;
    at += next.length;
  }
  return first;
}

/**
 * Recorre el archivo y devuelve los cortes por límite de trama, agrupando
 * tramas hasta completar `secondsPerChunk` de audio.
 *
 * Devuelve `null` si el archivo no parece un MP3 con tramas legibles, para que
 * quien llame vuelva al camino de siempre en vez de romper.
 *
 * Antes bastaba **una** cabecera válida en los primeros 8 KB para darlo por
 * MP3, y después se aceptaba cualquier cabecera suelta. En un MP4 de vídeo de
 * 460 MB eso «encontraba» 2 h 21 min de MP3 que no existían: los trozos no se
 * podían decodificar, se rellenaban con silencio, y Whisper transcribía ese
 * silencio como «[Música]». Le pasó a un MP4 de una hora el 14/10, y le pudo
 * pasar a cualquier archivo grande que no fuera MP3 desde el 11/08. Ahora hace
 * falta una cadena de tramas para empezar, del mismo ritmo todo el archivo, y
 * que las tramas cubran la mayor parte de los bytes.
 */
export function chunkRanges(
  bytes: Uint8Array,
  secondsPerChunk = 600,
): { start: number; end: number; seconds: number }[] | null {
  let pos = skipID3(bytes);
  // Resincronizar indefinidamente sería lentísimo en un archivo que no es MP3:
  // el primer encadenado tiene que aparecer pronto.
  const limit = Math.min(bytes.length, pos + 64 * 1024);
  let first: Mp3Frame | null = null;
  while (pos < limit) {
    first = chainAt(bytes, pos, CHAIN);
    if (first) break;
    pos++;
  }
  if (!first) return null;
  const { sampleRate, samples } = first;
  const begin = pos;

  const ranges: { start: number; end: number; seconds: number }[] = [];
  let chunkStart = pos;
  let chunkSeconds = 0;
  let covered = 0;
  // Tras un hueco de basura no basta una cabecera para volver: también ahí
  // hace falta ver dos seguidas.
  let synced = true;

  while (pos < bytes.length - 4) {
    const frame = synced ? readFrame(bytes, pos) : chainAt(bytes, pos, 2);
    if (!frame || frame.sampleRate !== sampleRate || frame.samples !== samples) {
      synced = false;
      pos++;
      continue;
    }
    synced = true;
    covered += frame.length;
    chunkSeconds += frame.samples / frame.sampleRate;
    pos += frame.length;

    if (chunkSeconds >= secondsPerChunk) {
      ranges.push({ start: chunkStart, end: pos, seconds: chunkSeconds });
      chunkStart = pos;
      chunkSeconds = 0;
    }
  }

  // Un MP3 de verdad es casi todo tramas. Si no, lo encontrado son bytes
  // sueltos que parecían cabeceras, y es mejor el camino de siempre.
  if (covered < 0.5 * (bytes.length - begin)) return null;
  if (chunkSeconds > 0) ranges.push({ start: chunkStart, end: bytes.length, seconds: chunkSeconds });
  return ranges;
}
