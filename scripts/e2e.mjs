// E2E del recorrido crítico de Gate32 con Playwright.
//
// Uso:  npm run build && node scripts/e2e.mjs
// Requiere un Chromium accesible: CHROMIUM_PATH=/ruta/a/chromium (o el
// Chromium que instala `npx playwright install chromium`).
//
// Nota: en entornos sin acceso al CDN de Hugging Face, la fase de modelo
// valida el camino de error; con red normal, valida la transcripción real.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 4273;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${name}`);
  if (!cond) failures++;
};

/** Genera un WAV mono 16 kHz de `seconds` con un tono modulado. */
function makeToneWav(path, seconds = 4) {
  const rate = 16000;
  const n = rate * seconds;
  const data = Buffer.alloc(n * 2);
  for (let t = 0; t < n; t++) {
    const v = Math.round(
      12000 * Math.sin((2 * Math.PI * 440 * t) / rate) * (0.5 + 0.5 * Math.sin((2 * Math.PI * 3 * t) / rate)),
    );
    data.writeInt16LE(v, t * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  detached: false,
});
await new Promise((resolve, reject) => {
  const t0 = Date.now();
  const tryConnect = async () => {
    try {
      const res = await fetch(BASE);
      if (res.ok) return resolve(undefined);
    } catch {
      /* aún no */
    }
    if (Date.now() - t0 > 20000) return reject(new Error("vite preview no arranca"));
    setTimeout(tryConnect, 300);
  };
  void tryConnect();
});

const tmp = mkdtempSync(join(tmpdir(), "g32-e2e-"));
const tonePath = join(tmp, "tone.wav");
makeToneWav(tonePath);

const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

try {
  // 1 · landing
  await page.goto(`${BASE}/?e2e=1`, { waitUntil: "load" });
  check("h1 visible", await page.locator("h1").isVisible());
  // Las cabeceras COOP/COEP dan hilos a WebAssembly, pero pueden bloquear
  // recursos de terceros: si el aislamiento está activo y la página sigue sin
  // errores, el modo `credentialless` está haciendo su trabajo.
  check(
    "aislamiento de origen cruzado activo (hilos WASM disponibles)",
    await page.evaluate(() => window.crossOriginIsolated === true),
  );
  check(
    "SharedArrayBuffer disponible",
    await page.evaluate(() => typeof SharedArrayBuffer !== "undefined"),
  );
  check("dropzone visible", await page.locator("#dropzone").isVisible());
  check("FAQ presente", (await page.locator("#faq details").count()) >= 5);
  check("explicador de primera ejecución visible", await page.locator(".firstrun").isVisible());
  await page.selectOption("#model-quality", "accurate");
  check(
    "el tamaño anunciado sigue al modelo elegido",
    ((await page.locator(".firstrun-size").first().textContent()) ?? "").includes("250"),
  );
  await page.selectOption("#model-quality", "balanced");

  // El desplegable ofrecía diez idiomas de los casi cien que reconoce Whisper:
  // quien tenía clases en vietnamita no podía ni elegir el suyo.
  const idiomas = await page.locator("#language option").count();
  check("el desplegable ofrece muchos idiomas", idiomas > 40);
  check(
    "incluye vietnamita, el idioma que destapó el problema",
    (await page.locator('#language option[value="vi"]').count()) === 1,
  );
  check("el español sigue siendo el idioma por defecto", (await page.locator("#language").inputValue()) === "es");

  // Y avisa antes de transcribir, para que nadie concluya que la herramienta
  // no sirve para su idioma cuando lo que falla es el tamaño del modelo.
  check("sin motivo, el aviso de idioma no aparece", await page.locator("#lang-note").isHidden());
  await page.selectOption("#language", "vi");
  check("con vietnamita y modelo pequeño avisa", await page.locator("#lang-note").isVisible());
  await page.selectOption("#model-quality", "accurate");
  check("con modelo grande el aviso desaparece", await page.locator("#lang-note").isHidden());
  await page.selectOption("#model-quality", "balanced");
  await page.selectOption("#language", "es");
  check("y en español tampoco aparece", await page.locator("#lang-note").isHidden());

  check(
    "contacto visible en el pie",
    (await page.locator('a[href^="mailto:"]').count()) > 0,
  );

  // Los datos estructurados son lo que citan los asistentes, y son también lo
  // que más fácil se queda atrás: nadie los ve al mirar la página. Se
  // comprueba que sean válidos y que enumeren lo que el producto hace hoy.
  const jsonLd = await page.$$eval('script[type="application/ld+json"]', (ns) =>
    ns.map((n) => n.textContent),
  );
  const parsed = jsonLd.map((raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  check("todos los JSON-LD son válidos", parsed.every(Boolean));
  const app = parsed.find((d) => d && d["@type"] === "SoftwareApplication");
  const features = (app?.featureList ?? []).join(" ");
  check("JSON-LD enumera funcionalidades", (app?.featureList ?? []).length >= 5);
  check("JSON-LD menciona la captura de reunión", /reuni/i.test(features));
  check("JSON-LD menciona los subtítulos", /SRT/i.test(features));
  const faq = parsed.find((d) => d && d["@type"] === "FAQPage");
  const preguntas = (faq?.mainEntity ?? []).map((q) => q.name).join(" | ");
  check("FAQ estructurada cubre las reuniones", /reuni/i.test(preguntas));
  check("FAQ estructurada cubre los vídeos de otra pestaña", /v[ií]deo/i.test(preguntas));

  // Una página nueva sin enlaces internos casi no se posiciona: /reuniones/
  // solo estaba enlazada desde el pie.
  check(
    "la home enlaza /reuniones/ desde el cuerpo",
    (await page.locator('main a[href="/reuniones/"]').count()) > 0,
  );

  // 2 · confirmación, decodificación y fase de modelo
  //
  // Elegir un archivo ya no arranca: enseña lo que va a pasar y espera. Con
  // cuatro modelos y 47 idiomas, arrancar solo hacía que los selectores —que
  // están encima de la zona de arrastre— se saltaran.
  await page.setInputFiles("#file-input", tonePath);
  await page.waitForSelector("#ready:not([hidden])", { timeout: 10000 });
  check("elegir archivo no arranca solo", await page.locator("#status").isHidden());
  check(
    "el panel dice qué archivo se va a transcribir",
    ((await page.locator("#ready-name").textContent()) ?? "").includes("tone.wav"),
  );
  await page.click("#ready-cancel");
  check("se puede cambiar de archivo sin transcribir", await page.locator("#ready").isHidden());

  await page.setInputFiles("#file-input", tonePath);
  await page.waitForSelector("#ready:not([hidden])", { timeout: 10000 });
  // La elección se recuerda, que es lo que hace barato el clic de confirmar.
  await page.selectOption("#model-quality", "fast");
  await page.click("#start-btn");
  await page.waitForSelector("#status:not([hidden])", { timeout: 10000 });
  const outcome = await Promise.race([
    page.waitForSelector("#result:not([hidden])", { timeout: 300000 }).then(() => "done"),
    page.waitForSelector("#error:not([hidden])", { timeout: 300000 }).then(() => "error"),
  ]);
  if (outcome === "done") {
    check("transcripción real completada", true);
    await page.click("#new-btn");
  } else {
    const errText = (await page.locator("#error-msg").textContent()) ?? "";
    check("error de modelo gestionado con mensaje claro", /modelo/i.test(errText));
    await page.click("#error-dismiss");
    check("error se cierra", await page.locator("#error").isHidden());
  }
  const dzClass = (await page.locator("#dropzone").getAttribute("class")) ?? "";
  check("dropzone reutilizable tras el primer intento", !dzClass.includes("disabled"));

  await page.reload({ waitUntil: "load" });
  check(
    "el modelo elegido se recuerda en la siguiente visita",
    (await page.locator("#model-quality").inputValue()) === "fast",
  );
  await page.selectOption("#model-quality", "balanced");

  // 3 · resultado inyectado: edición + exports
  await page.evaluate(() => {
    window.__g32.showResult([
      { start: 0, end: 2.5, text: "Hola, esto es una prueba." },
      { start: 2.5, end: 5, text: "Segunda frase de ejemplo." },
      { start: 5, end: 8, text: "Tercera y última." },
    ]);
  });
  await page.waitForSelector("#result:not([hidden])");
  check("3 segmentos renderizados", (await page.locator(".segment").count()) === 3);

  const firstText = page.locator(".seg-text").first();
  await firstText.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" EDITADO");
  await page.waitForTimeout(300);

  const dl = async (kind) => {
    const [d] = await Promise.all([
      page.waitForEvent("download"),
      page.click(`[data-export="${kind}"]`),
    ]);
    return readFileSync(await d.path(), "utf8");
  };

  const txt = await dl("txt");
  check("TXT contiene edición", txt.includes("EDITADO"));
  check("TXT contiene atribución", txt.includes("gate32.autoritasai.com"));
  check("encuesta de caso de uso aparece tras exportar", await page.locator("#usecase").isVisible());
  await page.click("#usecase .usecase-opt");
  check("encuesta agradece la respuesta", await page.locator("#usecase-thanks").isVisible());
  await page.uncheck("#attribution");
  check("TXT sin atribución al desmarcar", !(await dl("txt")).includes("gate32.autoritasai.com"));
  check("SRT bien formado", (await dl("srt")).startsWith("1\n00:00:00,000 --> 00:00:02,500"));
  check("VTT con cabecera", (await dl("vtt")).startsWith("WEBVTT"));

  // Subtítulos con longitud de línea: petición de un usuario de r/podcasting
  // que necesitaba 32 caracteres y tenía que reformatear con Subtitle Edit.
  await page.selectOption("#cue-chars", "32");
  const srt32 = await dl("srt");
  const cueLines = srt32
    .split("\n")
    .filter((l) => l && !/^\d+$/.test(l) && !l.includes("-->"));
  check("SRT respeta 32 caracteres por línea", cueLines.every((l) => l.length <= 32));
  check("SRT a 32 no pierde texto", srt32.includes("EDITADO"));
  await page.selectOption("#cue-chars", "0");
  check(
    "sin reformatear conserva la frase entera",
    (await dl("srt")).includes("Hola, esto es una prueba. EDITADO"),
  );
  await page.selectOption("#cue-chars", "42");

  // Un resultado flojo con el modelo pequeño tenía como única salida volver a
  // empezar de cero. Ahora se repite con el siguiente modelo sin recargar nada.
  await page.evaluate(() => window.__g32.finishRun("balanced"));
  check("se ofrece repetir con un modelo mejor", await page.locator("#retry-better").isVisible());
  check(
    "el botón nombra el modelo al que sube",
    ((await page.locator("#retry-btn").textContent()) ?? "").includes("Preciso"),
  );
  await page.evaluate(() => window.__g32.finishRun("fast"));
  check(
    "desde Rápido sube a Equilibrado, no salta escalones",
    ((await page.locator("#retry-btn").textContent()) ?? "").includes("Equilibrado"),
  );
  // Con el modelo mayor ya en uso no hay nada que ofrecer.
  await page.evaluate(() => window.__g32.finishRun("max"));
  check("con el modelo máximo no se ofrece nada", await page.locator("#retry-better").isHidden());

  // Instalar como aplicación. Tres de cada cuatro personas que transcriben usan
  // un navegador que no garantiza conservar el modelo, así que al volver se
  // comen otra descarga de 80-250 MB. Hasta aquí solo había un párrafo pidiendo
  // que buscaran "Instalar" en el menú; ahora se ofrece el diálogo de verdad.
  await page.evaluate(() => {
    window.__g32.noPersist();
    window.__g32.finishRun("max");
  });
  check(
    "sin diálogo del navegador queda el aviso escrito",
    await page.locator("#persist-note").isVisible(),
  );
  check("y no se ofrece un botón que no funcionaría", await page.locator("#install").isHidden());
  await page.evaluate(() => window.__g32.installOffer());
  check("cuando el navegador lo permite se ofrece instalar", await page.locator("#install").isVisible());
  check(
    "y el aviso escrito se retira para no repetir lo mismo",
    await page.locator("#persist-note").isHidden(),
  );
  await page.click("#install-btn");
  check("tras decidir, el panel no se queda colgado", await page.locator("#install").isHidden());

  await page.evaluate(() => window.__g32.showResult([{ start: 0, end: 2, text: "x" }]));

  // Marcado de líneas dudosas. Whisper nunca avisa de que duda: escribe una
  // frase con su puntuación y su cadencia. En la prueba del 20/08 una nota de
  // voz salió con "te voy a estar despedonando la hora" y nada indicaba dónde
  // mirar.
  await page.evaluate(() => {
    window.__g32.showResult([
      { start: 0, end: 4, text: "esto lo dijo una vez" },
      { start: 4, end: 8, text: "Esto lo dijo una vez." },
      { start: 8, end: 30, text: "ya" },
      { start: 30, end: 34, text: "y aquí sigue hablando con toda normalidad, sin nada raro." },
    ]);
  });
  check("avisa de cuántas líneas conviene comprobar", await page.locator("#doubt").isVisible());
  check(
    "y dice el número exacto",
    ((await page.locator("#doubt-count").textContent()) ?? "").includes("2"),
  );
  check("marca el eco del bloque anterior", await page.locator(".segment.doubtful").count() === 2);
  check(
    "no marca la línea que está bien",
    await page.locator('.segment[data-index="3"]').evaluate((el) => !el.classList.contains("doubtful")),
  );
  check(
    "explica por qué está marcada sin tener que adivinarlo",
    /repetido|stuck|enganchado/i.test(
      (await page.getAttribute('.segment[data-index="1"]', "title")) ?? "",
    ),
  );
  // Un texto limpio no debe enseñar el aviso: si marcara siempre algo, la marca
  // dejaría de significar nada y se ignoraría entera.
  await page.evaluate(() => {
    window.__g32.showResult([
      { start: 0, end: 4, text: "Buenas tardes, perdona la hora pero me acaba de contestar." },
    ]);
  });
  check("con texto limpio no aparece el aviso", await page.locator("#doubt").isHidden());

  // El pase de corrección. Sale del caso real: 69 minutos sobre Claude y
  // Whisper escribió "Cloud" 90 veces. Todo lo demás correcto y el texto igual
  // de inútil para estudiar o citar.
  await page.evaluate(() => {
    window.__g32.showResult([
      { start: 0, end: 2, text: "bienvenido al curso de Cloud" },
      { start: 2, end: 4, text: "Cloud es la herramienta, cloud es otra cosa" },
      { start: 4, end: 6, text: "aquí no hay nada" },
    ]);
  });
  await page.fill("#fix-find", "Cloud");
  check(
    "cuenta las coincidencias antes de tocar nada",
    ((await page.locator("#fix-count").textContent()) ?? "").includes("3"),
  );
  await page.check("#fix-case");
  check(
    "respetar mayúsculas cambia la cuenta",
    ((await page.locator("#fix-count").textContent()) ?? "").includes("2"),
  );
  await page.uncheck("#fix-case");
  await page.fill("#fix-replace", "Claude");
  await page.click("#fix-apply");
  check(
    "corrige en toda la transcripción de una vez",
    ((await page.locator(".seg-text").nth(1).textContent()) ?? "") ===
      "Claude es la herramienta, Claude es otra cosa",
  );
  check("tras corregir se ofrece deshacer", await page.locator("#fix-undo").isVisible());
  await page.click("#fix-undo");
  check(
    "deshacer devuelve el texto original",
    ((await page.locator(".seg-text").nth(1).textContent()) ?? "").includes("Cloud es la herramienta"),
  );
  // Un nombre propio con paréntesis no puede convertirse en comodín.
  await page.fill("#fix-find", "curso de Cloud");
  check(
    "la búsqueda es literal",
    ((await page.locator("#fix-count").textContent()) ?? "").includes("1"),
  );
  await page.fill("#fix-find", "");

  await page.evaluate(() => {
    window.__g32.showResult([
      { start: 0, end: 2.5, text: "Hola, esto es una prueba. EDITADO" },
      { start: 2.5, end: 5, text: "Segunda frase de ejemplo." },
      { start: 5, end: 8, text: "Tercera y última." },
    ]);
  });

  await page.click("#pro-btn");
  check("CTA Pro despliega funcionalidades", await page.locator("#pro-features").isVisible());
  await page.click(".pro-feature");
  check("CTA Pro registra la feature elegida", await page.locator("#pro-thanks").isVisible());

  // 3c · reabrir un JSON exportado (transcribir en un equipo, revisar en otro)
  const jsonPath = join(tmp, "transcripcion.json");
  writeFileSync(
    jsonPath,
    JSON.stringify({
      source: "gate32",
      segments: [
        { start: 0, end: 2, text: "Primera linea importada." },
        { start: 2, end: 4, text: "Segunda linea importada." },
      ],
    }),
  );
  await page.click("#new-btn");
  await page.setInputFiles("#file-input", jsonPath);
  await page.waitForSelector("#result:not([hidden])", { timeout: 10000 });
  check("JSON exportado se reabre", (await page.locator(".segment").count()) === 2);
  check(
    "JSON reabierto conserva el texto",
    ((await page.locator(".seg-text").first().textContent()) ?? "").includes("Primera linea"),
  );

  const badJson = join(tmp, "otro.json");
  writeFileSync(badJson, JSON.stringify({ hola: "mundo" }));
  await page.click("#new-btn");
  await page.setInputFiles("#file-input", badJson);
  await page.waitForSelector("#error:not([hidden])", { timeout: 10000 });
  check("JSON ajeno da error claro", await page.locator("#error").isVisible());
  await page.click("#error-dismiss");

  // 3d · encuesta durante la descarga del modelo. Lo que no puede romperse es
  // que la barra de progreso siga visible, por encima y sin moverse.
  await page.evaluate(() => localStorage.removeItem("gate32.usecase"));
  await page.reload({ waitUntil: "load" });
  check("encuesta de espera oculta al arrancar", await page.locator("#wait-survey").isHidden());
  await page.evaluate(() => window.__g32.waitSurvey());
  check("encuesta de espera visible al descargar", await page.locator("#wait-survey").isVisible());
  check("progreso visible junto a la encuesta", await page.locator("#progress-wrap").isVisible());
  // En coordenadas del documento, no de la ventana: Playwright desplaza la
  // página para poder pulsar, y ese desplazamiento no es que la barra se mueva.
  const barTop = () =>
    page.evaluate(
      () => document.querySelector("#progress-wrap").getBoundingClientRect().top + window.scrollY,
    );
  const barY = await barTop();
  const surveyBox = await page.locator("#wait-survey").boundingBox();
  const barBox = await page.locator("#progress-wrap").boundingBox();
  check("la barra de progreso queda por encima de la encuesta", barBox.y < surveyBox.y);
  await page.click("#wait-survey .usecase-opt");
  check(
    "encuesta de espera agradece sin ocultar el progreso",
    (await page.locator("#wait-survey .wait-survey-thanks").isVisible()) &&
      (await page.locator("#progress-wrap").isVisible()),
  );
  check("la barra no se mueve al responder", Math.abs((await barTop()) - barY) < 1);

  // 3f · captura de reunión. No se puede conceder compartir pantalla desde
  // Playwright, así que se valida lo que sí depende de nosotros: que el botón
  // aparezca donde el navegador sabe capturar una pestaña, que el primer clic
  // avise antes de abrir el diálogo, y que una pestaña compartida sin audio
  // termine en un error explicativo en vez de grabar media reunión.
  await page.goto(`${BASE}/?e2e=1`, { waitUntil: "load" });
  check("botón de reunión visible en Chromium", await page.locator("#meeting-btn").isVisible());
  check("botón de vídeo visible en Chromium", await page.locator("#media-btn").isVisible());
  check("aviso oculto de inicio", await page.locator("#meeting-hint").isHidden());

  // Los dos avisos hablan a públicos distintos y no deben decir lo mismo: el
  // consentimiento solo aplica cuando hay personas, y el DRM solo cuando hay
  // contenido de pago.
  await page.click("#meeting-btn");
  const meetingHint = (await page.locator("#meeting-hint").textContent()) ?? "";
  check("reunión: explica la casilla de audio", /audio de la pestaña/i.test(meetingHint));
  check("reunión: recuerda pedir consentimiento", /consentimiento/i.test(meetingHint));
  check(
    "reunión: el botón pasa a confirmar",
    ((await page.locator("#meeting-btn [data-label]").textContent()) ?? "").includes("empezar"),
  );
  // Armar no es grabar: hasta que no se comparte la pestaña, el otro botón
  // sigue disponible. Bloquear antes de tiempo sería atrapar a quien se ha
  // equivocado de botón.
  check("armar uno no bloquea el otro", await page.locator("#media-btn").isEnabled());

  await page.reload({ waitUntil: "load" });
  await page.click("#media-btn");
  const mediaHint = (await page.locator("#meeting-hint").textContent()) ?? "";
  check("vídeo: explica la casilla de audio", /audio de la pestaña/i.test(mediaHint));
  check("vídeo: dice que no usa el micrófono", /micrófono no se usa/i.test(mediaHint));
  check("vídeo: avisa del contenido protegido", /Netflix/i.test(mediaHint));
  check("vídeo: no habla de consentimiento", !/consentimiento/i.test(mediaHint));

  // Dos grabaciones a la vez dejarían dos cronómetros y dos archivos de la
  // misma voz: mientras una corre, la otra no se puede empezar.
  // La red de seguridad de la grabación: hora y media de webinar se perdieron
  // porque el audio solo vivía en memoria y falló la decodificación.
  check("sin grabación no se ofrece rescate", await page.locator("#recovery").isHidden());
  await page.evaluate(() => window.__g32.fakeRecording(3));
  check("tras grabar se ofrece descargar el audio", await page.locator("#recovery").isVisible());
  check(
    "el aviso dice cuántos archivos y que se pierden al cerrar",
    /3 archivo|se pierde/i.test((await page.locator("#recovery-note").textContent()) ?? ""),
  );

  await page.evaluate(() => window.__g32.micRecording(true));
  check("grabando con el micro, la reunión no se puede empezar", await page.locator("#meeting-btn").isDisabled());
  check("grabando con el micro, el vídeo tampoco", await page.locator("#media-btn").isDisabled());
  await page.evaluate(() => window.__g32.micRecording(false));
  check("al parar el micro vuelven a habilitarse", await page.locator("#meeting-btn").isEnabled());

  await page.addInitScript(() => {
    // Pestaña compartida sin marcar «compartir audio»: el caso que falla.
    navigator.mediaDevices.getDisplayMedia = () =>
      Promise.resolve({
        getTracks: () => [{ stop() {} }],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
      });
  });
  await page.goto(`${BASE}/?e2e=1`, { waitUntil: "load" });
  await page.click("#meeting-btn");
  await page.click("#meeting-btn");
  await page.waitForSelector("#error:not([hidden])", { timeout: 10000 });
  check(
    "pestaña sin audio: error que dice cómo arreglarlo",
    /casilla/i.test((await page.locator("#error-hint").textContent()) ?? ""),
  );
  check(
    "tras el fallo el botón vuelve a su estado inicial",
    ((await page.locator("#meeting-btn [data-label]").textContent()) ?? "").includes("Grabar una reunión"),
  );
  await page.click("#error-dismiss");

  const reuniones = await page.goto(`${BASE}/reuniones/`, { waitUntil: "load" });
  check("/reuniones/ responde 200", (reuniones?.status() ?? 0) === 200);
  check(
    "/reuniones/ explica el problema de los auriculares",
    /auriculares/i.test((await page.locator("main").textContent()) ?? ""),
  );
  check("/reuniones/ lleva al transcriptor", (await page.locator('a[href="/"]').count()) > 0);
  // La función no distingue qué hay en la pestaña, así que la página tampoco
  // debe prometer solo reuniones — ni callar que el streaming de pago no va.
  const reunionesTxt = (await page.locator("main").textContent()) ?? "";
  check("/reuniones/ dice que sirve para vídeos y clases", /YouTube/i.test(reunionesTxt));
  check("/reuniones/ avisa del contenido protegido", /Netflix/i.test(reunionesTxt));

  // El sitemap alimenta el aviso a los buscadores: si una página no está,
  // IndexNow no la envía y nadie se entera de que existe.
  const sitemap = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
  for (const ruta of ["/", "/en/", "/subtitulos/", "/entrevistas/", "/clases/", "/reuniones/"]) {
    check(`sitemap incluye ${ruta}`, sitemap.includes(`https://gate32.autoritasai.com${ruta}<`));
  }
  const llms = await (await page.request.get(`${BASE}/llms.txt`)).text();
  check("llms.txt describe la captura de pestaña", /captura de pesta/i.test(llms));
  check("llms.txt dice qué no funciona (streaming de pago)", /Netflix/i.test(llms));

  // 3e · página de integración: la misma app sin la web alrededor. Si algún
  // elemento que la aplicación exige faltara, main.ts lanzaría al arrancar y
  // esto lo detecta antes que un cliente.
  await page.goto(`${BASE}/embed/?e2e=1&model=fast`, { waitUntil: "load" });
  check("embed: dropzone operativo", await page.locator("#dropzone").isVisible());
  check("embed: sin cabecera de la web", (await page.locator(".site-header").count()) === 0);
  check(
    "embed: el modelo se puede fijar por URL",
    (await page.locator("#model-quality").inputValue()) === "fast",
  );
  await page.evaluate(() => {
    window.__g32.showResult([{ start: 0, end: 2, text: "Embedded run." }]);
  });
  await page.waitForSelector("#result:not([hidden])");
  check("embed: exporta igual que la web", (await page.locator("[data-export]").count()) >= 5);
  check("embed: la atribución se puede quitar", await page.locator(".embed-credit").isVisible());
  const brandOff = await page.goto(`${BASE}/embed/?e2e=1&brand=0`, { waitUntil: "load" });
  check("embed: responde 200", (brandOff?.status() ?? 0) === 200);
  check("embed: sin marca con brand=0", await page.locator(".embed-credit").isHidden());

  // 3b · página inglesa: app completa operativa
  await page.goto(`${BASE}/en/?e2e=1`, { waitUntil: "load" });
  check("EN: h1 en inglés", /Transcribe audio/i.test((await page.locator("h1").textContent()) ?? ""));
  await page.evaluate(() => {
    window.__g32.showResult([{ start: 0, end: 2.5, text: "Hello, this is a test." }]);
  });
  await page.waitForSelector("#result:not([hidden])");
  const [dlEn] = await Promise.all([
    page.waitForEvent("download"),
    page.click('[data-export="txt"]'),
  ]);
  const txtEn = readFileSync(await dlEn.path(), "utf8");
  check("EN: atribución en inglés", txtEn.includes("Transcribed with Gate32"));

  // El 77 % del tráfico entra por /en/. Si instalan desde ahí y el manifest es
  // el castellano, la app se llama en español y arranca en la portada española.
  check(
    "EN: instala su propia app, no la castellana",
    (await page.getAttribute('link[rel="manifest"]', "href")) === "/manifest.en.webmanifest",
  );
  const manEn = await (await fetch(`${BASE}/manifest.en.webmanifest`)).json();
  check("EN: la app instalada abre la portada inglesa", manEn.start_url === "/en/");
  check("EN: manifest válido para instalar", manEn.display === "standalone" && manEn.icons.length >= 2);

  // 4 · móvil
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  const dz = await page.locator("#dropzone").boundingBox();
  check("dropzone usable en móvil", !!dz && dz.width > 300);

  // 4b · aviso y modelo por defecto en teléfonos reales (puntero grueso)
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const phonePage = await phone.newPage();
  await phonePage.goto(`${BASE}/`, { waitUntil: "load" });
  check("móvil: aviso de rendimiento visible", await phonePage.locator("#mobile-note").isVisible());
  check(
    "móvil: modelo Rápido por defecto",
    (await phonePage.locator("#model-quality").inputValue()) === "fast",
  );
  await phone.close();

  // 5 · instrumentación: los eventos del embudo llegan de verdad a GoatCounter.
  // Se intercepta el script de gc.zgo.at con un doble que registra las llamadas,
  // así se valida NUESTRO cableado sin depender de la red ni de terceros.
  const gcCtx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await gcCtx.route("https://gc.zgo.at/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.goatcounter={count:function(o){(window.__gc=window.__gc||[]).push(o.path)}};",
    }),
  );
  const gcPage = await gcCtx.newPage();
  await gcPage.goto(`${BASE}/?e2e=1`, { waitUntil: "load" });
  await gcPage.evaluate(() => {
    window.__g32.showResult([{ start: 0, end: 2, text: "Hola." }]);
  });
  await gcPage.waitForSelector("#result:not([hidden])");
  const [gcDl] = await Promise.all([
    gcPage.waitForEvent("download"),
    gcPage.click('[data-export="txt"]'),
  ]);
  await gcDl.path();
  // La encuesta de espera va primero: una vez respondida cualquiera de las dos,
  // no se vuelve a preguntar en ese dispositivo.
  await gcPage.evaluate(() => window.__g32.waitSurvey());
  await gcPage.click("#wait-survey [data-kind='clase']");
  await gcPage.click("#usecase .usecase-opt");
  await gcPage.click("#pro-btn");
  await gcPage.click(".pro-feature");
  await gcPage.waitForTimeout(400);
  const gcEvents = await gcPage.evaluate(() => window.__gc ?? []);
  check("analítica: evento export registrado", gcEvents.includes("export"));
  check("analítica: evento pro_interest registrado", gcEvents.includes("pro_interest"));
  check(
    "analítica: evento de caso de uso registrado",
    gcEvents.some((e) => String(e).startsWith("use_case")),
  );
  check(
    "analítica: la encuesta de espera se registra y distingue el momento",
    gcEvents.includes("wait_survey_shown") && gcEvents.includes("use_case_wait_clase"),
  );
  check(
    "analítica: evento de feature Pro registrado",
    gcEvents.some((e) => String(e).startsWith("pro_feature")),
  );
  await gcCtx.close();

  check("sin errores JS de página", pageErrors.length === 0);
  if (pageErrors.length) console.log("PAGE ERRORS:\n" + pageErrors.join("\n"));
} finally {
  await browser.close();
  preview.kill();
}

console.log(failures === 0 ? "\n✅ E2E OK" : `\n❌ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
