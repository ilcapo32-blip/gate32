# EMBED.md · Gate32 dentro de otro producto

Transcripción para los usuarios de tu plataforma **sin coste por minuto y sin
que sus archivos lleguen a tus servidores**, porque el modelo se ejecuta en el
navegador de cada usuario.

## Por qué existe esta página

Podnews lo planteó en una línea el 10/08/2026, al reseñar Gate32: *"Could be
handy for podcast hosting companies?"*. La observación es correcta y describe
el único encaje donde este producto tiene un modelo de negocio: quien aloja
podcasts quiere ofrecer transcripción, pero la factura por minuto de ASR le
come el margen y guardar audio ajeno le añade responsabilidad legal. Aquí no
hay ni una cosa ni la otra.

## Integración

```html
<iframe
  src="https://gate32.autoritasai.com/embed/?lang=en&model=balanced"
  style="width:100%;height:760px;border:0;border-radius:12px"
  allow="microphone"
  title="Transcription"
></iframe>
```

Eso es todo. No hay SDK, no hay clave de API, no hay servidor que llamar.

### Parámetros

| Parámetro | Valores | Efecto |
|---|---|---|
| `lang` | `en`, `es` | Idioma de la interfaz |
| `model` | `fast`, `balanced`, `accurate` | Fija el modelo y quita la decisión al usuario |
| `brand` | `0` | Oculta la línea de atribución a Gate32 |

`allow="microphone"` solo hace falta si quieres que tus usuarios puedan grabar
directamente; para transcribir archivos no es necesario.

### Lo que verá tu usuario

Suelta un archivo, la primera vez se descarga el modelo (50–250 MB según el
elegido, cacheado después) y obtiene el texto con marcas de tiempo, editable,
con exportación a TXT, Markdown, SRT, VTT y JSON. Los subtítulos salen ya
formateados a 32 (CEA-608), 37 (BBC) o 42 (Netflix) caracteres por línea.

## Lo que cuesta

Cero servidores por tu parte y cero por la nuestra: la inferencia ocurre en la
máquina del usuario. Los pesos del modelo se sirven desde el CDN de Hugging
Face, o **desde tu propio dominio** si prefieres no depender de terceros
(variable `VITE_MODEL_HOST`; ver README, sección de autoalojamiento).

## Lo que hay que decirle al usuario, y no ocultar

- **La primera vez hay una espera** mientras baja el modelo. Está explicada en
  la propia interfaz, con progreso real en MB y tiempo restante.
- **Sin WebGPU va mucho más lento** (Firefox en algunos sistemas, equipos
  antiguos). La página lo avisa antes de empezar.
- **No separa hablantes** todavía.
- **Archivos muy largos pueden fallar por memoria** del navegador: un episodio
  de más de una hora en un equipo modesto es el límite práctico.

## Licencia y soporte

El código es MIT: puedes clonarlo, servirlo tú y modificarlo sin pedir permiso
ni pagar nada. Lo que ofrecemos a cambio de dinero es lo que la licencia no da:
una versión mantenida y probada contra los cambios de navegadores y modelos,
soporte de integración, y prioridad en las funcionalidades que necesites.

Contacto: a través de [GitHub](https://github.com/ilcapo32-blip/gate32/issues)
o del sitio.
