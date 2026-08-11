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

**Marca propia:** el logotipo es un SVG de barras verticales tipo onda de
audio, dibujado a mano en el HTML. No es un icono de librería.

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

1. **La tipografía es Inter**, que es exactamente la fuente por defecto del
   patrón. Una fuente con más carácter para los titulares —manteniendo Inter
   para el texto— sería el cambio de mayor efecto por menos esfuerzo.
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
