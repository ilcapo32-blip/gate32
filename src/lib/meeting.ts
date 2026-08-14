// Captura de reuniones: mezcla el audio de una pestaña con el del micrófono.
//
// El problema que resuelve: con auriculares puestos, el micrófono solo recoge
// tu voz. La de los demás sale por los cascos y nunca pasa por el aire, así
// que grabar la sala con el móvil da media conversación.
//
// La salida es `getDisplayMedia` con audio: al compartir la pestaña de la
// videollamada, el navegador entrega el sonido que esa pestaña **reproduce**,
// sin altavoces de por medio. Se mezcla con el micrófono y sale la reunión
// entera.
//
// Es también lo único que un servicio de servidor no puede replicar: para
// ellos hay que grabar por tu cuenta y subir el archivo; aquí la captura
// ocurre en la pestaña de al lado.

export interface MeetingCapture {
  /** Flujo mezclado, listo para MediaRecorder. */
  stream: MediaStream;
  /** Corta todo lo capturado. */
  stop(): void;
  /** El micrófono entró en la mezcla. */
  withMic: boolean;
}

/** ¿Puede este navegador capturar el audio de una pestaña? */
export function canCaptureTab(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof AudioContext !== "undefined"
  );
}

/** El usuario no marcó la casilla de compartir audio: es el fallo habitual. */
export class NoTabAudioError extends Error {
  constructor() {
    super("no-tab-audio");
    this.name = "NoTabAudioError";
  }
}

/**
 * Pide la pestaña y el micrófono y devuelve un único flujo con los dos
 * mezclados. Si la pestaña llega sin pista de audio, se aborta con un error
 * propio: seguir grabando solo el micrófono daría media reunión sin avisar,
 * que es exactamente el problema que veníamos a resolver.
 */
export async function captureMeeting(): Promise<MeetingCapture> {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  if (display.getAudioTracks().length === 0) {
    display.getTracks().forEach((t) => t.stop());
    throw new NoTabAudioError();
  }

  // El vídeo se descarta en cuanto se tiene el audio: no se usa para nada y
  // mantenerlo gasta memoria y batería.
  display.getVideoTracks().forEach((t) => t.stop());

  let mic: MediaStream | null = null;
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    // Sin micrófono se graba igual: se pierde tu voz, pero la de los demás no.
  }

  const ctx = new AudioContext();
  const mixer = ctx.createMediaStreamDestination();
  ctx.createMediaStreamSource(display).connect(mixer);
  if (mic) ctx.createMediaStreamSource(mic).connect(mixer);

  return {
    stream: mixer.stream,
    withMic: mic !== null,
    stop() {
      display.getTracks().forEach((t) => t.stop());
      mic?.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
