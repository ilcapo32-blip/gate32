// Internacionalización mínima: el idioma lo fija el atributo lang del HTML
// de cada página (es en /, en en /en/). Solo cubre las cadenas generadas
// desde JavaScript; el contenido estático vive en cada página.

export type Lang = "es" | "en";

export const lang: Lang =
  typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "es";

export const locale = lang === "en" ? "en-GB" : "es-ES";

const dict = {
  es: {
    reading: "Leyendo el audio…",
    preparing: "Preparando el modelo de IA…",
    downloading: "Descargando el modelo (solo la primera vez)…",
    downloading_size: "{done} MB de ~{total} MB",
    transcribing: "Transcribiendo…",
    device_gpu: "acelerado por tu gráfica (WebGPU)",
    device_wasm: "modo compatible (WASM)",
    of_audio: "{t} de audio",
    block_progress: "bloque {done} de {total} · quedan ~{eta}",
    finishing: "terminando…",
    decode_error: "No se ha podido leer el audio de este archivo. Prueba con MP3, WAV, M4A, OGG, MP4 o WEBM.",
    too_short: "El archivo es demasiado corto (menos de medio segundo).",
    no_webaudio: "Este navegador no soporta Web Audio.",
    unsupported: "Archivo no soportado.",
    decode_hint: "Formatos que funcionan bien: MP3, WAV, M4A, OGG, MP4 y WEBM.",
    long_confirm: "El archivo dura {min} minutos. Los archivos muy largos consumen bastante memoria del navegador. ¿Continuar?",
    load_error: "No se ha podido cargar el modelo: {msg}",
    load_hint: "El modelo se descarga de Hugging Face la primera vez: comprueba tu conexión o inténtalo de nuevo en unos minutos.",
    infer_error: "El modelo ha fallado durante la transcripción: {msg}",
    infer_hint: "Prueba con el modelo Rápido, con un archivo más corto, o recarga la página. En portátiles antiguos el modo Preciso puede quedarse sin memoria.",
    no_voice: "No se ha detectado voz en el archivo.",
    no_voice_hint: "Comprueba que el idioma seleccionado es correcto y que el audio contiene habla audible.",
    done_meta: "Transcrito en {gen}",
    done_setup: " (más {setup} de preparación del modelo, solo la primera vez)",
    done_model: " · modelo {model} · {device}",
    model_fast: "Rápido",
    model_balanced: "Equilibrado",
    model_accurate: "Preciso",
    model_max: "Máxima",
    copied: "¡Copiado!",
    copy: "Copiar",
    clipboard_fail: "No se ha podido copiar al portapapeles.",
    record: "Grabar con el micrófono",
    stop_rec: "Detener ({t})",
    mic_error: "No se ha podido acceder al micrófono.",
    mic_hint: "Concede permiso de micrófono en el navegador y vuelve a intentarlo.",
    from_history: "recuperado del historial de este dispositivo (sin audio)",
    link_copied: "¡Enlace copiado!",
    share_btn: "Compartir Gate32",
    share_title: "Gate32 — transcripción con IA local",
    share_text: "Transcribe audio y vídeo gratis, sin límites y sin subir archivos: la IA corre en tu navegador.",
    recording_prefix: "grabacion",
    attribution: "Transcrito con Gate32 · https://gate32.autoritasai.com",
    mobile_note:
      "📱 En el móvil funciona, pero va más lento que en un ordenador. Para probarlo ya, graba 30 segundos con el micrófono; para clases o entrevistas largas, mejor desde el portátil.",
    json_imported: "abierto desde un JSON de Gate32 (sin audio)",
    json_invalid: "Ese JSON no parece una transcripción de Gate32.",
    json_invalid_hint: "Debe ser un archivo exportado con el botón JSON de Gate32.",
  },
  en: {
    reading: "Reading the audio…",
    preparing: "Preparing the AI model…",
    downloading: "Downloading the model (first time only)…",
    downloading_size: "{done} MB of ~{total} MB",
    transcribing: "Transcribing…",
    device_gpu: "accelerated by your GPU (WebGPU)",
    device_wasm: "compatibility mode (WASM)",
    of_audio: "{t} of audio",
    block_progress: "chunk {done} of {total} · ~{eta} left",
    finishing: "finishing…",
    decode_error: "Couldn't read audio from this file. Try MP3, WAV, M4A, OGG, MP4 or WEBM.",
    too_short: "The file is too short (under half a second).",
    no_webaudio: "This browser doesn't support Web Audio.",
    unsupported: "Unsupported file.",
    decode_hint: "Formats that work well: MP3, WAV, M4A, OGG, MP4 and WEBM.",
    long_confirm: "This file is {min} minutes long. Very long files use a lot of browser memory. Continue?",
    load_error: "Couldn't load the model: {msg}",
    load_hint: "The model downloads from Hugging Face on first use: check your connection or try again in a few minutes.",
    infer_error: "The model failed during transcription: {msg}",
    infer_hint: "Try the Fast model, a shorter file, or reload the page. On older laptops the Accurate model can run out of memory.",
    no_voice: "No speech detected in this file.",
    no_voice_hint: "Check that the selected language is correct and the audio contains audible speech.",
    done_meta: "Transcribed in {gen}",
    done_setup: " (plus {setup} preparing the model, first time only)",
    done_model: " · {model} model · {device}",
    model_fast: "Fast",
    model_balanced: "Balanced",
    model_accurate: "Accurate",
    model_max: "Maximum",
    copied: "Copied!",
    copy: "Copy",
    clipboard_fail: "Couldn't copy to the clipboard.",
    record: "Record with the microphone",
    stop_rec: "Stop ({t})",
    mic_error: "Couldn't access the microphone.",
    mic_hint: "Grant microphone permission in your browser and try again.",
    from_history: "restored from this device's history (no audio)",
    link_copied: "Link copied!",
    share_btn: "Share Gate32",
    share_title: "Gate32 — private in-browser AI transcription",
    share_text: "Transcribe audio & video for free, no limits, no uploads: the AI runs in your browser.",
    recording_prefix: "recording",
    attribution: "Transcribed with Gate32 · https://gate32.autoritasai.com",
    mobile_note:
      "📱 It works on phones, but slower than on a computer. For a quick try, record 30 seconds with the mic; for long lectures or interviews, use a laptop.",
    json_imported: "opened from a Gate32 JSON file (no audio)",
    json_invalid: "That JSON doesn't look like a Gate32 transcript.",
    json_invalid_hint: "It should be a file exported with Gate32's JSON button.",
  },
} as const;

type Key = keyof (typeof dict)["es"];

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = dict[lang][key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  }
  return s;
}
