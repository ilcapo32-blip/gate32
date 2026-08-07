# X_CAMPAIGN.md · Banco de tuits para @AutoritasAI

## Reglas tácticas (leer antes de programar nada)

1. **El enlace va en la primera respuesta, no en el tuit.** X reduce el alcance
   de los posts con enlaces externos. Publica el tuit limpio y responde tú
   mismo con `gate32.autoritasai.com/?ref=x`.
2. **Programar es gratis desde la propia X**: en el compositor web, icono del
   reloj → fecha y hora. No hace falta herramienta externa. (Alternativa:
   Buffer, plan gratuito, 10 posts en cola por canal.)
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

---

## Calendario sugerido (primera semana)

| Día | Mañana | Tarde |
|---|---|---|
| 1 | A1 | B6 |
| 2 | C12 | D16 |
| 3 | A2 | E23 |
| 4 | B7 | G31 |
| 5 | C14 | D17 |
| 6 | F28 | B8 |
| 7 | D19 | G32 |

Repetir el patrón alternando bloques. Los del bloque B (números reales) van
mejor cuando tienes un dato nuevo que contar: guárdalos para cuando lo haya.

## Qué medir

Visitas con `?ref=x` en GoatCounter y Vercel. Si tras 30 tuits el canal no ha
traído ni 30 visitas, el problema no es la frecuencia: es que la cuenta no
tiene alcance todavía, y entonces lo que rinde es responder en hilos ajenos,
no publicar más.
