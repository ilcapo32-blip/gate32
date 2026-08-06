# LAUNCH.md · Kit de lanzamiento de Gate32

Textos listos para copiar/pegar. Los posts en comunidades debe publicarlos el
propietario desde sus cuentas (autenticidad); este kit elimina el trabajo de
redacción. Orden recomendado: directorios primero (tráfico lento pero
permanente + backlinks), comunidades después (picos de tráfico para leer
métricas), Product Hunt cuando el flujo esté rodado con usuarios reales.

---

## 1 · Directorios (altas gratuitas, ~10 min cada una)

Enviar a: **There's An AI For That** (theresanaiforthat.com/submit),
**Futurepedia** (futurepedia.io/submit-tool), **AlternativeTo**
(alternativeto.net — crear ficha y marcarla como alternativa a Otter.ai,
Notta y HappyScribe), **Uneed** (uneed.best), **AI Tool Hunt**, **Toolify**.

**Nombre:** Gate32
**Tagline (EN):** Free unlimited audio/video transcription & subtitles — AI runs 100% in your browser, files never leave your device.
**Descripción (EN):**
> Gate32 transcribes audio and video into text and SRT/VTT subtitles using
> Whisper running entirely in your browser (WebGPU). No sign-up, no minute
> caps, no watermarks, no uploads — your files never leave your device, and it
> even works offline after the first model download. Edit the transcript with
> synced audio playback and export TXT, Markdown, SRT, VTT or JSON. Free and
> open source. Spanish-first UI, supports dozens of languages.
**Categorías:** Transcription, Speech-to-Text, Subtitles, Privacy
**Alternativa a:** Otter.ai, Notta, HappyScribe, Maestra

---

## 2 · Reddit (transparencia: "lo he hecho yo")

Subreddits candidatos: r/InternetesHispano, r/programacion_es, r/podcasting
(EN), r/journalism (EN), r/DataHoarder (EN, aman lo local), r/selfhosted (EN),
r/opositores. **Leer las reglas de autopromoción de cada sub antes de postear.**

**Título (ES):** He hecho un transcriptor de audio gratuito donde el archivo nunca sale de tu navegador (la IA corre en local con WebGPU)

**Cuerpo (ES):**
> Estaba harto de que todos los transcriptores "gratis" tuvieran trampa:
> 30 minutos de prueba, registro obligatorio, marcas de agua… y todos suben tu
> audio a sus servidores.
>
> Así que he montado Gate32: Whisper ejecutándose dentro del navegador con
> WebGPU. Sin cuenta, sin límites de minutos, sin marca de agua. La prueba de
> que no sube nada: carga la página, desconecta internet y sigue funcionando.
>
> Transcribe audio y vídeo (también graba del micro), puedes corregir el texto
> con el audio sincronizado y exporta TXT, Markdown, SRT, VTT o JSON. Interfaz
> en español, decenas de idiomas. Código abierto.
>
> https://gate32.autoritasai.com — me encantaría feedback, sobre todo de
> tiempos en distintos equipos (en portátil con GPU va más rápido que el
> tiempo real; sin GPU tira de WASM y es más lento).

**Title (EN, para subs en inglés):** I built a free transcription tool where your audio never leaves your browser (Whisper on WebGPU, no sign-up, no caps)

---

## 3 · Menéame

**Titular:** Gate32: transcriptor de audio y subtítulos gratuito donde la IA corre en tu navegador y el archivo nunca se sube
**Entradilla:** Herramienta española de código abierto: Whisper con WebGPU en local, sin registro, sin límites de minutos y sin marca de agua. Funciona hasta sin conexión una vez cargado el modelo.

---

## 4 · X / Twitter (hilo)

> 1/ Todos los transcriptores "gratis" tienen la misma trampa: minutos de
> prueba, registro… y tu audio viajando a sus servidores.
>
> He construido lo contrario: Gate32. La IA corre EN tu navegador. Tu archivo
> no sale de tu equipo. Gratis y sin límites. 🧵
>
> 2/ La prueba de privacidad más simple del mundo: carga la web, pon el modo
> avión, transcribe. Funciona. Porque no hay servidor al que subir nada.
>
> 3/ Transcribe audio y vídeo, edita con el audio sincronizado, exporta
> TXT/Markdown/SRT/VTT. Subtítulos sin marca de agua para YouTube, Premiere o
> DaVinci. Con GPU va más rápido que el tiempo real.
>
> 4/ Es código abierto y no tiene ni cuentas ni cookies. Si transcribes
> entrevistas, clases o reuniones, pruébalo y dime tiempos:
> https://gate32.autoritasai.com

---

## 5 · LinkedIn

> ¿Cuánto vale la confidencialidad de una entrevista, una reunión de dirección
> o una consulta profesional?
>
> Los transcriptores online procesan tu audio en sus servidores. Gate32 hace
> lo contrario: el reconocimiento de voz (Whisper) se ejecuta íntegramente en
> tu navegador. El archivo nunca sale de tu equipo — funciona incluso sin
> conexión.
>
> Gratis, sin registro, sin límites. Texto y subtítulos SRT/VTT con editor
> sincronizado. Código abierto.
>
> Especialmente pensado para periodismo, legal, sanidad e investigación:
> https://gate32.autoritasai.com

---

## 6 · Product Hunt (cuando haya usuarios rodados)

**Name:** Gate32
**Tagline:** Unlimited free transcription that never uploads your files
**First comment (maker):** historia honesta: "todo lo 'gratis' tenía trampa →
la IA en el navegador la elimina; local = privacidad verificable + coste
marginal cero = sin límites". Pedir feedback de rendimiento por dispositivo.

---

## 7 · Contactos de nicho (email/DM cortos)

Asociaciones de periodistas, facultades de comunicación, comunidades de
podcasting en español. Mensaje base:

> Hola — he construido una herramienta gratuita que transcribe entrevistas
> sin que el audio salga del ordenador (la IA corre en el navegador; funciona
> hasta sin conexión). Pensé que podía ser útil para [vuestros asociados /
> alumnos] cuando trabajan con fuentes o material sensible:
> https://gate32.autoritasai.com/entrevistas/ — cualquier feedback es oro.

---

## Qué medir tras cada acción (ver VALIDATION.md)

- Pico de visitas por canal (referrers en Vercel Analytics).
- Activación (transcribe_done) y finalización — vía GoatCounter cuando esté
  activado el código del sitio.
- Comentarios cualitativos: velocidad por dispositivo y casos de uso reales
  (alimentan las páginas SEO y la decisión de la capa Pro).
