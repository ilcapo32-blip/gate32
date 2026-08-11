# X_CAMPAIGN.md · Banco de tuits para @Hpartida32

## Corrección (2026-08-11): la cuenta empieza de cero

Este banco se escribió suponiendo una cuenta con algo de alcance. La cuenta
real (**@Hpartida32**) se estrena vacía, y eso invierte el orden de todo: una
cuenta sin seguidores que publica cincuenta tuits no la lee nadie, porque X
apenas distribuye lo que publica una cuenta nueva.

**Orden correcto para arrancar:**

1. **Perfil completo antes de nada.** Nadie sigue a un huevo sin biografía. Foto
   (la misma que se envió a Podnews), cabecera, biografía, enlace y un tuit
   fijado.
2. **Seguir a 30-50 cuentas del nicho** y leerlas unos días. Sin un timeline
   relevante no hay dónde responder.
3. **Responder en hilos ajenos.** Con cero seguidores es *la única* forma de que
   te lea alguien. Cuatro de cada cinco acciones deberían ser respuestas.
4. **Publicar lo propio**, poco y bueno, para que quien llegue al perfil desde
   una respuesta encuentre algo.

**Nada de enlaces externos las primeras semanas.** Una cuenta nueva publicando
enlaces es el patrón exacto de un bot, y X lo entierra. El enlace vive en la
biografía; en un tuit solo cuando alguien lo pida.

### El idioma: decisión consciente

El tráfico de Gate32 es 82 % anglosajón y los destinatarios B2B son todos
angloparlantes, así que en abstracto convendría el inglés. **Pero quien maneja
la cuenta no lee inglés**, y responder en hilos que no entiendes acaba en un
comentario fuera de lugar tarde o temprano.

Decisión: **la cuenta funciona en español.** Es la comunidad donde se puede
conversar de verdad, España es solo el 7 % del tráfico (hay margen), y hay
cuentas activas de IA en español con audiencia real. Para hilos en inglés que
merezcan respuesta, se traducen y se redactan aparte antes de contestar.

## Reglas tácticas (leer antes de programar nada)

1. **El enlace va en la primera respuesta, no en el tuit.** X reduce el alcance
   de los posts con enlaces externos. Publica el tuit limpio y responde tú
   mismo con `gate32.autoritasai.com/?ref=x`.
2. **Programar es gratis desde la propia X**: en el compositor web, icono del
   reloj → fecha y hora. No hace falta herramienta externa. (Alternativa:
   Buffer, plan gratuito, 10 posts en cola por canal.)
   Pega **todos** los tuits de la semana en una sesión y olvídate.
   *Límite conocido:* no se puede programar la respuesta con el enlace, así que
   para los tuits programados el enlace tiene que estar **en la bio** — ponlo
   ahí antes de programar nada. Si estás delante cuando salga uno, añade la
   respuesta con el enlace a mano: rinde más.
3. **Cadencia:** 2-3 al día, mezclando categorías. Nunca dos del mismo bloque
   seguidos ni dos días iguales.
4. **Responder pesa más que publicar.** Con una cuenta pequeña, un buen
   comentario en el hilo de alguien grande llega a más gente que diez tuits
   propios. Reserva la mitad del tiempo a eso.
5. **Hashtags:** 2-3 como máximo, y no en todos. `#IA #Privacidad`,
   `#OpenSource`, `#Subtítulos`, `#Productividad`.
6. Nada de lo que no sea cierto: no exportamos "todos los formatos" (son TXT,
   MD, SRT, VTT y JSON), no hay transcripción en tiempo real y no hay
   identificación de hablantes.

---

## Bloque A · Gancho y propuesta de valor

1. Todos los transcriptores "gratis" tienen la misma trampa: o te limitan los minutos o suben tu audio a sus servidores. Gate32 no puede hacer ninguna de las dos cosas, porque la IA corre dentro de tu navegador.

2. Haz esta prueba: abre Gate32, espera a que cargue el modelo, pon el portátil en modo avión y transcribe un audio. Funciona. Porque no hay ningún servidor al que subir nada.

3. Whisper corriendo dentro de una pestaña. Sin instalar Python, sin CUDA, sin cuenta, sin tarjeta. Arrastras el archivo y ya está.

4. Gratis de verdad significa que a mí no me cuesta nada que lo uses. Gate32 procesa en tu equipo: no hay servidores que pagar, así que tampoco hay motivo para limitarte.

5. Tu audio no sale de tu ordenador. No es una promesa de la política de privacidad: es que no existe el servidor donde subirlo.

## Bloque B · Construir en público (números y errores)

6. Primer día de Gate32 en abierto: 53 visitantes, 3 transcripciones completas. Poco, pero el 75 % de quien lo intenta llega al final. Iré contando los números aquí, salgan como salgan.

7. Lo más útil de hoy: un podcaster me dijo que mi pitch estaba mal. Yo vendía privacidad; él dijo "lo tuyo es que puede usarlo gente que no tiene Python ni GPU". Tenía razón y he cambiado el mensaje.

8. Un usuario detectó que mi barra de progreso mentía: marcaba 100 % mientras seguía descargando. Promediaba porcentajes por fichero en vez de contar bytes. Arreglado el mismo día.

9. Puse un modelo de 800 MB como opción de máxima calidad. 24 minutos de descarga. Lo he quitado. La promesa es "abre una pestaña y transcribe", no "espera media hora".

10. Gate32 es código abierto con licencia MIT. Si vendes privacidad, lo mínimo es dejar que lean el código y comprueben qué hace con sus archivos.

11. Hoy alguien me llamó "porquería de IA" en Reddit y otro me pasó el enlace a sus contactos. Mismo producto, mismo día. Bienvenido al lanzamiento.

## Bloque C · Comparativa (sin faltar al respeto a nadie)

12. El plan gratuito de Otter te deja importar 3 archivos. No al mes: en total, para siempre. Ese dato es la razón por la que hice Gate32.

13. Los transcriptores online cobran por minuto porque el minuto les cuesta dinero. Si la IA corre en tu equipo, ese coste desaparece. Y el límite también.

14. Subtítulos SRT gratis, sin marca de agua y sin registro. El vídeo no se sube a ningún sitio.

15. No compito en velocidad con faster-whisper en una GPU con CUDA: ahí pierdo y lo digo. Compito en que no hay que instalar nada.

## Bloque D · Casos de uso

16. Si transcribes entrevistas con fuentes, el problema no es el precio: es que el audio viaje a un servidor ajeno. Gate32 lo procesa en tu navegador y puedes comprobarlo desconectando internet.

17. Una clase de dos horas transcrita sin tope de minutos ni registro. Exportas a Markdown con marcas de tiempo y ya tienes la base de los apuntes.

18. Muchos comités de ética prohíben subir entrevistas de investigación a servicios de terceros. Sin servidor no hay subida: el audio se queda en el ordenador.

19. Del episodio al archivo SRT sin salir del navegador y sin marca de agua. Para podcasters que suben transcripción con cada capítulo.

20. Subtítulos para CapCut en tres pasos: arrastras el vídeo, exportas SRT, lo importas. Sin cuenta y sin marca de agua.

21. Si trabajas con audio confidencial, la pregunta no es qué transcriptor es mejor. Es a dónde viaja el archivo.

22. Opositores: grabáis la clase, la soltáis y sale el texto con marcas de tiempo para volver al minuto exacto. Sin límite de duración.

## Bloque E · Técnicos (para el nicho dev)

23. transformers.js + ONNX Runtime Web hacen que Whisper corra sobre WebGPU dentro del navegador. Hace dos años esto no era viable; hoy transcribe más rápido que en tiempo real.

24. Sin backend no hay factura de servidores, y sin factura no hay motivo para poner límites. Toda la arquitectura de Gate32 sale de esa única decisión.

25. El audio se procesa en ventanas de 30 segundos con 5 de solape y se fusiona por punto medio. Así el progreso es real y la memoria no se dispara en archivos largos.

26. Gate32 se instala como app (PWA) y funciona sin conexión en cuanto el modelo queda cacheado. Un transcriptor offline que es una web.

27. Puedes autoalojarlo entero: es un build estático y los pesos del modelo se pueden servir desde tu propio dominio. Instancia sin una sola llamada externa.

## Bloque F · Útiles aunque no uses Gate32

28. Si necesitas transcribir y te manejas con terminal, faster-whisper es lo más rápido con GPU. En Mac, MacWhisper. Y si no quieres instalar nada, algo que corra en el navegador.

29. Truco: Whisper acierta bastante más si le dices el idioma en vez de dejar que lo detecte solo.

30. La transcripción automática te deja en el 90-95 %. El trabajo de verdad es el repaso. Elige herramienta por lo cómodo que sea corregir, no por lo bonita que sea la demo.

## Bloque G · Preguntas (para generar respuestas)

31. ¿Qué usáis para transcribir entrevistas largas? Busco alternativas que no suban el audio a la nube.

32. ¿Cuánto tarda vuestro equipo? Aquí 9 minutos de audio en 1:32 con WebGPU. Me interesan números de otras máquinas, sobre todo Apple Silicon.

33. ¿Qué es lo que más echáis en falta en el transcriptor que usáis ahora?

## Bloque H · Micro-hilos (2 o 3 tuits, rinden más que uno suelto)

**H1 — La trampa del gratis**
- 1/ Todos los transcriptores "gratis" acaban en lo mismo: minutos limitados o tu audio en su servidor. Es que no hay otra: transcribir en la nube cuesta dinero y alguien lo paga.
- 2/ Salvo que no haya nube. Si el modelo se descarga y corre en tu navegador, el coste por minuto es cero para el que lo ofrece. Y entonces no hay razón para limitarte.
- 3/ Eso es Gate32. Whisper dentro de la pestaña, sin cuenta, sin subir nada. Enlace abajo.

**H2 — Lo que aprendí lanzando**
- 1/ Llevo una semana enseñando Gate32 por foros. Lo que creía que vendía: privacidad. Lo que de verdad importa a la gente: no tener que instalar Python ni tener GPU.
- 2/ Me lo dijo un podcaster en Reddit y tenía razón. He reescrito la home entera con ese mensaje.
- 3/ Si vas a lanzar algo: el pitch que escribes en tu cuarto casi nunca es el bueno.

**H3 — Cómo funciona por dentro**
- 1/ ¿Cómo corre Whisper dentro de un navegador? transformers.js compila el modelo a ONNX y ONNX Runtime Web lo ejecuta sobre WebGPU, la API que da acceso a tu tarjeta gráfica desde JavaScript.
- 2/ El audio se decodifica a 16 kHz mono con OfflineAudioContext y se parte en ventanas de 30 s con 5 de solape, que luego se fusionan por el punto medio.
- 3/ Resultado: 9 minutos de audio en 1:32 en un portátil normal, sin backend. Hace dos años esto no era posible.

**H4 — Para quien no puede subir el audio**
- 1/ Hay gente que no elige transcriptor por precio: periodistas con fuentes, psicólogos, investigadores con comité de ética, abogados. Para ellos "sube tu archivo" es directamente no.
- 2/ La solución de siempre era instalar Whisper en local. Funciona, pero deja fuera a cualquiera que no se maneje con la terminal.
- 3/ Gate32 es esa opción para el resto: se abre en el navegador y el archivo no sale del equipo. Puedes comprobarlo desconectando internet a mitad.

## Bloque I · Más tuits sueltos

34. La transcripción no la hace un servidor mío: la hace tu procesador. Yo solo escribí la página.

35. Sin cuenta, sin correo, sin "empieza gratis". Abres la web y arrastras el archivo.

36. Lo más raro de Gate32 es que cuanta más gente lo use, menos me cuesta. No hay coste por minuto porque no hay minutos míos corriendo.

37. Si alguna vez te ha frenado subir una grabación a una web que no conoces: ese es exactamente el problema que intento resolver.

38. Funciona en el móvil, pero es más lento y consume batería. Lo digo yo antes de que lo descubras tú: para archivos largos, ordenador.

39. La primera vez tarda porque baja el modelo. Después queda guardado y arranca al instante, incluso sin conexión. Es el único peaje.

40. Exporta a TXT, Markdown, SRT, VTT y JSON. El JSON se puede volver a importar para seguir donde lo dejaste.

41. He publicado los números del lanzamiento en el repo: visitas, intentos, transcripciones terminadas y en qué punto se cae la gente. Si construyes algo parecido, te ahorras mis errores.

42. Un transcriptor que funciona en modo avión. Suena a truco y es simplemente que el modelo está en tu navegador.

43. Herramienta gratis para subtitular vídeos cortos: arrastras, esperas, descargas el SRT. Sin marca de agua ni registro.

44. No uso tu audio para entrenar nada. No es política de privacidad, es arquitectura: nunca llega a mí.

45. Whisper es de OpenAI y es abierto. Lo raro no es que existan transcriptores gratis: es que casi todos te pidan la tarjeta.

46. Cinco formatos de exportación y ninguna cuenta. Si te sirve, sirve; si no, cierras la pestaña y no queda nada tuyo en ningún lado.

47. Todo el código está en GitHub con licencia MIT. Puedes clonarlo y servirlo desde tu propio dominio, con los pesos del modelo incluidos. Cero llamadas externas.

48. Si das clases o las recibes: dos horas de grabación, transcripción con marcas de tiempo, exportas a Markdown y ya tienes el esqueleto de los apuntes.

49. La parte difícil no era la IA, era la memoria: un archivo de una hora no cabe entero. Se procesa por trozos con solape para que no se pierda nada en las costuras.

50. Pregunta honesta para quien transcribe a diario: ¿qué te haría cambiar de herramienta? No busco que uses la mía, busco saber qué falta.

---

## Respuestas para hilos ajenos (esto rinde más que publicar)

Busca en X: `transcribir audio`, `transcripción entrevista`, `subtítulos SRT`,
`Otter límite`, `alternativa a Otter`, `whisper local`, `transcribe podcast`.
Filtra por "Más recientes". Responde en los que tengan menos de 20 respuestas:
en los grandes te entierran.

**Regla:** responde primero a lo que preguntan, aunque la respuesta no sea
Gate32. Si Gate32 encaja, va al final y en una línea. Si no encaja, no lo
menciones: esa respuesta también construye cuenta.

**R1 · Alguien se queja del límite de minutos o del precio**
> El límite existe porque a ellos les cuesta dinero cada minuto que procesan. La vuelta a eso es transcribir en local: con GPU, faster-whisper; en Mac, MacWhisper. Yo hice una que corre en el navegador (Gate32) para no tener que instalar nada, por si te vale.

**R2 · Alguien pregunta por privacidad / audio sensible**
> Si el audio es sensible, la pregunta no es qué web es más segura sino si el archivo sale del equipo. Cualquier cosa que corra en local te lo resuelve. Yo uso la mía, que va dentro del navegador: se puede comprobar desconectando internet a mitad de la transcripción.

**R3 · Alguien pide subtítulos para vídeo**
> Para SRT sin marca de agua ni cuenta: hay opciones locales. Whisper acierta bastante más si le indicas el idioma en lugar de dejar que lo detecte. Luego el SRT lo importas directo en CapCut o Premiere.

**R4 · Alguien dice que Whisper local es complicado de instalar**
> Lo es, y es la razón por la que la mayoría acaba en una web de pago. Hay una vía intermedia: modelos que corren en el navegador con WebGPU, sin Python ni CUDA. Descargas el modelo una vez y luego funciona hasta sin conexión.

**R5 · Un desarrollador pregunta cómo se hace**
> transformers.js + ONNX Runtime Web sobre WebGPU. Lo complicado no es la inferencia, es la memoria con audios largos: hay que trocear en ventanas con solape y fusionar. Tengo el código abierto con licencia MIT si quieres ver la parte fea.

**R6 · Alguien sordo o con problemas de audición pide subtítulos**
> Sin vender nada: hay herramientas gratuitas que generan subtítulos sin límite de minutos ni cuenta. Si te sirve te paso una que corre en el propio navegador. Y si necesitas algo concreto que no haga, dímelo y lo miro.

Nunca abras una respuesta con "¡Gran pregunta!", ni con emojis de cohete, ni
con listas de tres puntos con negritas. Escribe como escribirías a un
conocido: dos o tres frases, minúscula si te sale, sin rematar con una
llamada a la acción.

---

## Calendario sugerido (primera semana)

| Día | Mañana (~9:00) | Tarde (~19:00) | Extra |
|---|---|---|---|
| 1 | A1 | B6 | hilo **H1** al mediodía |
| 2 | C12 | D16 | |
| 3 | A2 | E23 | |
| 4 | B7 | G31 | hilo **H2** al mediodía |
| 5 | C14 | D17 | |
| 6 | F28 | I36 | |
| 7 | D19 | G32 | hilo **H4** al mediodía |

Segunda semana: A3, C13, D18, E24, I34, B10, F29, G33, hilo H3, y sigue
bajando por el bloque I. Hay material para tres semanas sin repetir.

Los del bloque B (números reales) van mejor cuando tienes un dato nuevo que
contar: guárdalos para cuando lo haya, no los quemes todos la primera semana.

## Qué medir

Visitas con `?ref=x` en GoatCounter y Vercel. Si tras 30 tuits el canal no ha
traído ni 30 visitas, el problema no es la frecuencia: es que la cuenta no
tiene alcance todavía, y entonces lo que rinde es responder en hilos ajenos,
no publicar más.
