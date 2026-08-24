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
| ~~**Vocabulario personalizado**~~ | Nombres propios, jerga técnica | **No construible hoy:** `prompt_ids` está documentado en transformers.js pero sin implementar (16/08). La alternativa real es buscar y reemplazar en el pase de corrección |
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

## 7 · Publicidad: descartada, con umbral para revisarla (2026-08-24)

La pregunta era razonable —es la vía de monetización más obvia para algo
gratuito— y se descarta por tres motivos independientes. Cualquiera de los tres
bastaría; los tres juntos no dejan discusión.

### 7.1 · La aritmética: son 1,5 $ al mes

La publicidad monetiza atención a escala, y la escala es la que es: **258
páginas vistas en 25 días** (novena medición) = 10,3/día ≈ **310 al mes**.

Con un RPM generoso de 5 $ para tráfico de herramientas y geografía mixta
(EE. UU., España, India, Honduras), eso son **1,55 $/mes**. El umbral de pago
de AdSense es de **100 $**: el primer cobro llegaría en **64 meses**, más de
cinco años. Multiplicando el tráfico por diez seguirían siendo ~15 $/mes.

Puesto al lado de lo que ya hay sobre la mesa:

| Vía | Un mes de ingreso | Equivalente en publicidad |
|---|---|---|
| Un cliente B2B a 50 €/mes | 50 € | **32 meses** de anuncios |
| Una descarga de pago a 5,99 € | 5,99 € | **4 meses** de anuncios |

Una sola venta supera un trimestre entero de publicidad. No es que la
publicidad rinda poco: es que **no está en la misma escala del problema**.

### 7.2 · El bloqueo técnico: los anuncios no cargarían

`vercel.json` fija `Cross-Origin-Embedder-Policy: credentialless` en **todas**
las rutas (`/(.*)`). Google documenta que **Google Publisher Tag —el servidor
de anuncios que hay debajo de AdSense— no soporta páginas con COEP**, y los
iframes de otro origen siguen restringidos tanto con `require-corp` como con
`credentialless` salvo que el propio iframe lo acepte.

Quitar COEP de la portada no es gratis: el aislamiento entre orígenes es lo que
habilita los hilos de WASM, que es el camino por el que hoy pasa el **16 % de
las transcripciones completadas** y el único que existe para quien no tiene
WebGPU. Se estaría cambiando el camino sin GPU —que costó semanas hacer
funcionar— por 1,55 $ al mes.

### 7.3 · El coste de posicionamiento: se rompe justo lo que crece

Todo el argumento del producto es que el audio no sale del dispositivo y que no
rastreamos a nadie; por eso la analítica es GoatCounter sin cookies y no Google
Analytics. Meter anuncios significa scripts de terceros, cookies y **banner de
consentimiento** (RGPD/ePrivacy, y el mercado objetivo es España) sobre el
primer pintado de un embudo cuya métrica principal es la activación.

Peor: `llms.txt`, la FAQ con datos estructurados y la tabla comparativa —donde
criticamos a los competidores precisamente por privacidad— son lo que sostiene
el canal que crece **×57**, ChatGPT. Contradecir esas afirmaciones daña la
única fuente que compone sola, para ganar el equivalente a un café al trimestre.

### 7.4 · Cuándo volver a mirarlo

No es un "nunca", es un "no a esta escala". Se revisa si se cumplen **las dos**
condiciones:

1. **≥ 10.000 páginas vistas al mes** (hoy: 310). Ahí la publicidad da unos
   50 $/mes, que ya paga infraestructura.
2. **Pago directo y B2B probados y fallidos.** Mientras cualquiera de los dos
   siga vivo, los anuncios compiten contra ellos: no se puede cobrar por un
   producto y a la vez enseñar anuncios a quien paga.

Si se llegase a ese punto, la forma compatible con el discurso **no es
AdSense** sino un patrocinio estático de una línea —texto plano, sin script,
sin cookie, vendido directamente— o una red sin rastreo tipo EthicalAds
(**[SIN VERIFICAR]**: exige audiencia técnica y tiene mínimos propios). Eso
además esquiva los apartados 7.2 y 7.3 enteros.
