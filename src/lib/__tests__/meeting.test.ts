import { afterEach, describe, expect, it, vi } from "vitest";
import { canCaptureTab, captureMeeting, NoTabAudioError } from "../meeting";

/** Pista falsa que recuerda si la han parado. */
function track(kind: "audio" | "video") {
  return { kind, stopped: false, stop(this: { stopped: boolean }) { this.stopped = true; } };
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

  vi.stubGlobal("navigator", {
    mediaDevices: {
      getDisplayMedia: vi.fn(() => Promise.resolve(display)),
      getUserMedia: vi.fn(() =>
        micStream ? Promise.resolve(micStream) : Promise.reject(new Error("denegado")),
      ),
    },
  });

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
    vi.stubGlobal("navigator", { mediaDevices: {} });
    vi.stubGlobal("AudioContext", class {});
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
    const capture = await captureMeeting();
    expect(capture.withMic).toBe(true);
    expect(env.connected).toEqual([env.display, env.mic]);
    expect(capture.stream).toBe(env.mixer);
  });

  it("descarta el vídeo: solo se necesita el sonido", async () => {
    const env = setup();
    await captureMeeting();
    expect(env.display.getVideoTracks()[0]?.stopped).toBe(true);
    expect(env.display.getAudioTracks()[0]?.stopped).toBe(false);
  });

  it("sin permiso de micrófono graba igual, pero lo dice", async () => {
    const env = setup({ mic: false });
    const capture = await captureMeeting();
    expect(capture.withMic).toBe(false);
    expect(env.connected).toEqual([env.display]);
  });

  // Es el fallo habitual: si no se marca «compartir audio de la pestaña» el
  // navegador entrega la pestaña muda. Seguir grabando solo el micrófono daría
  // media reunión sin avisar, que es justo el problema que veníamos a resolver.
  it("una pestaña sin audio aborta en vez de grabar media reunión", async () => {
    const env = setup({ tabAudio: false });
    await expect(captureMeeting()).rejects.toBeInstanceOf(NoTabAudioError);
    expect(env.display.tracks.every((t) => t.stopped)).toBe(true);
  });

  it("stop() corta pestaña, micrófono y contexto", async () => {
    const env = setup();
    const capture = await captureMeeting();
    capture.stop();
    expect(env.display.tracks.every((t) => t.stopped)).toBe(true);
    expect(env.mic?.tracks.every((t) => t.stopped)).toBe(true);
    expect(env.closed).toBe(true);
  });
});
