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

### Pack de alta (copiar y pegar campo a campo)

| Campo | Valor |
|---|---|
| **Nombre** | Gate32 |
| **URL** | https://gate32.autoritasai.com/en/ (usa la inglesa en directorios anglófonos) |
| **Repositorio** | https://github.com/ilcapo32-blip/gate32 |
| **Tagline corto** (≤60) | `Transcription that never uploads your files` |
| **Tagline largo** (≤100) | `Free unlimited AI transcription & subtitles — runs 100% in your browser` |
| **Descripción breve** (≤160) | `Transcribe audio and video to text or SRT/VTT subtitles with AI running in your browser. No uploads, no sign-up, no limits. Free and open source.` |
| **Categorías** | Transcription · Speech-to-Text · Subtitles · Privacy · Productivity · Developer Tools |
| **Etiquetas** | whisper, transcription, subtitles, srt, vtt, webgpu, privacy, local-ai, speech-to-text, offline, open-source, spanish |
| **Modelo de precio** | Free (100% free, no paid tier yet) |
| **Público** | Journalists, students, podcasters, video creators, researchers, professionals handling sensitive audio |
| **Alternativa a** | Otter.ai · Notta · HappyScribe · Maestra · Rev |
| **Licencia** | MIT |
| **Plataformas** | Web (Chrome, Edge, Firefox, Safari) · PWA instalable |

**Descripción larga (EN)** — para el campo de 500-1000 caracteres:
> Gate32 transcribes audio and video into text and SRT/VTT subtitles using
> Whisper running entirely in your browser via WebGPU (with a WASM fallback).
> There is no processing backend, so your files physically cannot be uploaded —
> you can verify it by going offline once the model is cached and watching it
> keep working. No sign-up, no minute caps, no watermarks. Edit the transcript
> with synced audio playback, jump to any timestamp, and export TXT, Markdown,
> SRT, VTT or JSON. Works with MP3, WAV, M4A, OGG, MP4, WEBM and more, or record
> straight from your microphone. Spanish and English interface, dozens of
> transcription languages. Free, open source (MIT), and it costs nothing to run
> because your own device does the work.

**Campos que los autorrellenos suelen fallar** (revisar SIEMPRE):

- **Use cases / funciones:** ningún directorio debe listar *Translation*.
  Gate32 transcribe (`task: "transcribe"`), **no traduce**. Afirmarlo atraería
  usuarios que rebotan y ensuciaría la métrica de activación.
- **Alternatives:** rellenar siempre (Otter.ai, Notta, HappyScribe, Rev,
  Maestra). Es el campo por el que la gente descubre productos: buscan
  "alternativa a Otter", no "transcriptor local".
- **MRR / ingresos:** dejar vacío mientras sea 0. El campo suele traer un
  placeholder tipo `$1000`; no es un valor por defecto, es un ejemplo.
- **Descripción:** aprovechar el límite (los directorios modernos alimentan a
  ChatGPT/Perplexity). Densa, factual y **con las limitaciones incluidas**:
  las fuentes que se autolimitan se citan con más confianza.
- **Capturas:** subir al menos 3 (landing, resultado con editor y exports,
  móvil). La del resultado es la que enseña el valor real.

**Assets** (todos en el repo, ya públicos):

| Necesitan | Fichero |
|---|---|
| Logo cuadrado | `public/icon-512.png` |
| Imagen social 1200×630 | `public/og.png` |
| Captura escritorio | `docs/media/captura-escritorio.png` |
| Captura del resultado | `docs/media/captura-resultado.png` |
| Captura móvil | `docs/media/captura-movil.png` |

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

**Reglas concretas por subreddit (aprendidas en el lanzamiento):**

- **r/selfhosted: el post acabó retirado, y no por la IA.** Lo que se anotó
  aquí en su día —"un bot retira el post y lo restaura al declarar el uso de
  IA"— resultó ser solo la mitad. El equipo de moderación lo retiró después
  por la **regla 6**: los proyectos con menos de tres meses de vida solo se
  pueden publicar en el *New Project Megathread* del momento, nunca como post
  propio. Eso se sabía leyendo las normas, y no se leyó.
  **Si se vuelve a intentar, es en el megahilo.**
- **Y r/selfhosted probablemente no sea nuestro sitio.** El comentario más
  citado del hilo fue *"How is this self hosting? Where is the open source
  code?"*. Es una objeción justa: allí "self-hosted" significa *mi servidor*,
  y lo nuestro es *ningún servidor*. Suena parecido y no lo es. Documentamos
  el autoalojamiento (README §Self-hosting), pero no es el argumento con el
  que llegamos, así que llegamos como intrusos.
- **La voz de IA costó el hilo entero.** Dos comentarios lo dijeron sin
  rodeos: *"habría sido más rápido y menos vergonzoso si respondieras como una
  persona en vez de preguntarle a Claude"* y *"F off chatgpt"*. Es la tercera y
  cuarta confirmación independiente. La regla no es "que suene más humano":
  es que **el texto lo escriba el humano**.
- **Los subs anglófonos son los que están trayendo tráfico real**
  (Reino Unido y Australia en las primeras 24 h, 4 de 5 visitas a `/en`).
  Publicar en inglés y enlazar `/en/` no era opcional.

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

## 2b · Responder en hilos ajenos (donde alguien ya pregunta)

Es el canal de mayor conversión y el que más fácil se estropea. Un texto que
empieza por "podéis probar Gate32" es un anuncio: lo borran o lo hunden.

**Estructura que funciona:**
1. Responde de verdad la pregunta.
2. Menciona **varias** opciones, no solo la nuestra.
3. **Declara que Gate32 es tuyo.** Innegociable: recomendarlo sin decirlo
   incumple las normas de Reddit y quema la marca si se descubre.
4. Añade una limitación real.
5. Termina preguntando algo (tiempos, equipo, caso de uso).

**Nunca escribir:**

| Falso o ambiguo | Correcto |
|---|---|
| "todos los formatos de texto" | "TXT, MD, SRT, VTT y JSON" (no hacemos DOCX ni PDF) |
| "corregir en tiempo real con el audio" | "editar con el audio sincronizado" (no hay transcripción en directo) |
| "totalmente privado" | "desconecta internet tras cargar el modelo y sigue funcionando" |
| "sin límites" a secas | "sin límites, aunque en móvil va lento y la primera vez descarga el modelo" |

**No reutilizar la misma plantilla literal** en varios hilos: Reddit detecta el
texto repetido y los moderadores lo tratan como spam. Reescribe cada respuesta
adaptándola al hilo.

**Mencionar competidores (Transcrisper, whisper.cpp, MacWhisper, faster-whisper)
suma más de lo que resta:** una respuesta que solo nombra tu herramienta es
publicidad; una que nombra tres es ayuda, y el enlace sigue estando ahí.

## 2c · Prensa ganada: Tropical Podcasting (2026-08-13)

Primera mención que nadie pidió. Boletín de podcasting en español, desde
Puerto Rico, editor **Julio Axel Ponce**. Nos detectó y probó por su cuenta:
transcribió su propio episodio de 38 minutos y publicó la captura con los
fallos incluidos.

**Qué hacer:** dar las gracias por correo (el contacto está en
tropicalpodcasting.com; **no inventar la dirección**), sin pedir nada, y
aportarle algo útil —en la captura se ve que usó el modelo por defecto
(Equilibrado) y por eso los nombres propios salieron mal; con **Preciso**
mejoran—. Un medio que prueba de verdad merece una respuesta que también
aporte, no un agradecimiento vacío.

**Qué NO hacer:** pedir una segunda mención. Si la función de reuniones les
interesa, la mencionarán ellos.

**Su X está muerto** (@tropipodcasting, 5 seguidores, último post de septiembre
de 2024): el canal vivo es el boletín. Seguirles en X no hace daño pero no es
por ahí.

**Lo que enseña sobre el mensaje:** de todo lo que decimos, él eligió repetir
*"funciona directamente en tu navegador, en español y gratis"* y *"SRT o VTT"*.
No la privacidad. Cuando alguien resume el producto con sus palabras, esas son
las palabras que viajan solas.

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

**Hashtags en X:** 3-4 por tuit como máximo (más parece spam), distintos en
cada uno. Hook: `#IA #Privacidad` · Funciones: `#Subtítulos #Productividad` ·
Cierre con enlace: `#OpenSource #IA #Whisper`.

**Menciones que sí valen:** en el tuit técnico, mencionar a **@huggingface** y
**@xenovacom** (autor de transformers.js, la librería sobre la que corre
Gate32). Es una mención legítima —estamos construidos sobre su trabajo— y ese
ecosistema amplifica proyectos que demuestran IA local funcionando de verdad.
Vale más que cualquier hashtag.

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

## 8 · Prensa del sector: Podnews (2026-08-10)

Podnews, el boletín diario del podcasting, mencionó Gate32 sin que se lo
pidiéramos. Sus normas de envío son públicas, y **explican por qué la mención
salió con una foto de archivo genérica: no les dimos nada**.

**Contacto:** `editor@podnews.net` · Editor: **James Cridland**.
Se escribe **Podnews**, nunca "PodNews". Lo piden expresamente.

**No cobran por cubrir nada.** Cuando van cortos de espacio priorizan a sus
*supporters*, pero la cobertura editorial es gratuita.

**Lo que piden en un envío, literalmente:**

- **Fotografías de personas**, grandes y apaisadas. **No logotipos** ni carátulas
  cuadradas: *"la gente los confunde con anuncios"*. Y avisan: *"si no nos das
  material gráfico, puede que hagamos algún juego visual malo"* — que es
  exactamente lo que nos pasó.
- **Todo lo necesario en un solo correo.** Trabajan en otro huso horario: un
  "os mando fotos si os interesa" añade 24 horas de retraso y probablemente el
  descarte.
- Nota de prensa en DOC o PDF con **texto copiable** (DOC algo mejor).
- Embargos en mayúsculas al principio. Publican a las **11:00 GMT**.

**Lo que buscan activamente, y nos incluye:** equilibrio de género, **noticias
de fuera de Estados Unidos**, **podcasters y proyectos independientes** y voces
poco representadas. *"No dudes en señalarlo en tu correo si encajas en alguno
de estos grupos."* Somos un proyecto independiente hecho por una persona desde
España: se dice, sin adornarlo.

**Lo que no cubren:** nada que esté detrás de un muro de captura de datos
(formularios que piden correo para desbloquear contenido). Gate32 no tiene
ninguno, y eso conviene mencionarlo porque encaja con su política.

**Conflicto declarado:** James Cridland es asesor de Eurowaves, Northflow, The
Podcast Show London, Poductivity, The Podcast Broker y **RSS.com**. Lo declara
abiertamente en cada edición donde aparece alguna.

### Lista de destinatarios B2B, verificada

La página de *supporters* de Podnews es un directorio de quién está activo en
el sector. Plataformas de alojamiento y servicios donde el embed tiene sentido:

**Alojamiento:** Buzzsprout, PodBean, Libsyn, Simplecast, Acast, Audioboom,
RedCircle, Ausha, Blubrry, Transistor, iono.fm, SoundStack, RSS.com.

**Marca blanca y webs para podcasters:** Awesound (*"white-label premium
podcasting"*), Podpage, CoHost, Podscribe.

Prioridad: **RSS.com** (asesorada por el editor que nos mencionó) y **Blubrry**
(su CEO es quien dijo que el alojamiento es una materia prima y la diferencia
está en las herramientas).

### Direcciones y orden de envío (2026-08-11)

Recopiladas por búsqueda externa. **No verificadas desde este repositorio** (el
entorno de desarrollo no tiene salida a internet): pueden rebotar.

**Primera tanda — cuatro correos, no trece:**

| Plataforma | Dirección | Motivo |
|---|---|---|
| RSS.com | `support@rss.com` | La asesora el editor de Podnews |
| Blubrry | `support@blubrry.com` | Su CEO enunció el problema que resolvemos |
| Awesound | `mark@awesound.com`, `team@awesound.com` | Marca blanca; correo de fundador |
| Transistor | `support@transistor.fm` | Equipo pequeño: el soporte llega a quien decide |

Segunda tanda **solo si alguna contesta**: Buzzsprout (`support@buzzsprout.com`),
Ausha (`hello@ausha.co`), SoundStack (`sales@soundstack.com`).

**Descartadas y por qué:** correos de personas concretas sacados de
documentación (parecen scraping y suelen ser del rol equivocado); direcciones
de sistema que aparecen en feeds RSS; departamentos ajenos (inversores,
publicidad, integraciones de comercio); y cualquier dirección *reconstruida* a
partir de una versión ofuscada, que es una suposición, no un dato.

**Regla de fondo:** `support@` es un buzón para cerrar incidencias, no para
evaluar alianzas. Si no queda otra que usarlo, el asunto y la primera línea
tienen que decirle a quien abra el correo qué hacer con él:

> **Asunto:** Not a support ticket: transcription your users could run at zero
> cost to you
>
> Sorry for using the support address — it's the only public one I could find.
> If someone there handles partnerships or product, I'd be grateful if you
> passed this along.

Trece correos casi idénticos a buzones de soporte es spam, y en un sector
pequeño donde todos leen el mismo boletín diario, quemarse cuesta más que el
beneficio de cualquier envío masivo. Si los cuatro primeros no responden, el
problema es el mensaje o la propuesta: mandar nueve más no lo arregla.

---

## 9 · Directorios de pago: la respuesta es no (2026-08-11)

Patrón que se repetirá: un directorio del sector te añade **sin pedírtelo**,
te avisa por correo y a continuación te ofrece destacar por dinero. The
Podosphere lo hizo el 11/08 tras vernos en Podnews: 299 $/mes por la portada,
79 $/mes por encabezar la categoría, mitad de precio los tres primeros meses.

**Reclamar la ficha: sí.** Es gratis, deja poner descripción y categorías —una
ficha vacía es peor que ninguna— y aporta un enlace y presencia donde buscan
los profesionales del sector.

**Pagar por destacar: no**, y no es cuestión de tacañería. A 79 $/mes son
948 $ al año contra un producto con 0 € de ingresos y ~150 páginas vistas
semanales. Antes de pagar por visibilidad hay que saber que la visibilidad
convierte, y eso todavía no lo sabemos: la señal de monetización sigue en cero.
Cuando alguien pague por Gate32, se reconsidera.

El presupuesto es 0 € y solo se reinvierte lo que el propio producto genere.
Esa regla no admite excepciones por buen precio.

## Qué medir tras cada acción (ver VALIDATION.md)

- Pico de visitas por canal (referrers en Vercel Analytics).
- Activación (transcribe_done) y finalización — vía GoatCounter cuando esté
  activado el código del sitio.
- Comentarios cualitativos: velocidad por dispositivo y casos de uso reales
  (alimentan las páginas SEO y la decisión de la capa Pro).
