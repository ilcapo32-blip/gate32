// Gate32 · orquestación de la interfaz: estados, transcripción, edición,
// exports, historial y analítica. Las cadenas generadas por JS pasan por
// i18n (el idioma lo fija el atributo lang de cada página).

import "./styles.css";
import { decodeToMono16k, ACCEPT, LONG_FILE_WARN_MIN } from "./lib/audio";
import { Transcriber } from "./lib/transcriber";
import {
  toTXT,
  toMD,
  toSRT,
  toVTT,
  toJSON,
  clock,
  exportName,
} from "./lib/formats";
import type { ModelQuality, Segment } from "./lib/types";
import { t, lang, locale } from "./lib/i18n";
import { initAnalytics, track, trackVisit } from "./lib/analytics";
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
const newBtn = $<HTMLButtonElement>("#new-btn");
const proBtn = $<HTMLButtonElement>("#pro-btn");
const proThanks = $("#pro-thanks");
const shareBtn = $<HTMLButtonElement>("#share-btn");
const recentsBox = $("#recents");
const recentsList = $("#recents-list");

fileInput.accept = ACCEPT;

// Sin WebGPU la inferencia cae a WASM (lenta): el modelo pequeño es mejor
// primera experiencia en esos equipos, y el modelo grande deja de ofrecerse
// porque sería inviable.
if (!("gpu" in navigator)) {
  modelSelect.value = "fast";
  modelSelect.querySelector('option[value="max"]')?.remove();
}

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
let usecaseAnswered = false;
let objectUrl: string | null = null;

// ── utilidades de UI ──

function show(el: HTMLElement): void {
  el.hidden = false;
}
function hide(el: HTMLElement): void {
  el.hidden = true;
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

function resetToIdle(): void {
  busy = false;
  hide(statusBox);
  hide(errorBox);
  hide(partialBox);
  partialBox.textContent = "";
  dropzone.classList.remove("disabled");
  renderRecents();
}

function showError(message: string, hint: string): void {
  busy = false;
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

async function handleFile(file: File | Blob, name: string): Promise<void> {
  if (busy) return;

  // Un JSON exportado por Gate32 se reabre en vez de transcribirse.
  if (/\.json$/i.test(name) || file.type === "application/json") {
    if (await importJSON(file, name)) return;
    showError(t("json_invalid"), t("json_invalid_hint"));
    return;
  }

  busy = true;
  editTracked = false;
  hide(errorBox);
  hide(resultSection);
  show(statusBox);
  dropzone.classList.add("disabled");
  setProgress(null);
  statusText.textContent = t("reading");
  statusDetail.textContent = "";

  let audio: Float32Array;
  let duration: number;
  try {
    ({ audio, duration } = await decodeToMono16k(file));
  } catch (err) {
    track("transcribe_error", { stage: "decode", kind: "decode" });
    showError(err instanceof Error ? err.message : t("unsupported"), t("decode_hint"));
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
  track("transcribe_start", {
    model: quality,
    source: name.startsWith(`${t("recording_prefix")}-`) ? "mic" : "file",
    minutes,
    lang,
  });

  const loadFiles = new Map<string, number>();
  const tLoad0 = performance.now();

  statusText.textContent = t("preparing");
  transcriber.load(quality, {
    onDevice(device) {
      if (current) current.device = device;
      statusDetail.textContent = device === "webgpu" ? t("device_gpu") : t("device_wasm");
    },
    onLoadProgress(progress, fileName) {
      loadFiles.set(fileName, progress);
      let sum = 0;
      loadFiles.forEach((v) => (sum += v));
      const pct = sum / loadFiles.size;
      statusText.textContent = t("downloading");
      setProgress(pct);
    },
    onReady(cached, seconds) {
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
        onDone(segments, genSeconds) {
          finishTranscription(segments, quality, genSeconds, (performance.now() - tLoad0) / 1000);
        },
        onError(_stage, message) {
          track("transcribe_error", { stage: "transcribe", kind: "inference" });
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

  saveToHistory({
    id: current.id,
    title: current.title,
    date: Date.now(),
    minutes: current.minutes,
    segments,
  });

  const setup = totalSeconds - genSeconds;
  renderResult(
    t("done_meta", { gen: clock(genSeconds) }) +
      (setup > 20 ? t("done_setup", { setup: clock(setup) }) : "") +
      t("done_model", {
        model: modelLabel(quality),
        device: current.device === "webgpu" ? "WebGPU" : "WASM",
      }),
  );
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
  resultMeta.textContent = `${current.minutes} min · ${metaText}`;
  if (!current.fromHistory) show(player);
  else hide(player);

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
  hide($("#usecase"));
  usecaseAnswered = false;
  proBtn.disabled = false;
  show(proBtn);
  hide($("#pro-features"));
  show(resultSection);
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  renderRecents();
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
        download(toSRT(segs), exportName(title, "srt"), "application/x-subrip;charset=utf-8");
        break;
      case "vtt":
        download(toVTT(segs), exportName(title, "vtt"), "text/vtt;charset=utf-8");
        break;
      case "json":
        download(toJSON(segs), exportName(title, "json"), "application/json;charset=utf-8");
        break;
      default:
        return;
    }
    track("export", { format, lang });
    if (!usecaseAnswered) show($("#usecase"));
  });
});

// ── encuesta de caso de uso (1 clic, anónima) ──

document.querySelectorAll<HTMLButtonElement>(".usecase-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    const kind = btn.dataset["kind"] ?? "otro";
    track("use_case", { kind });
    track(`use_case_${kind}`);
    usecaseAnswered = true;
    btn.classList.add("picked");
    show($("#usecase-thanks"));
    setTimeout(() => hide($("#usecase")), 1500);
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

let recorder: MediaRecorder | null = null;
let recChunks: Blob[] = [];
let recTimer: number | undefined;

recordBtn.addEventListener("click", async () => {
  if (busy && !recorder) return;
  if (recorder) {
    recorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = [];
    recorder = new MediaRecorder(stream);
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) recChunks.push(e.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((tr) => tr.stop());
      window.clearInterval(recTimer);
      recordBtn.classList.remove("recording");
      recordLabel.textContent = t("record");
      const blob = new Blob(recChunks, { type: recorder?.mimeType ?? "audio/webm" });
      recorder = null;
      if (blob.size > 0) {
        const stamp = new Date().toTimeString().slice(0, 5).replace(":", ".");
        void handleFile(blob, `${t("recording_prefix")}-${stamp}`);
      }
    });
    recorder.start();
    const t0 = Date.now();
    recordBtn.classList.add("recording");
    recordLabel.textContent = t("stop_rec", { t: "00:00" });
    recTimer = window.setInterval(() => {
      recordLabel.textContent = t("stop_rec", { t: clock((Date.now() - t0) / 1000) });
    }, 500);
  } catch {
    showError(t("mic_error"), t("mic_hint"));
  }
});

// ── cancelar / cerrar errores / nueva ──

cancelBtn.addEventListener("click", () => {
  transcriber.reset();
  track("transcribe_error", { stage: "cancel", kind: "user" });
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
  show($("#pro-features"));
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
  };
}
