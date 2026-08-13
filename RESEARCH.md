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
   - **Activo SEO/GEO ya plantado** (5 páginas indexables, datos
     estructurados, llms.txt, IndexNow, sitemap): compone con el tiempo.
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
