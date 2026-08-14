# MONETIZATION.md · El camino de Gate32 hacia MRR

**Objetivo:** ingresos recurrentes (MRR) con margen ~100 % y sin costes fijos
hasta que los ingresos los financien. **Principio:** el núcleo local será
gratis siempre (es la máquina de adquisición); se cobra por capas de valor
para usuarios intensivos.

## 1 · Qué se cobra (Gate32 Pro)

Todas ejecutables en el navegador → coste marginal ≈ 0 → margen ≈ 100 %:

> **Revisión 2026-08-07 tras el hallazgo competitivo (ver RESEARCH.md §1b):**
> Transcrisper ofrece **diarización gratis** en el navegador. Por tanto la
> diarización pasa de "función Pro estrella" a **requisito de paridad que hay
> que dar gratis** si la señal la pide. Cobrar por ella ya no es viable.
> La monetización se desplaza hacia donde el competidor no está: **el flujo de
> corrección y verificación** (el dolor que los profesionales declaran) y las
> capas con coste real de servidor (actas con LLM, equipos).

| Funcionalidad Pro | Por qué pagarían | Viabilidad técnica |
|---|---|---|
| ~~Identificación de hablantes~~ (ahora paridad gratuita) | El competidor directo la regala: deja de ser palanca de precio | pyannote en ONNX corre en navegador |
| **Herramientas de corrección profesional** (atajos de teclado, reproducción a media velocidad, pedal/foot-switch, buscar-y-reemplazar con audio, marcas de "dudoso", control de calidad por confianza) | Es *el* trabajo caro que hoy se hace a mano; nadie lo optimiza | Todo en cliente, coste 0 |
| **Lotes** (cola de archivos) | Podcasters/creadores con backlog | Trivial sobre la arquitectura actual |
| **Actas y resúmenes con IA** | Del texto bruto al entregable | Fase 1 BYOK (clave del usuario, gratis para nosotros); fase 2 API propia financiada por ingresos |
| **Vocabulario personalizado** | Nombres propios, jerga técnica | `initial_prompt` de Whisper |
| Historial ampliado + export masivo | Usuarios intensivos | localStorage/OPFS |

## 2 · Precio (hipótesis a testar)

- **Pro: 4,99 €/mes o 39 €/año** (ancla anual = MRR estable y menos churn).
- Lanzamiento: 50 % primer año para los primeros 50 clientes ("fundadores").
- Referencia de mercado: Otter Pro ≈ 8–17 $/mes con topes; cobramos la mitad
  sin topes → posicionamiento coherente con la marca.
- **Segunda referencia, verificada (PrismaScribe, 13/08/2026):** 10-12,5 $/mes
  por 5-20 h y 20-25 $/mes por 40 h, con plan gratuito de **media hora al mes y
  archivos de 15 minutos como máximo**. Confirma la horquilla y confirma que
  todos los planes gratuitos del sector son de prueba, no de uso.
- **Y una señal de precio sobre lo que ya hemos construido:** los subtítulos
  configurables SRT/VTT figuran en su comparativa de **planes de pago**. Es la
  primera evidencia de que el formateo de subtítulos —lo que nos pidieron dos
  profesionales y lo que dice la encuesta— tiene precio de mercado. Si algún
  día hay Pro, ese es el candidato con más respaldo, por delante de la
  diarización.
- Escenarios MRR: 50 clientes ≈ 200 €/mes · 250 ≈ 1.000 €/mes · 1.000 ≈ 4.000 €/mes.

## 3 · Rail de pago (decidido, pendiente de trigger)

**Recomendación: Polar.sh** — Merchant of Record (liquidan IVA UE/impuestos
globales, sin OSS ni gestoría extra para el propietario), 4 % + 40¢,
license keys nativas, API developer-first. **Alternativa:** Lemon Squeezy
(5 % + 50¢, licencias muy maduras, ahora bajo Stripe).
Fuentes: goilerplate.com/blog/polar-vs-stripe-vs-lemonsqueezy,
stilllater.com/dev-tools/lemonsqueezy-vs-stripe-vs-paddle,
buildmvpfast.com/blog/lemon-squeezy-vs-polar-paddle-merchant-of-record-2026.

**Arquitectura sin backend propio:**
1. Checkout alojado por el MoR (enlace desde la web).
2. El cliente recibe una **license key**.
3. Gate32 valida la key contra la API de licencias del MoR desde el cliente y
   desbloquea las funciones Pro en local (flag en localStorage, revalidación
   periódica).
4. Riesgo de pirateo asumido conscientemente: a esta escala es irrelevante y
   el free ya es generoso; no se invierte en DRM.

## 3b · Lo que cambia con la captura de reuniones (2026-08-14)

La función de grabar videollamadas (ver PRODUCT.md) mueve una pieza del plan,
y conviene decir cuál exactamente para no sobreinterpretarla.

**No cambia:** el núcleo sigue gratis, y la función de captura también. Cobrar
por grabar la reunión sería cobrar por `getDisplayMedia`, que es del navegador
y no nuestro.

**Sí cambia el orden de la escalera B2B.** El paso 3 de §5 ("capa B2B: actas de
reuniones para equipos") estaba planteado como algo lejano que requeriría
infraestructura propia. Ahora la mitad difícil —**meter el audio de la reunión
dentro del producto**— ya está hecha y sin coste de servidor. Lo que falta
para un producto de reuniones vendible es la capa de entregable: acta,
acuerdos, tareas y quién dijo qué.

**Y cambia el argumento de venta, que era el eslabón débil.** Contra Otter o
Fireflies no íbamos a ganar por funciones. Contra "vuestra política prohíbe
meter bots en las reuniones" sí hay conversación, porque ahí no hay
competencia de producto: hay una prohibición y una necesidad sin cubrir.

**Sigue sin haber señal de pago de ningún usuario final.** Esto es una hipótesis
mejor situada, no un ingreso. El orden se mantiene: medir primero
(`transcribe_start_meeting`), construir después.

| Señal | Qué desbloquea |
|---|---|
| `transcribe_start_meeting` ≥ 15 % de `transcribe_start` | Las reuniones son un caso de uso real → actas con IA pasan a ser la primera feature Pro candidata, por delante de las herramientas de corrección |
| Alguien pregunta por equipos o por varias personas | Conversación B2B directa: es la única vía a un plan por asiento sin construirlo a ciegas |
| `meeting_no_audio` / `meeting_start` > 30 % | No es problema de monetización sino de explicación: arreglar el flujo antes de construir nada encima |

## 4 · Triggers (no construir antes de la señal)

| Señal (GoatCounter) | Acción |
|---|---|
| `pro_interest` ≥ 20 clics **o** ≥ 5 % de activados | Elegir la feature más votada en `pro_feature` y construirla |
| Feature Pro construida y usada por ≥ 10 personas en beta | Alta en Polar, checkout y license keys (el propietario crea la cuenta; yo integro) |
| Primeros 5 clientes | Subir precio a tarifa completa para los siguientes |
| `pro_interest` < 5 con ≥ 300 activados | La capa Pro B2C no tira → pivotar monetización a B2B (actas para equipos) o API |

## 5 · Escalera de crecimiento del MRR

1. **0 → 200 €** · early adopters de comunidades (LAUNCH.md) + oferta fundadores.
2. **200 → 1.000 €** · SEO/GEO compuesto + **versión en inglés** (mercado 20×;
   trigger: tráfico ES estancado o referrers EN en analytics) + afiliados del
   MoR (creadores que recomiendan la herramienta con comisión).
3. **1.000 € →** · capa B2B: actas de reuniones para equipos (planes por
   asiento) y/o API de transcripción privada; ahí sí, infraestructura propia
   financiada por el MRR existente. **Desde 2026-08-14 la captura de la
   reunión ya está construida y no cuesta servidor** (§3b): lo que falta es el
   entregable, no la entrada de audio.

## 6 · Instrumentación de esta hoja de ruta

- `pro_interest` (clic en "Me interesa") — ya activo.
- `pro_feature` {diarizacion|lotes|actas} — captura qué construir primero.
- Encuesta post-export (E4 de VALIDATION.md) — casos de uso dominantes.
- Todo visible en gate32.goatcounter.com sin coste.
