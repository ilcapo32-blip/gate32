# RADAR.md · Vigilancia de conversaciones en Reddit

Busca dos veces al día conversaciones donde Gate32 sería una respuesta útil,
las puntúa y abre una issue en GitHub con el resumen. GitHub envía un correo
por cada issue, así que no hay que entrar a mirar nada.

## Lo que hace y lo que no hará nunca

**Hace tres cosas, en este orden de importancia:**

1. **Respuestas pendientes en tus propios hilos.** Descubre solo lo que has
   publicado a partir del feed público del perfil (`REDDIT_ACCOUNT`, por
   defecto `HpartidaB`) y avisa de los comentarios nuevos. Sin listas que
   mantener y sin credenciales de ningún tipo. Ignora tus propios comentarios y
   los de AutoModerator.
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

## Puesta en marcha: ninguna

**No hace falta configurar nada.** El radar usa los feeds RSS públicos de
Reddit: sin registro de aplicación, sin aceptar políticas de desarrollador y
sin secretos que guardar.

La primera versión usaba la API con OAuth y se quedó atascada en el formulario
de alta de aplicación. Una herramienta interna que depende de un trámite no es
una herramienta: es una intención. Los feeds dan casi lo mismo sin ese peaje.

**Lo que se pierde frente a la API:** el número de comentarios de cada hilo. La
puntuación lo trata como desconocido y no ajusta nada, en vez de suponer que el
hilo está tranquilo. Las normas de autopromoción se siguen leyendo, desde el
endpoint público `/r/<sub>/about/rules.json`.

**Riesgo conocido, ya materializado:** Reddit limita las IP de los centros de
datos, y los ejecutores de GitHub Actions lo son. El 14/08/2026 la primera
petición dio 403 y las quince siguientes 429 seguidas. El resumen **lo dice**
en lugar de callar: un informe vacío por bloqueo es indistinguible de "no hay
nada", y confundir una cosa con la otra es el error que ya cometimos con las
métricas.

Mitigaciones puestas (14/08/2026): reintentos con espera creciente respetando
`Retry-After`, pausa base de 4 s en vez de 2 s, y un cortacircuitos que
abandona tras cinco fallos seguidos — cuando la IP viene limitada, insistir
veinte minutos da el mismo informe que rendirse en uno.

**Puede que no baste.** Si el bloqueo persiste, la vía fiable es ejecutarlo
desde un equipo propio, con IP doméstica:

```bash
node scripts/radar.mjs
```

El resumen sale por pantalla. Si se repite varios días, la alternativa es
volver a la API con credenciales.

## El fallo del 13/08/2026: cuatro días de silencio

Merece quedar escrito porque es el modo de fallo que este archivo decía
querer evitar, y ocurrió igual.

El radar llevaba desde el día 10 ejecutándose dos veces al día, siempre con
resultado *success*. No abrió ni una sola issue. El 13 por la tarde encontró
una respuesta real en un hilo propio, la apuntó como vista y no la reportó.
Esa conversación se perdió.

La cadena fue esta:

1. La etiqueta `radar` no existía en el repositorio.
2. `gh issue create --label radar` aborta **sin crear la issue** si la
   etiqueta no existe.
3. El comando llevaba `|| true`, así que el paso terminaba en verde.
4. El paso siguiente hacía commit de la lista de vistos igualmente.

Cada eslabón por separado parecía prudente. Juntos convertían el radar en un
sistema que olvida lo que no ha contado, en silencio y con el semáforo en
verde.

**Lo que se ha cambiado, y por qué en ese orden:**

- La etiqueta se crea antes de usarla.
- Se ha quitado el `|| true`: si el aviso no sale, el trabajo falla y GitHub
  manda el correo de siempre. Un radar que calla es peor que no tener radar.
- **La lista de vistos solo se guarda si el aviso ha salido.** Es la regla de
  fondo (`nextSeen` en `radar-core.mjs`, con pruebas): marcar como visto es
  una promesa de haber avisado. Repetir un hilo cuesta un vistazo; perder una
  respuesta cuesta la conversación.
- Cuando Reddit bloquea la pasada no se recuerda nada, ni siquiera lo poco que
  llegó: el resumen de esa pasada es el aviso de bloqueo, así que esos hilos
  tampoco están contados.
- La lista se ha vaciado para que vuelva a aparecer lo que se tragó.

## El ruido del 14/08/2026: 36 hilos, casi todos de relleno

La primera pasada que sí llegó a Reddit reportó **36 hilos**. Entre los diez
primeros: cirugía refractiva de miopía, un servidor de Minecraft y un tutorial
de Clip Studio Paint, con puntuaciones de 70 a 101. Tres hilos salían por
duplicado.

La causa: cuando una búsqueda no le cuadra, `search.rss` de Reddit **devuelve
el feed general de novedades** en lugar de una lista vacía. El puntuador no
comprobaba en ningún momento que el hilo fuera del tema, así que las señales
genéricas —"vs", "private", "free"— disparaban solas en cualquier texto lo
bastante largo.

Arreglado con una **puerta temática** que se comprueba antes de puntuar: si el
hilo no habla de pasar voz a texto (transcripción, subtítulos, Whisper, o el
nombre de un competidor), se descarta y da igual lo que sume. Y los hilos que
llegan por varias búsquedas se muestran una sola vez.

El motivo de arreglarlo el mismo día: un resumen con treinta hilos de relleno
enseña a no abrirlo, y entonces da lo mismo lo bueno que sea el que hacía
número treinta y uno.

## Cómo se lee el resumen

Cada hilo llega con:

- **Puntuación**: por debajo de 45 no se reporta.
- **Señales** que explican por qué aparece (`privacidad`, `coste`,
  `subtítulos`, `fricción`, `pregunta`…).
- **Antigüedad**: por debajo de 12 horas es cuando responder rinde. El número
  de respuestas solo se tiene en cuenta si se conoce, cosa que los feeds RSS no
  aportan.
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
node scripts/radar.mjs
```

O desde GitHub: pestaña *Actions* → *Radar de Reddit* → *Run workflow*.
