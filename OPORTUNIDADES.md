# Oportunidades local-first (WebGPU / navegador)

Memoria de oportunidades de producto que salen de lo aprendido con Gate32. No
es un plan: es una lista evaluada para no perderla, con el criterio que la
ordena y la condición para volver a ella.

Origen: propuesta del fundador del 2026-11-15, a partir de la idea de que la
computación local en el navegador (WebGPU, WebAssembly) permite productos con
coste de servidor casi cero y una promesa de privacidad que encaja con el RGPD.

## Lo que Gate32 demuestra y lo que todavía no

**Demostrado con datos** (VALIDATION.md, medición del 2026-11-05):

- **Coste de infraestructura 0 €** con miles de usuarios: el cómputo lo pone el
  dispositivo de cada uno, y los modelos los sirve el CDN de Hugging Face.
- **La privacidad atrae tráfico sin publicidad**: unas 1.150 vistas de página
  en tres meses a partir de un solo post en Reddit, y la primera fuente es
  ChatGPT, que recomienda Gate32 cuando alguien pregunta por transcribir sin
  subir archivos (1.867 registros con ese origen, casi tantos como Google,
  Bing y Reddit juntos). El canal GEO funciona para este tipo de producto.
- La gente lo usa de verdad: 634 transcripciones empezadas y vuelve el doble de
  gente que hace un mes.

**Sin demostrar todavía, y es lo que decide si esto es un negocio:**

- **Que alguien pague.** Ingresos: 0 €. Interés en Pro: 14 clics en tres meses.
  Coste cero quita el riesgo de perder dinero, no crea por sí solo la
  disposición a pagar.

Una lección técnica de este mes, que vale para todo lo de abajo: **detectar
`navigator.gpu` no basta.** En el móvil del fundador, WebGPU ejecutó Whisper
sin dar ningún error y devolvió «[Música]» para 55 s de voz. Hace falta
comprobar que el resultado tiene sentido y repetir en CPU si no
(`src/lib/sanity.ts`). Cualquier producto local con IA necesita esa capa.

## El criterio para ordenar

1. **¿Quién paga y por qué no puede usar la nube?** La privacidad vende cuando
   es una obligación (RGPD, secreto profesional, datos de salud), no cuando es
   una preferencia.
2. **¿Cabe en el navegador de un cliente normal?** Un modelo de 50–250 MB pasa;
   uno de 2 GB en el portátil de una gestoría, no.
3. **¿Llega por el canal que ya funciona?** Búsquedas y asistentes de IA en
   español que preguntan «cómo hacer X sin subir el archivo».
4. **¿Cuánta competencia gratuita hay ya?**

## Las propuestas, evaluadas

### 1. Anonimizar documentos (legal, médico, RR. HH.) · **la más prometedora**

Dolor real con comprador que paga: despachos, gestorías, clínicas y RR. HH. no
pueden subir expedientes a servicios de terceros.

Matices que cambian el producto respecto a la propuesta:

- **Para detectar datos personales, un LLM de 3B no es la mejor herramienta.**
  Es lento, pesa gigas y puede saltarse datos. DNI, NIE, CIF, IBAN, número de
  la Seguridad Social, teléfonos y correos se detectan con patrones y sus
  **dígitos de control**, sin error y al instante. Para nombres y direcciones
  basta un modelo pequeño de reconocimiento de entidades (NER, del orden de
  100–300 MB). Un LLM local, si acaso, para extraer cláusulas, y como extra.
- **Tapar con un recuadro negro no es anonimizar.** Es el fallo clásico: el
  texto sigue debajo y se puede copiar. Hay que eliminarlo del PDF de verdad,
  o rasterizar la página, y comprobarlo.
- **Competencia:** Adobe Acrobat Pro tacha datos en local, pero es de pago, de
  escritorio y sus patrones no conocen los formatos españoles. Microsoft
  Presidio es de código abierto, pero es una librería de Python que hay que
  instalar y montar: no es para una gestoría.

**El ángulo que lo hace oportuno: anonimizar antes de usar ChatGPT.** Mucha
gente quiere pegar un contrato o un informe en un asistente de IA y no puede
por los datos que lleva. Una herramienta local que sustituye los datos por
marcadores («[PERSONA_1]», «[DNI_1]»), guarda la correspondencia solo en el
navegador y **vuelve a poner los datos reales en la respuesta** resuelve el
uso de IA con documentos confidenciales. Encaja con el canal: la pregunta
«cómo usar ChatGPT con datos confidenciales» la hacen a ChatGPT.

### 2. Actas de reuniones con un LLM local · **función Pro de Gate32, no un producto aparte**

Es la extensión natural de Gate32 (ya graba reuniones y separa «Tú» y «Los
demás»). Pero la señal de demanda medida es débil: 2 clics en «actas» en
tres meses. Y un LLM útil para resumir en español pesa 1–2 GB, demasiado para
muchos equipos. Se construye dentro de Gate32 Pro cuando la suscripción tenga
sus primeros clientes y estos lo pidan.

### 3. Editor de fotos con IA local (quitar fondos, borrar objetos) · **descartada por ahora**

Mucha competencia gratuita y muy buena: la eliminación de fondos en el
navegador ya existe en código abierto, y Canva o Adobe Express la regalan. La
privacidad no es el motivo de compra en fotos, y los modelos de difusión pesan
demasiado para el equipo medio.

### 4. Análisis de CSV/Excel con IA local · **aparcada**

La parte de datos es sólida (DuckDB-WASM consulta millones de filas en el
navegador). La débil es la IA: un modelo pequeño traduce mal preguntas en
lenguaje natural a SQL, y en finanzas un resultado equivocado que parece
correcto es peor que no tener resultado. Y compite con Copilot en Excel, que
muchas empresas ya pagan.

## Verticales que añado

### A. Traducir subtítulos en local · **función de Gate32, barata y con público**

Modelos de traducción de 300 MB que ya corren en el navegador. El público de
Gate32 (podcasters, creadores, clases) necesita el SRT en otro idioma para
llegar a más gente, y hoy lo sube a servicios de pago. Es el mismo canal y el
mismo producto, con una exportación más. Candidata a función Pro.

### B. Difuminar caras en fotos y vídeos · **nicho con obligación legal clara**

Colegios, AMPAs, clubes deportivos y fotógrafos de eventos no pueden publicar
la cara de un menor sin consentimiento, y la solución habitual es difuminar a
mano. Detectar caras es ligero (modelos de pocos MB) y rápido incluso en móviles
modestos. Presupuestos bajos en colegios; más interesante para fotógrafos y
agencias que lo hacen por volumen. Las fotos se procesan sin salir del
dispositivo, que es justo lo que pide un dato de menores.

### C. Dictado médico sin nube · **atractiva, pero con riesgo**

Los datos de salud son categoría especial en el RGPD, y dictar notas
clínicas con Whisper en local es técnicamente lo que ya hace Gate32. Pero el
vocabulario médico exige un modelo mejor y la responsabilidad de un error es
alta. Solo con un socio clínico que lo valide.

## Orden de prioridad y condición para empezar

1. **Anonimizar documentos, con el ángulo «antes de ChatGPT».**
2. **Traducción de subtítulos**, como función de Gate32.
3. **Difuminar caras**, como producto pequeño.
4. **Actas con LLM local**, dentro de Gate32 Pro cuando lo pidan los clientes.

**No se empieza ninguna antes de que Gate32 cobre su primera suscripción.** El
riesgo real no es técnico: con Accy en producción esperando sus datos
legales, Gate32 en plena prueba de Google Play y cero ingresos, abrir un
tercer frente es repartir el poco tiempo entre tres cosas que no cobran.
Cuando Gate32 Pro tenga un precio y alguien lo haya pagado, la primera
validación de la opción 1 es barata: una página que explique el producto y
mida cuánta gente lo pide, igual que se validó Gate32 antes de construirlo
entero.
