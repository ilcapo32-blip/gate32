# PRODUCT.md · Gate32 — Transcripción y subtítulos, 100 % en tu navegador

## Tesis de producto

**¿Para quién es?**
Hispanohablantes que necesitan convertir audio o vídeo en texto o subtítulos:
periodistas y podcasters (entrevistas), estudiantes (clases grabadas),
investigadores (trabajo de campo), creadores (subtítulos SRT/VTT),
profesionales (reuniones grabadas, dictados largos) y cualquier persona con
material **sensible** que no quiere subir a servidores ajenos.

**Job to be done:** "Tengo una grabación y necesito su texto (o sus
subtítulos) ya, sin pelearme con límites, registros ni subir material privado
a saber dónde."

**¿Qué problema o deseo resuelve?**
Las herramientas "gratis" actuales imponen topes (30 min de prueba, 3 archivos
de por vida en Otter), muros de registro y — lo estructural — exigen subir el
audio a servidores de terceros. Las alternativas privadas son apps de
escritorio con fricción de instalación o herramientas de terminal.

**¿Qué hace el producto?**
Arrastras un archivo de audio/vídeo (o grabas con el micrófono) → Whisper se
ejecuta **dentro de tu navegador** (WebGPU, con fallback WASM) → obtienes una
transcripción con marcas de tiempo, editable en línea y sincronizada con el
reproductor → exportas TXT, Markdown, SRT, VTT o JSON. Sin registro, sin
límites de uso, sin que el archivo salga del dispositivo.

**¿Por qué ahora?**
Hasta hace poco esto era técnicamente imposible: WebGPU estable en navegadores
+ transformers.js v3 + modelos Whisper cuantizados hacen viable ASR de calidad
en cliente. La ventana "los SaaS cobran por algo que el navegador ya puede
hacer gratis" está abierta y se cerrará; llegar pronto con buen producto en
español es la oportunidad.

**¿Por qué la IA es necesaria?**
El producto *es* el modelo: reconocimiento de voz neuronal multilingüe. No hay
versión no-IA de esto. Y la elección de IA **local** no es estética: es el
diferenciador funcional (privacidad verificable, coste marginal ≈ 0, sin
límites).

**¿Qué alternativa usa hoy el usuario?**
Otter/Notta/HappyScribe (topes + subida), transcripción nativa de WhatsApp
(solo notas de voz en el móvil), MacWhisper (solo macOS), whisper.cpp
(terminal), o pagar.

**¿Por qué probaría Gate32?**
Porque la promesa es inmediata y verificable: "gratis, sin límites, sin
registro, tu audio no sale de tu equipo". Coste de probar: arrastrar un
archivo.

**¿Por qué volvería?**
1) El modelo queda cacheado: la segunda vez arranca en segundos, incluso
offline. 2) La necesidad es recurrente (cada entrevista, clase, vídeo).
3) El editor + exports cubren el flujo completo, no solo el texto bruto.

**¿Cómo llegan los primeros 100 usuarios?** Ver `VALIDATION.md` §Plan-100.

**¿Qué evidencia demostraría que la idea no funciona?**
Ver umbrales de fracaso en `VALIDATION.md`. Resumen: si con tráfico real la
tasa de finalización de transcripciones es <25 % (el rendimiento local no
cumple) o casi nadie repite ni exporta, la tesis "local-first" no aguanta.

## Refinamiento de la propuesta (2026-08-07, desde campo)

La tesis original lideraba con **privacidad**. Tres conversaciones con usuarios
reales en r/podcasting la corrigen: la privacidad es *por qué te creen*, pero
**el acceso es por qué pueden usarte**.

Lo dijo mejor un narrador de audiobooks que corre faster-whisper con
`large_v3` en su propia GPU (Ryzen 5 5500, ~10× tiempo real):

> "La tuya sirve más, porque gente que no tiene Python ni una GPU puede
> correrlo."

**Consecuencia:** no competimos en velocidad con las herramientas nativas —
ahí perdemos y hay que reconocerlo. Competimos en que Whisper de calidad esté
al alcance de quien nunca va a instalar Python, CUDA ni dependencias. Somos la
rampa de entrada, no la estación de carreras.

**Dato de campo (primero fuera de nuestro portátil):**
faster-whisper `large_v3` nativo ≈ 10× tiempo real · Gate32 `tiny` en WebGPU
≈ 5,8× tiempo real. La brecha es real y esperable (CTranslate2+CUDA frente a
ONNX Runtime Web). El intercambio honesto es *cero instalación*.

**Corroboración de la hipótesis de verificación:** ese mismo narrador ha
construido un "Proof Listener" que compara la grabación con el manuscrito para
detectar desviaciones. Es decir: alguien con el problema encima dedicó
esfuerzo a **verificar**, no a generar. Refuerza lo anotado en RESEARCH.md §1b.

## Reuniones: la primera función que un competidor de servidor no puede copiar (2026-08-14)

Origen: una pregunta del propietario, no una hipótesis de escritorio. Quería
transcribir sus videoconferencias de Meet y había estado grabando con la
grabadora del móvil. Y traía el diagnóstico hecho: *"si estás usando cascos y
micrófono de los cascos, claro, solo yo a través del casco escucho el audio
del otro conferenciante"*. Es exacto. Con auriculares, el micrófono ambiente
capta media conversación, y la mitad que capta es la que menos falta hace.

**La salida es `getDisplayMedia` con `audio: true`.** Al compartir la pestaña
de la videollamada, el navegador entrega el sonido que esa pestaña
**reproduce**, tomado antes de los altavoces. Se mezcla con el micrófono en un
`AudioContext` y sale una sola pista con la reunión entera.

**Por qué esto cambia la posición competitiva y no solo añade un botón:**

1. **Un servicio de servidor no puede hacerlo.** Otter, Fireflies, tl;dv y
   Fathom resuelven el mismo problema **metiendo un bot en la llamada**: un
   participante más, con nombre, visible para todos, que sube el audio a sus
   servidores. Nosotros no nos conectamos a la reunión: somos una pestaña
   escuchando a otra pestaña. Para la llamada no existimos.
2. **El bot es un veto, no una molestia.** Muchas organizaciones prohíben
   asistentes externos en sus reuniones, y en otras el invitado desconocido en
   la lista de participantes es socialmente caro. Ahí no competimos por
   precio: competimos contra "no se puede".
3. **Es la primera vez que "local" no es solo una promesa de privacidad, sino
   una capacidad.** Hasta hoy nuestro argumento local era defensivo (*tu audio
   no sale*). Este es ofensivo: hay algo que solo se puede hacer desde dentro
   del navegador del usuario.

**Lo que cuesta, dicho sin adornos:**

- **Solo Chrome y Edge de escritorio.** Firefox y Safari no permiten capturar
  el audio de una pestaña, y en el móvil no existe. El botón no aparece donde
  no funciona, en vez de fallar al pulsarlo.
- **Depende de una casilla que el usuario tiene que marcar** («compartir
  también el audio de la pestaña»). Si no la marca, el navegador entrega la
  pestaña muda. Por eso el flujo tiene dos pasos: el primer clic explica la
  casilla, y si aun así llega sin audio **se aborta con un mensaje** en vez de
  grabar media reunión sin avisar. Un fallo silencioso aquí sería peor que no
  tener la función: el usuario se enteraría al terminar la reunión.
- **Consentimiento.** Grabar a otras personas lo exige. El aviso va antes de
  empezar, no en la letra pequeña. Que sea técnicamente privado no lo hace
  legal.

**Qué medir antes de invertir más aquí** (`transcribe_start_meeting`,
`meeting_click`, `meeting_no_audio`): si el ratio `meeting_no_audio` /
`meeting_start` es alto, el problema no es la función sino la explicación. Y
si `transcribe_start_meeting` pesa de forma apreciable sobre el total,
entonces las actas y resúmenes de MONETIZATION.md §1 dejan de ser una capa
Pro genérica y pasan a ser el producto de reuniones — que es, además, donde
el mercado ya paga por asiento.

### Lo que la función era en realidad (2026-08-14, mismo día)

Pregunta del propietario horas después de desplegarla: *"¿podría transcribir
cualquier vídeo o audio que se estuviera reproduciendo en otra pestaña?"*.

Sí. Y ya lo hacía, sin tocar una línea. `getDisplayMedia` no sabe ni le importa
qué hay en la pestaña que compartes: entrega el audio que esa pestaña
reproduce, sea Meet, YouTube, un directo de Twitch o la radio. **Habíamos
construido algo más general de lo que decía el botón**, y el botón es lo que
la gente lee.

Corregido: «Grabar una reunión» pasa a **«Grabar otra pestaña (reunión, vídeo,
clase…)»**. Quien quería transcribir un vídeo no iba a pulsar un botón que
hablaba de reuniones, y ese es un usuario perdido por una etiqueta.

**Qué se gana y qué no.** Se gana volumen de búsqueda —"transcribir vídeo de
YouTube" tiene mucha más gente detrás que "transcribir reunión de Meet"— y
casos que nadie cubre bien: directos que no se subtitulan, vídeos con los
subtítulos desactivados, idiomas donde los automáticos son ilegibles. No se
gana intención de pago: quien transcribe un vídeo suelto no compra nada.

**Por eso el posicionamiento de cabecera sigue siendo la reunión.** Es donde
existe la historia competitiva («sin bot en la llamada»), donde hay dinero por
asiento y donde el usuario vuelve cada semana. Lo demás es tráfico, y el
tráfico está bien, pero no es lo mismo.

**Corrección el mismo día, del propietario:** *"yo dejaría el botón de
transcripción de reunión y añadiría otro botón con esta funcionalidad, porque
son públicos diferentes… si vienen a transcribir una reunión no piensan en el
botón que también transcribe YouTube"*. Tiene razón, y por un motivo más
fuerte del que da: **el micrófono se comporta al revés en cada caso**. En una
reunión tu voz forma parte de la conversación y sin ella la transcripción sale
coja; sobre un vídeo ajeno solo añadiría el ruido de tu habitación encima del
audio que quieres, y encima pediría un permiso que no hace falta para nada.

Es decir: un botón único no era solo peor de entender, **funcionaba peor**.
Ahora son dos botones sobre el mismo `captureTab(withMic)`, con textos, avisos
y eventos propios — consentimiento solo donde hay personas, aviso de DRM solo
donde hay contenido de pago. La lección para el resto del producto: cuando dos
usos comparten implementación pero no comparten intención, unificar la
interfaz es optimizar para el que escribe el código, no para el que lo usa.

**Dos límites que se dicen por delante, en la app y en la página:**

- **El streaming de pago no se puede capturar.** Netflix, Disney+, Prime Video
  y similares protegen el contenido y el navegador bloquea su captura. No es un
  fallo nuestro y **no vamos a intentar sortearlo**: eludir una medida de
  protección técnica es ilegal en la UE y en EE. UU., y vendemos
  verificabilidad. Un producto que ayuda a saltarse un DRM no puede después
  pedir que se fíen de él.
- **Transcribir para uso propio no es republicar.** El texto de una obra ajena
  sigue teniendo dueño. Se avisa una vez, sin sermón, y se sigue.

## Propuesta de valor (una frase)

> Transcribe y subtitula cualquier audio o vídeo con IA, gratis y sin límites,
> sin que tus archivos salgan de tu navegador.

## Diferenciación

| | Gate32 | SaaS freemium | Apps locales escritorio | Demos whisper-web |
|---|---|---|---|---|
| Sin subir archivos | ✅ | ❌ | ✅ | ✅ |
| Sin instalar nada | ✅ | ✅ | ❌ | ✅ |
| Sin registro / sin topes | ✅ | ❌ | ✅ | ✅ |
| Editor sincronizado + SRT/VTT/TXT/MD | ✅ | ✅ (de pago) | Parcial | ❌ |
| Graba reuniones **sin bot en la llamada** | ✅ (Chrome/Edge) | ❌ (bot participante) | Parcial (audio del sistema) | ❌ |
| UX en español | ✅ | Parcial | ❌ | ❌ |

## Papel de la IA y costes

- **Modelo:** Whisper (onnx-community, cuantizado) vía transformers.js.
  Tres calidades seleccionables: rápido (tiny), equilibrado (base, defecto),
  preciso (small). WebGPU si existe; WASM como fallback con aviso de
  rendimiento.
- **Coste de inferencia:** 0 € (cómputo del usuario, pesos servidos por el CDN
  de Hugging Face y cacheados en el navegador).
- **Sustituibilidad:** la capa de transcripción está aislada en un worker con
  interfaz propia; cambiar de modelo/proveedor (p. ej. una API de servidor
  para un plan Pro) no toca la UI.
- **Sin secretos:** no hay claves. Futuras capas BYOK guardarían la clave solo
  en localStorage del usuario.

## Riesgos principales

1. **Rendimiento en equipos modestos** (WASM lento) → mitigación: modelo tiny
   por defecto en dispositivos sin WebGPU + expectativas claras de tiempo.
2. **Competencia anglosajona** (SubtitleKit et al.) → mitigación: ES-first,
   SEO en español, iteración.
3. **Cambio de plataforma** (los navegadores/SO integren transcripción de
   archivos) → horizonte de años para el flujo completo con exports.
4. **Defensibilidad baja** → aceptada; se compite en ejecución y distribución.

## Distribución (bucle orgánico integrado)

- Exports TXT/MD llevan una línea final de atribución **opcional y
  desactivable**: "Transcrito con Gate32 · gate32.autoritasai.com".
- Botón "Compartir Gate32" (Web Share API / copiar enlace).
- La landing responde con contenido indexable las preguntas de búsqueda
  reales ("cómo transcribir una entrevista sin subirla", "SRT gratis sin
  marca de agua"...): SEO de intención.
- Repositorio público → credibilidad verificable de la promesa de privacidad.

## Retención

- Cache del modelo (segunda visita casi instantánea, funciona offline).
- Historial local de transcripciones (localStorage, sin cuenta).
- La necesidad es recurrente por naturaleza.

## Monetización (hipótesis, no bloqueante del MVP)

Free para siempre: transcribir + editar + exportar en local.
**Pro (futuro, cuando haya señal):** diarización de hablantes, procesado por
lotes, actas/resúmenes con IA, historial sincronizado entre dispositivos,
soporte prioritario. Señal de intención medida desde el día 1 con un CTA
"Quiero Gate32 Pro" (ver VALIDATION.md).
