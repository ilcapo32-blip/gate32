import { afterEach, describe, expect, it, vi } from "vitest";
import { canCaptureTab, captureTab, NoTabAudioError, recordInParts } from "../meeting";

/** Pista falsa que recuerda si la han parado. */
function track(kind: "audio" | "video") {
  const listeners: (() => void)[] = [];
  return {
    kind,
    stopped: false,
    stop(this: { stopped: boolean }) {
      this.stopped = true;
    },
    addEventListener(_ev: string, cb: () => void) {
      listeners.push(cb);
    },
    /** Simula que el usuario pulsa «Dejar de compartir» en la barra de Chrome. */
    fireEnded() {
      listeners.splice(0).forEach((cb) => cb());
    },
  };
}

type FakeTrack = ReturnType<typeof track>;

function stream(tracks: FakeTrack[]) {
  return {
    tracks,
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  };
}

interface Env {
  display: ReturnType<typeof stream>;
  mic: ReturnType<typeof stream> | null;
  connected: unknown[];
  closed: boolean;
  mixer: ReturnType<typeof stream>;
}

/** Monta navigator.mediaDevices y AudioContext con dobles mínimos. */
function setup(opts: { tabAudio?: boolean; mic?: boolean } = {}): Env {
  const { tabAudio = true, mic = true } = opts;
  const display = stream(tabAudio ? [track("audio"), track("video")] : [track("video")]);
  const micStream = mic ? stream([track("audio")]) : null;
  const mixer = stream([track("audio")]);
  const env: Env = { display, mic: micStream, connected: [], closed: false, mixer };

  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getDisplayMedia: vi.fn(() => Promise.resolve(display)),
      getUserMedia: vi.fn(() =>
        micStream ? Promise.resolve(micStream) : Promise.reject(new Error("denegado")),
      ),
    },
  });

  // Las pistas sueltas se envuelven en un flujo propio para grabarlas aparte.
  vi.stubGlobal(
    "MediaStream",
    class {
      constructor(public tracks: FakeTrack[]) {}
      getTracks() {
        return this.tracks;
      }
    },
  );

  vi.stubGlobal(
    "AudioContext",
    class {
      createMediaStreamDestination() {
        return { stream: mixer };
      }
      createMediaStreamSource(src: unknown) {
        return { connect: () => env.connected.push(src) };
      }
      close() {
        env.closed = true;
        return Promise.resolve();
      }
    },
  );

  return env;
}

afterEach(() => vi.unstubAllGlobals());

describe("meeting · disponibilidad", () => {
  it("sin getDisplayMedia el botón no debe ofrecerse", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal("navigator", { mediaDevices: {} });
    vi.stubGlobal("AudioContext", class {});
    expect(canCaptureTab()).toBe(false);
  });

  // Chrome de Android expone getDisplayMedia pero no entrega audio de
  // pestaña: el botón aparecería solo para fallar al pulsarlo.
  it("en el móvil tampoco, aunque la API exista", () => {
    setup();
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: !q.includes("fine") }));
    expect(canCaptureTab()).toBe(false);
  });

  it("con getDisplayMedia y AudioContext sí", () => {
    setup();
    expect(canCaptureTab()).toBe(true);
  });
});

describe("meeting · captura", () => {
  it("mezcla la pestaña con el micrófono", async () => {
    const env = setup();
    const capture = await captureTab(true);
    expect(capture.withMic).toBe(true);
    expect(env.connected).toEqual([env.display, env.mic]);
    expect(capture.stream).toBe(env.mixer);
  });

  it("descarta el vídeo: solo se necesita el sonido", async () => {
    const env = setup();
    await captureTab(true);
    expect(env.display.getVideoTracks()[0]?.stopped).toBe(true);
    expect(env.display.getAudioTracks()[0]?.stopped).toBe(false);
  });

  it("sin permiso de micrófono graba igual, pero lo dice", async () => {
    const env = setup({ mic: false });
    const capture = await captureTab(true);
    expect(capture.withMic).toBe(false);
    expect(env.connected).toEqual([env.display]);
  });

  // Para un vídeo ajeno el micrófono solo añadiría el ruido de la habitación,
  // y pedir el permiso sería una fricción a cambio de nada.
  it("sin micrófono no lo pide siquiera", async () => {
    const env = setup();
    const capture = await captureTab(false);
    expect(capture.withMic).toBe(false);
    expect(env.connected).toEqual([env.display]);
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  // Es el fallo habitual: si no se marca «compartir audio de la pestaña» el
  // navegador entrega la pestaña muda. Seguir grabando solo el micrófono daría
  // media reunión sin avisar, que es justo el problema que veníamos a resolver.
  it("una pestaña sin audio aborta en vez de grabar media reunión", async () => {
    const env = setup({ tabAudio: false });
    await expect(captureTab(true)).rejects.toBeInstanceOf(NoTabAudioError);
    expect(env.display.tracks.every((t) => t.stopped)).toBe(true);
  });

  // Chrome enseña su propia barra con «Dejar de compartir» y mucha gente la
  // usa. Sin esto el MediaRecorder seguía corriendo sobre una pista muerta:
  // una hora de webinar convertida en una hora de silencio.
  it("avisa si se deja de compartir desde la barra del navegador", async () => {
    const env = setup();
    const capture = await captureTab(true);
    let avisado = false;
    capture.onEnded(() => {
      avisado = true;
    });
    env.display.getAudioTracks()[0]?.fireEnded();
    expect(avisado).toBe(true);
  });

  it("stop() corta pestaña, micrófono y contexto", async () => {
    const env = setup();
    const capture = await captureTab(true);
    capture.stop();
    expect(env.display.tracks.every((t) => t.stopped)).toBe(true);
    expect(env.mic?.tracks.every((t) => t.stopped)).toBe(true);
    expect(env.closed).toBe(true);
  });
});

describe("meeting · pistas separadas para saber quién habla", () => {
  // Tu micrófono eres tú y la pestaña son los demás, por definición: grabarlos
  // por separado es lo que permite etiquetar sin adivinar.
  it("con micrófono entrega tu voz y la de la pestaña por separado", async () => {
    const env = setup();
    const capture = await captureTab(true);
    expect(capture.split?.mic).toBe(env.mic);
    const tab = capture.split?.tab as unknown as { tracks: FakeTrack[] };
    expect(tab.tracks).toEqual(env.display.getAudioTracks());
  });

  it("la mezcla sigue siendo la grabación principal", async () => {
    const env = setup();
    const capture = await captureTab(true);
    expect(capture.stream).toBe(env.mixer);
  });

  it("sin micrófono no hay nada que separar", async () => {
    setup({ mic: false });
    expect((await captureTab(true)).split).toBeNull();
  });

  it("en un vídeo ajeno tampoco", async () => {
    setup();
    expect((await captureTab(false)).split).toBeNull();
  });
});

/** MediaRecorder falso: para y entrega en el acto, sin esperar al navegador. */
class FakeRecorder {
  static all: FakeRecorder[] = [];
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  private listeners: Record<string, ((e: { data: Blob }) => void)[]> = {};
  constructor(stream: { active: boolean }) {
    if (!stream.active) throw new Error("flujo inactivo");
    FakeRecorder.all.push(this);
  }
  addEventListener(ev: string, cb: (e: { data: Blob }) => void) {
    (this.listeners[ev] ??= []).push(cb);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    const e = { data: new Blob(["x"]) };
    this.listeners["dataavailable"]?.forEach((cb) => cb(e));
    this.listeners["stop"]?.forEach((cb) => cb(e));
  }
}

describe("meeting · grabación por trozos", () => {
  let rotate: () => void = () => {};

  function arm() {
    FakeRecorder.all = [];
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("window", {
      setInterval: (cb: () => void) => {
        rotate = cb;
        return 1;
      },
      clearInterval: () => {},
    });
  }

  it("entrega todos los trozos de una vez al detener", () => {
    arm();
    const flujo = { active: true } as unknown as MediaStream;
    const entregas: number[] = [];
    const stop = recordInParts(flujo, 8, (parts) => entregas.push(parts.length));
    rotate();
    stop();
    expect(entregas).toEqual([2]);
  });

  // Con la pestaña grabada aparte, dejar de compartir mata su única pista: el
  // grabador se para solo y arrancar otro lanzaba un error. Y luego «Detener»
  // volvía a entregar, descuadrando a quien espera tres grabaciones.
  it("si el flujo muere, entrega lo grabado una sola vez", () => {
    arm();
    const flujo = { active: true };
    const entregas: number[] = [];
    const stop = recordInParts(flujo as unknown as MediaStream, 8, (parts) =>
      entregas.push(parts.length),
    );
    flujo.active = false;
    FakeRecorder.all[0]?.stop();
    stop();
    expect(entregas).toEqual([1]);
  });

  it("si no se puede ni empezar, quien llama se entera", () => {
    arm();
    const muerto = { active: false } as unknown as MediaStream;
    expect(() => recordInParts(muerto, 8, () => {})).toThrow();
  });
});
