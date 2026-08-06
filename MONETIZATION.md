# MONETIZATION.md · El camino de Gate32 hacia MRR

**Objetivo:** ingresos recurrentes (MRR) con margen ~100 % y sin costes fijos
hasta que los ingresos los financien. **Principio:** el núcleo local será
gratis siempre (es la máquina de adquisición); se cobra por capas de valor
para usuarios intensivos.

## 1 · Qué se cobra (Gate32 Pro)

Todas ejecutables en el navegador → coste marginal ≈ 0 → margen ≈ 100 %:

| Funcionalidad Pro | Por qué pagarían | Viabilidad técnica |
|---|---|---|
| **Identificación de hablantes** (diarización) | La función nº1 por la que Otter cobra; entrevistas y reuniones la piden | Modelo de segmentación pyannote en ONNX corre en navegador (patrón demostrado por whisper-speaker-diarization de Xenova) |
| **Lotes** (cola de archivos) | Podcasters/creadores con backlog | Trivial sobre la arquitectura actual |
| **Actas y resúmenes con IA** | Del texto bruto al entregable | Fase 1 BYOK (clave del usuario, gratis para nosotros); fase 2 API propia financiada por ingresos |
| **Vocabulario personalizado** | Nombres propios, jerga técnica | `initial_prompt` de Whisper |
| Historial ampliado + export masivo | Usuarios intensivos | localStorage/OPFS |

## 2 · Precio (hipótesis a testar)

- **Pro: 4,99 €/mes o 39 €/año** (ancla anual = MRR estable y menos churn).
- Lanzamiento: 50 % primer año para los primeros 50 clientes ("fundadores").
- Referencia de mercado: Otter Pro ≈ 8–17 $/mes con topes; cobramos la mitad
  sin topes → posicionamiento coherente con la marca.
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
   financiada por el MRR existente.

## 6 · Instrumentación de esta hoja de ruta

- `pro_interest` (clic en "Me interesa") — ya activo.
- `pro_feature` {diarizacion|lotes|actas} — captura qué construir primero.
- Encuesta post-export (E4 de VALIDATION.md) — casos de uso dominantes.
- Todo visible en gate32.goatcounter.com sin coste.
