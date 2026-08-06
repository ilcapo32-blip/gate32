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
