// Gate32 · orquestación de la interfaz: estados, transcripción, edición,
// exports, historial y analítica.

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
import { track, trackVisit } from "./lib/analytics";
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

async function handleFile(file: File | Blob, name: string): Promise<void> {
  if (busy) return;
  busy = true;
  editTracked = false;
  hide(errorBox);
  hide(resultSection);
  show(statusBox);
  dropzone.classList.add("disabled");
  setProgress(null);
  statusText.textContent = "Leyendo el audio…";
  statusDetail.textContent = "";

  let audio: Float32Array;
  let duration: number;
  try {
    ({ audio, duration } = await decodeToMono16k(file));
  } catch (err) {
    track("transcribe_error", { stage: "decode", kind: "decode" });
    showError(
      err instanceof Error ? err.message : "Archivo no soportado.",
      "Formatos que funcionan bien: MP3, WAV, M4A, OGG, MP4 y WEBM.",
    );
    return;
  }

  const minutes = Math.max(1, Math.round(duration / 60));
  if (duration / 60 > LONG_FILE_WARN_MIN) {
    const go = confirm(
      `El archivo dura ${Math.round(duration / 60)} minutos. Los archivos muy largos consumen bastante memoria del navegador. ¿Continuar?`,
    );
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
    source: name.startsWith("grabacion-") ? "mic" : "file",
    minutes,
  });

  const loadFiles = new Map<string, number>();
  const tLoad0 = performance.now();

  statusText.textContent = "Preparando el modelo de IA…";
  transcriber.load(quality, {
    onDevice(device) {
      if (current) current.device = device;
      statusDetail.textContent =
        device === "webgpu" ? "acelerado por tu gráfica (WebGPU)" : "modo compatible (WASM)";
    },
    onLoadProgress(progress, fileName) {
      loadFiles.set(fileName, progress);
      let sum = 0;
      loadFiles.forEach((v) => (sum += v));
      const pct = sum / loadFiles.size;
      statusText.textContent = "Descargando el modelo (solo la primera vez)…";
      setProgress(pct);
    },
    onReady(cached, seconds) {
      track("model_ready", {
        model: quality,
        seconds: Math.round(seconds),
        cached,
      });
      statusText.textContent = "Transcribiendo…";
      statusDetail.textContent = `${clock(duration)} de audio`;
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
            done < total ? `bloque ${done} de ${total} · quedan ~${clock(eta)}` : "terminando…";
        },
        onDone(segments, seconds) {
          void seconds;
          finishTranscription(segments, quality, (performance.now() - tLoad0) / 1000);
        },
        onError(_stage, message) {
          track("transcribe_error", { stage: "transcribe", kind: "inference" });
          transcriber.reset();
          showError(
            `El modelo ha fallado durante la transcripción: ${message}`,
            "Prueba con el modelo Rápido, con un archivo más corto, o recarga la página. En portátiles antiguos el modo Preciso puede quedarse sin memoria.",
          );
        },
      });
    },
    onDone() {
      /* la carga no emite done */
    },
    onError(_stage, message) {
      track("transcribe_error", { stage: "load", kind: "network" });
      transcriber.reset();
      showError(
        `No se ha podido cargar el modelo: ${message}`,
        "El modelo se descarga de Hugging Face la primera vez: comprueba tu conexión o inténtalo de nuevo en unos minutos.",
      );
    },
  });
}

function finishTranscription(segments: Segment[], quality: ModelQuality, totalSeconds: number): void {
  if (!current) return;
  busy = false;
  hide(statusBox);
  hide(partialBox);
  dropzone.classList.remove("disabled");

  if (segments.length === 0) {
    showError(
      "No se ha detectado voz en el archivo.",
      "Comprueba que el idioma seleccionado es correcto y que el audio contiene habla audible.",
    );
    return;
  }

  current.segments = segments;
  track("transcribe_done", {
    model: quality,
    device: current.device,
    minutes: current.minutes,
    seconds: Math.round(totalSeconds),
  });

  saveToHistory({
    id: current.id,
    title: current.title,
    date: Date.now(),
    minutes: current.minutes,
    segments,
  });

  renderResult(
    `Transcrito en ${clock(totalSeconds)} · modelo ${modelLabel(quality)} · ${
      current.device === "webgpu" ? "WebGPU" : "WASM"
    }`,
  );
}

function modelLabel(q: ModelQuality): string {
  return q === "fast" ? "Rápido" : q === "accurate" ? "Preciso" : "Equilibrado";
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
    time.title = "Saltar a este punto del audio";
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
  proBtn.disabled = false;
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
  const t = player.currentTime;
  const rows = segmentsBox.querySelectorAll<HTMLElement>(".segment");
  let activeIndex = -1;
  current.segments.forEach((s, i) => {
    if (t >= s.start && t < s.end) activeIndex = i;
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
          btn.textContent = "¡Copiado!";
          setTimeout(() => (btn.textContent = "Copiar"), 1600);
        } catch {
          alert("No se ha podido copiar al portapapeles.");
          return;
        }
        break;
      case "txt":
        download(toTXT(segs, attribution), exportName(title, "txt"), "text/plain;charset=utf-8");
        break;
      case "md":
        download(toMD(segs, title, attribution), exportName(title, "md"), "text/markdown;charset=utf-8");
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
    track("export", { format });
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
      stream.getTracks().forEach((t) => t.stop());
      window.clearInterval(recTimer);
      recordBtn.classList.remove("recording");
      recordLabel.textContent = "Grabar con el micrófono";
      const blob = new Blob(recChunks, { type: recorder?.mimeType ?? "audio/webm" });
      recorder = null;
      if (blob.size > 0) {
        const stamp = new Date().toTimeString().slice(0, 5).replace(":", ".");
        void handleFile(blob, `grabacion-${stamp}`);
      }
    });
    recorder.start();
    const t0 = Date.now();
    recordBtn.classList.add("recording");
    recordLabel.textContent = "Detener (00:00)";
    recTimer = window.setInterval(() => {
      recordLabel.textContent = `Detener (${clock((Date.now() - t0) / 1000)})`;
    }, 500);
  } catch {
    showError(
      "No se ha podido acceder al micrófono.",
      "Concede permiso de micrófono en el navegador y vuelve a intentarlo.",
    );
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
  show(proThanks);
});

shareBtn.addEventListener("click", async () => {
  const data = {
    title: "Gate32 — transcripción con IA local",
    text: "Transcribe audio y vídeo gratis, sin límites y sin subir archivos: la IA corre en tu navegador.",
    url: "https://gate32.autoritasai.com/",
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
      track("share", { channel: "webshare" });
    } catch {
      /* usuario canceló */
    }
  } else {
    await navigator.clipboard.writeText(data.url);
    shareBtn.textContent = "¡Enlace copiado!";
    setTimeout(() => (shareBtn.textContent = "Compartir Gate32"), 1600);
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
    const date = new Date(entry.date).toLocaleDateString("es-ES", {
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
  renderResult("recuperado del historial de este dispositivo (sin audio)");
}

// ── arranque ──

trackVisit();
renderRecents();

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
      renderResult("resultado inyectado para pruebas");
    },
  };
}
