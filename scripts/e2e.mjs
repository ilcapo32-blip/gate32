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
  check("dropzone visible", await page.locator("#dropzone").isVisible());
  check("FAQ presente", (await page.locator("#faq details").count()) >= 5);

  // 2 · decodificación + fase de modelo (éxito o error de red controlado)
  await page.setInputFiles("#file-input", tonePath);
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
  await page.click(".usecase-opt");
  check("encuesta agradece la respuesta", await page.locator("#usecase-thanks").isVisible());
  await page.uncheck("#attribution");
  check("TXT sin atribución al desmarcar", !(await dl("txt")).includes("gate32.autoritasai.com"));
  check("SRT bien formado", (await dl("srt")).startsWith("1\n00:00:00,000 --> 00:00:02,500"));
  check("VTT con cabecera", (await dl("vtt")).startsWith("WEBVTT"));

  await page.click("#pro-btn");
  check("CTA Pro despliega funcionalidades", await page.locator("#pro-features").isVisible());
  await page.click(".pro-feature");
  check("CTA Pro registra la feature elegida", await page.locator("#pro-thanks").isVisible());

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

  check("sin errores JS de página", pageErrors.length === 0);
  if (pageErrors.length) console.log("PAGE ERRORS:\n" + pageErrors.join("\n"));
} finally {
  await browser.close();
  preview.kill();
}

console.log(failures === 0 ? "\n✅ E2E OK" : `\n❌ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
