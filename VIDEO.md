# VIDEO.md · Playbook de vídeo corto (TikTok / Reels / Shorts)

## Por qué este canal encaja con Gate32

1. **La demo es visual y satisfactoria**: arrastras → aparece el texto → descargas el SRT.
2. **Tenemos un truco imposible de copiar**: activar el **modo avión** y que la
   transcripción siga funcionando. Ningún SaaS de la competencia puede grabar eso.
3. **Encaje canal-producto**: media plataforma son creadores que necesitan
   subtítulos. El público de TikTok *es* el usuario de `/subtitulos/`.
4. **Coste 0 €** y sin depender de que Google nos indexe.

## Reglas innegociables

- **Nada simulado.** Audio real, tiempos reales, resultado real en pantalla.
- Si aceleras la grabación, rotúlalo (`x4`). Acelerar sin decirlo = engañar.
- No prometer lo que no hace: sin identificación de hablantes, y en móvil es lento.
- Nunca mostrar en pantalla audio de terceros que sea confidencial.

## Cómo grabar (Windows, sin editor de pago)

1. **Pantalla:** `Win + Alt + R` (Xbox Game Bar) graba la ventana activa.
   Alternativa mejor: OBS o ShareX, gratis.
2. **Modo avión / móvil:** graba con el móvil apuntando al portátil — que se vea
   el icono de avión en la barra de tareas. Ese plano es el activo más valioso.
3. **Montaje:** CapCut (gratis). Lienzo 9:16, coloca la captura ampliada sobre la
   zona útil, añade el texto en pantalla y la tarjeta final.
4. **Duración objetivo:** 15–25 s. El hook, en los 2 primeros segundos.
5. Sin música con copyright: usa el audio original o pistas de la propia app.

## Enlaces con seguimiento (para saber qué funciona)

Pon en la bio y en los comentarios fijados:

- TikTok → `https://gate32.autoritasai.com/?ref=tiktok`
- Reels → `https://gate32.autoritasai.com/?ref=reels`
- Shorts → `https://gate32.autoritasai.com/?ref=shorts`

GoatCounter y Vercel Analytics los registran como referrer/campaña, así que
sabremos cuánto tráfico y cuántas activaciones vienen de cada plataforma.

---

# Los seis vídeos

### V1 · "El modo avión" (el más importante)

- **Hook (0-2 s):** *"Esto transcribe audio… sin internet."* — plano del portátil
  con el icono de modo avión bien visible.
- **Plano 2 (2-10 s):** arrastras un MP3, empieza la transcripción, aparece el texto.
- **Plano 3 (10-18 s):** *"El audio nunca sale de tu ordenador. Porque no hay
  servidor al que subirlo."*
- **Cierre:** tarjeta final con la URL.
- **Texto en pantalla:** `MODO AVIÓN ✈️` / `Y sigue transcribiendo` / `Gratis y sin registro`
- **Pie:** "Todos los transcriptores gratis suben tu audio a sus servidores. Este no puede: la IA corre dentro de tu navegador. gate32.autoritasai.com"
- **Hashtags:** #productividad #ia #privacidad #trucos #tecnologia #apps

### V2 · "3 archivos de por vida"

- **Hook:** *"El plan gratis de Otter te deja subir 3 archivos… en toda tu vida."*
- **Plano 2:** muestras el tope real en su web (captura), corte rápido a Gate32.
- **Plano 3:** transcribes uno detrás de otro. `SIN LÍMITES` en pantalla.
- **Cierre:** *"Gratis de verdad, porque no me cuesta nada: lo procesa tu equipo."*
- **Hashtags:** #ia #herramientas #gratis #productividad

### V3 · "Subtítulos sin marca de agua" (el de mayor encaje con TikTok)

- **Hook:** *"Subtítulos para tus vídeos, gratis y sin marca de agua."*
- **Plano 2:** arrastras el MP4 del propio vídeo que estás editando.
- **Plano 3:** pulsas **SRT**, lo importas en CapCut y aparecen los subtítulos.
- **Texto en pantalla:** `SRT en 30 segundos` / `Sin marca de agua` / `Sin registro`
- **Pie:** "Sirve para CapCut, Premiere, DaVinci y YouTube. gate32.autoritasai.com/subtitulos"
- **Hashtags:** #capcut #edicionvideo #creadores #subtitulos #tutorial

### V4 · "9 minutos en minuto y medio"

- **Hook:** *"9 minutos de audio, transcritos en 1:33."*
- **Plano:** grabación real con el cronómetro/progreso a la vista (acelerado `x4`,
  rotulado). Enseña el resultado con marcas de tiempo y el editor sincronizado.
- **Cierre:** *"Y esto corriendo en mi portátil, no en la nube."*
- **Hashtags:** #ia #whisper #productividad #tecnologia

### V5 · "Para periodistas" (nicho, alta conversión)

- **Hook:** *"Si transcribes entrevistas, esto te interesa: tus fuentes no viajan
  a ningún servidor."*
- **Plano:** entrevista real (tapa el nombre), transcripción, clic en un tiempo
  para saltar al audio y verificar la cita.
- **Cierre:** URL de `/entrevistas/`.
- **Hashtags:** #periodismo #comunicacion #entrevistas #privacidad

### V6 · "La clase de dos horas"

- **Hook:** *"Grabas la clase, la sueltas aquí, y tienes los apuntes."*
- **Plano:** audio largo procesándose por bloques, export a Markdown con tiempos.
- **Cierre:** URL de `/clases/`.
- **Hashtags:** #estudiantes #universidad #oposiciones #apuntes #estudio

---

## Cadencia y método

- Graba **los 6 en una sola tarde** (el material se repite; cambia el guion).
- Publica **3 por semana** en TikTok, y reutiliza el mismo archivo en Reels y
  Shorts (cambiando solo el enlace de la bio).
- Responde a todos los comentarios las primeras 2 h: el algoritmo lo premia.
- Los comentarios del tipo *"¿pero de verdad es gratis?"* son oro: contéstalos
  con el porqué (procesa tu equipo) y conviértelos en el siguiente vídeo.

## Qué mediremos

| Señal | Dónde | Qué significa |
|---|---|---|
| Visitas con `?ref=tiktok` | GoatCounter / Vercel | Tráfico real del canal |
| `transcribe_done` tras esas visitas | GoatCounter | Si el tráfico social **activa** o solo mira |
| `use_case_subtitulos` al alza | GoatCounter | El público creador manda → priorizar `/subtitulos/` y features de subtitulado |
| `pro_interest` desde móvil | GoatCounter | Si el canal social también trae intención de pago |

**Umbral de decisión:** si 3 vídeos generan <50 visitas totales, el problema es
el contenido (probar otros hooks). Si generan visitas pero la activación es
<5 %, el problema es el aterrizaje móvil (ya mitigado con el aviso y el modelo
Rápido por defecto, pero habría que revisarlo).
