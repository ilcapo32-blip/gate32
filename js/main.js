// ── GATE 32 · cableado de la terminal ──

import { createBoard, startClock, startTicker } from "./board.js";
import { SCENES } from "./scenes.js";
import { drawPass, downloadPass, randomSeat } from "./pass.js";
import { mulberry32, hashStr, seedLabel, chimeBoarding, clickTick } from "./util.js";

const $ = (sel) => document.querySelector(sel);

const screenBoard = $("#screen-board");
const screenScene = $("#screen-scene");
const sceneCanvas = $("#scene-canvas");
const passModal = $("#pass-modal");
const passCanvas = $("#pass-canvas");
const passName = $("#pass-name");

startClock($("#clock"), $("#dateline"));
startTicker($("#ticker-track"));

/* ── gestor de escena: canvas a pantalla completa con bucle rAF ── */

const DPR_CAP = 1.75;
let current = null; // { dest, seed, seedTag, scene, raf, t0 }

function resizeCanvas() {
  if (!current) return;
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  sceneCanvas.width = Math.round(window.innerWidth * dpr);
  sceneCanvas.height = Math.round(window.innerHeight * dpr);
  const ctx = sceneCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  current.scene.init(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", resizeCanvas);

function startScene(dest, seed) {
  stopScene();
  const seedRand = mulberry32(seed);
  const tag = seedLabel(seedRand);
  const scene = SCENES[dest.id](seed);
  current = { dest, seed, seedTag: tag, scene, raf: 0, t0: performance.now() };

  $("#scene-flight").textContent = `${dest.flight} · PUERTA 32`;
  $("#scene-title").textContent = dest.name;
  $("#scene-tagline").textContent = dest.tagline;
  $("#scene-seed").textContent = `SEMILLA ${dest.code}-${tag}`;

  resizeCanvas();
  const ctx = sceneCanvas.getContext("2d");
  const loop = (now) => {
    const t = (now - current.t0) / 1000;
    current.scene.draw(ctx, window.innerWidth, window.innerHeight, t);
    current.raf = requestAnimationFrame(loop);
  };
  current.raf = requestAnimationFrame(loop);
}

function stopScene() {
  if (current) cancelAnimationFrame(current.raf);
  current = null;
}

/* ── navegación entre pantallas ── */

function boardFlight(dest) {
  chimeBoarding();
  const seed = (Math.random() * 0xffffffff) >>> 0;
  startScene(dest, seed);
  screenScene.classList.remove("hidden");
  screenBoard.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "hidden";
}

function backToBoard() {
  stopScene();
  screenScene.classList.add("hidden");
  screenBoard.removeAttribute("aria-hidden");
  document.body.style.overflow = "";
}

createBoard($("#board"), boardFlight);

$("#btn-back").addEventListener("click", () => {
  clickTick();
  backToBoard();
});

$("#btn-reseed").addEventListener("click", () => {
  if (!current) return;
  clickTick();
  startScene(current.dest, (Math.random() * 0xffffffff) >>> 0);
});

/* ── tarjeta de embarque ── */

let passData = null;

function openPass() {
  if (!current) return;
  clickTick();
  const rand = mulberry32(hashStr(current.seedTag + current.dest.flight));
  const board = new Date(Date.now() + 15 * 60000);
  passData = {
    name: (passName.value.trim() || "VIAJERA ANÓNIMA").toUpperCase(),
    destName: current.dest.name,
    destCode: current.dest.code,
    flight: current.dest.flight,
    seat: randomSeat(rand),
    boardTime: board.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false }),
    seed: current.seedTag,
  };
  passModal.classList.remove("hidden");
  document.fonts.ready.then(() => {
    if (passData) drawPass(passCanvas, passData);
  });
  drawPass(passCanvas, passData);
  passName.focus();
}

function closePass() {
  passModal.classList.add("hidden");
  passData = null;
}

$("#btn-pass").addEventListener("click", openPass);
$("#btn-close-pass").addEventListener("click", closePass);

passName.addEventListener("input", () => {
  if (!passData) return;
  passData.name = (passName.value.trim() || "VIAJERA ANÓNIMA").toUpperCase();
  drawPass(passCanvas, passData);
});

$("#btn-download").addEventListener("click", () => {
  if (!passData) return;
  clickTick();
  drawPass(passCanvas, passData);
  downloadPass(passCanvas, passData.destCode);
});

passModal.addEventListener("click", (e) => {
  if (e.target === passModal) closePass();
});

/* ── teclado ── */

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!passModal.classList.contains("hidden")) closePass();
  else if (!screenScene.classList.contains("hidden")) backToBoard();
});
