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
  /**
   * Avisa si la compartición se corta desde fuera de la aplicación.
   *
   * Chrome enseña su propia barra con «Dejar de compartir», y mucha gente la
   * usa: es lo que tiene delante. Si eso ocurre, la pista de audio muere pero
   * el `MediaRecorder` sigue tan contento **grabando silencio**, y el
   * cronómetro sigue subiendo. Quien creía estar grabando una hora de webinar
   * se encontraría con una hora de nada.
   */
  onEnded(cb: () => void): void;
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

  const [tabTrack] = display.getAudioTracks();

  return {
    stream: mixer.stream,
    withMic: mic !== null,
    onEnded(cb) {
      tabTrack?.addEventListener("ended", cb, { once: true });
    },
    stop() {
      display.getTracks().forEach((t) => t.stop());
      mic?.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}

/**
 * Graba un flujo en trozos independientes en vez de en un archivo único.
 *
 * Un `MediaRecorder` corriendo hora y media produce un WebM enorme que el
 * navegador **no puede decodificar de una pieza**: Opus se descomprime primero
 * a su ritmo nativo y hora y media pasan del gigabyte. Eso costó una grabación
 * entera de webinar. Parando y arrancando el grabador cada pocos minutos, cada
 * trozo es un WebM completo y válido por su cuenta, y se decodifican de uno en
 * uno.
 *
 * Devuelve una función para detener; los trozos llegan por `onFinish`.
 */
export function recordInParts(
  stream: MediaStream,
  minutesPerPart: number,
  onFinish: (parts: Blob[], mimeType: string) => void,
): () => void {
  const parts: Blob[] = [];
  let chunks: Blob[] = [];
  let rec: MediaRecorder | null = null;
  let stopping = false;
  let rotator: number | undefined;
  let mimeType = "audio/webm";

  const startOne = (): void => {
    rec = new MediaRecorder(stream);
    mimeType = rec.mimeType || mimeType;
    chunks = [];
    rec.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });
    rec.addEventListener("stop", () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size > 0) parts.push(blob);
      if (stopping) {
        window.clearInterval(rotator);
        onFinish(parts, mimeType);
      } else {
        startOne();
      }
    });
    rec.start();
  };

  startOne();
  rotator = window.setInterval(
    () => {
      if (!stopping && rec && rec.state === "recording") rec.stop();
    },
    minutesPerPart * 60 * 1000,
  );

  return () => {
    stopping = true;
    window.clearInterval(rotator);
    if (rec && rec.state !== "inactive") rec.stop();
    else onFinish(parts, mimeType);
  };
}

/** Minutos por trozo: con esto, una hora y media son unos doce archivos. */
export const MINUTES_PER_PART = 8;
