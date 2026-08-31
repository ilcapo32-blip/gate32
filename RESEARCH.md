# RESEARCH.md · Investigación de oportunidades para Gate32

**Fecha:** 2026-08-06 · **Método:** búsquedas web reales + análisis estructurado.
**Presupuesto:** 0 €. **Restricción dura:** sin acceso al panel de Vercel (no se
pueden configurar variables de entorno con claves de pago), por lo que cualquier
IA de servidor con API de pago queda descartada para el MVP. Esto favorece:
inferencia en cliente (WebGPU/WASM), modelos open source y BYOK opcional.

Este documento distingue explícitamente entre **[HECHO]** (observado en fuentes),
**[INFERENCIA]** (deducción razonada) e **[HIPÓTESIS]** (por validar).

---

## 1 · Señales observadas

### Transcripción de audio (mercado y quejas)

- **[HECHO]** El plan gratuito de Otter.ai da 300 min/mes, 30 min por
  conversación y **solo 3 importaciones de archivo de por vida**; los planes de
  pago van de ~8 a 30 $/mes. Reseñas señalan "límites ocultos" que fuerzan el
  upgrade. (sonix.ai/resources/otter-ai-pricing, usecarly.com/blog/otter-ai-pricing,
  tldv.io/blog/otter-pricing)
- **[HECHO]** El mercado hispano de "transcribir audio a texto gratis" está
  lleno de herramientas freemium con topes: Monica 30 min de prueba,
  Proactor 1 h/archivo, VexaScribe 30 min sin tarjeta, Maestra exige registro
  para descargar. Todas suben el audio a sus servidores.
  (xataka.com/basics/transcribir-audio-a-texto-17-herramientas-gratuitas,
  notta.ai, happyscribe.com, maestra.ai)
- **[HECHO]** Existen herramientas locales de escritorio valoradas por su
  privacidad (MacWhisper —solo macOS—, Vibe, whisper.cpp —requiere terminal—,
  OpenWhispr, Handy STT). (voicescriber.com/best-offline-transcription-apps,
  alternativeto.net/software/whisper)
- **[HECHO]** Whisper corre íntegramente en el navegador vía transformers.js +
  ONNX Runtime Web con WebGPU; el modelo se cachea (Cache API) y funciona
  offline tras la primera descarga. Existe la demo de referencia *whisper-web*
  (Xenova) y derivados. (github.com/xenova/whisper-web, whisperstt.com/blog,
  huggingface.co/collections/Xenova/transformersjs-demos)
- **[INFERENCIA]** whisper-web y sus derivados son demos técnicas, no
  productos: sin edición sincronizada, sin flujo de subtítulos completo, sin
  UX en español, sin analítica de producto. El hueco no es tecnológico, es de
  **producto y distribución**.
- **[HECHO]** WhatsApp ya transcribe notas de voz de forma nativa y local en
  iOS/Android (Ajustes → Chats → Transcripciones), incluido español.
  (elespanol.com 2025-02, infobae.com 2025-08) → **[INFERENCIA]** el nicho
  "audios de WhatsApp a texto" como producto independiente está muerto; el
  resto de casos (entrevistas, clases, reuniones grabadas, vídeos, podcasts,
  dictados largos) sigue abierto.

### Subtítulos para creadores

- **[HECHO]** Los generadores de SRT "gratis" habituales imponen registro,
  minutos de prueba o marcas; SubtitleKit destaca precisamente por ser
  "en tu navegador, sin registro" — señal de que ese posicionamiento tiene
  demanda. (maestra.ai, novascribe.ai, subtitlekit.com)
- **[INFERENCIA]** El posicionamiento "local + sin límites + sin registro" ya
  compite en inglés; en español sigue prácticamente vacío.

### Viabilidad técnica verificada

- **[HECHO]** transformers.js v3: pipeline `automatic-speech-recognition` con
  `device: "webgpu"` (fallback WASM), `chunk_length_s`/`stride_length_s` para
  audio largo, `return_timestamps: "word"` con los modelos
  `onnx-community/whisper-*_timestamped`, parámetro `language`.
  (github.com/huggingface/transformers.js issues #1198, #894, #784;
  huggingface.co/docs)
- **[HECHO]** Los tamaños prácticos van de whisper-tiny (~40 MB cuantizado) a
  small (~250 MB), con large-v3-turbo posible en equipos con WebGPU potente.

---

## 1b · Revisión competitiva (2026-08-07) — corrige la sección anterior

Descubierto a través de hilos reales de Reddit en español. **Corrige la
afirmación de arriba de que no existía nada local-first con flujo completo:**
existía, y compite en las mismas comunidades.

| Competidor | Procesado | Precio | Lo que tiene y nosotros no |
|---|---|---|---|
| **Transcrisper** (transcrisper.com) | **Local, navegador, GPU** | Gratis | **Diarización**, archivos de 10 h, saltar silencios, export DOCX/PDF, historial persistente |
| VocaScript | **Servidor** (subida) | Gratis con límites por hora + planes | Diarización, 100+ idiomas, importar por URL (YouTube, Zoom, Drive) |
| TurboScribe | Servidor | 3 transcripciones/día de 30 min | Precisión alta con ruido |
| AirCaption | App de escritorio | — | Local, pero requiere instalación |

**Consecuencias, sin adornos:**

1. **"IA local en el navegador" ya no es un diferenciador exclusivo.**
   Transcrisper ocupa exactamente nuestro hueco, con más funciones.
2. **La diarización no es monetizable**: el competidor directo la regala.
3. El mercado, en cambio, **queda validado**: hay hilos recurrentes de gente
   real pidiendo esto (r/asklinguistics, r/EducacionChile,
   r/RepublicadeChile, r/generativeAI) y varios productos compitiendo.
4. **Lo que sí nos queda como diferencia real:**
   - **Código abierto y auditable** (MIT, repo público). Frente a un binario
     cerrado, "puedes leer el código" es estrictamente más fuerte que
     "confía en mí" — y es *el* argumento para datos de investigación,
     periodismo y comités de ética.
   - **Español nativo** en interfaz, contenido y SEO.
   - **Activo SEO/GEO ya plantado** (6 páginas indexables, datos
     estructurados, llms.txt, IndexNow, sitemap): compone con el tiempo.
     *Corrección del 16/08:* cuando se escribió esta línea, "IndexNow" era
     solo la clave de verificación publicada en `public/`. **Nunca hubo nada
     que hiciera la llamada**, así que en diez días no se notificó una sola
     página. Se descubrió auditando, no por un fallo: un trozo de
     infraestructura que no hace nada tampoco avisa de que no hace nada.
     Ya funciona (`scripts/indexnow.mjs`, 6 URL enviadas con respuesta 200 el
     16/08). Y de paso, la comprobación de esta medición: **no dar por
     implementado lo que solo está preparado.**
   - **Velocidad de iteración.**

### 1d · MOSS-Transcribe-Diarize (2026-08-08)

Difundido por @gptzone_net el 21/07 (1,9 K visualizaciones, 10 me gusta, 6
respuestas): modelo de 0,9 B que hace transcripción, diarización y marcas de
tiempo **en una sola pasada**, 50+ idiomas, etiquetas `[S01]`/`[S02]`.

**Qué es y qué no es:** se prueba en un *Space* de Hugging Face, es decir,
**el audio se sube a un servidor ajeno**, y la propia difusión advierte de que
"la demo pública puede tener cola". No compite con nosotros en el eje que nos
define; compite en funcionalidad.

**Lo que sí cambia:** la diarización se está convirtiendo en expectativa por
defecto, no en extra. Tres señales acumuladas: una petición directa de usuario,
dos competidores que la regalan y ahora un modelo que la integra en el propio
flujo de transcripción.

**Y cambia el coste, que era mi razón para aplazarla.** Existe
[`diarization-js`](https://www.npmjs.com/package/diarization-js) (Apache-2.0,
245 KB, **sin dependencias**, puerto ONNX del pipeline
`pyannote/speaker-diarization-community-1`, pensado para navegador con
WebGPU/WASM). Yo había supuesto un coste alto —modelo grande, complejidad— y
puede que la vía ligera exista.

**Reservas, porque el paquete es v0.1.0 de un solo mantenedor:** no está
verificado desde este entorno (el proxy bloquea Hugging Face) ni el tamaño real
de los pesos, ni si se descargan sin autenticación, ni la calidad en audio
español con ruido. **Decisión: una prueba de concepto acotada antes de
comprometer nada**, no una funcionalidad prometida.

### 1e · El alojamiento de podcasts como cliente (2026-08-10)

Podnews, el boletín diario del sector, reseñó Gate32 sin que se lo pidiéramos.
De esa edición salen dos cosas, y **la valiosa no es la que parecía**.

**Lo que parecía:** el editor añadió *"(¿podría ser útil para las empresas de
alojamiento de podcasts?)"*. Lo tomé como una validación externa del modelo
B2B. **Corrección: no lo es.** El mismo editor usa idéntica fórmula con la
herramienta del punto siguiente (*"¿podría esto alimentar las notas del
episodio?"*). Es un recurso de estilo aplicado a las herramientas que reseña.
Atribuirle intención fue inflar la evidencia.

**Lo valioso, dos párrafos antes:** Barry Krantz, **CEO de Blubrry** —una de
las plataformas grandes de alojamiento—, entrevistado en The New Media Show:
el alojamiento, el almacenamiento y la distribución *"se han convertido en
materias primas. La diferencia competitiva viene ahora de las herramientas,
servicios, soporte, analítica, flujos de trabajo, opciones de distribución y
experiencia humana construidos alrededor de la infraestructura"*.

Eso sí es evidencia: el problema de negocio del cliente potencial, enunciado
por el cliente potencial. Nosotros somos una de esas herramientas, y la única
cuyo coste marginal para la plataforma es cero.

**Contexto que conviene tener presente:** el editor de Podnews declara estar en
el consejo asesor de RSS.com, y la sección donde nos mencionaron la patrocina
RSS.com. Lo declara abiertamente. No invalida la mención —es editorial—, pero
sí explica por qué RSS.com es el primer destinatario natural del pitch.

### 1g · PrismaScribe, el competidor que nos recomiendan encima (2026-08-13)

Aparecía recomendado en el comentario más votado del hilo de r/podcasting.
Verificado sobre su propia web (impresa a PDF, porque el entorno no tiene
salida a internet).

**Qué es:** servicio **de servidor**. *"Tus archivos están encriptados durante
la carga y el procesamiento"* — es decir, el archivo sube. Nuestro eje sigue
intacto.

**Lo que tienen y nosotros no:** diarización de hasta 32 hablantes, resúmenes
con IA, traducción a 99+ idiomas, vocabulario personalizado con paquetes para
medicina, derecho y finanzas, eliminación de ruido, modos limpio y literal,
etiquetas de eventos de audio, importación por URL. Es un producto maduro.

**Velocidad:** dicen 1 hora de audio en 2 minutos. Nosotros, ~9 minutos en
1:33 con WebGPU, o sea unos 10 minutos por hora. **Son unas cinco veces más
rápidos** y es lógico: GPU de servidor contra la del usuario. Eso se dice, no
se esconde.

**Precios:** gratis 0,5 h/mes con archivos de 15 minutos como máximo; de ahí,
planes desde ~10-12,5 $/mes hasta ~20-25 $/mes según horas (5, 20 o 40 al
mes), con horas extra comprables que no caducan.

**Tres consecuencias:**

1. **Su plan gratuito confirma nuestro argumento con un ejemplo fresco:** media
   hora al mes y archivos de 15 minutos. Un episodio de podcast no cabe. Es
   exactamente la trampa que describimos, verificable y con fecha.
2. **Compran búsqueda de pago.** La URL trae `gclid` y `gad_campaignid`: están
   en Google Ads sobre las palabras que nosotros intentamos ganar en orgánico.
   Con presupuesto 0 € no competimos ahí; el SEO/GEO tarda más pero no se puja.
3. **Los subtítulos configurables (SRT/VTT) aparecen en su tabla de planes de
   pago.** No he podido leer con certeza en qué nivel entran, pero que estén en
   la comparativa de pago es la **primera evidencia de que lo que construimos
   la semana pasada tiene precio de mercado**, y coincide con las dos peticiones
   profesionales y con la encuesta.

**Dónde queda nuestro terreno defendible, más estrecho de lo que suponía:** no
es "IA local en el navegador" (Transcrisper también), ni las funciones
(PrismaScribe gana), ni la velocidad. Es la combinación de **sin límites, sin
subida, verificable y gratis de verdad** — que es literalmente lo que pedía el
podcaster que se quejaba del coste por minuto.

### 1f · La corrección, otra vez (2026-08-12)

Hilo de r/podcasting de hace tres meses (12 votos, 49 comentarios), sin
responder por nuestra parte: está muerto y ya nos avisaron ahí de la norma de
autopromoción. Vale como investigación, no como canal.

Lo que pide quien pregunta, textual: precisión inconsistente **con acentos y
ruido de fondo**, herramientas **lentas**, y sobre todo *"idealmente algo que
no necesite un montón de limpieza después"*.

Es la tercera vez que aparece la misma idea —tras el comentario de
r/asklinguistics y las dos peticiones sobre formato de subtítulos— y coincide
con la hipótesis escrita el primer día y **todavía sin validar**: el dolor no
es generar el borrador, es el pase de corrección. Cuatro señales
independientes empiezan a ser demasiadas para seguir ignorándola.

**Competidor nuevo sin verificar: `prismascribe`.** Recomendado en el
comentario más votado por rapidez y precisión *"sin tener que ajustar el
texto"*. No comprobado (el entorno bloquea la salida a internet): falta saber
si es local o de servidor y si cobra por minuto.

**Señal cualitativa más valiosa del hilo de r/asklinguistics** (12 votos, el
comentario más apoyado): *"Si los datos tienen que ser precisos, alguien tiene
que hacerlo a mano. Simplemente no hay una forma real de evitarlo."*
→ **[INFERENCIA]** El dolor real de los profesionales no es generar el borrador
—eso ya lo resuelve cualquier Whisper— sino **el pase de corrección**. Ahí es
donde hay tiempo, dinero y ninguna herramienta buena. Transcrisper optimiza
rendimiento (10 h, saltar silencios); nadie optimiza *la corrección*.
→ **[HIPÓTESIS a validar]** El hueco defendible de Gate32 no es transcribir
mejor, sino **ser el mejor sitio para corregir y verificar una transcripción**.

### 1h · La corrección, quinta señal — y esta viene de fuera (2026-08-13)

**Tropical Podcasting** (tropicalpodcasting.com, Puerto Rico, editor Julio Axel
Ponce) menciona Gate32 en su boletín del 13/08. Es la **primera mención ganada
del proyecto**: nadie la pidió, y llegó registrada en los referrers.

Lo que importa no es la mención, es **qué eligió enseñar**. En vez de copiar la
descripción de la web, cogió su propio episodio de 38:33, lo transcribió, hizo
captura del resultado —con los fallos a la vista, incluido su propio apellido
mal ("Ponzi" por "Ponce")— y le puso este pie:

> *"Los errores se pueden editar fácilmente"*

Un editor de podcasting, evaluando por su cuenta y sin hablar con nosotros,
resumió el producto por **el pase de corrección**, no por la transcripción.
Quinta señal independiente, y la primera que no es alguien quejándose de un
dolor sino alguien señalando la solución.

También dice qué mensaje viaja solo, porque es el que él escribió: *"funciona
directamente en tu navegador, en español y gratis"* y *"SRT o VTT"*. Ni
privacidad ni «sin subir archivos» — el navegador, el español, el precio y los
subtítulos.

**Y dice a quién le importamos.** Podcasting hispanohablante, no r/selfhosted.
El mismo día que un sub anglófono nos retiraba un post preguntando dónde
estaba el servidor, un medio del sector en español nos recomendaba sin que
nadie se lo pidiera.

### 1i · El idioma es la barrera, no la privacidad (2026-08-16, r/notebooklm)

Hilo de 45 votos y 24 comentarios. Quien pregunta tiene **clases de horas en
YouTube en vietnamita**, sin subtítulos o con automáticos malísimos, y quiere
un archivo de subtítulos completo para estudiar. Probó Whisper y *"la
transcripción al vietnamita salió sorprendentemente mala"*. **Usa un portátil
Windows**, y lo dice dos veces.

**Las 24 respuestas, resumidas: todas piden algo que él no puede hacer.**
API de Gemini con clave, subir el vídeo a Gemini, `yt-dlp` + Whisper en
terminal (*"te toma como 10 minutos de configuración"*), MacWhisper (→ *"uso
una laptop con Windows"*), Google Colab con un script de Python, extensiones
de navegador, o servicios de pago con prueba de 14 días. **Ninguna de las 24
menciona una opción que funcione en el navegador.** Su última respuesta, sobre
faster-whisper-cli: *"ya hay un montón de modelos en GitHub, yo no sé cuál es
el mejor para mi caso de uso"*.

Es la tesis de acceso de PRODUCT.md, otra vez y más nítida. El narrador de
audiolibros lo dijo en abstracto (*"gente que no tiene Python ni una GPU"*);
aquí se ve en directo a alguien rebotando contra cada recomendación.

**Y hemos descubierto que la puerta la teníamos cerrada nosotros.** El
desplegable ofrecía **diez idiomas** de los casi cien que reconoce Whisper. No
había ninguna razón técnica —el código de idioma se pasa tal cual al modelo—:
era una lista escrita a mano el primer día y jamás revisada. Alguien con
clases en vietnamita no podía **ni seleccionar su idioma**. Corregido: 47
idiomas, y el modelo grande (`large-v3-turbo`, oculto hasta ahora para todos)
disponible para quien ya ha transcrito una vez.

**El diagnóstico que nadie le dio, y que probablemente era el bueno:** que
Whisper le fallara en vietnamita casi seguro no era Whisper, era el **tamaño
del modelo**. El entrenamiento está dominado por el inglés y unas pocas
lenguas más; fuera de ese grupo los modelos pequeños se desploman y los
grandes aguantan. Ahora la app lo avisa **al elegir el idioma**, antes de
transcribir, en vez de dejar que alguien concluya que la herramienta no sirve
para su lengua.

**Sexta confirmación del pase de corrección**, y de la fuente más limpia hasta
ahora, porque no nos conoce. u/oldsongwin recomienda dos cosas concretas:
sacar el audio a **mono 16 kHz** (que es exactamente lo que hace `audio.ts`) y

> *"deja las marcas de tiempo en la salida. Un muro de texto sin timestamps es
> mucho más difícil de usar de lo que parece — pierdes la posibilidad de
> volver a donde el transcript se equivocó."*

Eso es literalmente nuestro editor sincronizado, descrito por alguien que no
sabe que existimos.

**Competidores nuevos, sin verificar** (el entorno no tiene salida a internet):
`Revoldiv` (gratis, sin límites ni anuncios; un comentarista dice *"no tengo
idea de cómo el sitio se financia solo"*), `Notely` (notely.se, subtítulos SRT
de YouTube), `Lilys.ai` y `Meetily Pro` (reuniones, prueba de 14 días). El
primero merece una mirada: mismo posicionamiento de gratis-sin-límites.

## 1c · Segmento no contemplado: accesibilidad (sordera)

**[ANÉCDOTA, no evidencia]** Un hilo viral en X (376 K visualizaciones) de una
mujer sorda a la que se le niega el acceso de su intérprete de lengua de signos
en consultas médicas. Un comentarista le sugiere grabar el audio para
transcribirlo después.

**Lectura:** para personas sordas o con pérdida auditiva, la transcripción no
es comodidad sino acceso, y ocurre a diario (consultas, clases, reuniones). El
argumento de privacidad local es aún más fuerte que en nuestros otros públicos:
una consulta médica contiene datos de salud.

**Encaje real de Gate32 hoy: malo, y conviene decirlo.**
1. **No hay transcripción en tiempo real.** Grabamos y procesamos después; en
   una consulta se necesita leer *mientras* hablan.
2. **El móvil es nuestro peor escenario** (WASM, lento) y es precisamente el
   dispositivo que se lleva a una consulta.

**Condiciones para entrar en este segmento** (ninguna cumplida):
transcripción por streaming con latencia baja, rendimiento aceptable en
teléfonos de gama media, y validación con usuarios sordos reales — no con
suposiciones de oyentes.

**Criterio ético asumido:** no promocionar la herramienta en hilos donde
alguien denuncia una vulneración de derechos. Ofrecer una app como "solución"
legitima que la institución incumpla su obligación de proporcionar intérprete.

## 2 · Veinte oportunidades

Formato por oportunidad — **U**: usuario · **P**: problema/deseo ·
**F**: frecuencia×intensidad · **S**: soluciones actuales y por qué no bastan ·
**IA**: papel imprescindible · **MVP0€** · **Coste op.** · **Dist.**: dificultad
de distribución · **Vir.**: viralidad · **Mon.**: monetización · **Esc.**:
escalabilidad · **R**: riesgos · **Copia**: facilidad de copia · **Venta**:
ventaja acumulable.

### O1 · Estudio de transcripción y subtítulos 100 % local (navegador)
- **U:** periodistas, estudiantes, investigadores, creadores y profesionales
  hispanohablantes con audio/vídeo que convertir en texto o SRT.
- **P:** transcribir sin pagar, sin topes por archivo y **sin subir material
  sensible** (entrevistas, reuniones, pacientes, fuentes).
- **F:** semanal para creadores/periodistas; picos intensos (entregas). Alta.
- **S:** SaaS con topes y subida a servidores (Otter, HappyScribe…); apps
  locales de escritorio con fricción de instalación o solo macOS; demo
  whisper-web sin producto. Nada local-first en español con flujo completo.
- **IA:** Whisper es el producto: sin ASR no existe. Local = diferenciador.
- **MVP0€:** alta (transformers.js + Vercel estático). **Coste op.:** ~0
  (cómputo del usuario; modelos servidos por CDN de Hugging Face).
- **Dist.:** SEO de intención clara ("transcribir audio a texto gratis",
  "generar subtítulos SRT") + comunidades; media. **Vir.:** media (utilidad
  compartible, exports con atribución).
- **Mon.:** Pro futuro (diarización, lotes, actas con IA, historial). 
- **Esc.:** coste marginal ≈ 0 por usuario (cómputo en cliente). Excelente.
- **R:** dispositivos débiles lentos en WASM; competencia en inglés.
- **Copia:** media-alta. **Venta:** SEO acumulado + marca de privacidad +
  velocidad de iteración de producto.

### O2 · Lector TTS local: artículos y PDF → audio natural
- **U:** commuters, personas con dislexia/baja visión, multitarea.
- **P:** escuchar cualquier texto con voz natural sin pagar ElevenLabs.
- **F:** diaria para el nicho. Media-alta.
- **S:** TTS del navegador (robótico), apps de pago. Kokoro-82M corre en
  navegador con calidad alta **en inglés**; voces españolas mediocres.
- **IA:** TTS neuronal local. **MVP0€:** alta. **Coste op.:** ~0.
- **Dist.:** media. **Vir.:** baja-media. **Mon.:** pro/exports. **Esc.:** alta.
- **R:** **calidad de voz en español insuficiente hoy** → mata el mercado
  natural del proyecto (ES-first). **Copia:** alta. **Venta:** baja.

### O3 · Generador de tests y flashcards para opositores (ES)
- **U:** opositores en España (nicho grande con alta intención de pago).
- **P:** convertir temario en tests/tarjetas de repaso lleva horas.
- **F:** diaria durante años de preparación. Intensidad altísima.
- **S:** academias caras, Anki manual, GPT a mano sin estructura ni repaso.
- **IA:** generación de preguntas de calidad requiere LLM fuerte → **BYOK o
  API de pago desde el minuto uno** (sin clave, la primera sesión no da valor).
- **MVP0€:** media (BYOK Gemini gratis existe pero es fricción brutal para un
  público no técnico). **Coste op.:** 0 con BYOK. **Dist.:** foros de
  opositores, decks públicos indexables (SEO fuerte). **Vir.:** media.
  **Mon.:** clara (suscripción). **Esc.:** alta. **R:** calidad jurídica de
  preguntas, dependencia de proveedor. **Copia:** media. **Venta:** banco de
  decks públicos acumulado.

### O4 · Alt-text y accesibilidad de imágenes por lotes (visión local)
- **U:** agencias y devs que deben cumplir el Acta Europea de Accesibilidad
  (aplicable desde 2025) **[HIPÓTESIS: presión real de compliance]**.
- **P:** escribir alt-text de cientos de imágenes es tedioso.
- **S:** APIs de visión de pago; manual. **IA:** captioning local
  (Florence-2/SmolVLM) + traducción. **MVP0€:** media (calidad de caption en
  español regular; WebGPU casi obligatorio). **Mon.:** B2B clara.
  **Dist.:** difícil (B2B frío). **R:** calidad insuficiente → daño de
  confianza. **Copia:** media. **Venta:** baja.

### O5 · Limpieza de audio local para podcasters (denoise/normalize)
- **U:** podcasters amateur. **P:** audio con ruido/niveles malos.
- **S:** Adobe Podcast (gratis, excelente, sube audio), Audacity (fricción).
- **IA:** RNNoise/DeepFilter en WASM. **MVP0€:** media-alta. 
- **R:** competir contra Adobe gratis es cuesta arriba. **Venta:** baja.

### O6 · Traductor de subtítulos SRT que preserva tiempos
- **U:** creadores que localizan vídeos. **P:** traducir SRT rompe formatos y
  tiempos; herramientas cobran por minuto.
- **S:** SaaS de pago; copiar/pegar en un chatbot rompe el formato.
- **IA:** NLLB local o BYOK. **MVP0€:** alta. **Dist.:** SEO nicho claro.
- **R:** NLLB local es pesado y regular; con BYOK pierde "sin fricción".
- **Copia:** alta. Buen **módulo futuro de O1**, flojo como producto solo.

### O7 · Contratos en lenguaje claro (alquiler, servicios)
- **U:** consumidores ES. **P:** no entienden lo que firman.
- **IA:** requiere LLM fuerte (BYOK/pago) + **riesgo legal** de parecer
  asesoría. **MVP0€:** baja-media. Descartable para v1 por riesgo/calidad.

### O8 · Adaptar CV a cada oferta con análisis de brechas
- **U:** candidatos activos. **P:** personalizar CV por oferta es lento.
- **S:** Teal, ChatGPT a mano. **IA:** LLM fuerte → BYOK. **Dist.:** saturada
  (mil wrappers). **Difer.:** baja → descarte casi directo.

### O9 · Notas de voz largas → notas estructuradas (actas ligeras)
- **U:** profesionales que se autodictan; equipos pequeños.
- **P:** el valor no es el texto bruto, es la estructura (temas, acuerdos).
- **IA:** STT local (gratis) + LLM para estructurar (**BYOK** para ser bueno).
- **MVP0€:** media. Sin clave, se queda en O1; con clave, gran extra.
  → mejor como **capa 2 de O1** que como producto independiente.

### O10 · Buscador semántico personal 100 % local sobre tus documentos
- **U:** investigadores, abogados, estudiantes con carpetas de PDFs.
- **P:** "sé que lo leí pero no sé dónde". **S:** grep mental, Ctrl+F.
- **IA:** embeddings en navegador (MiniLM local) + File System Access API.
- **MVP0€:** alta. **Coste op.:** 0. **Dist.:** difícil de explicar; caso de
  uso episódico → retención dudosa. **R:** indexar carpetas grandes en
  navegador es lento. **Copia:** media. Interesante, retención incierta.

### O11 · Recibos/facturas → CSV con OCR local (autónomos ES)
- **U:** autónomos en España. **P:** picar gastos a mano trimestralmente.
- **IA:** OCR local (tesseract) + extracción estructurada (necesita LLM para
  robustez → BYOK). **F:** trimestral (baja frecuencia → retención débil).
- **R:** errores en datos fiscales = daño real. Descarte por riesgo/calidad.

### O12 · Quizzes desde vídeos de YouTube para profesores
- **U:** docentes. **IA:** transcript + LLM (BYOK). Depende de scraping de
  YouTube (frágil, ToS) → descarte por riesgo técnico/legal.

### O13 · Práctica de pronunciación de idiomas (STT local + comparación)
- **U:** estudiantes de idiomas. **P:** feedback de pronunciación caro.
- **IA:** Whisper local + alineación fonética. **R:** feedback fonético serio
  requiere modelos específicos; Whisper normaliza errores (transcribe lo que
  *quisiste* decir). Calidad dudosa → descarte técnico para v1.

### O14 · Letras sincronizadas / karaoke automático de cualquier audio
- **U:** creadores, fiestas. **IA:** word-timestamps de Whisper.
- **R:** **copyright** de letras/música → descartado por criterio del brief.

### O15 · Voz en off + subtítulos para vídeos cortos (doblaje ligero)
- **U:** creadores de Reels/TikTok. **IA:** TTS local + STT.
- **R:** misma limitación de voces ES que O2; ffmpeg.wasm para incrustar es
  lento y frágil en móvil. Ambicioso para MVP; parte útil ya está en O1.

### O16 · Reuniones grabadas → actas + acuerdos + tareas (B2B)
- **U:** pymes. **P:** nadie escribe el acta. **S:** Otter/Fireflies (caros,
  suben audio, inglés-céntricos).
- **IA:** STT local + LLM (BYOK/pago) + diarización (pyannote no corre bien
  en navegador aún). **MVP0€:** media-baja por diarización.
  → **evolución natural de O1**, no punto de partida.

### O17 · Culling de fotos por lotes local (fotógrafos)
- **U:** fotógrafos de eventos. **P:** elegir 200 de 3.000 fotos.
- **IA:** detección de borrosas/ojos cerrados/duplicadas local.
- **MVP0€:** media. **Dist.:** nicho alcanzable. **R:** rendimiento con miles
  de RAW en navegador (RAW ≠ soportado). JPEG-only reduce valor. Descarte.

### O18 · Dictado universal en la web (página + PWA, STT local)
- **U:** cualquiera que escriba largo. **P:** dictar es 3× más rápido.
- **S:** dictado del SO (calidad regular), extensiones de pago.
- **IA:** Whisper local streaming. **R:** el dictado en tiempo real con
  Whisper-en-navegador tiene latencia; los SO lo integran cada vez mejor.
  Subconjunto de O1 (grabar micro) con más riesgo técnico.

### O19 · Apuntes desde audios largos (clases, podcasts)
- **U:** estudiantes. **P:** 2 h de clase → apuntes.
- **IA:** STT local + resumen (BYOK para calidad). Igual que O9: es la capa 2
  de O1, no un producto independiente sin clave.

### O20 · Detector local de datos personales en PDFs antes de compartir
- **U:** profesionales bajo RGPD. **P:** filtrar DNI/emails/teléfonos antes de
  enviar documentos.
- **IA:** NER local (regex + modelo pequeño). **MVP0€:** alta. **Dist.:**
  difícil (problema latente, no buscado). **Vir.:** baja. **Mon.:** B2B
  posible. **R:** falsos negativos = responsabilidad. Descarte por riesgo.

---

## 3 · Matriz ponderada

Criterios (peso): Utilidad real ×1,5 · Intensidad ×1,25 · Diferenciación ×1 ·
IA genuina ×0,75 · Viabilidad 0 € ×1,5 · Tiempo a MVP ×1 · Escalabilidad ×0,75 ·
Distribución orgánica ×1,25 · Viralidad ×0,5 · Monetización ×1 · Retención ×1 ·
Defensibilidad ×0,75 · Riesgo operativo (10 = riesgo bajo) ×0,75. Σ pesos = 13,25.

| # | Oportunidad | Uti | Int | Dif | IA | 0€ | MVP | Esc | Dis | Vir | Mon | Ret | Def | Rgo | **Pond.** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| O1 | Transcripción/subtítulos local | 9 | 7 | 7 | 9 | 10 | 9 | 9 | 7 | 6 | 6 | 7 | 4 | 8 | **7,7** |
| O2 | Lector TTS local | 7 | 6 | 6 | 8 | 8 | 8 | 9 | 5 | 4 | 5 | 6 | 3 | 6 | 6,3 |
| O3 | Tests para opositores | 9 | 9 | 7 | 8 | 5 | 6 | 8 | 7 | 5 | 8 | 8 | 6 | 6 | 7,2 |
| O4 | Alt-text por lotes | 6 | 5 | 7 | 8 | 5 | 6 | 8 | 3 | 2 | 7 | 5 | 4 | 5 | 5,3 |
| O5 | Limpieza de audio | 6 | 5 | 3 | 7 | 6 | 6 | 8 | 4 | 3 | 4 | 5 | 2 | 7 | 5,0 |
| O6 | Traductor de SRT | 6 | 5 | 5 | 7 | 7 | 8 | 8 | 6 | 3 | 5 | 4 | 3 | 7 | 5,7 |
| O7 | Contratos en claro | 8 | 7 | 5 | 8 | 3 | 5 | 7 | 5 | 4 | 6 | 3 | 3 | 3 | 5,2 |
| O8 | CV por oferta | 6 | 6 | 2 | 7 | 4 | 7 | 7 | 3 | 3 | 5 | 4 | 2 | 6 | 4,7 |
| O9 | Voz → notas estructuradas | 8 | 6 | 5 | 8 | 5 | 7 | 8 | 5 | 4 | 6 | 6 | 3 | 7 | 6,0 |
| O10 | Buscador semántico local | 8 | 6 | 7 | 8 | 8 | 6 | 8 | 4 | 3 | 5 | 4 | 4 | 7 | 6,0 |
| O11 | Recibos → CSV | 7 | 6 | 5 | 7 | 4 | 5 | 7 | 5 | 2 | 7 | 4 | 3 | 4 | 5,2 |
| O12 | Quizzes de YouTube | 6 | 5 | 4 | 7 | 4 | 6 | 7 | 5 | 4 | 5 | 5 | 3 | 3 | 4,9 |
| O13 | Pronunciación idiomas | 7 | 6 | 6 | 8 | 5 | 4 | 8 | 5 | 5 | 6 | 6 | 4 | 4 | 5,7 |
| O14 | Karaoke automático | 5 | 4 | 6 | 8 | 7 | 6 | 7 | 5 | 8 | 3 | 3 | 3 | 2 | 5,0 |
| O15 | Voz en off + subs | 6 | 5 | 5 | 8 | 4 | 4 | 7 | 5 | 5 | 5 | 5 | 3 | 5 | 5,1 |
| O16 | Actas de reuniones B2B | 8 | 7 | 5 | 8 | 3 | 4 | 8 | 4 | 3 | 8 | 7 | 4 | 6 | 5,8 |
| O17 | Culling de fotos | 6 | 6 | 6 | 7 | 5 | 5 | 7 | 4 | 3 | 6 | 5 | 3 | 5 | 5,3 |
| O18 | Dictado universal | 7 | 5 | 4 | 8 | 6 | 5 | 8 | 4 | 3 | 5 | 6 | 3 | 6 | 5,4 |
| O19 | Apuntes de clases | 7 | 7 | 4 | 8 | 5 | 7 | 8 | 5 | 4 | 5 | 5 | 3 | 7 | 5,8 |
| O20 | Detector RGPD local | 7 | 5 | 7 | 6 | 8 | 7 | 8 | 3 | 2 | 6 | 4 | 4 | 4 | 5,6 |

---

## 4 · Cinco finalistas

**O1 (7,7) · O3 (7,2) · O2 (6,3) · O9 (6,0) · O10 (6,0)**

| | O1 Transcripción local | O3 Opositores | O2 Lector TTS | O9 Voz→notas | O10 Búsqueda semántica |
|---|---|---|---|---|---|
| Valor 1ª sesión sin clave ni registro | **Sí, completo** | No (necesita BYOK) | Sí, pero voz ES floja | Parcial (solo texto bruto) | Sí, pero caso episódico |
| Peor riesgo | Competencia EN | Fricción BYOK en público no técnico | Calidad voz ES | Sin LLM no diferencia | Retención |
| Coste marginal | ~0 | 0 (BYOK) | ~0 | ~0/BYOK | ~0 |
| SEO alcanzable | Alto (intención clara ES) | Alto (nicho) | Medio | Bajo | Bajo |
| Camino de ingresos | Pro (diarización, lotes, actas) | Suscripción clara | Pro | Pro | Licencia |
| Puede evolucionar hacia | O6, O9, O16, O18, O19 | — | O15 | — | — |

**Análisis decisivo:**

- **O3** tiene el mejor mercado (intención de pago real, retención diaria),
  pero incumple una condición innegociable del brief: *mostrar valor en la
  primera sesión con fricción mínima*. Sin clave BYOK no hay generación de
  calidad, y pedir una API key a un opositor en la primera visita es un
  embudo letal. Queda como candidato futuro si Gate32 consigue
  infraestructura de servidor con ingresos.
- **O2** muere por calidad de voz en español (el mercado natural del dominio).
- **O9/O19** solo son buenos *encima* de O1: son capas, no productos.
- **O10** tiene utilidad real pero uso episódico, distribución difícil de
  explicar y sin gancho SEO claro.
- **O1** es el único que cumple todo a la vez: tarea completa de principio a
  fin en la primera sesión, sin registro, sin clave, con coste marginal ≈ 0,
  con demanda buscada activamente (SEO de intención), con diferenciador
  honesto (privacidad verificable: el audio no sale del dispositivo) y con
  **camino de evolución** hacia O6, O9, O16, O18 y O19 sin reconstruir nada.

## 5 · Selección

**Se construye O1: "Gate32 — Transcripción y subtítulos con IA, 100 % en tu
navegador".** Los motivos de descarte del resto quedan arriba; la tesis de
producto completa está en `PRODUCT.md` y el plan de validación en
`VALIDATION.md`.

**Debilidad aceptada y mitigación:** defensibilidad baja (4/10). Mitigación:
posicionamiento ES-first, SEO acumulativo con páginas de casos de uso,
producto (editor + exports) muy por encima de las demos, y hoja de ruta hacia
capas con retención (actas, lotes, diarización) donde sí hay pago.

## 6 · Evidencia posterior al lanzamiento

Lo que sigue se añade a medida que aparece. Cada entrada dice **qué se vio**,
**cuánto pesa** y **qué se hizo**, en ese orden, porque la tentación es contar
la conclusión y dar la fuente por buena.

### 6a · El diferenciador no es la precisión, es la incertidumbre (2026-08-20)

**Fuente:** hilo de r/aiToolForBusiness, «¿Por qué es tan difícil encontrar una
alternativa a gotranscript que se las arregle con audio medio hecho un lío?»,
de hace un mes, 10 votos y 14 comentarios. Vistos 6 de esos 14 en capturas; del
resto no se afirma nada.

**Cuánto pesa: menos de lo que parece, y por un motivo concreto.** El
comentario mejor valorado recomienda Prismascribe; otro se autopromociona
abiertamente («DaDaScribe, que yo mismo creé», «99,5 % de precisión» sin decir
sobre qué corpus); otro suelta «Hedy es bastante buena» sin un dato; y el
último lo firma el Community Manager de Fireflies. Las herramientas
mencionadas **no son señal de demanda, son colocación**. Lo que sí vale es el
planteamiento del problema y la coincidencia de los dos comentaristas sin
producto que vender.

**Qué se vio.** Dos personas llegan por separado a lo mismo: pasado cierto
punto estas herramientas envuelven los mismos modelos, así que el diferenciador
no es la precisión sino **cómo manejan la incertidumbre**. Textualmente:
*«prefiero un transcript que diga [no se entiende] con una marca de tiempo, en
vez de uno que inventa una oración limpia que luego no me doy cuenta»*, y
*«extra si enlaza cada parte cuestionable de vuelta al audio»*.

**Por qué se le hace caso pese al ruido del hilo:** coincide con tres fallos
propios ya documentados. «Gazpacho» salió «campancho»; «aceite» salió
«acelete» ocho veces; y en la prueba del 20/08 una nota de voz de 21 segundos
salió con «te voy a estar **despedonando** la hora» — una palabra que no
existe, dentro de una frase con su puntuación y su cadencia. El pase de
corrección solo sirve **si ya sabes qué está mal**. Faltaba el paso anterior.

**Qué se hizo.** `src/lib/doubt.ts`: marcado de líneas dudosas sobre señales
observables en la salida (eco del bloque anterior, palabra en bucle, palabras
por segundo imposibles, segundos de audio para casi ninguna palabra, y las
frases de subtítulo que Whisper escribe sobre el silencio).

**Lo que no se pudo hacer, y por qué.** La confianza del modelo no está
disponible: el pipeline de transformers.js llama a `model.generate` y se queda
solo con los identificadores de token, descartando las puntuaciones
(`transformers.js:28748-28762`). Sacarlas exigiría reimplementar el troceado y
el cosido que delegamos en la librería a propósito — y que, cuando lo hacíamos
nosotros, provocó el fallo de las costuras que se comió frases enteras.

**La mitad que ya teníamos.** Lo de «enlazar cada parte cuestionable de vuelta
al audio» ya estaba hecho desde antes: pulsar la hora de una línea salta a ese
punto del audio. Anotado porque en el primer análisis se estimó como trabajo
pendiente y no lo era.

**Lo que queda como hipótesis, no como plan.** La versión fuerte de esto es
**contrastar dos modelos**: donde Equilibrado y Preciso discrepan es
exactamente donde hay que mirar, y donde coinciden se puede confiar. Es
gratis en señal y caro en cómputo (duplica el tiempo), lo que le da forma de
capa de pago para quien transcribe en serio. No se construye hasta ver si el
marcado gratuito se usa: `doubt_seek` sobre `doubt_shown` lo dirá.

### 6b · Marcar el momento mientras grabas (2026-08-21)

**Fuente:** hilo de r/Journalism, «La transcripción de la entrevista está
tardando muchísimo más de lo que esperaba», 18 votos y 52 comentarios. Vistos
unos 25 de los 52 en capturas; del resto no se afirma nada.

**Cuánto pesa: mucho más que el hilo anterior.** Aquí no hay colocación de
producto: son periodistas contándose entre ellos cómo trabajan, y el hilo está
etiquetado «Tools and Resources», así que recomendar herramientas es lo
esperado. Las coincidencias son espontáneas.

**Qué se vio, en orden de valor.**

1. **Que el proceso sea local es criterio de compra declarado, no una manía
   nuestra.** dnohunter (8 votos): *«Yo uso MacWhisper porque es local, no está
   en la nube, y no tiene suscripción»*. eurydicey, marcado como reportero:
   *«Yo también uso MacWhisper por esta razón»*. Acrobatic_Count_6594: *«La
   empresa para la que trabajo es bastante estricta con otros programas de
   transcripción»*. Y cowperthwaite, reportero verificado, recomienda instalarse
   Whisper a mano.
   **El hueco concreto:** todos resuelven lo local con MacWhisper (solo Mac, de
   pago) o instalando Whisper (solo técnicos). **El 53 % de nuestro tráfico es
   Windows.** Local, sin instalar y en cualquier sistema no lo ofrece ninguno de
   los mencionados.

2. **El motivo del marcado de líneas dudosas, dicho por un tercero.**
   markhachman: *«la IA y las personas pueden tener dificultades para distinguir
   el carraspeo vocal del acento en las palabras clave. "Él estaba, uh, al
   tanto" es muchísimo distinto a "Él no estaba enterado"»*. Y todo el hilo lo
   resuelve **a mano**: comprobar las partes importantes, ir a la marca de
   tiempo y escuchar. Ninguna herramienta mencionada les dice dónde mirar.

3. **La diarización cambia de categoría.** En VALIDATION.md figuraba como *una*
   petición aislada. Aquí el autor la nombra en la pregunta, Many_Reporter8026
   (7 votos) cuenta que una entrevista de tres voces salió *«básicamente un
   desastre»* y **se cambió de herramienta por eso**, y otro menciona Otter por
   lo mismo. Tres hilos independientes y un cambio de herramienta documentado:
   pasa a ser la carencia más importante del producto. Sigue pendiente
   comprobar si existe un modelo de identificación de hablantes viable en el
   navegador con transformers.js.

4. **Marcar el momento mientras grabas — construido el 21/08.**
   Specialist_Pepper734 pide que alguien recuerde una aplicación de Android de
   hace diez años: un botón grande que al pulsarlo marcaba el momento **y
   retrocedía 30 segundos**. Nadie se lo supo decir. Y no es un caso aislado:
   LunacyBin (20 votos), Special-Edna-K (8), bewarethecarebear, PatrioticHotDog
   y da_newsdude describen **el mismo apaño hecho a mano**, anotar la hora al
   oír una buena cita. Special-Edna-K lo resume: *«no necesitas transcribirlo
   todo si ya sabes dónde están las citas»*.
   Cinco personas describiendo el mismo remedio casero es una funcionalidad
   pidiendo existir, y el grabador ya estaba hecho. En `src/lib/marks.ts`.

**Y un aviso sobre el precio.** El competidor real de este público no es otro
SaaS: es Word (300 minutos gratis al mes), subir el audio a YouTube en privado,
las notas de voz de Apple, Zencastr, TurboScribe con tres archivos al día, o
pegárselo a ChatGPT. Saltan de plan gratuito en plan gratuito. Solo mew5175
defiende pagar, y con una condición: *«si de verdad vas a transcribir un montón
de entrevistas»*. El que paga es el profesional intensivo, no el ocasional.

**Qué no se hizo: publicar en el hilo.** Estaba saturado —una docena larga de
herramientas ya recomendadas— y llegar el segundo día como proveedor a una
lista de recomendaciones es quedar sepultado. Además no se leyeron las normas
de r/Journalism, y el día anterior un comentario en r/legaltech se había
retirado por no llevar la etiqueta de proveedor.

---

### Abogado penalista pidiendo justo nuestro argumento, y por qué no es cliente (2026-08-30)

Hilo de r/Lawyertalk que mandó el propietario en cinco capturas. **Reddit está
bloqueado desde el entorno de desarrollo**, así que solo se ha leído lo que
entra en el recuadro: ni el resto del hilo ni las normas completas del
subreddit.

**Qué pide.** Un penalista que trabaja solo y **a tarifa fija**. Necesita notas
del mismo día para protegerse: un cliente de hace ocho años reapareció en
órdenes de arresto e intentó echarle la culpa, y lo que le salvó fue el
archivo. Su caso difícil no son las consultas agendadas —esas ya las anota—
sino **las llamadas imprevistas** mientras está en el juzgado.

**Lo que confirma.** Tres comentaristas distintos convergen, sin que nadie se
lo pregunte, en que lo único aceptable para material amparado por el secreto
profesional es **local y sin conexión**. Uno afirma que en su estado la
transcripción con IA destruye la confidencialidad y remite a leer la política
de privacidad. El propio autor cuenta que usa Descript solo para material no
confidencial y que **fue al colegio de abogados de su provincia a asegurarse
de que estaba aprobado** antes de usarlo.

Es la confirmación externa más fuerte que tenemos del argumento central de
Gate32, y viene de gente que no es nuestro público, en otro idioma, y a la que
nadie preguntó.

**Y aun así no son clientes.** Tres motivos, por orden de gravedad:

1. **No quiere una transcripción.** Lo dice él: *«no necesito una
   transcripción directa; la ventaja de la IA es que va armando un resumen
   mientras hablas»*. Gate32 no transcribe en tiempo real.
2. **Una llamada tiene dos voces.** Una nota que no distingue quién dijo qué
   vale menos como prueba. Gate32 no separa hablantes.
3. **El problema ocurre en un móvil, en un juzgado.** Gate32 es una
   herramienta de navegador; en un teléfono cae al respaldo WASM.

Los dos primeros son las afirmaciones prohibidas de la regla 3. Este hilo es la
prueba de por qué son prohibidas: aquí habría sido facilísimo escribir «justo
lo que buscas» y ser desmentido en el primer uso, delante de abogados.

**Lo que sí vale como posicionamiento.** Este comprador **consulta a su colegio
profesional antes de adoptar una herramienta**. En esa conversación no gana el
que promete privacidad: gana el que la puede demostrar. Desconectar la red y
ver que sigue funcionando es exactamente el artefacto que sobrevive a esa
consulta. Va a `EMBED.md`/`LAUNCH.md` como argumento, no como funcionalidad.

**Qué no se hizo: comentar.** El AutoModerator del propio subreddit, visible en
la captura, dice dos cosas que zanjan el asunto: que la comunidad es para
abogados y que quien no lo sea borre su publicación para evitar sanción, y que
participar en contenido generado por bots puede marcar la cuenta como
astroturfing con **expulsión permanente extensible a todo Reddit**. Ya hay
precedente propio: un comentario en r/legaltech se retiró por no llevar la
etiqueta de proveedor. La regla 5 existe para leer las normas antes, no
después.

---

### r/podcasting confirma dos decisiones nuestras y señala el hueco que no cubrimos (2026-08-30)

Nueve capturas de un hilo de r/podcasting con 23 comentarios, mandadas por el
propietario. **Reddit sigue bloqueado desde el entorno**, así que solo se ha
leído lo que entra en los recuadros.

Pregunta del autor: lanza su podcast en rss.com gratis y quiere transcripción
en las notas de cada episodio. Salen recomendados, sin orden: Otter, Whisper
local, Audacity con OpenVINO, NotebookLM, Transcript LOL, Turboscribe,
Rev.com, CastKeeper, Voxtext, MacWhisper, Sonix, CastMagic, SoundMadeSeen,
Transcript Workbench Pro, Revoldiv, podcasts-ai.com, WhisperX y faster-whisper.

**Dos comentarios coinciden en lo mismo, y no es la precisión.**

> *«Lo que destroza una transcripción en las notas del show es que te devuelvan
> un solo bloque gigante sin etiquetas de quién habla. Es la parte que vas a
> estar corrigiendo a mano cada semana.»* — Cernete

> *«Whisper, por sí sola, te deja una pared de texto sin diferenciar. Una
> transcripción de entrevista sin marcadores de anfitrión/invitado se vuelve
> casi ilegible en las notas. Todos se dan cuenta en el episodio dos.»* — garse

**Gate32 no separa hablantes.** Es la afirmación prohibida número 3, y resulta
que es el criterio de compra de nuestro segmento principal. No se puede
maquillar: para un podcast de entrevistas somos, hoy, la pared de texto.

**Y garse regala la salida barata**, que no necesita diarización ninguna:
grabar a cada persona en su propia pista, transcribir cada archivo por
separado —cada línea es de esa persona por definición, no hay nada que
adivinar— y entrelazar las dos por marca de tiempo. Un podcaster que graba en
remoto con pistas locales o «doble-end» ya tiene esos archivos.

Eso **sí cabe en el navegador y sin modelo nuevo**: dos archivos, una etiqueta
por archivo, mezcla por timestamp. Es la respuesta a la queja principal de
nuestro público construida enteramente dentro de nuestras restricciones. Queda
propuesto, no hecho.

**Lo que el hilo confirma de lo que ya decidimos.**

1. *El prompt inicial.* Cernete explica que lo que pongas en el prompt inicial
   de Whisper sesga toda la transcripción, y que ahí se arreglan solos los
   nombres propios; MacWhisper lo llama «vocabulary». Es exactamente el
   mecanismo que buscamos tras el incidente de **«Claude» → «Cloud» noventa
   veces**, y que `formats.ts` documenta como imposible: `prompt_ids` está
   documentado en transformers.js **pero sin implementar**. Un experto de fuera
   nombra el mecanismo correcto y confirma que nuestra sustitución —corregir
   después, con reemplazo en toda la transcripción— es la forma que nos queda.
2. *Las alucinaciones sobre el silencio.* garse avisa de que Whisper suelta
   líneas basura repetidas en los tramos callados, normalmente créditos de
   subtítulo vistos en el entrenamiento, y recomienda una implementación con
   detección de actividad de voz. Nosotros no lo prevenimos: lo **marcamos**,
   en `doubt.ts`, con la razón `boilerplate` y la lista literal de esas frases
   («amara org», «gracias por ver el vídeo», «thanks for watching»…), más las
   razones `repeat`, `fast` y `slow`. Distinto enfoque —él evita, nosotros
   señalamos para que se compruebe— y llegamos por nuestra cuenta al mismo
   fenómeno.

**Un punto estructural que no teníamos.** krishh155 separa dos cosas que todos
mezclan: un texto pegado en la descripción del episodio es texto en esa
descripción y nada más. Para que una **app** de podcasts muestre una
transcripción de verdad tiene que ir en el feed RSS como etiqueta
`podcast:transcript` apuntando a un archivo **VTT o SRT**, y eso es una función
del alojador, no de la herramienta de transcripción. En plan gratuito, la
transcripción sirve para tu web y para el buscador.

Gate32 exporta VTT y SRT. Es decir: exportamos justo el artefacto que encaja en
esa etiqueta. La página de caso de uso de podcast debería decirlo con esas
palabras, porque es un detalle que el propio público desconoce.

**Sobre publicar.** No se ha comentado. Pero este hilo cambia lo que creíamos
de r/podcasting, que es el subreddit que ya nos citó su norma: aquí comentan
al menos cuatro proveedores de su propio producto, y DanielJLewis lo hace con
un **«aviso requerido por el moderador»** enumerando todas sus afiliaciones. La
norma parece ser *declarar*, no *abstenerse*. No se afirma más: las normas no
se han podido leer desde aquí y el radar tiene el endpoint para comprobarlo
(`/r/<sub>/about/rules.json`). Antes de escribir nada ahí, que lo compruebe.

Y si se escribe, la limitación va delante, no escondida: cualquier comentario
nuestro en este hilo tiene que decir que no separamos hablantes, justo después
de que dos personas hayan explicado que es lo que más les duele.
