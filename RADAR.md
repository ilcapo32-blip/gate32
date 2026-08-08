# RADAR.md · Vigilancia de conversaciones en Reddit

Busca dos veces al día conversaciones donde Gate32 sería una respuesta útil,
las puntúa y abre una issue en GitHub con el resumen. GitHub envía un correo
por cada issue, así que no hay que entrar a mirar nada.

## Lo que hace y lo que no hará nunca

**Hace tres cosas, en este orden de importancia:**

1. **Respuestas pendientes en tus propios hilos.** Descubre solo lo que has
   publicado a partir del perfil público de la cuenta (`REDDIT_ACCOUNT`, por
   defecto `HpartidaB`) y avisa de los comentarios nuevos. No hace falta
   mantener ninguna lista ni entregar las credenciales de la cuenta: basta con
   las de la aplicación. Ignora tus propios comentarios y los de AutoModerator.
2. **Menciones de Gate32** en cualquier parte de Reddit.
3. **Hilos nuevos** donde tendría sentido aparecer: buscar, filtrar, puntuar,
   recordar lo ya visto y sugerir qué plantilla de `X_CAMPAIGN.md` encaja.

El orden importa: alguien que te está hablando y lleva horas esperando pesa más
que un hilo ajeno donde podrías aparecer.

Además, de cada hilo dice **si el subreddit restringe la autopromoción** —
leyendo sus normas antes de que respondas, no después de que te avise un
moderador— y sugiere un enlace con `?ref=r_<subreddit>` para saber luego qué
comunidad convierte de verdad.

**No hace: publicar.** No es una limitación técnica, es una decisión, y hay
tres razones:

1. **Las normas.** La mayoría de subreddits prohíben la publicación
   promocional automatizada, y a nosotros ya nos avisaron en r/podcasting con
   la regla en la mano. Un baneo cierra el canal que hoy trae un tercio del
   tráfico, y no se revierte.
2. **Ya nos han pillado.** Dos usuarios dijeron explícitamente que el texto
   sonaba a IA: *"me sentiría muchísimo más cómodo si estuvieras escribiendo tu
   propio post"*. Automatizar la respuesta es hacer a escala exactamente lo que
   nos costó credibilidad.
3. **No es el cuello de botella.** Lo que consume tiempo es *encontrar* los
   hilos, no escribir tres frases. El radar quita justo esa parte.

Un agente que responde solo daría más volumen y menos resultado. El objetivo no
es aparecer en muchos hilos: es que quien lea la respuesta se fíe.

### Qué se ha tomado de RedditMaster y qué no (2026-08-08)

Revisado el producto de referencia (59,99 $/mes por modo, 79,99 $ los dos).

**Adoptado**, porque no depende de disimular ante nadie:

- **Vigilancia de competidores.** Un hilo donde alguien compara Otter con
  Descript vale más que cualquier búsqueda genérica: esa persona ya está
  eligiendo.
- **Clasificación por intención.** Distinguir a quien pregunta de quien se
  desahoga. A quien solo despotrica no se le responde con una herramienta.
- **Lectura de las normas del subreddit** antes de responder.
- **Bucle de aprendizaje** vía `?ref=r_<subreddit>`: saber qué comunidad
  convierte.

**Descartado:** el modo Karma y la publicación autónoma. Su logro técnico
central es **no ser detectado**: escritura con *jitter*, "el agente duerme por
la noche para que el patrón nunca parezca un bot", retrocesos automáticos
cuando Reddit marca el comportamiento. Cultivar karma con comentarios
generados para desbloquear la publicación en subreddits moderados es
exactamente lo que esos moderadores intentan impedir. Un producto cuya
funcionalidad estrella es la evasión no es una referencia para nosotros, que
vendemos verificabilidad.

**Lo más valioso del análisis no era el agente, sino la premisa:** los hilos de
Reddit alimentan lo que ChatGPT, Claude, Gemini y Perplexity recomiendan. Ya
tenemos una visita llegada desde chatgpt.com. Eso significa que una respuesta
honesta y útil en un hilo que posiciona **no se mide en clics de esa tarde**,
sino en meses de recomendaciones. Sube el valor de responder bien y baja el de
responder mucho.

## Puesta en marcha (unos minutos, 0 €)

1. **Crear la app de Reddit** en <https://www.reddit.com/prefs/apps> → *create
   another app* → tipo **script**. El nombre da igual; en *redirect uri* vale
   `http://localhost`.
2. Apuntar el **client id** (bajo el nombre de la app) y el **secret**.
3. En GitHub: *Settings → Secrets and variables → Actions → New repository
   secret*, y crear `REDDIT_CLIENT_ID` y `REDDIT_CLIENT_SECRET`.

Las credenciales viven solo ahí. **Nunca en el repositorio**, que es público.

Sin los secretos configurados el workflow no falla: no busca y termina en
silencio.

## Cómo se lee el resumen

Cada hilo llega con:

- **Puntuación**: por debajo de 45 no se reporta.
- **Señales** que explican por qué aparece (`privacidad`, `coste`,
  `subtítulos`, `fricción`, `pregunta`…).
- **Antigüedad y número de respuestas**: por encima de 40 respuestas la nuestra
  queda enterrada; por debajo de 12 horas es cuando responder rinde.
- **Plantilla sugerida** de `X_CAMPAIGN.md`, como punto de partida.

La plantilla **no se pega tal cual**. Se responde primero a lo que preguntan,
con palabras propias, y solo se menciona Gate32 si encaja.

## Ajustes

Todo lo editable está en `scripts/radar-core.mjs`:

- `QUERIES`: qué se busca.
- `SIGNALS` / `PENALTIES`: qué suma y qué resta.
- `rank(..., minScore)`: cuánto hay que exigir para molestar.

El núcleo es puro y está cubierto por tests (`src/lib/__tests__/radar.test.ts`),
así que se puede tocar el criterio sin romper nada a ciegas.

## Ejecución manual

```bash
REDDIT_CLIENT_ID=... REDDIT_CLIENT_SECRET=... node scripts/radar.mjs
```

O desde GitHub: pestaña *Actions* → *Radar de Reddit* → *Run workflow*.
