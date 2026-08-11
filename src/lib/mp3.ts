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

/**
 * Recorre el archivo y devuelve los cortes por límite de trama, agrupando
 * tramas hasta completar `secondsPerChunk` de audio.
 *
 * Devuelve `null` si el archivo no parece un MP3 con tramas legibles, para que
 * quien llame vuelva al camino de siempre en vez de romper.
 */
export function chunkRanges(
  bytes: Uint8Array,
  secondsPerChunk = 600,
): { start: number; end: number; seconds: number }[] | null {
  let pos = skipID3(bytes);
  const ranges: { start: number; end: number; seconds: number }[] = [];
  let chunkStart = pos;
  let chunkSeconds = 0;
  let frames = 0;
  // Resincronizar indefinidamente sería lentísimo en un archivo que no es MP3:
  // si tras muchos intentos no aparece ninguna trama, se abandona.
  let misses = 0;

  while (pos < bytes.length - 4) {
    const frame = readFrame(bytes, pos);
    if (!frame) {
      if (frames === 0 && ++misses > 8192) return null;
      pos++;
      continue;
    }
    frames++;
    chunkSeconds += frame.samples / frame.sampleRate;
    pos += frame.length;

    if (chunkSeconds >= secondsPerChunk) {
      ranges.push({ start: chunkStart, end: pos, seconds: chunkSeconds });
      chunkStart = pos;
      chunkSeconds = 0;
    }
  }

  if (frames === 0) return null;
  if (chunkSeconds > 0) ranges.push({ start: chunkStart, end: bytes.length, seconds: chunkSeconds });
  return ranges;
}
