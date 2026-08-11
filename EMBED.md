# EMBED.md · Gate32 dentro de otro producto

Transcripción para los usuarios de tu plataforma **sin coste por minuto y sin
que sus archivos lleguen a tus servidores**, porque el modelo se ejecuta en el
navegador de cada usuario.

## Por qué existe esta página

Quien aloja podcasts quiere ofrecer transcripción, pero la factura por minuto
de ASR le come el margen y guardar audio ajeno le añade responsabilidad legal.
Con Gate32 integrado no hay ni una cosa ni la otra: el trabajo ocurre en el
equipo de cada usuario final.

**Corrección tras el primer contacto real (2026-08-11):** Transistor respondió
que *"no vamos a hacer cambios en nuestra herramienta de transcripción ahora
mismo"*. Es decir: **ya la tienen**. El primer envío daba por hecho que
faltaba, y eso era falso para cualquier plataforma establecida.

El argumento correcto no es *"os falta transcripción"* sino **"la que tenéis os
cuesta por minuto y obliga a que el audio de vuestros clientes pase por
vuestros servidores; esta no hace ninguna de las dos cosas"**. Sustituir algo
que ya funciona es una venta más difícil que rellenar un hueco, pero es la
situación real y fingir lo contrario se nota en la primera respuesta.

**Contexto temporal que ayuda:** en agosto de 2026 el sector está lanzando
vídeo (RSS.com con vídeo para Apple Podcasts, Transistor con su propio
lanzamiento). El vídeo dispara la demanda de subtítulos, y ahí Gate32 tiene
algo concreto: SRT y VTT con longitud de línea a estándar de emisión, sin
coste por minuto.

**La evidencia de que eso importa, en orden de peso:**

1. **Barry Krantz, CEO de Blubrry**, en The New Media Show (recogido por
   Podnews el 10/08/2026): el alojamiento, el almacenamiento y la distribución
   *"se han convertido en materias primas; la diferencia competitiva viene
   ahora de las herramientas, servicios, soporte, analítica y flujos de trabajo
   construidos alrededor de la infraestructura"*. Es el problema de negocio del
   cliente, dicho por el cliente.
2. **Un empleado de Riverside**, en r/podcasting: el formateo de subtítulos es
   *"una brecha real"* y merece ser una opción nativa de exportación.
3. Podnews, al reseñar Gate32, añadió *"(¿podría ser útil para las empresas de
   alojamiento de podcasts?)"*. **Peso bajo, y conviene decirlo:** el editor
   usa la misma fórmula especulativa con la herramienta del punto siguiente
   (*"¿podría esto alimentar las notas del episodio?"*). Es un recurso de
   estilo, no una validación.

La hipótesis se sostiene por el punto 1, no por el 3.

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

## Quién hay detrás, y por qué eso no es un riesgo para ti

Gate32 lo construye y lo mantiene **una sola persona**. Conviene decirlo antes
de que lo preguntes, porque para quien va a apoyar una funcionalidad de su
producto en algo ajeno es la primera duda razonable: *¿y si mañana desaparece?*

La respuesta es la licencia. **MIT, código completo y público, sin backend.**
Si esto se abandonara, tu equipo se queda con un build estático que sigue
funcionando, que podéis clonar, servir desde vuestro dominio y modificar sin
pedir permiso a nadie. No hay servidor que apagar, ni API que se pueda cortar,
ni claves que caduquen.

Compáralo con integrar un servicio de transcripción en la nube: ahí el riesgo
de que cierre o suba precios **sí** te deja sin funcionalidad. Aquí el peor
escenario es que dejes de recibir actualizaciones de algo que ya tienes.

## Licencia y soporte

El código es MIT: puedes clonarlo, servirlo tú y modificarlo sin pedir permiso
ni pagar nada. Lo que ofrecemos a cambio de dinero es lo que la licencia no da:
una versión mantenida y probada contra los cambios de navegadores y modelos,
soporte de integración, y prioridad en las funcionalidades que necesites.

Contacto: **hpartida@autoritasai.com**, o a través de
[GitHub](https://github.com/ilcapo32-blip/gate32/issues).
