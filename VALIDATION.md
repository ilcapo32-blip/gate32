# VALIDATION.md · Plan de validación de Gate32

## Hipótesis

- **H1 (valor):** existe gente que necesita transcribir audio y no quiere o no
  puede subirlo a un SaaS; si se le ofrece hacerlo gratis y en local,
  completará la tarea entera (transcribir → exportar).
- **H2 (viabilidad técnica en campo):** el hardware real de los visitantes
  (no el nuestro) puede ejecutar Whisper en navegador con una experiencia
  aceptable en la mayoría de sesiones.
- **H3 (retención):** la necesidad es recurrente; una fracción medible vuelve
  a transcribir en <30 días.
- **H4 (monetización):** una fracción medible manifiesta interés explícito en
  capas Pro (diarización, lotes, actas).

## Instrumentación

Doble capa, ambas anónimas y sin cookies:

1. **Vercel Web Analytics** (activada): visitas, páginas, países,
   dispositivos y referrers — suficiente para tráfico y canales (incluido
   GEO, vía referrers de chatgpt.com/perplexity.ai). **Limitación
   verificada:** los eventos personalizados requieren plan Pro; en Hobby no
   se registran.
2. **GoatCounter** (gratuita, open source, sin cookies) para los eventos del
   embudo (`transcribe_done`, `export`, `pro_interest`, `return_visit`…).
   Integración lista en `src/lib/analytics.ts`; se activa rellenando
   `GOATCOUNTER_CODE` con el código del sitio tras crear la cuenta en
   goatcounter.com (pendiente del propietario, 2 minutos).

Los eventos también se registran en un contador local (localStorage) para
depuración.

**Nunca** se envía contenido de audio ni texto transcrito: solo nombres de
evento y propiedades técnicas agregadas (duración en minutos redondeados,
modelo, webgpu sí/no, formato de export).

### Sesgo de medición (importante para interpretar los números)

Vercel sirve su script desde nuestro propio dominio (`/_vercel/insights/`), así
que los bloqueadores rara vez lo filtran. GoatCounter carga desde `gc.zgo.at`,
un tercero, y **sí se bloquea con frecuencia**. Como los eventos del embudo solo
existen en GoatCounter, siempre subcontarán respecto a las visitas de Vercel.

**Regla:** los ratios se calculan **dentro de una misma fuente**
(`transcribe_done` de GoatCounter ÷ páginas vistas de GoatCounter). Cruzar
fuentes daría una activación artificialmente baja y podría llevarnos a
abandonar la tesis por un artefacto de medición, no por falta de demanda.

Lo que sí es comparable entre fuentes: la **tendencia** y los **referrers**.

**Segunda trampa, y esta la pisé yo (2026-08-08):** en GoatCounter los eventos
se almacenan como rutas, así que el número grande de "Totals" **suma páginas
vistas y eventos**. Dividir transcripciones entre ese total infla el
denominador con nuestros propios eventos y hunde la activación: así reporté un
5 % que en realidad era un 8 %. El denominador correcto es la **suma de las
filas de página** (`/` + `/en` + landings), nunca el total.

### Verificación del cableado

`scripts/e2e.mjs` intercepta el script de GoatCounter con un doble y comprueba
que `export`, `pro_interest`, `use_case_*` y `pro_feature_*` se emiten de
verdad. Verificado el 2026-08-07: los cuatro eventos llegan. Así no se descubre
una instrumentación rota *después* de gastar la munición de distribución.

### Línea de salida (2026-08-07)

Antes de que entre tráfico externo real: 8 visitantes en Vercel y 2 visitas en
GoatCounter, todas del propietario (Android/España/directo), 0 eventos de
embudo. Cualquier medición posterior se compara contra este punto cero.

### Primera medición con tráfico externo (2026-08-07, 20:20)

| Métrica | Valor | Umbral | Lectura |
|---|---|---|---|
| Visitas (GoatCounter) | 58 (30 a `/en`, 6 a `/`) | — | Tráfico de r/podcasting y r/selfhosted |
| `transcribe_start` | 4 | — | |
| `transcribe_done` | 3 | — | **Primeras transcripciones completadas** |
| **Finalización** (done/start) | **75 %** | ≥ 60 % sano | ✅ La tesis local aguanta en hardware ajeno |
| **Activación** (done/visitas) | **~5 %** | ≥ 10 % continuar · < 3 % replantear | 🟡 Zona intermedia; el tráfico viene de hilos técnicos donde muchos miran sin audio a mano |
| Dispositivo de los éxitos | 3/3 WebGPU | — | Ningún éxito registrado en WASM todavía |

**Aviso de interpretación:** parte de esas transcripciones son pruebas del
propietario. El dato limpio llegará cuando haya volumen suficiente para que su
propio uso sea despreciable.

**Corrección (2026-08-08):** la activación de esa tabla estaba mal calculada.
Las "58 visitas" eran el total de GoatCounter, que incluye los eventos; las
páginas vistas reales eran 36. La activación de aquel día fue **8,3 %**
(3 ÷ 36), no el 5 % que reporté.

### Segunda medición (2026-08-08, 17:39) · ventana 01–08/08

Denominador correcto: 66 páginas vistas (54 en `/en`, 12 en `/`). El total de
127 que muestra GoatCounter incluye 61 eventos y no debe usarse.

| Paso | Valor | Lectura |
|---|---|---|
| Páginas vistas | 66 | 82 % en inglés: el tráfico es anglosajón (US 27 %, CA 20 %) |
| Archivos soltados | 12 | `transcribe_start` (10) + fallos de decodificación (2) |
| **Intento** (soltados/visitas) | **18 %** | Antes 11 %. El explicador de primera ejecución parece estar funcionando |
| Fallo de decodificación | 2 | 17 % de los archivos ni siquiera se pudieron leer |
| Modelo listo | 9 | 3 de ellos **desde caché**: hay reutilización |
| Cancelaciones | 3 | 30 % de quien empieza se cansa y para |
| Otros errores | 1 | |
| `transcribe_done` | 6 | |
| **Finalización** (done/start) | **60 %** | Antes 75 %; baja al entrar hardware más variado |
| **Activación** (done/visitas) | **9,1 %** | Umbral de continuar ≥ 10 %: estamos justo debajo |
| `export` | 3 | La mitad de quien termina se lleva el archivo |
| Dispositivo de los éxitos | **6/6 WebGPU** | Sigue sin haber ni un solo éxito en WASM |

**Dónde se pierde la gente ahora:** ya no en la portada, sino **después de
soltar el archivo**. De 12 intentos, 6 no llegan a texto: 2 por formato
ilegible, 3 por cansancio, 1 por error. Ese es el cuello, y por eso los eventos
pasan a llevar la causa dentro del nombre (`transcribe_error_decode_<ext>`,
`transcribe_cancel_download` vs `_inference`).

**Encuesta de espera:** 6 apariciones, 2 respuestas → **33 % de respuesta**, el
primer día. Respuestas: 1 "clase", 1 "otro" (más 1 "otro" del formato antiguo).
Insuficiente para decidir segmento, pero el mecanismo funciona: pasó de 0
respuestas en una semana a 2 en unas horas.

**Canales:** Reddit 42 visitas (33 %), Google 8, ChatGPT 1 — primera visita
llegada desde un LLM, que valida el trabajo de GEO.

**Sobre X, corrección:** en la primera lectura de esta tabla di por hecho que
las 0 visitas desde X medían el fracaso de la campaña. No medían nada: la
campaña aún no había empezado y los enlaces con `?ref=x` todavía no se habían
publicado. **Un canal sin publicar no es un canal fracasado**, y confundir
"ausencia de datos" con "dato negativo" es el mismo error de método que el del
denominador, cometido dos veces en el mismo informe. X queda sin medir hasta
que haya publicaciones con `?ref=x` circulando.

**Señal cualitativa sobre diarización — con la evidencia real:**
- **1 petición explícita** de un usuario (r/podcasting, 2026-08-07).
- **2 competidores** la ofrecen gratis (Transcrisper, VocaScript). Eso es
  contexto de mercado, **no demanda**.
- **0 clics** en el CTA "¿qué te haría pagar?": nadie ha llegado a expresarlo.

**Corrección (2026-08-21):** esto queda desfasado. En r/Journalism el autor la
nombra en la pregunta, un comentarista con 7 votos **se cambió de herramienta
por ella**, y otro cita Otter por lo mismo; sumado a r/aiToolForBusiness son
tres hilos independientes. Sigue sin ser palanca de precio demostrada, pero ya
no es "una petición aislada": es la carencia más nombrada del producto. Ver
RESEARCH.md §6b.

No es, por tanto, "la función más pedida": es *la única* pedida, una vez. Al
regalarla el competidor sigue sin ser palanca de precio, pero la decisión de
construirla no puede apoyarse en demanda observada — solo en el argumento de
que nuestros segmentos objetivo (entrevistas, podcasts) generan audio
multi-hablante.

### Segunda petición real de usuario (2026-08-08, r/podcasting)

Un usuario probó la herramienta y midió: **vídeo de 12 min en 2:15** con una
NVIDIA 3050 en Chrome, y **más de una hora estimada en Firefox**, donde no
había WebGPU y cae a WASM. Dos conclusiones, las dos accionadas el mismo día:

1. **Subtítulos con longitud de línea.** Pedía 32 caracteres por línea y tenía
   que pasar nuestro SRT por Subtitle Edit para reformatearlo. Es una petición
   concreta, barata (función pura, sin servidor) y del segmento que más tráfico
   nos trae. **Construida**: selector de 32/37/42 caracteres, máximo dos
   líneas, con el tiempo repartido en proporción al texto.
2. **La caída a WASM es una mala primera experiencia, no un matiz.** 2:15 vs.
   más de una hora es la diferencia entre usar el producto y abandonarlo.
   **Construido**: aviso previo cuando el navegador no expone WebGPU, con la
   comparación de tiempos y cómo activarlo en Firefox. Evento `no_webgpu` para
   medir qué proporción del tráfico llega en esas condiciones.

Contraste con diarización: aquella lleva **una** petición y un coste alto
(modelo adicional, pesos, complejidad). Esta llevaba **una** petición y coste
de una tarde. El criterio no es cuántas veces se pide, es la razón entre señal
y coste — por eso esta se construye ya y la otra sigue esperando volumen.

### Experimento abierto: hilos de WebAssembly (2026-08-08)

Con las cabeceras `Cross-Origin-Opener-Policy: same-origin` y
`Cross-Origin-Embedder-Policy: credentialless`, la página queda aislada, hay
`SharedArrayBuffer` y ONNX Runtime puede repartir la inferencia entre núcleos.
Es la única palanca que mejora el camino sin WebGPU, que hoy es inservible.

Se elige `credentialless` y no `require-corp` porque los scripts de terceros se
piden en modo no-cors y con `require-corp` quedarían bloqueados; los pesos del
modelo van por `fetch` en modo CORS, que no necesita CORP en ninguno de los dos
modos.

**Riesgo asumido y cómo se vigila:** el entorno de desarrollo no tiene acceso
al CDN de Hugging Face, así que la descarga real bajo aislamiento no está
probada aquí — solo que la página se aísla y sigue sin errores. Si las
cabeceras no llegaran en producción, `coi_off` se dispara en cada visita; si
rompieran la descarga, `transcribe_error_load` sube. Revertir es un commit.

**Qué mediría el éxito:** aparición de `transcribe_done_wasm`, que hoy es 0
(los 3 éxitos han sido todos WebGPU).

### Tercera medición (2026-08-10) · el umbral de continuar, superado

Denominador correcto: 81 páginas vistas (68 en `/en`, 13 en `/`). El total de
202 incluye eventos.

| Paso | Valor | Antes | Lectura |
|---|---|---|---|
| Páginas vistas | 81 | 66 | |
| Archivos soltados | 20 | 12 | `transcribe_start` 15 + 5 fallos de lectura |
| **Intento** | **24,7 %** | 18 % | Sigue subiendo desde el explicador de primera ejecución |
| **Finalización** (done/start) | **67 %** | 60 % | |
| **Activación** (done/visitas) | **12,3 %** | 9,1 % | ✅ **Por encima del umbral de continuar (≥ 10 %)** |
| `export` | 5 | 3 | La mitad de quien termina se lleva el archivo |
| `return_visit` | 2 | 0 | Primeros usuarios que vuelven |

**Tres resultados de experimentos abiertos, todos verificados:**

1. **`transcribe_done_wasm` = 2.** Primeras transcripciones completadas **sin
   WebGPU**, después de una semana con cero. Es la señal que se esperaba de los
   hilos de WebAssembly.
2. **`coi_off` = 3** sobre 81 visitas: las cabeceras COOP/COEP llegan en el
   96 % de los casos y **no han roto la descarga del modelo** (13
   `model_ready`). El riesgo asumido al desplegarlas sin poder probarlas se
   resuelve a favor.
3. **`storage_not_persisted` = 5** de 15 intentos: un tercio de los navegadores
   no garantiza conservar el modelo. Esos usuarios se enfrentarán a otra
   descarga completa al volver.

**El cuello ha vuelto a moverse: ahora es la lectura del archivo.** 5 de 20
archivos (25 %) no se pudieron ni abrir, y **2 de ellos eran MP3**, el formato
más estándar que existe. Con audiencia de r/podcasting la hipótesis es el
tamaño, no el formato: `decodeAudioData` carga el archivo entero descomprimido
en memoria y un episodio de una hora pasa del gigabyte.

Acciones tomadas: el contexto de audio se crea ya a 16 kHz, lo que reduce la
memoria del audio decodificado casi tres veces; se reintenta con el ritmo
nativo si el navegador rechaza el forzado; y el evento separa
`transcribe_error_decode_grande` de `_formato` para confirmar o descartar la
hipótesis en la próxima medición.

### Cuarta medición (2026-08-10, 19:10) · misma ventana, 18 horas después

| Paso | 00:58 | 19:10 | Lectura |
|---|---|---|---|
| Páginas vistas | 81 | **124** | +53 % en menos de un día |
| Archivos soltados | 20 | 32 | |
| **Intento** | 24,7 % | **25,8 %** | Estable: el explicador aguanta con más tráfico |
| **Finalización** | 67 % | **56 %** | 🔻 Baja al ensancharse el público |
| **Activación** | 12,3 % | **11,3 %** | Sigue por encima del umbral, pero ya no sube |
| `return_visit` | 2 | 4 | |
| `export` | 5 | 7 | La mitad de quien termina, constante |

**Primer canal que no es Reddit: `podnews.net`, 15 visitas**, con parámetro de
campaña propio. Podnews es el boletín diario de la industria del podcasting:
es el público exacto, y llegó sin que lo buscáramos. Google sube de 8 a 15.

**Hipótesis del tamaño, confirmada:** `transcribe_error_decode_grande` = 2 en
las pocas horas desde que existe el evento. Los archivos que no se pueden leer
fallan por memoria, no por formato. La corrección a 16 kHz acaba de entrar y su
efecto se medirá en la próxima ventana.

**Dos cosas empeoran, y las dos apuntan a Apple:**

- `storage_not_persisted` pasa de 5 a **14** (más de la mitad de los intentos).
  Safari borra el almacenamiento tras unos días sin visitas, así que más de la
  mitad de quien vuelva se comerá otra descarga completa.
- `coi_off` pasa de 3 a **12**: Safari no soporta `COEP: credentialless`, y su
  cuota ha subido al 22 % (30 % del tráfico es Apple).

Sobre lo primero se ha actuado: al terminar una transcripción, si el navegador
no garantiza permanencia, se sugiere **instalar Gate32 como aplicación**, que
es la única vía real para que Safari conserve el modelo. Sobre lo segundo no se
actúa: cambiar a `require-corp` daría hilos a Safari pero bloquearía el script
de analítica —y perderíamos la capacidad de detectar que lo hemos roto—, y
además `no_webgpu` sigue siendo residual, así que esos usuarios ya van por GPU
y los hilos les aportarían poco.

### Quinta medición (2026-08-11) · el arreglo de decodificación **no ha funcionado**

Ventana 04–11/08. Denominador: 146 páginas vistas (129 en `/en`, 17 en `/`).

| Paso | Valor | Antes | |
|---|---|---|---|
| Páginas vistas | 146 | 124 | |
| Archivos soltados | 40 | 32 | |
| **Intento** | **27,4 %** | 25,8 % | Cuarta subida consecutiva |
| **Finalización** | 58 % | 56 % | |
| **Activación** | **12,3 %** | 11,3 % | Por encima del umbral |
| `export` | 9 | 7 | La mitad de quien termina |
| `return_visit` | 9 | 4 | Se duplica |

**El resultado negativo, que es el importante:** `transcribe_error_decode` = 9
sobre 40 archivos = **22,5 %**. Exactamente la misma proporción que antes de
decodificar a 16 kHz. Y `transcribe_error_decode_grande` = **4**, todos
posteriores al despliegue del arreglo.

Conclusión: reducir la memoria del audio decodificado casi tres veces **no es
suficiente**. Un episodio estéreo de una hora a 16 kHz sigue ocupando ~460 MB,
y `decodeAudioData` necesita el archivo entero en memoria antes de devolver
nada. La hipótesis del tamaño está confirmada; la solución era insuficiente.

**Lo hecho hoy:** avisar **antes** de decodificar cuando el archivo supera los
60 MB, con mensaje más duro en móvil (24 % del tráfico, memoria mucho más
justa). No arregla el fallo: evita esperar dos minutos para nada y dice qué
hacer. Eventos `big_file_prompt` y `big_file_cancel` para saber cuántos siguen
adelante y si el aviso ahuyenta a alguien. *(El 16/08 `big_file_cancel`
desaparece: el aviso deja de ser un `confirm()` del navegador y pasa al panel
de confirmación, así que el abandono equivalente es `file_ready_cancel`.)*

**El arreglo de verdad** es decodificar por trozos con **WebCodecs**
(`AudioDecoder`), que mantiene la memoria constante. Requiere demultiplexar los
contenedores a mano y es un proyecto en sí mismo: queda anotado, no
improvisado.

**Primera señal clara de caso de uso:** `use_case_wait_subtitulos` = 3, el
único `use_case_*` que asoma entre los veinte eventos más frecuentes, sobre 10
respuestas totales. Coincide con las dos peticiones profesionales que ya
teníamos sobre formato de subtítulos. **Los subtítulos son el caso de uso**, y
esta es la primera evidencia cuantitativa de ello.

**Dos motores de IA envían tráfico ya:** `gemini.google.com` 6 y `chatgpt.com`
1. Google 24, Bing 6, Podnews 24, `Email` 14. Reddit sigue siendo el mayor con
~165 entre sus tres formas.

**Calibración entre fuentes (no para ratios):** Vercel cuenta 261 páginas
vistas donde GoatCounter ve 146. GoatCounter ve el **56 %**, porque su script
es de terceros y lo bloquean. Sirve para estimar tráfico real; **los ratios
siguen calculándose dentro de una sola fuente**.

**Sigue empeorando lo de Apple:** `storage_not_persisted` 20 sobre 31 intentos
(65 %) y `coi_off` 19 sobre 146 (13 %). macOS ha subido al 20 % y Safari al
26 %: el tráfico de Podnews es de industria del podcasting, y esa industria usa
Mac.

### Sexta medición (2026-08-14) · ventana 30/07–14/08, 569 visitas

**Denominador:** la suma de las filas de página, no el Totals (regla aprendida
a base de equivocarse). Filas de página visibles: `/en` 155 + `/` 23 = **178**.
Hay 46 visitas repartidas en filas ocultas tras "Show more", parte de ellas de
`/subtitulos/`, `/entrevistas/` y `/clases/`, así que el denominador real está
entre 178 y ~200 y los porcentajes de activación se dan como horquilla.

| Métrica | Valor | Umbral | Lectura |
|---|---|---|---|
| Activación (`transcribe_done` / páginas) | **13,5–15,2 %** | continuar ≥ 10 % | Por primera vez claramente por encima |
| Finalización (`done`/`start`) | 27/46 = **58,7 %** | sano ≥ 60 % · fracaso < 25 % | A un punto de "sano" |
| Export (`export`/`done`) | 15/27 = **55,6 %** | ≥ 40 % | Se llevan el resultado, no solo prueban |
| Errores (`error`/`start`) | 14/46 = **30,4 %** | — | Casi un tercio |
| De decodificación | 9/46 = **19,6 %** | — | Antes 22,5 % |
| Sin persistencia (`storage_not_persisted`/`start`) | 34/46 = **73,9 %** | — | **Antes 65 %: va a peor** |
| Sin aislamiento (`coi_off`/páginas) | 29/178 = **16,3 %** | — | Antes 13 % |
| Sin WebGPU (`no_webgpu`/`start`) | 8/46 = **17,4 %** | — | WASM ya remata: 5 de 27 |

**El 19,6 % de errores de decodificación NO demuestra que el troceado de MP3
funcione.** La ventana es acumulada desde el 30/07 e incluye los días
anteriores al despliegue: bajar de 22,5 % a 19,6 % es compatible con la mejora
y también con el ruido. Para saberlo hace falta filtrar por fecha posterior al
arreglo, y todavía no hay volumen suficiente. Se anota como pendiente, no como
logro. **44 % de esos fallos (4 de 9) son por tamaño**, así que el aviso previo
de archivo grande está apareciendo donde tiene que aparecer.

**Lo peor del cuadro: tres de cada cuatro.** El 73,9 % de quien transcribe
tiene un navegador que no garantiza conservar el modelo, y ha empeorado
respecto al 65 % anterior. Se traduce en que casi todo el que vuelva se comerá
otra descarga de 80 MB. Con Safari en el 26 % de las visitas y iOS en el 16 %,
esto no se arregla programando mejor: la única salida real es que instalen la
web como aplicación, y hoy eso solo se sugiere en un aviso al final.

#### Distribución: el canal propio ha empezado a existir

| Origen | Visitas | % |
|---|---|---|
| (desconocido) | 217 | 38 % |
| Reddit (web + app + hilo r/podcasting) | 180 | 32 % |
| **Google** | **84** | **15 %** |
| Podnews | 29 | 5 % |
| Email | 14 | 2 % |
| Bing | 14 | 2 % |
| **gemini.google.com** | 6 | 1 % |
| chatgpt.com | 1 | .2 % |

**Google al 15 % es la novedad de esta medición.** Hasta ahora todo el tráfico
venía de publicar a mano; ahora hay 104 visitas (Google + Bing) que llegan
solas y que seguirán llegando sin trabajo adicional. Es el primer indicio de
que el SEO de intención compone. Y con Gemini (6) y ChatGPT (1) sumando 7, el
GEO deja de ser una hipótesis: los asistentes ya nos mandan gente.

**Podnews trajo 28 visitas reales.** La mención existía y se midió.

**Tropical Podcasting trajo 1 visita etiquetada.** Como canal, eso es lo que
es: una visita. **[INFERENCIA, no dato]** Puerto Rico aparece con 23 visitas
(4 %, sexto país) en un proyecto cuyo tráfico es EE. UU./España/Canadá/
Alemania/Australia, y el boletín salió el 13/08: es razonable pensar que buena
parte de esas 23 vienen de ahí y que el referrer se pierde al leerse por
correo. No se puede confirmar.

#### La monetización sigue sin existir

`pro_interest` **no aparece en el top 20 de eventos**, cuyo último puesto tiene
4 visitas. Es decir: como mucho 4 clics en quince días, con 27 transcripciones
completadas. Es la cuarta medición seguida con señal cero.

Lo honesto es también decir qué **no** demuestra: el disparador escrito en
MONETIZATION.md §4 pedía `pro_interest` < 5 **con ≥ 300 activados** para
declarar muerta la capa Pro B2C. Vamos por 27. No es un resultado negativo, es
una muestra demasiado pequeña. Lo que sí hace es reforzar la decisión de mirar
hacia reuniones y B2B (MONETIZATION.md §3b) en vez de esperar sentados.

#### Qué equipo tiene la gente (y qué implica para reuniones)

Chrome 65 %, Safari 26 %, Firefox 8 %. Escritorio 71 %, móvil 28 %.
→ El botón de reuniones, que exige Chrome o Edge de escritorio, **lo verá
aproximadamente la mitad de las visitas**. El otro 26 % (Safari) no lo verá
nunca y además es quien peor conserva el modelo.

### Séptima medición (2026-08-16) · 673 visitas, 10 días de producto

**Denominador:** suma de filas de página (`/en` + `/` + las páginas SEO
visibles) = **201**; con las filas ocultas tras "Show more" el denominador
llega a ~230. La activación se da como horquilla por eso.

| Métrica | Valor | Umbral | Lectura |
|---|---|---|---|
| Activación (`transcribe_done` / páginas) | 32/201–230 = **13,9–15,9 %** | continuar ≥ 10 % | Se sostiene por encima, tercera medición seguida |
| Finalización (`done`/`start`) | 32/53 = **60,4 %** | sano ≥ 60 % · fracaso < 25 % | **Cruza "sano" por primera vez** |
| Export (`export`/`done`) | 18/32 = **56,2 %** | ≥ 40 % | Estable en torno al 56 % |
| De decodificación (`decode_error`/`start`) | 11/53 = **20,8 %** | — | 19,6 % → 20,8 %: sigue sin poder atribuirse nada |
| Sin persistencia (`storage_not_persisted`/`start`) | 40/53 = **75,5 %** | — | **65 % → 73,9 % → 75,5 %: tercera subida seguida** |
| Vuelta (`return_visit`) | 13 → **20** | — | +54 % en dos días |

**Finalización sana, retención rota.** Los dos números que importan para MRR
apuntan en direcciones opuestas: el producto ya termina lo que empieza (60,4 %,
por encima del umbral escrito antes de medir), pero **tres de cada cuatro
personas que transcriben usan un navegador que no garantiza conservar el
modelo, y la proporción empeora en cada medición**. Volver es la condición
previa de cualquier suscripción: nadie paga una cuota mensual por una
herramienta que le cobra 80–250 MB de descarga cada vez que la abre.

Por eso esta iteración no añade funcionalidad: convierte el aviso escrito
("busca «Instalar» en el menú de tu navegador") en el **diálogo real de
instalación** vía `beforeinstallprompt`, ofrecido justo después de la primera
transcripción, que es el único momento en que alguien tiene motivo para
aceptar. El párrafo explicativo se conserva **solo** donde el diálogo no
existe (Safari e iOS), que es justo donde más falta hace y menos se puede
hacer.

**Umbrales fijados antes de mirar el dato** (evita interpretar a posteriori):

| Señal | Umbral | Qué implica |
|---|---|---|
| `install_click` / `install_shown` | ≥ 15 % | El aviso funciona; mantener y medir si `return_visit` sube |
| `install_click` / `install_shown` | 5–15 % | Funciona a medias: probar copy y posición antes de descartar |
| `install_click` / `install_shown` | < 5 % con ≥ 40 mostrados | La instalación no es el camino; la retención habrá que buscarla en otro sitio (o aceptar que el producto es de uso puntual, lo que cambiaría el modelo de negocio hacia pago por uso) |
| `install_accepted` / `install_click` | — | Mide fricción del diálogo del navegador, no del producto: no se actúa sobre ello |

`install_shown` es el denominador honesto: distingue "nadie lo pulsa" de
"nadie lo ve" (el navegador solo dispara `beforeinstallprompt` si cumple sus
criterios y la app no está ya instalada).

#### Marcado de líneas dudosas: umbrales antes del dato (2026-08-20)

Se despliega en la misma ventana, así que conviene fijar antes qué contaría
como funcionar. El denominador es `doubt_shown` (personas a las que se avisó,
una vez por transcripción, no por repintado).

| Señal | Umbral | Qué implica |
|---|---|---|
| `doubt_seek` / `doubt_shown` | ≥ 20 % | La marca dirige la revisión: construir el contraste de dos modelos como capa de pago |
| `doubt_seek` / `doubt_shown` | 5–20 % | Se ve pero no se usa: revisar redacción y posición antes de invertir más |
| `doubt_seek` / `doubt_shown` | < 5 % con ≥ 40 avisos | No interesa señalar la duda; la hipótesis del hilo de Reddit no aplica a este público |
| `doubt_shown_muchas` / `doubt_shown` | > 40 % | **Falso positivo sistemático**: si a la mayoría se le marcan cinco o más líneas, los umbrales están mal y hay que apretarlos, porque una marca que sale siempre no dice nada |

La última fila es la que más importa vigilar: el riesgo de esta función no es
que no se use, es que marque de más y el usuario aprenda a ignorarla.

#### Distribución: Google se consolida, España se dispara

Google 100 visitas (**15 %**), igual proporción que la medición anterior pero
sobre más volumen. España pasa de 40 a **71 visitas** — el efecto de las
páginas SEO en castellano, que son las únicas que no compiten en inglés. India
aparece por primera vez con un 5 %.

#### Monetización: quinta medición seguida en cero

`pro_interest` sigue **sin aparecer en el top 20** de eventos. Con 32
transcripciones completadas, el disparador de MONETIZATION.md §4 (< 5 clics con
≥ 300 activados) **sigue sin poder evaluarse**: la muestra es diez veces menor
que la que se pactó. No es un no; es que todavía no hay pregunta.

### Octava medición (2026-08-20) · 787 visitas, ventana 30/07–20/08

**Denominador:** filas de página visibles 189 (`/en`) + 38 (`/`) = **227**; hay
41 visitas en filas ocultas tras "Show more", parte de ellas las cuatro páginas
de caso de uso. La activación va como horquilla por eso.

| Métrica | Valor | Antes | Lectura |
|---|---|---|---|
| Activación (`transcribe_done` / páginas) | **14,2–16,7 %** | 13,9–15,9 % | Cuarta medición seguida por encima del umbral |
| Finalización (`done`/`start`) | 38/60 = **63,3 %** | 58,7 → 60,4 | **Tres subidas seguidas; "sano" era ≥ 60 %** |
| Export (`export`/`done`) | 21/38 = **55,3 %** | 56,2 % | Estable |
| Errores (`error`/`start`) | 17/60 = 28,3 % | 30,4 % | |
| De decodificación | 12/60 = **20,0 %** | 20,8 % | **La mitad (6 de 12) son por tamaño** |
| Sin persistencia | 44/60 = **73,3 %** | 75,5 % | Deja de empeorar por primera vez; la bajada cabe en el ruido |
| Vuelta (`return_visit`) | **31** | 20 | +55 %, más rápido que el tráfico |
| Éxitos en WASM | 5/38 = **13,2 %** | ~0 | El camino sin GPU deja de ser inservible |

**Comprobación de consistencia:** `transcribe_done_webgpu` (33) +
`transcribe_done_wasm` (5) = 38 = `transcribe_done`. Cuadra exacto. El reparto
por modelo suma 40 (28 equilibrado + 12 preciso) porque **GoatCounter cuenta
visitas por ruta, no impactos**: quien repite con otro modelo en la misma visita
aparece en las dos filas de modelo y una sola vez en `done`. Conviene tenerlo
presente: todos estos números son visitas únicas, no eventos brutos.

#### El hallazgo que cambia la estrategia: los umbrales son inalcanzables

`pro_interest` no aparece en el top 30, cuyo último puesto tiene 3 visitas. Son
**seis mediciones seguidas en cero o casi**. Y `install_shown` = **3** en los
cuatro días que lleva desplegado, con `install_click` por debajo de 3 (no
aparece).

Lo importante no es que los dos números sean bajos. Es que **los umbrales que
escribí para decidir no se pueden alcanzar a este ritmo**:

- El disparador de MONETIZATION.md §4 exige `pro_interest` < 5 **con ≥ 300
  activados**. Llevamos 38 en 21 días: al ritmo actual, 300 activados son
  **5,5 meses**.
- El umbral de instalación exige **≥ 40 avisos mostrados**. Van 3 en cuatro
  días.

Es decir: la pregunta "¿paga alguien por esto?" **no se puede responder
esperando**. O el tráfico se multiplica por diez, o se responde por otra vía.

**Conclusión de método:** el cuello de botella ya no es la calidad del producto.
Finalización 63,3 % y subiendo tres mediciones seguidas, export estable en el
55 %, `return_visit` creciendo más rápido que el tráfico, y el camino sin GPU
por fin funcionando. El producto hace lo que promete. **Lo que falta es gente.**

Eso reordena la prioridad: la vía B2B de `EMBED.md` necesita **una
conversación**, no trescientos usuarios, y por tanto es la única que puede dar
respuesta en semanas y no en medio año.

#### GEO: el salto real de esta medición

| Origen | Visitas | Antes |
|---|---|---|
| Reddit (web + app + hilo) | 207 | 180 |
| **Google** | **106** | 84 |
| podnews.net | 34 | 29 |
| **chatgpt.com** | **18** | **1** |
| gemini.google.com | 6 | 6 |
| www.bing.com | 15 | 14 |
| thepodosphere.com | 1 | — (nuevo, no lo habíamos publicado nosotros) |

**ChatGPT pasa de 1 a 18.** Es el mayor salto proporcional del cuadro y el
primer indicio serio de que el trabajo de GEO (`llms.txt`, datos estructurados,
respuestas honestas sobre lo que no hacemos) devuelve tráfico. Sumado a Gemini,
24 visitas llegan desde asistentes.

**España pasa de 71 a 115 visitas (15 %)**, segundo país tras EE. UU. (199).
India se consolida en el 5 %. Puerto Rico mantiene 23, coherente con la
inferencia sobre el boletín de Tropical Podcasting, que como referrer marcado
suma 2.

**Equipo:** Chrome 71 %, Safari 21 % (baja desde 26 %), Firefox 7 %. Escritorio
76 %, móvil 24 %.

### Las páginas SEO no se estaban midiendo (2026-08-20)

`/subtitulos/`, `/entrevistas/`, `/clases/`, `/reuniones/` y `/notas-de-voz/`
cargan `src/landing.ts`, que durante dos semanas **solo importaba los
estilos**. Nunca arrancaban la analítica, así que no produjeron ni una visita
medible: toda la estrategia SEO estaba sin instrumentar y no había forma de
saber si una página traía gente o no.

Es la misma familia de fallo que el radar en verde sin abrir issues: algo que
parece funcionar porque nadie mira la salida. Corregido, y cubierto por E2E —
se comprueba que cada página arranca GoatCounter, no que el archivo exista.

**Dos consecuencias para leer las mediciones anteriores:**

1. **El denominador de página era 227, no una horquilla hasta 268.** Las filas
   ocultas de GoatCounter no contenían las páginas de caso de uso, porque esas
   páginas no reportaban nada. La activación de la octava medición es
   **38/227 = 16,7 %**, no «14,2–16,7 %». Todas las horquillas anteriores
   estaban sesgadas a la baja por el mismo motivo.
2. **`return_visit` va a subir sin que nadie vuelva más.** `landing.ts` ahora
   también llama a `trackVisit()`, así que quien regresa entrando por una
   página de caso de uso pasa a contarse y antes no. La próxima medición no
   debe leer esa subida como crecimiento de retención.

### Umbral B2B: el único alcanzable (2026-08-20)

La octava medición dejó claro que los umbrales de monetización B2C piden
cientos de activaciones y hacemos decenas. El embudo B2B tiene otra escala,
y por eso su umbral sí se puede evaluar:

| Señal | Umbral | Qué implica |
|---|---|---|
| `integrate_contact` o un correo recibido | **≥ 1** | Hay conversación: se responde y se aprende del caso real |
| `integrate_demo` | ≥ 5 sin ningún contacto | Miran y no escriben: el problema está en la página, no en la oferta |
| `integrate_demo` = 0 tras 30 días indexada | — | Nadie busca esto, o no nos encuentran: revisar el canal antes que el mensaje |

Es n = 1, no n = 300. Ahí está la diferencia con `pro_interest`.

### Novena medición (2026-08-24) · 1024 registros, ventana 30/07–24/08

| Métrica | Valor | Antes | Lectura |
|---|---|---|---|
| Activación (`transcribe_done` / páginas) | 50/258 = **19,4 %** | 16,7 % | Mejor dato del proyecto |
| Finalización (`done`/`start`) | 50/77 = **64,9 %** | 63,3 % | **Cuarta subida seguida**: 58,7 → 60,4 → 63,3 → 64,9 |
| Export (`export`/`done`) | 29/50 = **58,0 %** | 55,3 % | Sube |
| Errores (`error`/`start`) | 20/77 = 26,0 % | 28,3 % | Baja |
| De decodificación | 15/77 = 19,5 % | 20,0 % | **8 de 15 son por tamaño (53 %)** |
| Sin persistencia | 59/77 = **76,6 %** | 73,3 % | **Peor dato de la serie**: 65 → 73,9 → 75,5 → 73,3 → 76,6 |
| Éxitos en WASM | 8/50 = 16,0 % | 13,2 % | El camino sin GPU se consolida |

**La bajada anterior de `storage_not_persisted` era ruido.** Se leyó como «deja
de empeorar por primera vez» y no era una mejora: la serie sigue subiendo.

**`return_visit` = 35 no se compara con las mediciones anteriores.** Desde el
20/08 las páginas de caso de uso también llaman a `trackVisit()`, así que el
evento cuenta vueltas que antes no contaba. La subida es del contador, no de la
gente.

#### Corrección de método: los referrers cuentan impactos, no visitas

La aritmética lo confirma exacto. **Hoy:** 16 páginas + 95 eventos = 111 =
Totals, y los referrers suman 108. **Global:** 258 páginas + 703 eventos
visibles ≈ 961, con 1024 de Totals una vez añadidas las filas ocultas, y los
referrers suman 962.

Es decir, cada evento se atribuye también a su referrer. Consecuencia que
invalida cómo se venían leyendo: **una fuente que trae gente comprometida
aparece inflada frente a una que trae gente que rebota**, porque quien completa
una transcripción dispara ocho o diez eventos y quien se va dispara uno.

«Google, 158» no son 158 visitas: son 158 impactos de un número menor de
visitas. La proporción entre fuentes sigue valiendo como tendencia; el valor
absoluto no. Corrige la lectura de todas las mediciones anteriores.

#### La alarma del marcado de dudas saltó, y era correcta

El umbral escrito en la octava medición, antes de tener un solo dato:
`doubt_shown_muchas / doubt_shown` por encima del 40 % significaba falso
positivo sistemático.

**Salió al 100 %.** Nueve transcripciones marcadas, las nueve con cinco líneas
o más señaladas. Hoy, 4 de 5. A todo el que se le marcaba algo se le marcaba
media transcripción, y una marca que sale siempre no informa de nada — que es
literalmente lo que la alarma vigilaba.

**Qué se hizo el mismo día:**

1. **Apretadas solo las reglas de ritmo**, que son las frágiles porque dependen
   de que las marcas de tiempo de Whisper reflejen el habla real: `fast` de 6 a
   7,5 palabras/segundo y de 5 a 8 palabras mínimas; `slow` de 8 a 12 segundos y
   de 0,4 a 0,3 palabras/segundo. Eco y frase de subtítulo se quedan igual:
   son concluyentes.
2. **Techo de desconfianza.** Si se marcaría más de una cuarta parte de los
   bloques, lo probable no es que el audio sea un desastre sino que los tiempos
   de ese archivo no cuadran: se descartan las reglas de ritmo y se conservan
   solo las concluyentes. Con menos de 8 bloques el techo no se aplica, porque
   en una nota de voz de dos bloques marcar uno ya es el 50 %.
3. **Se registra el motivo** (`doubt_por_repeat`, `doubt_por_fast`,
   `doubt_por_slow`, `doubt_por_boilerplate`). Faltaba, y por eso hubo que
   apretar **adivinando** qué regla sobraba. La próxima vez el dato lo dirá.

**Lección de método, que vale más que el arreglo:** el umbral se escribió antes
de mirar, saltó solo, y señalaba un defecto real. Es la primera vez en el
proyecto que una alarma preinscrita funciona como se pretendía.

#### Instalar: primera señal, y no es buena

`install_shown` = 10 en total, 4 hoy. **`install_click` no aparece**, ni
siquiera en la lista de hoy, que baja hasta 1. Hoy son 4 mostrados y 0 clics.

El umbral era: por debajo del 5 % **con al menos 40 mostrados** significa que la
instalación no es el camino. Vamos por 10, así que **todavía no se puede
concluir**. Pero la tendencia no acompaña, y conviene decirlo ahora en vez de
descubrirlo dentro de un mes.

#### Marcar momentos: sin señal

`mark_added` = 1, del propio propietario probándolo. Cero uso externo. Se
desplegó ayer; no hay nada que leer todavía.

#### Distribución: ChatGPT es el canal que crece

| Origen | Impactos (global) | Antes |
|---|---|---|
| Reddit (web + app + hilo) | 269 | 207 |
| Google | 158 | 106 |
| **chatgpt.com** | **57** | 18 |
| podnews.net | 34 | 34 |
| bing.com | 15 | 15 |
| gemini.google.com | 6 | 6 |

**Hoy, ChatGPT es el 25 % de los impactos** (28 de 111) y Google el 37 %.
Reddit hoy: 3. El canal que se construyó con `llms.txt` y datos estructurados
ha pasado de 1 a 57 en tres mediciones, y hoy pesa más que Reddit.

**España 143 (14 %) y la India 60 (6 %)** en global. Hoy la India es el primer
país con el 21 %, y aparece Honduras con el 15 %.

**Aviso sobre el día de hoy:** está contaminado con pruebas del propietario
(`mark_added`, `edit_used`, la visita a `/reuniones/`). La finalización del
78 % de hoy no es comparable con la serie.

#### Conclusión de la novena medición

**1 · El producto está en su mejor momento y da igual.** Activación 19,4 %,
finalización 64,9 % con cuatro subidas seguidas, export 58 %, errores a la
baja, el camino sin GPU consolidado. Todas las métricas de producto son las
mejores del proyecto. Y la única métrica que cuenta para el objetivo declarado
—que esto genere MRR— sigue en **cero exacto**: `pro_interest` cero en siete
mediciones, `install_click` cero, `integrate_contact` cero, correos recibidos
cero. Mejorar el producto ya no mueve el número que importa.

**2 · El ritmo ha subido y aun así no alcanza.** Transcripciones completadas:
27 (14/08) → 32 (16/08) → 38 (20/08) → 50 (24/08). Son **1,8/día** en la
ventana anterior y **3,0/día** en esta: el ritmo se ha multiplicado por 1,6. Con
ese ritmo sostenido, las 300 activaciones que exige el disparador de
MONETIZATION.md §4 llegan en **unos 83 días**, frente a los 5,5 meses que
calculamos en la octava. Mejor, y sigue sin servir: la pregunta «¿paga
alguien?» no se puede responder esperando tres meses.

**3 · Instalar no puede arreglar la retención, y esto es aritmética, no
opinión.** `install_shown` / `transcribe_done` = 10/50 = **20 %**. El aviso
solo alcanza a una de cada cinco transcripciones completadas —hace falta un
navegador que lo permita y no tenerlo ya instalado—, mientras que el problema
que pretendía resolver, `storage_not_persisted`, afecta al **76,6 %**. Aunque
todo el mundo pulsara, el techo estructural es el 20 %. El umbral escrito
(≥ 40 mostrados) sigue sin alcanzarse y no se declara fracaso todavía, pero la
instalación deja de ser la respuesta a la persistencia: es, como mucho, una
mejora para quien ya vuelve.

**4 · El canal ha cambiado de dueño.** Entre la séptima y esta:
Reddit 180 → 207 → 269 (×1,5 en total, y **hoy 3 impactos**), Google 84 → 106 →
158 (×1,9), **ChatGPT 1 → 18 → 57 (×57)**. Hoy ChatGPT es el 25 % de los
impactos y Reddit el 3 %. Reddit exige trabajo manual cada vez, se agota en
cuanto el hilo baja, y en la última semana ha costado **dos retiradas por
normas** (r/legaltech por falta de flair de vendedor, r/aiToolForBusiness).
GEO y SEO acumulan sin trabajo repetido y sin riesgo de normas.

**5 · Qué se sigue de todo esto.** El cuello de botella es la demanda, no el
producto, por segunda medición consecutiva. Por tanto:

- **Sí:** GEO/SEO, que es lo único que compone solo, y la vía B2B de
  `EMBED.md`, que es la única con umbral n = 1 en vez de n = 300.
- **Sí, con excepción:** el único trabajo de producto que se paga es el fallo
  de archivos grandes —**8 de 15 errores de decodificación (53 %), dos
  mediciones seguidas**—, porque cae justo sobre el caso de uso que traen las
  páginas SEO (clases, entrevistas, reuniones): archivos largos.
- **No:** diarización. Es lo más pedido en los hilos de Reddit, pero la
  viabilidad en navegador está **[SIN VERIFICAR]** y ningún usuario nuestro la
  ha pedido con un evento. Construirla ahora sería volver a mejorar producto
  contra un cuello de botella de demanda.

### Por qué no sabemos para qué se usa (2026-08-07, corregido)

La encuesta de caso de uso existía desde el principio, pero solo se mostraba
**después del primer export**. Como todavía no ha habido ningún export externo,
nunca llegó a verse: los 0 resultados no eran desinterés, eran una encuesta que
nadie tuvo delante. Es un fallo de diseño de la medición, no una señal.

Corrección: se pregunta también **durante la descarga del modelo**, el único
tiempo muerto del flujo y el único momento en que el usuario ya está
comprometido pero no puede hacer nada. Condiciones que la hacen aceptable:

- La barra de progreso queda **por encima** y no se mueve al responder; el
  E2E lo verifica midiendo su posición antes y después.
- Solo aparece si hay descarga real en curso (> 4 MB); una carga desde caché
  no la ve nunca.
- Un clic, anónima, opcional, y **una sola vez por dispositivo**
  (`localStorage: gate32.usecase`): quien responda en la espera no vuelve a
  verla tras exportar.

El evento distingue el momento (`use_case_wait_*` vs `use_case_export_*`)
porque las dos tasas de respuesta no son comparables: mezclarlas falsearía el
reparto por caso de uso. `wait_survey_shown` da el denominador.

## Eventos definidos

| Evento | Momento | Propiedades |
|---|---|---|
| (page view) | visita | automático de Vercel |
| `wait_survey_shown` | la encuesta se muestra durante la descarga | — |
| `no_webgpu` | el navegador no expone WebGPU (irá en WASM) | — |
| `coi_off` | la página **no** quedó aislada: WASM vuelve a un hilo | — |
| `storage_not_persisted` | el navegador no garantiza conservar el modelo | — |
| `storage_full` | no cabe el modelo; se avisa antes de descargar | — |
| `use_case_wait_*` / `use_case_export_*` | respuesta a la encuesta | `kind`, `when` |
| `file_ready` | archivo elegido, esperando confirmación | — |
| `retry_better` | repite la misma transcripción con un modelo mayor | — |
| `fix_replace` | corrige un término en toda la transcripción | — |
| `fix_undo` | deshace la corrección | — |
| `mark_added` | marca un momento mientras graba | — |
| `mark_used` | salta a un momento marcado en la transcripción | — |
| `doubt_shown` | hay líneas dudosas y se avisa de cuántas | `n` |
| `doubt_shown_1` / `_pocas` / `_muchas` | cuántas, en el nombre (GoatCounter no guarda propiedades) | — |
| `doubt_por_repeat` / `_fast` / `_slow` / `_boilerplate` | qué regla disparó el marcado | — |
| `doubt_seek` | pulsa la hora de una línea marcada: ha ido a comprobarla | — |
| `integrate_demo` | una plataforma carga la demo del embed en la página B2B | — |
| `integrate_copy` | copia el iframe de integración | — |
| `integrate_contact` | pulsa el correo de contacto en la página B2B | — |
| `install_shown` | el navegador permite instalar y se ofrece tras transcribir | — |
| `install_click` | pulsa «Instalar»; abre el diálogo del navegador | — |
| `install_accepted` / `install_dismissed` | qué respondió a ese diálogo | — |
| `install_done` | la instalación se completó (`appinstalled`) | — |
| `transcribe_partial` | terminó pero se perdieron bloques por el camino | — |
| `file_ready_cancel` | elige otro archivo sin transcribir | — |
| `transcribe_start` | usuario confirma y lanza la transcripción | `model`, `device`, `source` (file/mic/meeting/media), `minutes` |
| `transcribe_start_meeting` | la transcripción viene de una reunión grabada | — |
| `meeting_click` | primer clic en «Grabar una reunión» (aún no comparte) | — |
| `meeting_start` | la captura arranca de verdad | — |
| `meeting_no_mic` | se capturó la pestaña pero no el micrófono | — |
| `meeting_no_audio` | la pestaña se compartió sin audio: se aborta | — |
| `meeting_error` | fallo de captura distinto a los anteriores | — |
| `model_ready` | pesos cargados | `model`, `seconds`, `cached` |
| `transcribe_done` | transcripción completa | `model`, `device`, `minutes`, `seconds` |
| `transcribe_error` | fallo | `stage`, `kind` |
| `edit_used` | primera edición de un segmento | — |
| `export` | descarga/copia | `format` |
| `share` | usa el botón compartir | `channel` |
| `pro_interest` | clic en "Quiero Gate32 Pro" | — |
| `return_visit` | visita con historial local previo | `days_since_first` |

### El pase de corrección, construido por fin (2026-08-16)

Seis señales independientes llevaban semanas apuntando al mismo sitio y no
habíamos construido nada de ello. La primera transcripción larga que salió bien
lo zanjó: todo correcto salvo "Cloud" noventa veces, y el texto igual de
inservible para estudiar o citar.

**Está en la pantalla del resultado, gratis:** buscar, ver **cuántas
coincidencias hay antes de tocar nada**, reemplazar en toda la transcripción y
deshacer. La cuenta previa no es un adorno: reemplazar a ciegas en ochocientos
párrafos es una función que nadie se atreve a usar.

**Por qué esto, y no un muro de pago, siendo la dirección la monetización.**
Con 27 activaciones, un 5 % de conversión son 1,35 clientes: montar el cobro
ahora mide ruido, no demanda. Lo que bloquea el MRR, en orden, es **volumen,
después retención, y solo entonces cobrar**. Un transcriptor de un solo uso no
tiene camino a suscripción — nadie paga cada mes por algo que usó una vez. La
corrección es lo que da motivo para volver, y es lo único nuestro que la
evidencia de usuarios respalda.

**Y sirve además para arreglar el instrumento.** `pro_interest` lleva cuatro
mediciones en cero, pero es un botón que no cuesta nada pulsar y no da nada a
cambio: una encuesta sobre un producto hipotético. `fix_replace` mide algo
distinto y más fiable — **gente usando la funcionalidad que decimos que es
nuestro hueco**. Si nadie la usa, la tesis de la corrección se cae con datos
propios y no por opinión.

| Señal | Qué diría |
|---|---|
| `fix_replace` en ≥ 20 % de las transcripciones | La corrección es el trabajo real → es donde construir la capa de pago |
| `fix_replace` casi nulo pero `edit_used` alto | Corrigen a mano: el problema existe pero la herramienta no se encuentra |
| Ambos bajos | La tesis del pase de corrección no aguanta y hay que decirlo |
| `retry_better` alto junto a `fix_replace` | El modelo por defecto se queda corto y la gente lo arregla como puede |

### Primera transcripción larga que sale bien (2026-08-16) — tres validaciones resueltas

MP3 de **99 MB y 69 minutos**, modelo **Preciso**, WebGPU. Es la prueba que
llevábamos días pidiendo y resuelve de golpe tres cosas que estaban anotadas
como no verificadas.

| Qué estaba pendiente | Resultado |
|---|---|
| ¿Funciona el troceado de MP3 en archivos > 1 h? | **Sí.** 99 MB decodificados enteros; el reproductor marca 1:08:57. Antes fallaba casi todo por encima de 60 MB |
| ¿Se sigue saltando texto tras delegar el troceado? | **No.** 14 363 palabras en 69 min = **208 por minuto**, ritmo de habla rápida sostenido. No hay huecos |
| ¿Las costuras entre bloques cosen bien? | **Sí.** Cero párrafos duplicados consecutivos en 852 |

**Velocidad: 31 min 11 s para 69 minutos de audio = 2,2× tiempo real** con
`small` en WebGPU. Para comparar con el dato de campo que teníamos:
faster-whisper `large_v3` nativo iba a ~10×. Seguimos siendo cuatro veces más
lentos que la herramienta de terminal, y a cambio no hay nada que instalar.

**Bucles de repetición: uno solo en todo el archivo**, y al mirarlo resulta
que era real (*"veis aquí que pone bash, bash, bash, bash"* — la pantalla del
vídeo repetía la palabra). Frente a los ocho "el acelete" seguidos del modelo
Equilibrado, el salto de calidad es evidente.

**El único defecto que queda, y es grande:** el vídeo trata sobre **Claude**, y
Whisper escribe **"Cloud" 90 veces**. Un nombre propio mal oído de forma
sistemática arruina la transcripción para estudiar o citar, aunque el resto
sea correcto.

**Lo que se puede y no se puede hacer con eso:**
`prompt_ids` —el mecanismo de Whisper para pasarle vocabulario esperado antes
de transcribir— aparece **documentado en transformers.js pero sin implementar**
(está comentado en el código). Así que el "vocabulario personalizado" que
figuraba en MONETIZATION.md §1 **no es construible con la pila actual**, y hay
que dejar de contarlo como opción.

La salida que sí existe es el **pase de corrección**: buscar y reemplazar sobre
el resultado arregla 90 apariciones de una vez. Y es, precisamente, la tesis
que seis señales independientes llevan semanas señalando como el hueco
defendible (RESEARCH.md §1f, §1h, §1i). La primera transcripción buena que
tenemos apunta al mismo sitio que los usuarios.

### 1 h 35 min de webinar perdidos (2026-08-16) — el peor fallo hasta ahora

El propietario grabó un webinar entero con la captura de pestaña. Al terminar:
*"superfallo, fatal, toda la grabación perdida"*. El mensaje fue **"No se ha
podido leer el audio de este archivo"**.

**Qué pasó, en orden:** la grabación salió bien. El `MediaRecorder` produjo un
único WebM de hora y media. `decodeAudioData` no pudo con él: Opus se
descomprime primero a su ritmo nativo, así que 95 minutos superan el gigabyte
antes de remuestrear a 16 kHz. El troceado que habíamos construido el día
anterior **solo sabe leer MP3**, así que ni se intentó. La decodificación
falló, y con ella se fue el único sitio donde existía el audio: la memoria de
la pestaña.

**Lo grave no es que fallara la decodificación. Es que no había copia.**
Grabábamos hora y media en RAM y se la entregábamos a un decodificador que
podía fallar, sin guardar nada en ningún sitio. Un fallo recuperable convertido
en pérdida total por una decisión de diseño que nadie tomó explícitamente.

**Tres arreglos, en este orden de importancia:**

1. **La grabación se puede descargar siempre.** En cuanto se para de grabar
   aparece un botón para bajarla, y sigue ahí aunque la transcripción falle.
   Una grabación vale por sí misma, se pueda transcribir o no.
2. **Se graba por trozos de 8 minutos**, cada uno un archivo válido e
   independiente. Hora y media son doce archivos que se decodifican de uno en
   uno, así que la memoria máxima es la de un trozo y no la del total.
3. **Un trozo ilegible ya no se lleva a los demás por delante**, igual que se
   arregló antes para los bloques del modelo.

**Lo que esto dice de cómo estábamos probando:** el E2E cubría el recorrido
completo con un WAV de cuatro segundos. Ninguna prueba automática ha grabado
nunca más de unos segundos, y por eso este fallo llegó intacto hasta un
usuario con un webinar de verdad. Los archivos largos son el caso de uso —
clases, entrevistas, reuniones— y eran justo lo que no se probaba.

### Calidad de transcripción: la primera prueba real con voz (2026-08-16)

El propietario grabó 2:49 de un vídeo de cocina con el micrófono, modelo
**Equilibrado** (`whisper-base`), en español. Veredicto suyo: *"la
transcripción es mala, se salta muchísiiimo texto"*. Tenía razón, y había
**dos causas distintas** que conviene no mezclar.

**1 · El modelo pequeño no da para esto, y eso no lo arregla el código.**
`whisper-base` son 74 M de parámetros. En el texto se ve el tipo de error que
comete: *gazpacho* → «campancho», *pepino* → «pino», *aceite* → «acelete»,
*pedúnculo huela* → «peducro huella». Son errores acústicos de un modelo
pequeño con habla rápida y vocabulario de dominio, no un fallo de integración.
También aparece un **bucle de repetición** («el acelete» ocho veces), que es
el modo de fallo clásico de Whisper en tamaños pequeños y se come el resto de
su bloque.

**2 · El troceado era nuestro, y sí era un fallo.** Cortábamos a mano en
ventanas de 30 s y cosíamos por el punto medio de cada segmento.
transformers.js **ya implementa** el algoritmo de audio largo de Whisper, que
cose casando *tokens* en el solape. Cuando una frase caía en la costura y el
modelo no la repetía igual en los dos bloques, no la reclamaba ninguno y se
perdía entera. Con seis costuras en tres minutos, eso explica el "se salta
muchísimo". Ahora se le entregan bloques de dos minutos y trocea la
biblioteca: una costura cada dos minutos en lugar de una cada veinticinco
segundos.

**[NO VERIFICADO]** No puedo medir la mejora desde aquí: el entorno no llega
al CDN de modelos, así que ninguna prueba automática ejecuta Whisper de
verdad. Lo dice el usuario o no lo sabemos. Es la misma limitación que con el
troceado de MP3.

**Lo que esto obliga a mirar, y es incómodo:** 21 de las 27 transcripciones
completadas usaron **Equilibrado**, que es el valor por defecto. Si `base` da
esta calidad en español, la mayoría de nuestros usuarios se está llevando esta
impresión. Subir el modelo por defecto a Preciso triplicaría la descarga
inicial (80 → 250 MB), que es justo el punto donde más gente se cae. Por eso
la primera medida no es cambiar el valor por defecto sino **ofrecer repetir
con el modelo siguiente desde el propio resultado**, sin recargar el archivo:
convierte "esto no sirve" en "con el otro sí" al precio de una espera, y de
paso mide cuánta gente lo necesita.

| Señal | Qué diría |
|---|---|
| `retry_better` / `transcribe_done` alto | El modelo por defecto se queda corto para el uso real → cambiarlo pese al coste de descarga |
| `retry_better` casi nulo | O el resultado basta, o el botón no se ve. Comprobar lo segundo antes de concluir lo primero |
| `transcribe_partial` frecuente | Los bucles de repetición y los bloques vacíos son sistemáticos, no anécdota |

### El botón de confirmar (desplegado 2026-08-16, sin datos todavía)

Elegir un archivo ya no arranca la transcripción: aparece un panel con el
archivo, el aviso de tamaño si lo hay, y un botón **Transcribir**.

**Es un clic añadido en el camino feliz, así que hay que medirlo, no
justificarlo.** La métrica es `transcribe_start` / `file_ready`:

- **≥ 90 %** — el botón no cuesta nada y evita arranques equivocados.
- **75–90 %** — parte de esa caída puede ser gente que se lo repensó al ver el
  aviso de archivo grande, que es un abandono *bueno*: antes esa transcripción
  fallaba igual, pero después de dos minutos de espera. Mirar `file_ready` en
  archivos grandes antes de concluir.
- **< 75 %** — el botón está perdiendo gente de verdad. Revertir a arranque
  automático dejando la memoria de idioma y modelo, que es la mitad del valor y
  no cuesta ningún clic.

**Por qué se hizo igualmente:** el coste de arrancar con los ajustes
equivocados subió mucho el mismo día. Con cuatro modelos y 47 idiomas, un
arranque erróneo son 250 MB de descarga o diez minutos transcribiendo en otro
idioma; los selectores están encima de la zona de arrastre y por eso se
saltaban. El clic se abarata recordando la última elección
(`gate32.model`, `gate32.lang`): a partir de la segunda visita ya está puesto
lo que esa persona usa siempre.

**Sustituye a `big_file_cancel`**, que ya no existe: el aviso de archivo grande
era un `confirm()` del navegador y ahora vive dentro del panel. El abandono
equivalente es `file_ready_cancel`.

### Captura de reuniones (desplegada 2026-08-14, sin datos todavía)

Se instrumenta con nombres de evento propios porque GoatCounter **solo guarda
el nombre**, no las propiedades: `source: "meeting"` dentro de
`transcribe_start` sería invisible ahí.

Tres preguntas, en este orden:

1. **¿Se usa?** `transcribe_start_meeting` / `transcribe_start`. Por debajo
   del 5 % es una función de nicho y no debe condicionar el roadmap; a partir
   del 15 % las actas para equipos dejan de ser una hipótesis lejana
   (MONETIZATION.md §3b).
2. **¿Se entiende?** `meeting_no_audio` / `meeting_start`. Es el fallo
   esperable (no marcar la casilla de compartir audio). Por encima del 30 % el
   problema es la explicación, no la función, y se arregla antes de construir
   nada encima.
3. **¿Se abandona antes de compartir?** `meeting_start` / `meeting_click`. Un
   número bajo significa que el aviso de consentimiento o el diálogo del
   navegador asustan; hay que saberlo antes de concluir que la función no
   interesa.

**Sesgo conocido:** el botón solo existe en Chrome y Edge de escritorio, así
que el denominador natural no son todas las visitas. Comparar contra
`transcribe_start` total infravalorará el uso; se anota aquí para no repetir
el error de la primera medición de activación, donde se dividió por el
denominador equivocado.

## Métricas y umbrales

- **Evento de activación:** `transcribe_done` (primera transcripción
  completada).
- **Métrica principal:** tasa de activación = `transcribe_done` únicos /
  visitas. **Continuar** si ≥ 10 % · **revisar UX/rendimiento** si 3–10 % ·
  **replantear tesis** si < 3 % con ≥ 500 visitas.
- **Métrica de éxito técnico (H2):** `transcribe_done` / `transcribe_start`.
  Sano ≥ 60 %. Si < 25 % con ≥ 100 intentos, el enfoque local no aguanta en
  hardware real → pivotar a híbrido (local + servidor opcional).
- **Métrica de valor completado:** `export` / `transcribe_done` ≥ 40 %
  (la gente no solo prueba: se lleva el resultado).
- **Métrica de retención (H3):** `return_visit` (>24 h) / usuarios activados.
  Señal buena ≥ 15 % a 30 días.
- **Señal de monetización (H4):** `pro_interest` / usuarios activados ≥ 5 %.
- **Anti-vanidad:** las visitas solas no deciden nada; deciden activación,
  finalización, export y retorno.

## Experimentos iniciales

1. **E1 — Humo real (semana 1-2):** publicar y llevar 100–300 visitas
   orgánicas (ver Plan-100). Medir activación y finalización. Éxito: ≥ 10 %
   activación. Fracaso: < 3 %.
2. **E2 — Rendimiento en campo:** distribución de `seconds/minutes` por
   dispositivo (webgpu vs wasm). Decide el modelo por defecto y si hace falta
   modo híbrido.
3. **E3 — Intención Pro:** CTA visible tras cada export. Éxito: ≥ 5 % de
   activados hacen clic. Resultado esperado si fracasa: la monetización
   vendrá de otra capa (B2B actas) o no vendrá → decidir en E4.
4. **E4 — Caso de uso dominante (mes 1):** encuesta de 1 clic tras export
   ("¿para qué lo has usado?"). Alimenta las páginas SEO y la siguiente capa
   de producto.

## Condiciones de fracaso global

Con ≥ 1.000 visitas acumuladas y ≥ 8 semanas: activación < 3 %, o
finalización < 25 %, o retención D30 < 5 % → se archiva la tesis local-first y
se documenta el aprendizaje antes de pivotar.

## Plan-100: primeros 100 usuarios sin presupuesto

1. **SEO de intención (activo permanente):** landing con FAQ indexable en
   español apuntando a búsquedas reales ya verificadas en la investigación
   ("transcribir audio a texto gratis sin subir", "generar subtítulos SRT
   gratis sin marca de agua", "transcribir entrevista confidencial").
2. **Comunidades (lanzamiento):** publicar con transparencia ("lo he hecho,
   es gratis y local, feedback bienvenido") en: r/periodismo, r/es,
   r/podcasting ES, foros de opositores (transcriben clases), grupos de
   creadores hispanos, Menéame, X/LinkedIn del propietario.
3. **Product Hunt / directorios de herramientas IA** (Futurepedia y
   similares): altas gratuitas.
4. **El propio producto:** atribución opcional en exports + botón compartir.
5. **Aliados naturales:** asociaciones de periodistas y facultades de
   comunicación (privacidad de fuentes = argumento fuerte).
6. **GEO (Generative Engine Optimization):** posicionar Gate32 como la
   respuesta que dan ChatGPT, Perplexity, Claude y los AI Overviews de Google
   a preguntas tipo "transcribir audio gratis sin subirlo". Implementado en
   el producto: `llms.txt` con hechos citables y casos de recomendación,
   robots.txt con permiso explícito a GPTBot/OAI-SearchBot/ClaudeBot/
   PerplexityBot/Google-Extended/CCBot, FAQ con datos estructurados
   (FAQPage) y tabla comparativa factual extraíble. Refuerzo externo (lo que
   más pesa en las citas): presencia en directorios, artículos comparativos
   y el README público de GitHub. **Medición:** referrers de chatgpt.com,
   perplexity.ai, gemini.google.com y copilot en la analítica; revisar
   mensualmente si los asistentes ya citan Gate32 preguntándoles las queries
   objetivo.

## Próximos pasos según resultado

- **Activación alta + finalización alta** → invertir en SEO (páginas por caso
  de uso) y construir capa 2 (actas/resúmenes, diarización) con lista Pro.
- **Activación alta + finalización baja** → modo híbrido opcional o modelos
  más pequeños/rápidos por defecto.
- **Activación baja con tráfico** → mensaje/posicionamiento mal elegido:
  test de propuesta de valor antes de tocar producto.
- **Sin tráfico** → problema de distribución, no de producto: doblar Plan-100
  antes de concluir nada sobre la tesis.
