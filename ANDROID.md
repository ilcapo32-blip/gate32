# App de Android (Google Play)

Plan, decisiones y pasos para publicar Gate32 en Google Play. Se mantiene al
día a medida que avanza; lo hecho se marca con [x].

## Decisiones (2026-11-05)

- **Gratis + suscripción Pro.** Google Play no deja pasar a de pago una app
  que se publicó gratis (ayuda de Play Console, artículo 6334373), así que se
  decidió antes de subir nada. Gratis para que lleguen más personas y para que
  los 12 probadores no tengan que pagar; la suscripción da ingresos mensuales.
  Qué limita la versión gratuita de la app se decide con los datos de la
  prueba cerrada, no antes. La web sigue gratis y sin límites.
- **Cuenta personal de Play Console** (25 $, pago único). Obliga a una prueba
  cerrada con **12 probadores durante 14 días seguidos** antes de poder
  publicar en producción. Las cuentas de empresa no tienen ese requisito, pero
  piden un número D-U-N-S.
- **Nombre del paquete: `com.autoritasai.gate32`.** No se puede cambiar
  nunca una vez subida la primera versión.
- **La app es esta misma web dentro de Chrome** (TWA, Trusted Web Activity).
  Google la acepta; Apple rechaza este tipo de app (directriz 4.2), así que
  iOS queda para más adelante y con otro enfoque.
- **Entrada: `https://gate32.autoritasai.com/?app=android`.** Con eso la web
  sabe que viene de la app: cuenta sus aperturas y transcripciones aparte
  (`app_open`, `transcribe_start_app`, `transcribe_done_app`) y abre en el
  idioma del teléfono.

## Lo que ya está hecho en la web

- [x] Recibir audio y vídeo desde «Compartir» de otras apps (WhatsApp,
      Telegram, grabadora, galería): `share_target` en los manifiestos y el
      service worker. Funciona también con la web instalada en Android.
- [x] Detección de la app y apertura en el idioma del teléfono.
- [x] Política de privacidad propia: `/privacidad/` y `/en/privacy/`.
- [x] Icono válido para Android: el dibujo cabe en la zona segura del recorte
      circular.
- [~] `/.well-known/assetlinks.json`, que verifica que la app y la web son del
      mismo dueño y quita la barra de direcciones. Publicado el 2026-11-12 con
      la huella de la clave de subida (PWABuilder). Falta la de la clave de
      firma de Google, que aparece en Play Console al subir el primer `.aab`
      (paso 4): sin ella, la app instalada desde Play abre con barra.

## Pasos, en orden

### 1. Cuenta de desarrollador · tú · [x] creada el 2026-11-12

Cuenta personal «Hpartida», declarada como operador (DSA): sus datos de
contacto se muestran a los usuarios de la UE.

1. Entra en <https://play.google.com/console/signup> con la cuenta de Google
   con la que quieras gestionar la app.
2. Elige **cuenta personal**. Paga los 25 $.
3. Verifica tu identidad (documento) y tu teléfono. Google pide también
   demostrar que tienes acceso a un **dispositivo Android físico**, con la app
   Google Play Console instalada en él.

La verificación puede tardar unos días. Mientras tanto se puede avanzar el
paso 2.

### 2. Generar el paquete de la app · tú, con PWABuilder (10 minutos)

1. Abre <https://www.pwabuilder.com> y escribe `https://gate32.autoritasai.com`.
2. Pulsa **Package for stores → Android → Generate package**, y en las
   opciones:
   - Package ID: `com.autoritasai.gate32`
   - App name: `Gate32` · Launcher name: `Gate32`
   - Start URL: `/?app=android`
   - Version code: `1` · Version name: `1.0.0`
   - Signing key: **Create new**. Rellena tu nombre y AutoritasAI.
3. Descarga el ZIP. Dentro vienen el paquete (`.aab`), la clave de firma
   (`signing.keystore`), un texto con sus contraseñas y un `assetlinks.json`.

**La clave de firma y sus contraseñas son lo único secreto de todo esto.**
Guárdalas en un sitio privado (por ejemplo, una carpeta de Google Drive solo
tuya). **Nunca en el repositorio, que es público.** Sin ellas no se pueden
subir actualizaciones; si se perdieran, Google permite cambiar la clave de
subida, pero es un trámite.

### 3. Crear la app y la prueba interna · tú

- [x] App creada en Play Console el 2026-11-12: «Gate32: audio y vídeo a
      texto», `com.autoritasai.gate32`, español (España), gratuita.

1. En Play Console: **Crear aplicación**. Nombre: `Gate32: audio y vídeo a
   texto`. Idioma predeterminado: español (España). Aplicación, **gratuita**.
2. **Prueba interna → Crear versión** y sube el `.aab`. Acepta la firma de
   apps de Google Play.
3. Añádete como probador y instálala en tu teléfono.
4. Desde la app instalada, haz las capturas de pantalla para la ficha
   (paso 6): reales, con un audio tuyo.

### 4. Verificar el dominio · tú me pasas dos datos, yo lo publico

Las huellas SHA-256 **no son secretas**: son públicas por diseño, y se pueden
pegar en el chat.

1. La de la clave de subida viene en el `assetlinks.json` del ZIP.
2. La de la clave de firma de Google está en Play Console → **Integridad de la
   app → Firma de apps**, «Huella digital del certificado SHA-256».

Con las dos publico `/.well-known/assetlinks.json` y compruebo que se sirve.

### 5. Prueba cerrada: 12 probadores, 14 días · los dos

1. Crea un grupo de Google (<https://groups.google.com>), por ejemplo
   `gate32-probadores`, abierto a quien quiera unirse.
2. En Play Console: **Prueba cerrada → Crear canal**, testers: ese grupo.
3. Probadores: amigos y familia con Android son la vía más rápida. Yo pondré
   en la web un aviso, solo para quien entra desde Android, para unirse al
   grupo.
4. Tienen que estar apuntados **14 días seguidos**. Si bajan de 12, la cuenta
   vuelve a empezar.

### 6. Ficha de la tienda · borrador mío, texto final tuyo

Lo que pide Google: icono 512×512 (ya está: `public/icon-512.png`), gráfico
de funciones 1024×500 (hecho: `docs/play/grafico-funciones-es.png` y `-en.png`), al menos dos capturas de teléfono
(reales, del paso 3), la URL de privacidad y los textos.

Los textos de abajo son un **borrador**. Como todo lo público de Gate32, el
texto final lo reescribe el fundador con sus palabras (regla 4 de
`.claude/skills/gate32/SKILL.md`). Respetan la regla 3: no promete tiempo real,
y la separación de hablantes va con su condición.

**Título (29/30):** Gate32: audio y vídeo a texto

**Descripción corta (77/80):** Pasa a texto notas de voz, reuniones y vídeos
sin subirlos a ningún servidor.

**Descripción completa:**

> Gate32 pasa a texto audios y vídeos sin subirlos a ningún sitio. El
> reconocimiento de voz funciona dentro de tu teléfono, así que lo que grabas
> se queda contigo.
>
> Comparte una nota de voz de WhatsApp o Telegram a Gate32 y la transcribe ahí
> mismo. También puedes elegir un archivo o grabar con el micrófono.
>
> El texto sale por frases con su hora. Tocas una y suena ese trozo, así que
> corregir es rápido. Si se equivoca siempre en el mismo nombre, lo cambias una
> vez y se arregla en toda la transcripción. Las líneas dudosas salen marcadas
> para que sepas dónde mirar.
>
> Exporta a TXT, Markdown, SRT, VTT o JSON. Los subtítulos no llevan marca de
> agua.
>
> Si en una entrevista cada persona está grabada en su propio archivo,
> compártelos juntos y te lo devuelve como diálogo. Con todas las voces en un
> solo archivo, todavía no distingue quién habla.
>
> La primera vez descarga el modelo de reconocimiento, entre 50 y 250 MB.
> Después funciona sin conexión. En el teléfono va más lento que en un
> ordenador: para audios largos, la web gate32.autoritasai.com en un portátil
> va mejor.
>
> 47 idiomas. Sin cuenta ni registro. Código abierto.

**English listing (draft):**

- Title (29/30): Gate32: audio & video to text
- Short description (71/80): Turn voice notes, meetings and videos into text
  without uploading them.
- Full description: the same text as above, translated, keeping the same
  claims and the same limits.

**Otros datos de la ficha:**

- Categoría: Productividad.
- Política de privacidad: `https://gate32.autoritasai.com/privacidad/`.
- Público objetivo: mayores de 18. Evita los requisitos de apps para familias,
  y es el público real.
- Anuncios: no tiene.

**Seguridad de los datos** (formulario de Play Console). Lo que tiene que
decir, porque es lo que hace el código:

- No se recogen ni se comparten datos personales: audio, texto y archivos se
  procesan en el dispositivo.
- Analítica (GoatCounter): nombre de la acción y datos técnicos del navegador,
  sin identificar a nadie y sin cookies. En el formulario de Google eso
  encaja en «Actividad en la app» (interacciones) y, como GoatCounter deduce
  el país de la IP, en «Ubicación aproximada». Las dos, recogidas para
  analítica, sin vincular a la identidad y sin compartir con terceros.
- Los datos viajan cifrados (HTTPS).
- No hay cuenta, así que no hay datos que pedir borrar en un servidor; lo
  local se borra desde Android.

### 7. Producción · cuando acaben los 14 días

Play Console → **Solicitar acceso a producción**, con lo aprendido en la
prueba. Google revisa la solicitud (suele tardar unos días).

### 8. Suscripción Pro · después de la prueba

Con Play Billing (en una TWA se usa la Digital Goods API). Qué incluye y qué
limita la versión gratuita se decide con los datos de uso de la prueba
cerrada (`transcribe_start_app`, duración de los audios, uso de compartir).
