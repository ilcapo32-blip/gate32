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

**Señal cualitativa sobre diarización — con la evidencia real:**
- **1 petición explícita** de un usuario (r/podcasting, 2026-08-07).
- **2 competidores** la ofrecen gratis (Transcrisper, VocaScript). Eso es
  contexto de mercado, **no demanda**.
- **0 clics** en el CTA "¿qué te haría pagar?": nadie ha llegado a expresarlo.

No es, por tanto, "la función más pedida": es *la única* pedida, una vez. Al
regalarla el competidor sigue sin ser palanca de precio, pero la decisión de
construirla no puede apoyarse en demanda observada — solo en el argumento de
que nuestros segmentos objetivo (entrevistas, podcasts) generan audio
multi-hablante.

## Eventos definidos

| Evento | Momento | Propiedades |
|---|---|---|
| (page view) | visita | automático de Vercel |
| `transcribe_start` | usuario lanza una transcripción | `model`, `device`, `source` (file/mic), `minutes` |
| `model_ready` | pesos cargados | `model`, `seconds`, `cached` |
| `transcribe_done` | transcripción completa | `model`, `device`, `minutes`, `seconds` |
| `transcribe_error` | fallo | `stage`, `kind` |
| `edit_used` | primera edición de un segmento | — |
| `export` | descarga/copia | `format` |
| `share` | usa el botón compartir | `channel` |
| `pro_interest` | clic en "Quiero Gate32 Pro" | — |
| `return_visit` | visita con historial local previo | `days_since_first` |

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
