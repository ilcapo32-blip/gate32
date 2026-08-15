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

/**
 * ¿Puede este navegador capturar el audio de una pestaña?
 *
 * Además de la API hace falta descartar el móvil: Chrome de Android expone
 * `getDisplayMedia` pero no entrega audio de pestaña, así que el botón
 * aparecería para fallar al pulsarlo. `any-pointer: fine` distingue un
 * portátil (aunque tenga pantalla táctil) de un teléfono.
 */
export function canCaptureTab(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof AudioContext !== "undefined" &&
    typeof matchMedia === "function" &&
    matchMedia("(any-pointer: fine)").matches
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
 * Captura el audio de una pestaña, opcionalmente mezclado con el micrófono.
 *
 * `withMic` no es un detalle de configuración, es la diferencia entre los dos
 * usos. En una reunión tu voz forma parte de la conversación y sin ella la
 * transcripción sale coja. En un vídeo ajeno tu micrófono solo aportaría el
 * ruido de tu habitación encima del audio que quieres transcribir, y además
 * pediría un permiso que no hace falta para nada.
 *
 * Si la pestaña llega sin pista de audio se aborta con un error propio:
 * seguir adelante grabaría media reunión —o silencio— sin avisar, que es
 * exactamente el problema que veníamos a resolver.
 */
export async function captureTab(withMic: boolean): Promise<MeetingCapture> {
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
  if (withMic) {
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Sin permiso se graba igual: se pierde tu voz, pero la de los demás no.
    }
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
