# LAUNCH.md · Kit de lanzamiento de Gate32

Textos listos para copiar/pegar. Los posts en comunidades debe publicarlos el
propietario desde sus cuentas (autenticidad); este kit elimina el trabajo de
redacción. Orden recomendado: directorios primero (tráfico lento pero
permanente + backlinks), comunidades después (picos de tráfico para leer
métricas), Product Hunt cuando el flujo esté rodado con usuarios reales.

---

## 1 · Directorios (altas gratuitas, ~10 min cada una)

**Prioridad 1 — PeerPush** (peerpush.com): alta gratuita (entra en cola de
publicación), backlink de autoridad alta y, sobre todo, está optimizado para
que lo lean ChatGPT, Perplexity, Copilot y los AI Overviews → cuenta como
directorio **y** como palanca GEO. Recomendado por un comentarista en
r/indiehackers, verificado antes de incluirlo.

Después: **There's An AI For That** (theresanaiforthat.com/submit),
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

**Dos reglas aprendidas en el primer intento (r/indiehackers, agosto 2026):**

1. **Escribe en el idioma del sub.** En subs anglófonos, en inglés: Reddit
   traduce automáticamente y el texto traducido pierde fuerza y alcance. Usa el
   guion en inglés de más abajo.
2. **Distingue el tipo de comunidad**, porque sirven para cosas distintas:
   - *Comunidades de makers* (r/indiehackers, r/SideProject, Hacker News):
     dan **feedback, backlinks y pistas de distribución**, no clientes. El
     primer comentario recibido allí nos descubrió PeerPush y confirmó que el
     gancho es la privacidad local. Valiosísimo — pero no esperes activación.
   - *Comunidades de usuarios finales* (periodismo, opositores, estudiantes,
     podcasting, creadores): de ahí salen las transcripciones reales, la
     retención y, eventualmente, el MRR. **Son la prioridad del Plan-100.**

**Cómo responder a los comentarios** (importa más que el post): agradece,
refuerza el diferenciador con algo *verificable* (la prueba del modo avión), y
pide un dato concreto — sobre todo **cuánto tarda en su equipo**, que es la
métrica H2 que no podemos medir de otra forma. Un comentarista que prueba y
reporta tiempos vale más que diez upvotes.

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

**Body (EN):**
> Every "free" transcription tool I tried had a catch: 30 trial minutes, a
> sign-up wall, watermarked exports — and all of them upload your audio to
> their servers. Otter's free plan lets you import 3 files. Not per month:
> ever.
>
> So I built Gate32: Whisper running inside the browser via WebGPU. No account,
> no minute caps, no watermark. The privacy claim is verifiable — load the
> page, go offline once the model is cached, and it still transcribes, because
> there is no backend to upload anything to.
>
> It handles audio and video (or records from your mic), lets you fix the text
> with synced playback, and exports TXT, Markdown, SRT, VTT and JSON. Spanish
> and English UI, dozens of languages. Open source.
>
> https://gate32.autoritasai.com/en/
>
> What I'd genuinely like feedback on: **how long it takes on your machine**.
> On my laptop 9 minutes of audio took 1:33 with WebGPU, but I have no idea how
> it behaves across different GPUs — and without WebGPU it falls back to WASM,
> which is much slower. Timings very welcome.

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
