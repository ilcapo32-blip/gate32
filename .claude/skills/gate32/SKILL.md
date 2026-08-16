---
name: gate32
description: Reglas de trabajo del proyecto Gate32, aprendidas cometiendo cada uno de estos errores. Úsala siempre que se trabaje en este repositorio: al leer métricas, al escribir mensajes para foros o prensa, al afirmar cualquier cosa sobre el producto y antes de publicar en cualquier sitio.
---

# Reglas de Gate32

Cada una de estas reglas existe porque se incumplió y costó algo. No son
buenas prácticas genéricas: son la lista de errores ya cometidos.

## 1. No afirmar lo que no se ha comprobado

El entorno de desarrollo **no tiene salida a internet**: el proxy bloquea
Reddit, X, Hugging Face, Podnews y casi todo lo externo. GitHub sí responde.

- Si no se puede abrir una fuente, **decirlo antes de razonar sobre ella**, no
  después de que pregunten.
- Cuando el usuario manda una captura, lo que queda fuera del recuadro **no se
  ha visto**. No se deduce.
- Nunca inventar nombres de personas, direcciones, identificadores ni datos
  personales. Si no consta, se pregunta.

Errores reales: se etiquetó el límite de 32 caracteres como estándar de
TikTok (es CEA-608); se dedujo un nombre propio a partir de un correo; se dio
por bueno el contenido de un producto sin abrir su web.

## 2. Métricas: el denominador y la fuente

- En GoatCounter **los eventos se guardan como rutas**, así que el total suma
  páginas vistas y eventos. El denominador correcto es **la suma de las filas
  de página**, nunca el total.
- Los ratios se calculan **dentro de una misma fuente**. Cruzar GoatCounter con
  Vercel da activaciones falsas.
- **Ausencia de datos no es un dato negativo.** Un canal sin estrenar no es un
  canal fracasado.

Errores reales: se reportó un 5 % de activación que era un 8 %; se concluyó
que X había fracasado antes de que existiera la campaña.

## 3. Tres afirmaciones prohibidas sobre el producto

No es cierto y no se escribe en ningún sitio:

1. Que exporte "todos los formatos" — son TXT, MD, SRT, VTT y JSON.
2. Que transcriba en tiempo real — no lo hace.
3. Que separe hablantes — no lo hace.

Y la privacidad se argumenta **con la prueba verificable** (desconectar la red
y ver que sigue funcionando), nunca como promesa absoluta.

## 4. Los mensajes públicos los escribe una persona

Dos usuarios detectaron que los borradores sonaban a IA, y uno lo dijo con
tres votos a favor. Desde entonces:

- Frases cortas, sin encabezados en negrita, sin listas de tres puntos, sin
  guiones largos decorativos, sin "¡gran pregunta!".
- **Se responde primero a lo que preguntan**, aunque la respuesta no sea
  Gate32. El enlace va al final y solo si encaja.
- Contar un fallo propio vale más que cualquier argumento de venta.
- El texto final lo reescribe siempre el humano con sus palabras.

## 5. Antes de publicar en una comunidad, sus normas

r/podcasting nos citó su norma de autopromoción con el post ya publicado. Se
leen las normas **antes**. El radar (`RADAR.md`) las comprueba automáticamente.

## 6. Nada de automatizar publicaciones

El radar busca, puntúa y avisa. **No publica.** Automatizar respuestas
promocionales incumple las normas de la mayoría de subreddits, arriesga la
cuenta y contradice el motivo por el que alguien nos creería.

## 7. Un aviso automático que falla en silencio no existe

El radar estuvo cuatro días ejecutándose dos veces al día, siempre en verde,
sin abrir una sola issue. Encontró una respuesta real en un hilo propio, la
apuntó como vista y no la reportó: `gh issue create --label radar` abortaba
porque la etiqueta no existía, y un `|| true` se comía el error.

De ahí tres reglas que se aplican a cualquier automatización del proyecto:

- **Nada de `|| true` en el paso que avisa.** Si el aviso no sale, el trabajo
  debe fallar y hacer ruido.
- **No se marca como hecho lo que no se ha entregado.** Guardar "ya visto"
  antes de confirmar el aviso convierte un fallo puntual en una pérdida
  permanente. En el radar esto vive en `nextSeen`, con pruebas.
- **Verde no es prueba de nada.** Al tocar un flujo programado, se mira una
  ejecución real y su salida, no el color del semáforo.
- **Preparado no es implementado.** IndexNow figuró diez días como hecho en
  `RESEARCH.md` teniendo solo la clave publicada y ningún código que llamara
  a la API: cero páginas notificadas. Si algo se apunta como hecho, tiene que
  haber una ejecución con su salida detrás.
- **Lo que no se ve es lo que se queda atrás.** Los datos estructurados, el
  `llms.txt` y el sitemap no aparecen al mirar la página, así que se
  desincronizan sin que nadie lo note. Están cubiertos por el E2E justo por
  eso; al añadir una capacidad, se actualizan a la vez que la interfaz.

## 8. Secretos fuera del repositorio

Es público. Las credenciales van en variables de entorno o en *secrets* de
GitHub. Nunca en un archivo.

## 9. Commits

Mensajes en inglés. El asunto dice qué cambia; el cuerpo, **por qué** y qué
evidencia lo motivó. Sin emojis, sin firmas de herramientas, sin identificador
de modelo. Si el mensaje lleva caracteres especiales, `git commit -F fichero`.

La firma con GPG falla en este entorno: `git -c commit.gpgsign=false commit`.

## 10. Antes de dar algo por terminado

`npx tsc --noEmit`, `npm test`, `npm run build` y
`CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/e2e.mjs`.

El E2E ya ha detectado defectos reales que los tests unitarios no veían.

## 11. Dónde está el contexto

- `VALIDATION.md` — métricas, umbrales y todas las mediciones con sus
  correcciones.
- `RESEARCH.md` — competencia y evidencia de mercado, con su peso real.
- `PRODUCT.md` / `MONETIZATION.md` — tesis y modelo de negocio.
- `EMBED.md` — la vía B2B y qué se le dice a una plataforma.
- `LAUNCH.md` — canales, normas de prensa y destinatarios.
- `RADAR.md` — vigilancia de Reddit.

Ante una decisión de producto: decidir, documentar el porqué en el archivo que
corresponda y continuar. No preguntar por elecciones ordinarias de diseño o
implementación.
