// ── tarjeta de embarque: se dibuja en canvas y se descarga como PNG ──

import { mulberry32, hashStr } from "./util.js";

const W = 1500;
const H = 560;
const STUB_X = 1080;

const INK = "#1c1712";
const MUTED = "#8a7f6a";
const CREAM = "#f4edda";
const CREAM2 = "#ece3cc";
const AMBER = "#f5a623";

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(ctx, text, x, y) {
  ctx.fillStyle = MUTED;
  ctx.font = "600 17px 'IBM Plex Mono', monospace";
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size = 34, color = INK) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px 'IBM Plex Mono', monospace`;
  ctx.fillText(text, x, y);
}

function barcode(ctx, rand, x, y, w, h) {
  ctx.fillStyle = INK;
  let bx = x;
  while (bx < x + w) {
    const bw = 2 + Math.floor(rand() * 6);
    if (rand() < 0.62) ctx.fillRect(bx, y, bw, h);
    bx += bw + 2;
  }
}

export function drawPass(canvas, data) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  // cuerpo de la tarjeta
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 26);
  ctx.clip();

  const paper = ctx.createLinearGradient(0, 0, 0, H);
  paper.addColorStop(0, CREAM);
  paper.addColorStop(1, CREAM2);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // textura de líneas finas
  ctx.strokeStyle = "rgba(140,125,95,0.07)";
  ctx.lineWidth = 1;
  for (let y = 110; y < H; y += 9) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // "32" fantasma de fondo
  ctx.save();
  ctx.translate(760, 400);
  ctx.rotate(-0.12);
  ctx.fillStyle = "rgba(140,120,80,0.08)";
  ctx.font = "700 360px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("32", 0, 120);
  ctx.restore();

  // banda superior ámbar
  ctx.fillStyle = AMBER;
  ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = "#171106";
  ctx.font = "700 40px 'IBM Plex Mono', monospace";
  ctx.fillText("GATE 32 ✈", 56, 60);
  ctx.font = "600 20px 'IBM Plex Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText("TARJETA DE EMBARQUE · BOARDING PASS", STUB_X - 40, 58);
  ctx.textAlign = "left";

  // ── zona principal ──
  const nx = 56;
  label(ctx, "PASAJERO/A", nx, 150);
  value(ctx, data.name, nx, 196, 42);

  label(ctx, "DESTINO", nx, 262);
  value(ctx, data.destName, nx, 306, 40);
  label(ctx, "CÓDIGO", 700, 262);
  value(ctx, data.destCode, 700, 306, 40, "#a3542a");

  label(ctx, "VUELO", nx, 372);
  value(ctx, data.flight, nx, 410, 30);
  label(ctx, "PUERTA", 320, 372);
  value(ctx, "32", 320, 410, 30, "#a3542a");
  label(ctx, "ASIENTO", 500, 372);
  value(ctx, data.seat, 500, 410, 30);
  label(ctx, "EMBARQUE", 700, 372);
  value(ctx, data.boardTime, 700, 410, 30);

  const rand = mulberry32(hashStr(data.name + data.flight + data.seed));
  barcode(ctx, rand, nx, 448, 600, 62);
  ctx.fillStyle = MUTED;
  ctx.font = "600 15px 'IBM Plex Mono', monospace";
  ctx.fillText(`SEMILLA ${data.destCode}-${data.seed} · VÁLIDA PARA UN VIAJE IMAGINARIO · SIN FECHA DE CADUCIDAD`, nx, 536);

  // ── talón (stub) ──
  ctx.fillStyle = "rgba(140,120,80,0.06)";
  ctx.fillRect(STUB_X, 0, W - STUB_X, H);
  ctx.fillStyle = AMBER;
  ctx.fillRect(STUB_X, 0, W - STUB_X, 92);
  ctx.fillStyle = "#171106";
  ctx.font = "700 26px 'IBM Plex Mono', monospace";
  ctx.fillText("G32", STUB_X + 36, 58);

  const sx = STUB_X + 36;
  label(ctx, "PASAJERO/A", sx, 150);
  value(ctx, data.name.length > 16 ? data.name.slice(0, 15) + "…" : data.name, sx, 186, 24);
  label(ctx, "DESTINO", sx, 240);
  value(ctx, data.destCode, sx, 296, 56, "#a3542a");
  label(ctx, "VUELO", sx, 356);
  value(ctx, data.flight, sx, 390, 26);
  label(ctx, "ASIENTO", sx + 220, 356);
  value(ctx, data.seat, sx + 220, 390, 26);
  barcode(ctx, rand, sx, 430, 340, 50);
  ctx.fillStyle = MUTED;
  ctx.font = "600 14px 'IBM Plex Mono', monospace";
  ctx.fillText("CONSERVE ESTE TALÓN COMO RECUERDO", sx, 516);

  // línea de perforación
  ctx.strokeStyle = "rgba(90,80,60,0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(STUB_X, 12);
  ctx.lineTo(STUB_X, H - 12);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // muescas de la perforación (recortadas del papel)
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (const ny of [0, H]) {
    ctx.beginPath();
    ctx.arc(STUB_X, ny, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // borde interior sutil
  ctx.save();
  roundRectPath(ctx, 1.5, 1.5, W - 3, H - 3, 25);
  ctx.strokeStyle = "rgba(90,80,60,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function randomSeat(rand) {
  const row = 1 + Math.floor(rand() * 32);
  const letter = "ABCDEF"[Math.floor(rand() * 6)];
  return `${row}${letter}`;
}

export function downloadPass(canvas, destCode) {
  const a = document.createElement("a");
  a.download = `gate32-tarjeta-${destCode.toLowerCase()}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}
