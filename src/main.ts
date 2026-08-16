// Gate32 · orquestación de la interfaz: estados, transcripción, edición,
// exports, historial y analítica. Las cadenas generadas por JS pasan por
// i18n (el idioma lo fija el atributo lang de cada página).

import "./styles.css";
import {
  decodeToMono16k,
  decodeParts,
  DecodeError,
  ACCEPT,
  LONG_FILE_WARN_MIN,
  BIG_FILE_BYTES,
} from "./lib/audio";
import { Transcriber } from "./lib/transcriber";
import {
  toTXT,
  toMD,
  toSRT,
  toVTT,
  toJSON,
  clock,
  countMatches,
  replaceAll,
  exportName,
  type Correction,
  type CueOptions,
} from "./lib/formats";
import { MODELS, type ModelQuality, type Segment } from "./lib/types";
import { t, lang, locale } from "./lib/i18n";
import {
  canCaptureTab,
  captureTab,
  NoTabAudioError,
  recordInParts,
  MINUTES_PER_PART,
} from "./lib/meeting";
import { LANGUAGES, needsBiggerModel } from "./lib/languages";
import { initAnalytics, track, trackVisit } from "./lib/analytics";
import { ensureStorage, humanBytes } from "./lib/storage";
import {
  loadHistory,
  saveToHistory,
  updateHistorySegments,
  type HistoryEntry,
} from "./lib/history";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Elemento no encontrado: ${sel}`);
  return el;
};

// ── referencias ──
const dropzone = $("#dropzone");
const fileInput = $<HTMLInputElement>("#file-input");
const recordBtn = $<HTMLButtonElement>("#record-btn");
const recordLabel = $("#record-label");
// Opcionales: /embed/ y las páginas de caso de uso no llevan captura de pestaña.
const meetingBtn = document.querySelector<HTMLButtonElement>("#meeting-btn");
const mediaBtn = document.querySelector<HTMLButtonElement>("#media-btn");
const tabHint = document.querySelector<HTMLElement>("#meeting-hint");
const modelSelect = $<HTMLSelectElement>("#model-quality");
const langSelect = $<HTMLSelectElement>("#language");
const statusBox = $("#status");
const statusText = $("#status-text");
const statusDetail = $("#status-detail");
const progressBar = $("#progress-bar");
const partialBox = $("#partial");
const cancelBtn = $<HTMLButtonElement>("#cancel-btn");
const errorBox = $("#error");
const errorMsg = $("#error-msg");
const errorHint = $("#error-hint");
const resultSection = $("#result");
const resultTitle = $("#result-title");
const resultMeta = $("#result-meta");
const player = $<HTMLAudioElement>("#player");
const segmentsBox = $("#segments");
const attributionCheck = $<HTMLInputElement>("#attribution");
const cueCharsSelect = document.querySelector<HTMLSelectElement>("#cue-chars");
const newBtn = $<HTMLButtonElement>("#new-btn");
const proBtn = $<HTMLButtonElement>("#pro-btn");
const proThanks = $("#pro-thanks");
const shareBtn = $<HTMLButtonElement>("#share-btn");
const recentsBox = $("#recents");
const recentsList = $("#recents-list");
const waitSurvey = $("#wait-survey");
const readyBox = document.querySelector<HTMLElement>("#ready");
const readyName = document.querySelector<HTMLElement>("#ready-name");
const readySize = document.querySelector<HTMLElement>("#ready-size");
const readyWarn = document.querySelector<HTMLElement>("#ready-warn");
const startBtn = document.querySelector<HTMLButtonElement>("#start-btn");
const readyCancel = document.querySelector<HTMLButtonElement>("#ready-cancel");
const fixFind = document.querySelector<HTMLInputElement>("#fix-find");
const fixReplace = document.querySelector<HTMLInputElement>("#fix-replace");
const fixCase = document.querySelector<HTMLInputElement>("#fix-case");
const fixApply = document.querySelector<HTMLButtonElement>("#fix-apply");
const fixUndo = document.querySelector<HTMLButtonElement>("#fix-undo");
const fixCount = document.querySelector<HTMLElement>("#fix-count");
const retryBox = document.querySelector<HTMLElement>("#retry-better");
const retryBtn = document.querySelector<HTMLButtonElement>("#retry-btn");
const recoveryBox = document.querySelector<HTMLElement>("#recovery");
const recoveryBtn = document.querySelector<HTMLButtonElement>("#recovery-btn");
const recoveryNote = document.querySelector<HTMLElement>("#recovery-note");
const installBox = document.querySelector<HTMLElement>("#install");
const installBtn = document.querySelector<HTMLButtonElement>("#install-btn");

fileInput.accept = ACCEPT;

// ── idiomas ──
//
// El desplegable se rellena desde `languages.ts` en vez de repetir cincuenta
// opciones en cada página. El HTML conserva una lista corta como respaldo sin
// JavaScript, y el idioma por defecto de cada página es el que venía marcado.
const defaultLang = langSelect.value || (lang === "en" ? "en" : "es");
langSelect.replaceChildren();
const ordered = [...LANGUAGES].sort((a, b) => a[lang].localeCompare(b[lang], locale));
for (const l of ordered) {
  const opt = document.createElement("option");
  opt.value = l.code;
  opt.textContent = l[lang];
  langSelect.appendChild(opt);
}
const auto = document.createElement("option");
auto.value = "auto";
auto.textContent = lang === "en" ? "Detect automatically" : "Detectar automáticamente";
langSelect.insertBefore(auto, langSelect.firstChild);
langSelect.value = defaultLang;

// Aviso cuando el idioma elegido no es de los que el modelo pequeño transcribe
// bien. Es lo que le pasó a quien preguntaba en r/notebooklm: probó Whisper con
// vietnamita, salió mal y concluyó que Whisper no servía. No era Whisper, era
// el tamaño. Decirlo **antes** de transcribir evita esa conclusión.
const langNote = document.querySelector<HTMLElement>("#lang-note");
function syncLangNote(): void {
  if (!langNote) return;
  const avisa = needsBiggerModel(langSelect.value, modelSelect.value);
  langNote.textContent = avisa ? t("lang_note") : "";
  langNote.hidden = !avisa;
}
langSelect.addEventListener("change", syncLangNote);
modelSelect.addEventListener("change", syncLangNote);
syncLangNote();

// Sin WebGPU la inferencia cae a WASM (lenta): el modelo pequeño es mejor
// primera experiencia en esos equipos, y el modelo grande deja de ofrecerse
// porque sería inviable. El aviso va por delante porque la diferencia no es
// de matiz: un usuario de r/podcasting midió 2:15 en Chrome y más de una hora
// en Firefox con el mismo vídeo de 12 minutos.
const hasWebGPU = "gpu" in navigator;

// El modelo grande estaba definido pero oculto para todo el mundo: 800 MB
// arruinan la primera experiencia. Ese razonamiento vale para quien llega hoy,
// no para quien ya ha transcrito aquí — ese sabe lo que se descarga y por qué.
// Y para lenguas fuera del núcleo de Whisper es la diferencia entre servir y
// no servir: en r/notebooklm alguien concluyó que "Whisper no vale para
// vietnamita" cuando lo que fallaba era el tamaño del modelo.
if (hasWebGPU && loadHistory().length > 0 && !modelSelect.querySelector('option[value="max"]')) {
  const opt = document.createElement("option");
  opt.value = "max";
  opt.textContent = `${t("model_max")} · ${MODELS.max.sizeLabel}`;
  modelSelect.appendChild(opt);
}

if (!hasWebGPU) {
  modelSelect.value = "fast";
  modelSelect.querySelector('option[value="max"]')?.remove();
  const gpuNote = document.querySelector<HTMLElement>("#gpu-note");
  if (gpuNote) {
    gpuNote.textContent = t("gpu_note");
    gpuNote.hidden = false;
  }
  track("no_webgpu");
}

// Solo se registra el fallo: con las cabeceras COOP/COEP puestas esto debería
// estar siempre activo, así que cualquier `coi_off` en producción significa que
// las cabeceras no llegaron y el camino WASM volvió a un solo hilo.
if (!(window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated) {
  track("coi_off");
}

// Una integración puede fijar el modelo por URL (?model=fast) para que sus
// usuarios no elijan: quien monta Gate32 dentro de su panel sabe mejor que
// nosotros qué compromiso entre calidad y espera le encaja.
const requestedModel = new URLSearchParams(location.search).get("model");
if (requestedModel && requestedModel in MODELS) {
  modelSelect.value = requestedModel;
}

// El tamaño anunciado en el explicador sigue al modelo elegido, para que la
// expectativa sea siempre exacta.
function syncFirstRunSize(): void {
  const spec = MODELS[modelSelect.value as ModelQuality];
  if (!spec) return;
  document.querySelectorAll<HTMLElement>(".firstrun-size").forEach((el) => {
    el.textContent = spec.sizeLabel;
  });
}
modelSelect.addEventListener("change", syncFirstRunSize);

// El tráfico social llega sobre todo desde el móvil, donde el procesado es
// más lento: expectativas claras por delante para no quemar la visita.
const onPhone =
  window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 820;
if (onPhone) {
  modelSelect.value = "fast";
  const note = document.querySelector<HTMLElement>("#mobile-note");
  if (note) {
    note.textContent = t("mobile_note");
    note.hidden = false;
  }
}
// Se recuerda la última elección. Sin esto, el botón de confirmar sería un
// peaje en cada visita; con esto, a partir de la segunda vez ya está puesto lo
// que el usuario usa siempre y confirmar es un vistazo.
const MODEL_KEY = "gate32.model";
const LANG_KEY = "gate32.lang";
const hasOption = (sel: HTMLSelectElement, v: string): boolean =>
  [...sel.options].some((o) => o.value === v);
try {
  const m = localStorage.getItem(MODEL_KEY);
  if (m && hasOption(modelSelect, m)) modelSelect.value = m;
  const l = localStorage.getItem(LANG_KEY);
  if (l && hasOption(langSelect, l)) langSelect.value = l;
} catch {
  /* sin almacenamiento se usa el valor por defecto y ya está */
}
// La URL manda sobre lo recordado: si una integración fija el modelo, es porque
// sabe mejor que nosotros qué le encaja a sus usuarios.
if (requestedModel && requestedModel in MODELS && hasOption(modelSelect, requestedModel)) {
  modelSelect.value = requestedModel;
}
const remember = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ídem */
  }
};
modelSelect.addEventListener("change", () => remember(MODEL_KEY, modelSelect.value));
langSelect.addEventListener("change", () => remember(LANG_KEY, langSelect.value));

syncLangNote();
syncFirstRunSize();

// ── estado ──
interface Current {
  id: string;
  title: string;
  minutes: number;
  segments: Segment[];
  device: "webgpu" | "wasm" | "?";
  fromHistory: boolean;
}

const transcriber = new Transcriber();
let current: Current | null = null;
let busy = false;
let editTracked = false;
let objectUrl: string | null = null;

// Una vez respondida la encuesta no se vuelve a preguntar en este dispositivo:
// la descarga del modelo solo ocurre una vez, pero el usuario puede exportar
// muchas veces y no hay que convertir la pregunta en un peaje.
const USECASE_KEY = "gate32.usecase";
function storedUsecase(): boolean {
  try {
    return localStorage.getItem(USECASE_KEY) !== null;
  } catch {
    return false;
  }
}
let usecaseAnswered = storedUsecase();

// ── utilidades de UI ──

function show(el: HTMLElement): void {
  el.hidden = false;
}
function hide(el: HTMLElement): void {
  el.hidden = true;
}
/**
 * Oculta un elemento que puede no existir. La página de integración (/embed/)
 * no lleva las piezas de marketing, y la aplicación no debe depender de ellas
 * para funcionar: si falta una, no es motivo para romper una transcripción.
 */
function hideIfPresent(selector: string): void {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) el.hidden = true;
}

function setProgress(pct: number | null): void {
  const wrap = $("#progress-wrap");
  if (pct === null) {
    wrap.classList.add("indeterminate");
    progressBar.style.width = "40%";
  } else {
    wrap.classList.remove("indeterminate");
    progressBar.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
  }
}

// La descarga del modelo es el único tiempo muerto del flujo, y es también el
// único momento en el que el usuario ya está comprometido pero no puede hacer
// nada. Aprovecharlo para preguntar no cuesta conversión, siempre que la barra
// de progreso siga mandando: la pregunta va debajo y es opcional.
// Fase actual del proceso, para atribuir las cancelaciones.
let phase: "idle" | "download" | "inference" = "idle";

// Más de la mitad de los navegadores medidos no garantizan conservar el modelo
// (Safari lo borra tras unos días sin visitas). A quien esté en ese caso se le
// ofrece la única salida real: instalar la web como aplicación.
let storagePersisted = true;

// Una reunión grabada sin micrófono sale entera menos la voz de quien graba.
// Decirlo al final evita la conclusión más cara: creer que la herramienta se
// ha saltado frases al azar.
let meetingNoMic = false;

// De dónde viene lo que se va a transcribir. Lo fija quien llama a handleFile.
let pendingSource: "file" | "mic" | "meeting" | "media" = "file";

// Archivo elegido y a la espera de que se confirmen idioma y modelo.
let pending: { file: File | Blob; name: string; parts?: Blob[] } | null = null;

// Lo último que se ha grabado, guardado aparte de todo lo demás. Existe porque
// una hora y media de webinar se perdió entera: la grabación estaba bien y se
// tiró al fallar la decodificación, sin que hubiera copia en ningún sitio. Una
// grabación vale por sí misma, se pueda transcribir o no.
let recorded: { parts: Blob[]; name: string; mimeType: string } | null = null;

// Lo último transcrito, para poder repetirlo con un modelo mejor sin que el
// usuario tenga que volver a buscar el archivo. Es la diferencia entre "esto
// no sirve" y "ah, vale, con el otro modelo sí".
let lastRun: { file: File | Blob; name: string; quality: ModelQuality } | null = null;

let waitSurveyShown = false;
function showWaitSurvey(bytesDone: number): void {
  // Solo con descarga real en curso; una carga desde caché no llega aquí.
  if (waitSurveyShown || usecaseAnswered || bytesDone < 4e6) return;
  waitSurveyShown = true;
  show(waitSurvey);
  track("wait_survey_shown");
}

function resetToIdle(): void {
  pending = null;
  if (readyBox) hide(readyBox);
  busy = false;
  phase = "idle";
  hide(waitSurvey);
  hide(statusBox);
  hide(errorBox);
  hide(partialBox);
  partialBox.textContent = "";
  dropzone.classList.remove("disabled");
  renderRecents();
}

function showError(message: string, hint: string): void {
  busy = false;
  hide(waitSurvey);
  hide(statusBox);
  errorMsg.textContent = message;
  errorHint.textContent = hint;
  show(errorBox);
  dropzone.classList.remove("disabled");
}

// ── flujo principal ──

/**
 * Reabre una transcripción exportada en JSON. Permite transcribir en un equipo
 * potente y revisar el resultado en otro (petición de un usuario en
 * r/selfhosted).
 */
async function importJSON(file: File | Blob, name: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(await file.text()) as { segments?: unknown };
    const raw = parsed.segments;
    if (!Array.isArray(raw) || raw.length === 0) return false;
    const segments: Segment[] = [];
    for (const item of raw) {
      const s = item as Partial<Segment>;
      if (typeof s.start !== "number" || typeof s.end !== "number" || typeof s.text !== "string") {
        return false;
      }
      segments.push({ start: s.start, end: s.end, text: s.text });
    }
    current = {
      id: `${Date.now()}`,
      title: name.replace(/\.json$/i, ""),
      minutes: Math.max(1, Math.round((segments[segments.length - 1]?.end ?? 0) / 60)),
      segments,
      device: "?",
      fromHistory: true,
    };
    editTracked = false;
    hide(errorBox);
    track("json_import", { segments: segments.length });
    renderResult(t("json_imported"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Prepara un archivo y espera a que se confirme. **No transcribe.**
 *
 * Antes se arrancaba solo al soltar el archivo. Con dos ajustes y diez idiomas
 * era defendible; con cuatro modelos y cuarenta y siete idiomas ya no: los
 * selectores están encima de la zona de arrastre, así que se saltan, y quien
 * pulsa lo más grande de la pantalla arranca con lo que hubiera puesto. El
 * precio de equivocarse no es un clic, son 250 MB de descarga o diez minutos
 * transcribiendo en otro idioma.
 *
 * El clic añadido se paga con dos cosas: se recuerda la última elección, así
 * que a la segunda vez ya está bien, y el aviso de archivo grande pasa a este
 * panel en lugar de un diálogo del navegador encima.
 */
async function handleFile(file: File | Blob, name: string, parts?: Blob[]): Promise<void> {
  if (busy) return;

  // Un JSON exportado por Gate32 se reabre en vez de transcribirse.
  if (/\.json$/i.test(name) || file.type === "application/json") {
    if (await importJSON(file, name)) return;
    showError(t("json_invalid"), t("json_invalid_hint"));
    return;
  }

  pending = { file, name, ...(parts ? { parts } : {}) };
  hide(errorBox);
  hide(resultSection);
  if (readyName) readyName.textContent = name;
  const bytes = parts ? parts.reduce((n, p) => n + p.size, 0) : file.size;
  if (readySize) readySize.textContent = humanBytes(bytes, locale);
  // El aviso por tamaño va **antes** de decodificar. Un 22 % de los archivos
  // que se sueltan no se pueden leer, y la causa confirmada es la memoria del
  // navegador: enterarse después de dos minutos de espera es la peor versión
  // de ese fallo.
  if (readyWarn) {
    // Con la grabación partida en trozos el tamaño total ya no es el problema:
    // cada trozo se decodifica por su cuenta.
    const big = !parts && file.size > BIG_FILE_BYTES;
    if (big) track("big_file_prompt");
    readyWarn.textContent = big
      ? t(onPhone ? "big_file_note_phone" : "big_file_note", {
          size: humanBytes(bytes, locale),
        })
      : "";
    readyWarn.hidden = !big;
  }
  if (readyBox) show(readyBox);
  track("file_ready");
  startBtn?.focus();
}

/** Arranca de verdad, ya con el idioma y el modelo confirmados. */
async function startTranscription(
  file: File | Blob,
  name: string,
  pendingParts?: Blob[],
): Promise<void> {
  if (busy) return;
  pending = null;
  lastRun = { file, name, quality: modelSelect.value as ModelQuality };
  const parts = pendingParts;
  if (readyBox) hide(readyBox);

  busy = true;
  editTracked = false;
  hide(errorBox);
  hide(resultSection);
  hide(waitSurvey);
  show(statusBox);
  dropzone.classList.add("disabled");
  setProgress(null);
  statusText.textContent = t("reading");
  statusDetail.textContent = "";

  let audio: Float32Array;
  let duration: number;
  let chunked: boolean | undefined;
  try {
    // Una grabación larga llega partida en trozos independientes: se
    // decodifican de uno en uno, que es lo único que no depende de que quepa
    // el archivo entero en memoria.
    ({ audio, duration, chunked } =
      parts && parts.length > 1 ? await decodeParts(parts) : await decodeToMono16k(file));
    // Se mide aparte: es el camino nuevo y hay que saber si de verdad salva
    // archivos que antes se perdían.
    if (chunked) track("decode_chunked");
  } catch (err) {
    // El nombre del evento lleva la causa: GoatCounter (plan gratuito) solo
    // registra el nombre, no las propiedades. Sin esto los fallos son opacos.
    // La extensión va incluida porque "no se pudo decodificar" sin saber de qué
    // formato no permite arreglar nada.
    const ext = (/\.([a-z0-9]{1,5})$/i.exec(name)?.[1] ?? "sin-extension").toLowerCase();
    // El tamaño va en el nombre del evento porque separa las dos causas: un
    // formato que el navegador no entiende y un archivo que no le cabe.
    const big = err instanceof DecodeError && err.big;
    track("transcribe_error", { stage: "decode", kind: "decode", ext, big });
    track("transcribe_error_decode");
    track(`transcribe_error_decode_${ext}`);
    track(big ? "transcribe_error_decode_grande" : "transcribe_error_decode_formato");
    showError(
      err instanceof Error ? err.message : t("unsupported"),
      big ? t("decode_hint_big") : t("decode_hint"),
    );
    return;
  }

  const minutes = Math.max(1, Math.round(duration / 60));
  if (duration / 60 > LONG_FILE_WARN_MIN) {
    const go = confirm(t("long_confirm", { min: Math.round(duration / 60) }));
    if (!go) {
      resetToIdle();
      return;
    }
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  player.src = objectUrl;
  hide(player);

  const quality = modelSelect.value as ModelQuality;
  const language = langSelect.value;
  current = {
    id: `${Date.now()}`,
    title: name,
    minutes,
    segments: [],
    device: "?",
    fromHistory: false,
  };
  // El origen lo declara quien llama, no se deduce del nombre: un archivo que
  // el usuario hubiera llamado "reunion-3.mp3" se contaba como grabación.
  const source = pendingSource;
  pendingSource = "file";
  if (source !== "meeting") meetingNoMic = false;
  // GoatCounter solo guarda el nombre del evento, no sus propiedades: para
  // saber cuánto pesa la captura de pestaña hace falta un nombre propio.
  if (source === "meeting") track("transcribe_start_meeting");
  if (source === "media") track("transcribe_start_media");
  track("transcribe_start", { model: quality, source, minutes, lang });

  // Antes de bajar 80 MB conviene saber que caben y que no los van a borrar:
  // sin esto el fallo llega a mitad de descarga y como QuotaExceededError.
  const spec0 = MODELS[quality];
  const store = await ensureStorage(spec0.bytes);
  // Solo se registra el caso malo: si el navegador no garantiza permanencia, el
  // usuario que vuelva se comerá otra descarga completa.
  storagePersisted = store.persisted;
  if (!store.persisted) track("storage_not_persisted");
  if (!store.ok) {
    track("storage_full");
    showError(
      t("storage_error", {
        need: humanBytes(spec0.bytes, locale),
        free: humanBytes(store.freeBytes ?? 0, locale),
      }),
      t("storage_hint"),
    );
    return;
  }

  const loadFiles = new Map<string, number>();
  const tLoad0 = performance.now();

  phase = "download";
  statusText.textContent = t("preparing");
  transcriber.load(quality, {
    onDevice(device) {
      if (current) current.device = device;
      statusDetail.textContent = device === "webgpu" ? t("device_gpu") : t("device_wasm");
    },
    onLoadProgress(fileName, loaded) {
      // Progreso por bytes descargados sobre el tamaño conocido del modelo:
      // monotónico y comprensible ("120 MB de ~250 MB").
      loadFiles.set(fileName, loaded);
      let sum = 0;
      loadFiles.forEach((v) => (sum += v));
      const spec = MODELS[quality];
      const doneMB = Math.round(sum / 1e6);
      const totalMB = Math.round(spec.bytes / 1e6);
      statusText.textContent = t("downloading");

      // Estimación de lo que queda a partir del ritmo medido. Solo se muestra
      // cuando hay muestra suficiente para no dar una cifra que baile.
      const elapsed = (performance.now() - tLoad0) / 1000;
      const eta = sum > 4e6 && elapsed > 3 ? ((spec.bytes - sum) / (sum / elapsed)) : 0;
      statusDetail.textContent =
        eta > 3 && eta < 3600
          ? t("downloading_eta", { done: doneMB, total: totalMB, eta: clock(eta) })
          : t("downloading_size", { done: doneMB, total: totalMB });
      setProgress(Math.min(99, (sum / spec.bytes) * 100));
      showWaitSurvey(sum);
    },
    onReady(cached, seconds) {
      hide(waitSurvey);
      phase = "inference";
      track("model_ready", {
        model: quality,
        seconds: Math.round(seconds),
        cached,
      });
      statusText.textContent = t("transcribing");
      statusDetail.textContent = t("of_audio", { t: clock(duration) });
      setProgress(0);
      show(partialBox);
      const tGen0 = performance.now();
      transcriber.transcribe(audio, language, {
        onWindowProgress(done, total, partial) {
          setProgress((done / total) * 100);
          const tail = partial.slice(-2).map((s) => s.text).join(" ");
          if (tail) partialBox.textContent = `…${tail.slice(-220)}`;
          const elapsed = (performance.now() - tGen0) / 1000;
          const eta = done > 0 ? (elapsed / done) * (total - done) : 0;
          statusDetail.textContent =
            done < total
              ? t("block_progress", { done, total, eta: clock(eta) })
              : t("finishing");
        },
        onDone(segments, genSeconds, failed) {
          // Bloques que el modelo no pudo transcribir. Se dicen: un hueco
          // silencioso en mitad del texto, sin explicación, se lee como que la
          // herramienta se ha inventado el corte.
          if (failed && failed > 0) {
            track("transcribe_partial");
            track(`transcribe_partial_${quality}`);
          }
          finishTranscription(
            segments,
            quality,
            genSeconds,
            (performance.now() - tLoad0) / 1000,
            failed ?? 0,
          );
        },
        onError(_stage, message) {
          track("transcribe_error", { stage: "transcribe", kind: "inference" });
          track("transcribe_error_inference");
          track(`transcribe_error_inference_${quality}`);
          transcriber.reset();
          showError(t("infer_error", { msg: message }), t("infer_hint"));
        },
      });
    },
    onDone() {
      /* la carga no emite done */
    },
    onError(_stage, message) {
      track("transcribe_error", { stage: "load", kind: "network" });
      track("transcribe_error_load");
      track(`transcribe_error_load_${quality}`);
      transcriber.reset();
      showError(t("load_error", { msg: message }), t("load_hint"));
    },
  });
}

function finishTranscription(
  segments: Segment[],
  quality: ModelQuality,
  genSeconds: number,
  totalSeconds: number,
  failed = 0,
): void {
  if (!current) return;
  busy = false;
  hide(statusBox);
  hide(partialBox);
  dropzone.classList.remove("disabled");

  if (segments.length === 0) {
    showError(t("no_voice"), t("no_voice_hint"));
    return;
  }

  current.segments = segments;
  track("transcribe_done", {
    model: quality,
    device: current.device,
    minutes: current.minutes,
    seconds: Math.round(genSeconds),
    total_seconds: Math.round(totalSeconds),
    lang,
  });
  track(`transcribe_done_${quality}`);
  track(`transcribe_done_${current.device}`);

  saveToHistory({
    id: current.id,
    title: current.title,
    date: Date.now(),
    minutes: current.minutes,
    segments,
  });

  // Con un modelo pequeño el resultado puede salir flojo, y hasta ahora la
  // única salida era volver a empezar de cero. Ofrecer la repetición con el
  // modelo siguiente convierte "esto no sirve" en "con el otro sí".
  const better = nextQuality(quality);
  if (retryBox && retryBtn && better && lastRun) {
    retryBtn.textContent = t("retry_better", { model: modelLabel(better) });
    retryBtn.dataset["quality"] = better;
    show(retryBox);
  } else if (retryBox) {
    hide(retryBox);
  }

  const setup = totalSeconds - genSeconds;
  renderResult(
    t("done_meta", { gen: clock(genSeconds) }) +
      (setup > 20 ? t("done_setup", { setup: clock(setup) }) : "") +
      t("done_model", {
        model: modelLabel(quality),
        device: current.device === "webgpu" ? "WebGPU" : "WASM",
      }) +
      // Un hueco en mitad del texto sin explicación se lee como que la
      // herramienta se ha comido una frase por su cuenta.
      (failed > 0 ? t("done_failed", { n: failed }) : ""),
  );
}

/** El siguiente escalón de calidad, si está disponible en este equipo. */
function nextQuality(q: ModelQuality): ModelQuality | null {
  const order: ModelQuality[] = ["fast", "balanced", "accurate", "max"];
  const i = order.indexOf(q);
  for (let n = i + 1; n < order.length; n++) {
    const cand = order[n];
    // "max" solo existe con WebGPU: en WASM sería una espera inaceptable.
    if (cand && (cand !== "max" || hasWebGPU)) return cand;
  }
  return null;
}

/** Pinta la lista de segmentos editables. Se repinta tras una corrección. */
function renderSegments(): void {
  if (!current) return;
segmentsBox.replaceChildren();
  current.segments.forEach((seg, i) => {
    const row = document.createElement("div");
    row.className = "segment";
    row.dataset["index"] = String(i);

    const time = document.createElement("button");
    time.type = "button";
    time.className = "seg-time";
    time.textContent = clock(seg.start);
    time.addEventListener("click", () => {
      if (current?.fromHistory) return;
      player.currentTime = seg.start;
      void player.play();
    });

    const text = document.createElement("span");
    text.className = "seg-text";
    text.contentEditable = "plaintext-only";
    if (text.contentEditable !== "plaintext-only") text.contentEditable = "true";
    text.textContent = seg.text;
    text.addEventListener("input", () => {
      if (!current) return;
      const target = current.segments[i];
      if (target) target.text = text.textContent ?? "";
      if (!editTracked) {
        editTracked = true;
        track("edit_used");
      }
      persistEditsSoon();
    });

    row.append(time, text);
    segmentsBox.appendChild(row);
  });

  hide(proThanks);
  hideIfPresent("#usecase");
  hideIfPresent("#pro-features");
  // Antes se ponía a false aquí, lo que reabría la encuesta a quien ya la
  // había contestado y anulaba la memoria por dispositivo.
  usecaseAnswered = storedUsecase();
  proBtn.disabled = false;
  show(proBtn);
  show(resultSection);
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  renderRecents();
}

function modelLabel(q: ModelQuality): string {
  if (q === "fast") return t("model_fast");
  if (q === "accurate") return t("model_accurate");
  if (q === "max") return t("model_max");
  return t("model_balanced");
}

// ── resultado y edición ──

function renderResult(metaText: string): void {
  if (!current) return;
  resultTitle.textContent = current.title;
  const micNote = meetingNoMic && !current.fromHistory ? ` · ${t("meeting_mic_off")}` : "";
  resultMeta.textContent = `${current.minutes} min · ${metaText}${micNote}`;
  if (!current.fromHistory) show(player);
  else hide(player);

  // El aviso va aquí y no antes: durante la espera solo añadiría ruido, y en
  // este punto el usuario ya sabe si le ha merecido la pena volver.
  // El diálogo real si el navegador lo ofrece; el párrafo explicativo solo
  // donde no existe (Safari e iOS), que es justo donde más falta hace y menos
  // se puede hacer.
  const persistNote = document.querySelector<HTMLElement>("#persist-note");
  const necesita = !current.fromHistory && !storagePersisted;
  // El navegador decide cuándo dispara `beforeinstallprompt` y puede hacerlo
  // después de esto; queda anotado para ofrecerlo en cuanto llegue.
  installWanted = necesita;
  if (necesita && installPrompt) {
    offerInstall();
    if (persistNote) persistNote.hidden = true;
  } else if (persistNote && necesita) {
    persistNote.textContent = t("persist_note");
    persistNote.hidden = false;
  } else if (persistNote) {
    persistNote.hidden = true;
  }

  renderSegments();
}

let persistTimer: number | undefined;
function persistEditsSoon(): void {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    if (current) updateHistorySegments(current.id, current.segments);
  }, 800);
}

player.addEventListener("timeupdate", () => {
  if (!current || current.fromHistory) return;
  const time = player.currentTime;
  const rows = segmentsBox.querySelectorAll<HTMLElement>(".segment");
  let activeIndex = -1;
  current.segments.forEach((s, i) => {
    if (time >= s.start && time < s.end) activeIndex = i;
  });
  rows.forEach((row, i) => row.classList.toggle("active", i === activeIndex));
});

// ── exports ──

function download(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/**
 * Longitud de línea para SRT/VTT. Whisper devuelve frases enteras y eso, como
 * subtítulo, obliga a reformatear a mano en Subtitle Edit; el desplegable trae
 * los tres estándares habituales y por defecto el de Netflix (42/2 líneas).
 */
function cueOptions(): CueOptions {
  const value = Number(cueCharsSelect?.value ?? 42);
  return { maxChars: Number.isFinite(value) ? value : 42, maxLines: 2 };
}

document.querySelectorAll<HTMLButtonElement>("[data-export]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!current || current.segments.length === 0) return;
    const format = btn.dataset["export"] ?? "";
    const attribution = attributionCheck.checked;
    const segs = current.segments;
    const title = current.title;
    switch (format) {
      case "copy":
        try {
          await navigator.clipboard.writeText(toTXT(segs, false));
          btn.textContent = t("copied");
          setTimeout(() => (btn.textContent = t("copy")), 1600);
        } catch {
          alert(t("clipboard_fail"));
          return;
        }
        break;
      case "txt":
        download(toTXT(segs, attribution, t("attribution")), exportName(title, "txt"), "text/plain;charset=utf-8");
        break;
      case "md":
        download(toMD(segs, title, attribution, t("attribution")), exportName(title, "md"), "text/markdown;charset=utf-8");
        break;
      case "srt":
        download(toSRT(segs, cueOptions()), exportName(title, "srt"), "application/x-subrip;charset=utf-8");
        break;
      case "vtt":
        download(toVTT(segs, cueOptions()), exportName(title, "vtt"), "text/vtt;charset=utf-8");
        break;
      case "json":
        download(toJSON(segs), exportName(title, "json"), "application/json;charset=utf-8");
        break;
      default:
        return;
    }
    track("export", { format, lang });
    const usecase = document.querySelector<HTMLElement>("#usecase");
    if (!usecaseAnswered && usecase) usecase.hidden = false;
  });
});

// ── encuesta de caso de uso (1 clic, anónima) ──
// Se pregunta en dos momentos: durante la descarga del modelo (tiempo muerto)
// y tras el primer export. El evento distingue el momento porque las tasas de
// respuesta no son comparables entre sí y mezclarlas falsearía el reparto.

document.querySelectorAll<HTMLButtonElement>(".usecase-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    const kind = btn.dataset["kind"] ?? "otro";
    const when = btn.dataset["when"] ?? "export";
    track("use_case", { kind, when });
    track(`use_case_${when}_${kind}`);
    usecaseAnswered = true;
    try {
      localStorage.setItem(USECASE_KEY, kind);
    } catch {
      /* modo privado: la encuesta simplemente se podrá repetir */
    }
    btn.classList.add("picked");

    const box = btn.closest<HTMLElement>("#wait-survey, #usecase");
    if (!box) return;
    if (box.id === "usecase") {
      show($("#usecase-thanks"));
      setTimeout(() => hide(box), 1500);
      return;
    }
    // En la espera todo lo que cambia está por debajo de la barra de progreso,
    // así que la barra no se mueve al colapsar la pregunta.
    box.querySelector<HTMLElement>(".wait-survey-q")?.setAttribute("hidden", "");
    box.querySelector<HTMLElement>(".wait-survey-opts")?.setAttribute("hidden", "");
    const thanks = box.querySelector<HTMLElement>(".wait-survey-thanks");
    if (thanks) show(thanks);
  });
});

// ── entrada de archivos ──

dropzone.addEventListener("click", () => {
  if (!busy) fileInput.click();
});
dropzone.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !busy) {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) void handleFile(f, f.name);
  fileInput.value = "";
});
["dragover", "dragenter"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    if (!busy) dropzone.classList.add("dragging");
  }),
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragging");
  }),
);
dropzone.addEventListener("drop", (e) => {
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f && !busy) void handleFile(f, f.name);
});

// ── grabación con micrófono ──

let stopMic: (() => void) | null = null;
let micRecording = false;
let recTimer: number | undefined;

recordBtn.addEventListener("click", async () => {
  if (busy && !micRecording) return;
  // Con una pestaña grabándose, el micrófono puede estar ya dentro de la
  // mezcla: una segunda grabación dejaría dos cronómetros y dos archivos.
  if (recordingTab()) return;
  if (micRecording) {
    stopMic?.();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // También por trozos: una entrevista de dos horas con el micrófono tiene
    // exactamente el mismo problema que un webinar de hora y media.
    stopMic = recordInParts(stream, MINUTES_PER_PART, (parts, mimeType) => {
      stream.getTracks().forEach((tr) => tr.stop());
      window.clearInterval(recTimer);
      recordBtn.classList.remove("recording");
      if (meetingBtn) meetingBtn.disabled = false;
      if (mediaBtn) mediaBtn.disabled = false;
      recordLabel.textContent = t("record");
      micRecording = false;
      stopMic = null;
      if (parts.length === 0) return;
      const stamp = new Date().toTimeString().slice(0, 5).replace(":", ".");
      const name = `${t("recording_prefix")}-${stamp}`;
      recorded = { parts, name, mimeType };
      showRecovery();
      pendingSource = "mic";
      void handleFile(parts[0] as Blob, name, parts);
    });
    micRecording = true;
    const t0 = Date.now();
    recordBtn.classList.add("recording");
    if (meetingBtn) meetingBtn.disabled = true;
    if (mediaBtn) mediaBtn.disabled = true;
    recordLabel.textContent = t("stop_rec", { t: "00:00" });
    recTimer = window.setInterval(() => {
      recordLabel.textContent = t("stop_rec", { t: clock((Date.now() - t0) / 1000) });
    }, 500);
  } catch {
    showError(t("mic_error"), t("mic_hint"));
  }
});

// ── captura del audio de otra pestaña ──
//
// Un solo mecanismo, dos botones, y no por cosmética: el micrófono se
// comporta al revés en cada uso. En una reunión tu voz es parte de la
// conversación; en un vídeo ajeno solo metería el ruido de tu habitación
// encima del audio que quieres transcribir, y pediría un permiso inútil.
//
// Separarlos también resuelve un problema de reconocimiento: quien viene a
// transcribir una videollamada no se para a pensar si el botón que menciona
// YouTube también le sirve. La etiqueta tiene que hablar de lo que trae al
// usuario, no de cómo está implementado por dentro.
//
// Dos pasos a propósito. El primer clic explica la casilla de compartir audio
// —sin ella el navegador entrega la pestaña muda— y, en el caso de una
// reunión, que grabar a otras personas exige avisarles. El diálogo del
// navegador tapa la página, así que un aviso simultáneo no lo lee nadie.

type TabMode = "meeting" | "media";

interface TabCapture {
  capture: Awaited<ReturnType<typeof captureTab>> | null;
  /** Detiene la grabación por trozos; null si no hay ninguna en curso. */
  stop: (() => void) | null;
  recording: boolean;
  timer: number | undefined;
  armed: boolean;
}

const tabState: Record<TabMode, TabCapture> = {
  meeting: { capture: null, stop: null, recording: false, timer: undefined, armed: false },
  media: { capture: null, stop: null, recording: false, timer: undefined, armed: false },
};

const recordingTab = (): boolean => tabState.meeting.recording || tabState.media.recording;

function wireTabCapture(mode: TabMode, btn: HTMLButtonElement): void {
  const label = btn.querySelector<HTMLElement>("[data-label]");
  const st = tabState[mode];
  const other = mode === "meeting" ? mediaBtn : meetingBtn;
  const idle = mode === "meeting" ? "meeting_btn" : "media_btn";
  const armedKey = mode === "meeting" ? "meeting_start" : "media_start";
  const stopKey = mode === "meeting" ? "meeting_stop" : "media_stop";
  const hint =
    mode === "meeting"
      ? `${t("meeting_pick")} ${t("meeting_consent")}`
      : `${t("media_pick")} ${t("media_drm")}`;

  const reset = (): void => {
    st.armed = false;
    btn.classList.remove("recording");
    recordBtn.disabled = false;
    if (other) other.disabled = false;
    if (label) label.textContent = t(idle);
    if (tabHint) hide(tabHint);
  };

  btn.addEventListener("click", async () => {
    if (busy && !st.recording) return;
    if (st.recording) {
      st.stop?.();
      return;
    }
    // Dos capturas a la vez darían dos cronómetros y dos archivos solapados.
    if (micRecording || recordingTab()) return;
    if (!st.armed) {
      st.armed = true;
      if (tabHint) {
        tabHint.textContent = hint;
        show(tabHint);
      }
      if (label) label.textContent = t(armedKey);
      track(`${mode}_click`);
      return;
    }
    try {
      st.capture = await captureTab(mode === "meeting");
      track(`${mode}_start`);
      if (mode === "meeting") {
        meetingNoMic = !st.capture.withMic;
        if (meetingNoMic) track("meeting_no_mic");
      }
      // Se graba en trozos de pocos minutos, cada uno un archivo válido por su
      // cuenta. Una sola grabación de hora y media es indecodificable y ya
      // costó un webinar entero.
      st.stop = recordInParts(st.capture.stream, MINUTES_PER_PART, (parts, mimeType) => {
        st.capture?.stop();
        st.capture = null;
        window.clearInterval(st.timer);
        st.recording = false;
        st.stop = null;
        reset();
        if (parts.length === 0) return;
        const stamp = new Date().toTimeString().slice(0, 5).replace(":", ".");
        const name = `${t(mode === "meeting" ? "meeting_prefix" : "media_prefix")}-${stamp}`;
        // Antes que nada, la grabación queda a salvo y descargable pase lo que
        // pase después.
        recorded = { parts, name, mimeType };
        showRecovery();
        pendingSource = mode;
        void handleFile(parts[0] as Blob, name, parts);
      });
      st.recording = true;
      // Si se corta la compartición desde la barra del navegador, se cierra la
      // grabación igual que si se hubiera pulsado «Detener» aquí: dejar de
      // compartir es dejar de grabar. Lo contrario sería seguir apuntando
      // silencio sin que nadie lo note hasta el final.
      st.capture.onEnded(() => {
        if (st.recording) {
          track(`${mode}_ended_external`);
          st.stop?.();
        }
      });

      const t0 = Date.now();
      if (tabHint) hide(tabHint);
      recordBtn.disabled = true;
      if (other) other.disabled = true;
      btn.classList.add("recording");
      if (label) label.textContent = t(stopKey, { t: "00:00" });
      st.timer = window.setInterval(() => {
        if (label) label.textContent = t(stopKey, { t: clock((Date.now() - t0) / 1000) });
      }, 500);
    } catch (err) {
      reset();
      // Cancelar el diálogo de compartir no es un fallo: no se avisa de nada.
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      if (err instanceof NoTabAudioError) {
        track(`${mode}_no_audio`);
        showError(t(mode === "meeting" ? "meeting_no_audio" : "media_no_audio"), t("tab_no_audio_hint"));
      } else {
        track(`${mode}_error`);
        showError(t("tab_error"), t("tab_error_hint"));
      }
    }
  });
}

if (canCaptureTab()) {
  if (meetingBtn) {
    meetingBtn.hidden = false;
    wireTabCapture("meeting", meetingBtn);
  }
  if (mediaBtn) {
    mediaBtn.hidden = false;
    wireTabCapture("media", mediaBtn);
  }
}

// ── instalar como aplicación ──
//
// Es el mayor lastre medido y va a peor: **el 75,5 % de quien transcribe** usa
// un navegador que no garantiza conservar el modelo (65 % → 73,9 % → 75,5 % en
// tres mediciones). Tres de cada cuatro se comen otra descarga de 80–250 MB al
// volver, y volver es la condición previa de cualquier suscripción.
//
// Hasta ahora solo había un párrafo pidiendo que buscaran "Instalar" en el
// menú del navegador. Nadie sigue una instrucción de tres pasos escondida bajo
// una transcripción. `beforeinstallprompt` permite ofrecer el diálogo real de
// instalación con un clic, y además **se puede medir**: un aviso que nadie
// pulsa se distingue de uno que nadie ve.

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

let installPrompt: InstallPrompt | null = null;
/** Hay una transcripción recién hecha y el modelo no está a salvo. */
let installWanted = false;

window.addEventListener("beforeinstallprompt", (e) => {
  // Sin esto el navegador enseña su propia barra cuando le parece, casi siempre
  // antes de que la persona sepa si la herramienta le sirve.
  e.preventDefault();
  installPrompt = e as InstallPrompt;
  // Puede llegar con la transcripción ya en pantalla: entonces se ofrece ahora
  // y se retira el párrafo, que solo tiene sentido si no hay diálogo.
  if (installWanted) {
    offerInstall();
    const persistNote = document.querySelector<HTMLElement>("#persist-note");
    if (persistNote) persistNote.hidden = true;
  }
});

window.addEventListener("appinstalled", () => {
  track("install_done");
  installPrompt = null;
  installWanted = false;
  if (installBox) hide(installBox);
});

let installShown = false;

/** Se ofrece tras la primera transcripción: antes no hay motivo para aceptar. */
function offerInstall(): void {
  if (!installBox || !installPrompt || storagePersisted) return;
  // Una sola vez por carga: quien transcribe tres archivos seguidos lo ve una
  // vez, y así el denominador significa "personas que lo vieron" y no "veces
  // que se pintó", que es lo que hay que dividir para saber si convence.
  if (!installShown) {
    installShown = true;
    track("install_shown");
  }
  show(installBox);
}

installBtn?.addEventListener("click", async () => {
  if (!installPrompt) return;
  track("install_click");
  await installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  track(outcome === "accepted" ? "install_accepted" : "install_dismissed");
  // El evento no se puede reutilizar: una vez consumido, el navegador solo
  // vuelve a ofrecerlo en otra visita.
  installPrompt = null;
  installWanted = false;
  if (installBox) hide(installBox);
});

// ── pase de corrección ──
//
// La primera transcripción larga que salió bien lo pedía a gritos: 69 minutos
// sobre **Claude** y Whisper escribió **"Cloud" noventa veces**. Todo lo demás
// era correcto y el texto no servía igual, porque un nombre propio mal oído de
// forma sistemática invalida la transcripción para estudiar o citar.
//
// No se puede arreglar antes de transcribir: `prompt_ids`, el mecanismo de
// Whisper para darle vocabulario esperado, está documentado en transformers.js
// pero sin implementar. Así que se arregla después — que es, además, donde seis
// señales independientes de usuarios llevan semanas diciendo que está el hueco
// que nadie cubre (RESEARCH.md §1f, §1h, §1i).

let lastCorrection: Correction | null = null;

function syncFixCount(): void {
  if (!fixCount || !fixApply) return;
  const find = fixFind?.value ?? "";
  const n = current ? countMatches(current.segments, find, fixCase?.checked ?? false) : 0;
  fixCount.textContent = find ? t("fix_count", { n }) : "";
  fixApply.disabled = n === 0;
}

fixFind?.addEventListener("input", syncFixCount);
fixCase?.addEventListener("change", syncFixCount);

fixApply?.addEventListener("click", () => {
  if (!current || !fixFind?.value) return;
  const find = fixFind.value;
  const to = fixReplace?.value ?? "";
  const caseSensitive = fixCase?.checked ?? false;
  const count = countMatches(current.segments, find, caseSensitive);
  if (count === 0) return;
  // Se guarda el estado anterior entero: reemplazar en ochocientos párrafos sin
  // vuelta atrás es una función que nadie se atreve a usar.
  lastCorrection = { find, replace: to, before: current.segments, count };
  current.segments = replaceAll(current.segments, find, to, caseSensitive);
  updateHistorySegments(current.id, current.segments);
  track("fix_replace");
  renderSegments();
  if (fixUndo) {
    fixUndo.textContent = t("fix_undo", { n: count });
    show(fixUndo);
  }
  syncFixCount();
});

fixUndo?.addEventListener("click", () => {
  if (!current || !lastCorrection) return;
  current.segments = lastCorrection.before;
  updateHistorySegments(current.id, current.segments);
  lastCorrection = null;
  track("fix_undo");
  renderSegments();
  if (fixUndo) hide(fixUndo);
  syncFixCount();
});

// ── la grabación no se pierde ──
//
// Una hora y media de webinar se perdió entera: la grabación estaba bien y se
// tiró al fallar la decodificación, porque solo vivía en memoria. Ahora queda
// aparte y se puede descargar aunque todo lo demás falle. Una grabación vale
// por sí misma, se pueda transcribir o no.

function showRecovery(): void {
  if (!recoveryBox || !recorded) return;
  const total = recorded.parts.reduce((n, p) => n + p.size, 0);
  if (recoveryNote) {
    recoveryNote.textContent = t("recovery_note", {
      n: recorded.parts.length,
      size: humanBytes(total, locale),
    });
  }
  show(recoveryBox);
}

recoveryBtn?.addEventListener("click", () => {
  if (!recorded) return;
  track("recording_download");
  const ext = recorded.mimeType.includes("ogg") ? "ogg" : "webm";
  recorded.parts.forEach((part, i) => {
    const url = URL.createObjectURL(part);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      recorded && recorded.parts.length > 1
        ? `${recorded.name}-${String(i + 1).padStart(2, "0")}.${ext}`
        : `${recorded?.name}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });
});

// ── confirmar y arrancar ──

startBtn?.addEventListener("click", () => {
  if (!pending) return;
  void startTranscription(pending.file, pending.name, pending.parts);
});

retryBtn?.addEventListener("click", () => {
  const q = retryBtn.dataset["quality"];
  if (!lastRun || !q) return;
  // El modelo mayor pasa a ser el elegido: si alguien lo necesita una vez,
  // casi siempre lo necesita la siguiente.
  if (!modelSelect.querySelector(`option[value="${q}"]`) && q === "max") {
    const opt = document.createElement("option");
    opt.value = "max";
    opt.textContent = `${t("model_max")} · ${MODELS.max.sizeLabel}`;
    modelSelect.appendChild(opt);
  }
  modelSelect.value = q;
  remember(MODEL_KEY, q);
  syncFirstRunSize();
  syncLangNote();
  track("retry_better");
  track(`retry_better_${q}`);
  hide(resultSection);
  void startTranscription(lastRun.file, lastRun.name);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

readyCancel?.addEventListener("click", () => {
  pending = null;
  if (readyBox) hide(readyBox);
  fileInput.value = "";
  track("file_ready_cancel");
});

// ── cancelar / cerrar errores / nueva ──

cancelBtn.addEventListener("click", () => {
  transcriber.reset();
  // Cancelar no es un error: mezclarlos impedía distinguir un fallo real de
  // alguien que se cansó de esperar. La fase va en el nombre porque cansarse
  // de la descarga y cansarse de la transcripción piden arreglos distintos.
  track("transcribe_cancel");
  track(`transcribe_cancel_${phase}`);
  resetToIdle();
});
$("#error-dismiss").addEventListener("click", () => hide(errorBox));
newBtn.addEventListener("click", () => {
  hide(resultSection);
  current = null;
  resetToIdle();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Pro y compartir ──

proBtn.addEventListener("click", () => {
  track("pro_interest");
  proBtn.disabled = true;
  hide(proBtn);
  const features = document.querySelector<HTMLElement>("#pro-features");
  if (features) features.hidden = false;
});

document.querySelectorAll<HTMLButtonElement>(".pro-feature").forEach((btn) => {
  btn.addEventListener("click", () => {
    track("pro_feature", { feature: btn.dataset["feature"] ?? "?" });
    // en GoatCounter cada feature queda como su propio evento
    track(`pro_feature_${btn.dataset["feature"] ?? "otra"}`);
    btn.disabled = true;
    btn.classList.add("picked");
    show(proThanks);
  });
});

shareBtn.addEventListener("click", async () => {
  const url = lang === "en" ? "https://gate32.autoritasai.com/en/" : "https://gate32.autoritasai.com/";
  const data = { title: t("share_title"), text: t("share_text"), url };
  if (navigator.share) {
    try {
      await navigator.share(data);
      track("share", { channel: "webshare" });
    } catch {
      /* usuario canceló */
    }
  } else {
    await navigator.clipboard.writeText(data.url);
    shareBtn.textContent = t("link_copied");
    setTimeout(() => (shareBtn.textContent = t("share_btn")), 1600);
    track("share", { channel: "clipboard" });
  }
});

// ── historial ──

function renderRecents(): void {
  const entries = loadHistory();
  if (entries.length === 0) {
    hide(recentsBox);
    return;
  }
  recentsList.replaceChildren();
  entries.slice(0, 6).forEach((entry) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "recent-chip";
    const date = new Date(entry.date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
    chip.innerHTML = `<strong></strong><span>${date} · ${entry.minutes} min</span>`;
    const strong = chip.querySelector("strong");
    if (strong) strong.textContent = entry.title;
    chip.addEventListener("click", () => openFromHistory(entry));
    recentsList.appendChild(chip);
  });
  show(recentsBox);
}

function openFromHistory(entry: HistoryEntry): void {
  if (busy) return;
  current = {
    id: entry.id,
    title: entry.title,
    minutes: entry.minutes,
    segments: entry.segments.map((s) => ({ ...s })),
    device: "?",
    fromHistory: true,
  };
  editTracked = false;
  hide(errorBox);
  renderResult(t("from_history"));
}

// ── arranque ──

initAnalytics();
trackVisit();
renderRecents();

// PWA: el service worker hace que la app cargue sin conexión
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin SW la app funciona igual, solo pierde el arranque offline */
    });
  });
}

// Hook mínimo para pruebas E2E (solo activo con ?e2e=1 en la URL): permite
// inyectar un resultado sin ejecutar el modelo, para probar edición y exports
// en entornos sin acceso al CDN de modelos.
if (new URLSearchParams(location.search).has("e2e")) {
  (window as unknown as { __g32: object }).__g32 = {
    showResult(segments: Segment[]): void {
      current = {
        id: "e2e",
        title: "e2e-audio.wav",
        minutes: 1,
        segments,
        device: "?",
        fromHistory: true,
      };
      renderResult("e2e");
    },
    // Simula la fase de descarga para poder comprobar que la encuesta de
    // espera aparece sin depender del CDN de modelos.
    waitSurvey(): void {
      show(statusBox);
      showWaitSurvey(9e6);
    },
    // Recorre el final real de una transcripción (incluido el ofrecimiento de
    // repetir con un modelo mejor), que `showResult` se salta por diseño.
    finishRun(quality: ModelQuality): void {
      current = {
        id: "e2e",
        title: "e2e-audio.wav",
        minutes: 1,
        segments: [],
        device: "webgpu",
        fromHistory: false,
      };
      lastRun = { file: new Blob(["x"]), name: "e2e-audio.wav", quality };
      busy = true;
      finishTranscription([{ start: 0, end: 2, text: "prueba" }], quality, 1, 2, 0);
    },
    // Simula una grabación terminada para comprobar la red de seguridad, que
    // es justo lo que faltaba cuando se perdió hora y media de webinar.
    fakeRecording(nParts: number): void {
      recorded = {
        parts: Array.from({ length: nParts }, () => new Blob(["x".repeat(1000)])),
        name: "e2e-grabacion",
        mimeType: "audio/webm",
      };
      showRecovery();
    },
    // El navegador solo revela si conserva el almacenamiento al empezar una
    // transcripción de verdad; sin esto el aviso nunca se daría por necesario.
    noPersist(): void {
      storagePersisted = false;
    },
    // `beforeinstallprompt` no se puede provocar desde Playwright (depende de
    // criterios del navegador y de que la app no esté ya instalada), así que se
    // inyecta un evento equivalente para comprobar el panel y el recuento.
    installOffer(): void {
      const e = new Event("beforeinstallprompt") as InstallPrompt;
      e.prompt = () => Promise.resolve();
      Object.defineProperty(e, "userChoice", {
        value: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(e);
    },
    // No se puede conceder el micrófono desde Playwright, así que la exclusión
    // entre las dos grabaciones se comprueba desde su efecto observable.
    micRecording(on: boolean): void {
      if (meetingBtn) meetingBtn.disabled = on;
      if (mediaBtn) mediaBtn.disabled = on;
    },
  };
}
