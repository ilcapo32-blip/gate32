---
name: gate32-diseno
description: Identidad visual de Gate32 y cómo evitar que una página parezca generada por IA. Úsala al crear o modificar cualquier página, componente o estilo del proyecto, y antes de añadir una landing nueva.
---

# Diseño de Gate32

Un usuario que entra y piensa "esto lo ha hecho una IA" no prueba el producto.
Ya nos pasó con el **texto**: dos personas detectaron que las respuestas
sonaban a IA y una lo dijo en público con votos a favor. El equivalente visual
es el mismo fallo en otro canal, y con un producto cuyo argumento es "fíate de
mí, comprueba el código", parecer plantilla es caro.

## Lo que ya nos diferencia y no se toca

**La paleta es cálida, de papel, no el azul-violeta de plantilla.** Está en
`src/styles.css` como variables y es la decisión visual que más nos aleja del
patrón:

- Fondo `#fafaf7` (papel), tinta `#1c1c1a`, líneas `#e5e2d8`.
- Acento **naranja quemado** `#b45309`, no índigo ni violeta.
- Modo oscuro cálido (`#12120f`), no el gris azulado habitual.

**Cero efectos de plantilla.** En toda la hoja de estilos hay **un** degradado
y ninguna transparencia difuminada. Se mantiene así.

**Marca propia:** el logotipo del fundador, «Gate32» a pincel dentro de un
bocadillo de diálogo (16/11). Sustituyó en toda la web al SVG de barras que
había antes. Es reconocible tal cual: no se redibuja ni se retoca.

- `public/logo-light.webp` y `logo-dark.webp`: sin fondo, con versión clara
  para el modo oscuro. Van en un `<picture>` con
  `(prefers-color-scheme: dark)`, en la cabecera de cada página y en el modo
  app.
- Icono (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) y favicon
  (`favicon-48.png`, `favicon-32.png`): el bocadillo con el «32» naranja sobre
  el crema del logotipo, sin la palabra «Gate», que a 48 px no se lee. Elegido
  entre tres versiones (crema, oscuro, naranja). El icono deja margen de
  seguridad porque Android recorta el borde; el favicon no.
- `public/og.png` y `og-en.png` (1200×630) y `docs/play/grafico-funciones-*.png`
  (1024×500): logotipo y titular, con textos ya aprobados.
- Títulos (`h1`, `h2`, `h3`) en **Space Grotesk** en toda la web, autoalojada.
  Las etiquetas pequeñas en mayúsculas siguen en Inter.

**Modo app** (`html.app`, al final de `src/styles.css`): la interfaz de la app
de Android y de la web instalada en un teléfono. La decidió el fundador sobre
una maqueta con dos versiones, y eligió la sobria en los tres puntos dudosos:

- Botón principal de **naranja liso** (`--accent`), con sombra neutra. Se
  descartó el degradado `#C4622D → #E07A3A` con brillo naranja: es un rasgo
  de plantilla y su extremo claro deja el texto blanco a 3:1.
- Reproductor flotante **opaco**. Se descartó el cristal desenfocado.
- Sin fondo con degradado en la pantalla de transcribir.

Lo que sí entró: **Space Grotesk** en los títulos (autoalojada en
`public/fonts/`, licencia OFL), esquinas de 16 px, sombras suaves en lugar de
bordes, el arco de progreso con un degradado del naranja del logotipo y un
halo que late. El degradado del arco es el único de la app, y va en un
indicador, no en un botón ni en un fondo.

## Señales que delatan una página generada, y que aquí no entran

- Degradados violeta/índigo, texto con degradado, manchas borrosas de fondo.
- Cristal esmerilado (`backdrop-filter`) en tarjetas o cabeceras.
- Rejilla de tres tarjetas con un emoji grande cada una.
- Emojis decorativos en titulares (✨ 🚀 💡). Los emojis solo se usan cuando
  **informan**: 🔒 en la línea de privacidad, ⚠️ en un aviso, 💾 en el de
  almacenamiento.
- Filas de "confían en nosotros" sin logotipos reales.
- Radios de borde enormes por todas partes. Aquí `--radius: 12px`.
- Animaciones de entrada al hacer scroll.

## Lo que sí es genérico en lo que tenemos (honestidad)

No todo está resuelto. Si algún día se rediseña, estos son los puntos débiles:

1. ~~**La tipografía es Inter**~~ Resuelto el 16/11: los títulos van en Space
   Grotesk y el texto sigue en Inter.
2. **La fila de insignias con ✓** (`gratis · sin registro · no se suben`) es un
   recurso muy visto. El contenido es cierto y útil, pero la forma es de
   plantilla.
3. **El orden de secciones** (héroe → insignias → app → pasos → FAQ) es el
   esqueleto habitual.

**No se rediseña sin motivo.** A 11 de agosto de 2026 el ratio de intento sube
(11 % → 18 % → 24,7 % → 25,8 %): la portada no está espantando a nadie. El
cuello de botella está en la lectura de archivos, no en el aspecto. Ver
`VALIDATION.md`.

## Reglas al añadir una página

1. Reutilizar las variables de `src/styles.css`. Nunca colores en crudo.
2. Reutilizar clases existentes (`panel`, `btn`, `badges`, `info`, `steps`)
   antes de inventar componentes.
3. Cada página nueva entra en `vite.config.ts` como entrada del build.
4. Idioma según el atributo `lang` del documento; el texto estático vive en el
   HTML y el generado por JS pasa por `src/lib/i18n.ts`.
5. Contraste real: el texto secundario usa `--ink-soft`, no `--muted`, cuando
   tiene que leerse.
6. Nada de tipografías ni scripts externos: rompen el aislamiento de origen
   cruzado (`COOP`/`COEP`) del que dependen los hilos de WebAssembly.

## La prueba que hay que pasar

Antes de dar por buena una página: **¿se distingue de las otras cincuenta
páginas de herramientas de IA que esa persona ha visto este mes?** Si la única
respuesta es "el texto es mejor", el diseño no está haciendo su parte.
