// ── los mundos: ocho paisajes generativos con semilla ──
//
// Cada fábrica recibe una semilla y devuelve { init(w,h), draw(ctx,w,h,t) }.
// Regla de oro: el azar de composición (rand) solo se consume en la fábrica,
// nunca en init/draw, para que un cambio de tamaño no cambie el paisaje.

import { mulberry32, makeNoise1D, fbm } from "./util.js";

// sprite circular con degradado radial, para brillos y partículas
function makeSprite(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [pos, color] of stops) grad.addColorStop(pos, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function vignette(ctx, w, h, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function skyGradient(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [pos, color] of stops) g.addColorStop(pos, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function makeStars(rand, n, yMax = 1) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: rand(), y: rand() * yMax,
      r: 0.4 + rand() * 1.1,
      phase: rand() * Math.PI * 2,
      speed: 0.4 + rand() * 1.4,
    });
  }
  return stars;
}

function drawStars(ctx, stars, w, h, t, color = "255,255,255") {
  for (const s of stars) {
    const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`;
    ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
  }
}

// silueta montañosa/ondulada: rellena desde una cresta hasta el fondo
function fillRidge(ctx, w, h, yFn, color) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  const step = Math.max(4, w / 240);
  for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, yFn(x / w));
  ctx.lineTo(w + step, h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/* ══════════ AURORA-9 ══════════ */
function makeAurora(seed) {
  const rand = mulberry32(seed);
  const noise = makeNoise1D(rand);
  const stars = makeStars(rand, 260, 0.75);
  const ribbons = [];
  const nR = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < nR; i++) {
    ribbons.push({
      baseY: 0.2 + rand() * 0.3,
      amp: 0.1 + rand() * 0.14,
      len: 0.14 + rand() * 0.14,
      hue: rand() < 0.72 ? 130 + rand() * 45 : 265 + rand() * 30,
      speed: 0.05 + rand() * 0.08,
      off: rand() * 100,
    });
    ribbons[i].len = 0.2 + rand() * 0.16;
  }
  const ridgeOff1 = rand() * 50;
  const ridgeOff2 = rand() * 50;

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#020613"], [0.6, "#04122a"], [1, "#071c33"]]);
      drawStars(ctx, stars, w, h, t);

      ctx.globalCompositeOperation = "lighter";
      const step = Math.max(5, w / 220);
      for (const r of ribbons) {
        for (let x = 0; x <= w; x += step) {
          const nx = x / w;
          const n = fbm(noise, nx * 3 + r.off + t * r.speed, 3);
          const y = (r.baseY + (n - 0.5) * r.amp * 2) * h;
          const len = (r.len + 0.1 * noise(nx * 6 + r.off + 40 + t * r.speed * 1.7)) * h;
          const hue = r.hue + n * 26;
          const g = ctx.createLinearGradient(0, y, 0, y + len);
          g.addColorStop(0, `hsla(${hue},95%,62%,0.16)`);
          g.addColorStop(0.35, `hsla(${hue},90%,55%,0.07)`);
          g.addColorStop(1, "hsla(0,0%,0%,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x, y, step + 1, len);
        }
      }
      ctx.globalCompositeOperation = "source-over";

      fillRidge(ctx, w, h, (nx) => h * (0.74 + fbm(noise, nx * 2.4 + ridgeOff1, 3) * 0.18), "#060d18");
      fillRidge(ctx, w, h, (nx) => h * (0.85 + fbm(noise, nx * 3.1 + ridgeOff2, 3) * 0.12), "#03070e");
      vignette(ctx, w, h, 0.45);
    },
  };
}

/* ══════════ MAR DE NIEBLA ══════════ */
function makeNiebla(seed) {
  const rand = mulberry32(seed);
  const noise = makeNoise1D(rand);
  const moonX = 0.6 + rand() * 0.28;
  const moonY = 0.14 + rand() * 0.14;
  const layers = [];
  for (let i = 0; i < 6; i++) {
    layers.push({
      baseY: 0.4 + i * 0.1,
      amp: 0.045 + rand() * 0.03,
      speed: 0.014 + i * 0.012 + rand() * 0.008,
      off: rand() * 90,
      light: 26 - i * 3.4,
    });
  }
  const mists = [];
  for (let i = 0; i < 9; i++) {
    mists.push({ y: 0.38 + rand() * 0.5, r: 0.14 + rand() * 0.2, speed: (rand() - 0.5) * 0.012, off: rand() });
  }
  const birds = [];
  for (let i = 0; i < 3; i++) {
    birds.push({ y: 0.16 + rand() * 0.18, speed: 0.008 + rand() * 0.006, off: rand(), size: 5 + rand() * 4, flap: 2 + rand() * 2 });
  }
  const mistSprite = makeSprite(256, [[0, "rgba(190,205,220,0.35)"], [0.6, "rgba(190,205,220,0.1)"], [1, "rgba(190,205,220,0)"]]);

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#0b1520"], [0.55, "#17293a"], [1, "#22394c"]]);

      // luna con halo
      const mx = moonX * w, my = moonY * h, mr = Math.min(w, h) * 0.045;
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6);
      halo.addColorStop(0, "rgba(220,232,240,0.5)");
      halo.addColorStop(0.2, "rgba(220,232,240,0.12)");
      halo.addColorStop(1, "rgba(220,232,240,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
      ctx.fillStyle = "#e6eef4";
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      // pájaros lejanos
      ctx.strokeStyle = "rgba(10,18,26,0.8)";
      ctx.lineWidth = 1.5;
      for (const b of birds) {
        const bx = ((b.off + t * b.speed) % 1.2 - 0.1) * w;
        const by = (b.y + Math.sin(t * 0.7 + b.off * 9) * 0.01) * h;
        const wing = Math.sin(t * b.flap + b.off * 20) * b.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(bx - b.size, by + wing);
        ctx.quadraticCurveTo(bx, by - b.size * 0.4, bx, by);
        ctx.quadraticCurveTo(bx, by - b.size * 0.4, bx + b.size, by + wing);
        ctx.stroke();
      }

      // capas de olas hundiéndose en niebla
      for (const l of layers) {
        fillRidge(ctx, w, h,
          (nx) => h * (l.baseY + (fbm(noise, nx * 2.6 + l.off + t * l.speed, 3) - 0.5) * l.amp * 2),
          `hsl(209, 32%, ${l.light}%)`);
      }

      // bancos de niebla a la deriva
      for (const m of mists) {
        const r = m.r * Math.min(w, h) * 2.4;
        const x = (((m.off + t * m.speed) % 1) + 1) % 1;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(mistSprite, x * w - r / 2, m.y * h - r / 4, r, r / 2);
        ctx.globalAlpha = 1;
      }
      vignette(ctx, w, h, 0.4);
    },
  };
}

/* ══════════ DUNAS DE ÁMBAR ══════════ */
function makeDunas(seed) {
  const rand = mulberry32(seed);
  const noise = makeNoise1D(rand);
  const sunX = 0.3 + rand() * 0.4;
  const dunes = [];
  const cols = ["#8a4526", "#6e3620", "#54281a", "#3a1a12", "#22100b"];
  for (let i = 0; i < 5; i++) {
    dunes.push({ baseY: 0.52 + i * 0.1, amp: 0.05 + rand() * 0.05, off: rand() * 80, color: cols[i] });
  }
  const sparks = [];
  for (let i = 0; i < 70; i++) {
    sparks.push({ x: rand(), y: 0.55 + rand() * 0.4, speed: 0.01 + rand() * 0.03, phase: rand() * Math.PI * 2 });
  }

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#2a1030"], [0.45, "#7c2f2a"], [0.62, "#c2622f"], [0.75, "#e89a4a"]]);

      // sol retro con bandas
      const sx = sunX * w, sy = 0.52 * h, sr = Math.min(w, h) * 0.13;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3);
      glow.addColorStop(0, "rgba(255,205,120,0.55)");
      glow.addColorStop(0.35, "rgba(255,160,80,0.16)");
      glow.addColorStop(1, "rgba(255,160,80,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.clip();
      const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
      sg.addColorStop(0, "#ffe9b0");
      sg.addColorStop(1, "#ff9840");
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      ctx.fillStyle = "rgba(122,47,42,0.85)";
      for (let i = 0; i < 4; i++) {
        const by = sy + sr * (0.15 + i * 0.24);
        ctx.fillRect(sx - sr, by, sr * 2, 2 + i * 1.5);
      }
      ctx.restore();

      // dunas en capas, de la luz a la sombra
      for (const d of dunes) {
        fillRidge(ctx, w, h,
          (nx) => h * (d.baseY + (fbm(noise, nx * 1.9 + d.off + t * 0.004, 3) - 0.5) * d.amp * 2),
          d.color);
      }

      // arena en suspensión que centellea
      for (const s of sparks) {
        const x = (((s.x + t * s.speed) % 1) + 1) % 1;
        const a = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + s.phase));
        ctx.fillStyle = `rgba(255,214,150,${a.toFixed(3)})`;
        ctx.fillRect(x * w, (s.y + Math.sin(t * 0.8 + s.phase) * 0.008) * h, 1.6, 1.6);
      }
      vignette(ctx, w, h, 0.42);
    },
  };
}

/* ══════════ NEBULOSA ÍMPAR ══════════ */
function makeNebulosa(seed) {
  const rand = mulberry32(seed);
  const stars = makeStars(rand, 320);
  const baseHue = 180 + rand() * 150;
  const hues = [baseHue, baseHue + 35, baseHue + 70];
  const sprites = hues.map((hu) =>
    makeSprite(128, [
      [0, `hsla(${hu % 360},85%,68%,0.55)`],
      [0.4, `hsla(${hu % 360},80%,55%,0.18)`],
      [1, `hsla(${hu % 360},80%,50%,0)`],
    ]));
  const parts = [];
  for (let i = 0; i < 620; i++) {
    const rr = (rand() + rand() + rand()) / 3;
    parts.push({
      r: rr,
      a0: rand() * Math.PI * 2,
      size: 0.02 + rand() * 0.09,
      sprite: Math.floor(rand() * 3),
      alpha: 0.25 + rand() * 0.6,
      wob: rand() * Math.PI * 2,
    });
  }
  const rand2 = mulberry32(seed ^ 0x9e3779b9);
  let shoot = { next: 3 + rand2() * 5, active: false, start: 0, x0: 0, y0: 0, dx: 0, dy: 0 };

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#040309"], [1, "#0a0714"]]);
      drawStars(ctx, stars, w, h, t);

      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.46;
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        const ang = p.a0 + t * 0.02 / (p.r + 0.25);
        const wob = 1 + 0.04 * Math.sin(t * 0.5 + p.wob);
        const x = cx + Math.cos(ang) * p.r * R * 1.35 * wob;
        const y = cy + Math.sin(ang) * p.r * R * 0.85 * wob;
        const s = p.size * R * 2;
        ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(t * 0.7 + p.wob * 3));
        ctx.drawImage(sprites[p.sprite], x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // estrella fugaz ocasional
      if (!shoot.active && t > shoot.next) {
        shoot.active = true;
        shoot.start = t;
        shoot.x0 = rand2() * w;
        shoot.y0 = rand2() * h * 0.4;
        const ang = Math.PI * (0.15 + rand2() * 0.2);
        const sp = w * (0.5 + rand2() * 0.4);
        shoot.dx = Math.cos(ang) * sp;
        shoot.dy = Math.sin(ang) * sp;
      }
      if (shoot.active) {
        const dt = t - shoot.start;
        if (dt > 0.9) {
          shoot.active = false;
          shoot.next = t + 4 + rand2() * 6;
        } else {
          const x = shoot.x0 + shoot.dx * dt;
          const y = shoot.y0 + shoot.dy * dt;
          const fade = 1 - dt / 0.9;
          ctx.strokeStyle = `rgba(255,255,255,${(0.7 * fade).toFixed(3)})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x - shoot.dx * 0.08, y - shoot.dy * 0.08);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      vignette(ctx, w, h, 0.5);
    },
  };
}

/* ══════════ CIUDAD LUCIÉRNAGA ══════════ */
function makeCiudad(seed) {
  const rand = mulberry32(seed);
  const stars = makeStars(rand, 120, 0.5);
  const backBld = [];
  let x = 0;
  while (x < 1.02) {
    const bw = 0.03 + rand() * 0.06;
    backBld.push({ x, w: bw, h: 0.2 + rand() * 0.26 });
    x += bw + 0.004;
  }
  const frontBld = [];
  x = -0.02;
  while (x < 1.02) {
    const bw = 0.04 + rand() * 0.08;
    const bh = 0.2 + rand() * 0.34;
    const windows = [];
    const cols = Math.max(2, Math.floor(bw * 90));
    const rows = Math.max(3, Math.floor(bh * 42));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() < 0.24) {
          windows.push({ cx: (c + 0.5) / cols, cy: (r + 0.5) / rows, phase: rand() * Math.PI * 2, warm: rand() < 0.8 });
        }
      }
    }
    frontBld.push({ x, w: bw, h: bh, windows });
    x += bw + 0.006;
  }
  const flies = [];
  for (let i = 0; i < 60; i++) {
    flies.push({
      x0: rand(), y0: 0.45 + rand() * 0.45,
      ax: 0.015 + rand() * 0.05, ay: 0.01 + rand() * 0.03,
      fx: 0.2 + rand() * 0.5, fy: 0.3 + rand() * 0.6,
      px: rand() * Math.PI * 2, py: rand() * Math.PI * 2,
      pulse: 0.6 + rand() * 1.6, pp: rand() * Math.PI * 2,
    });
  }
  const flySprite = makeSprite(64, [[0, "rgba(220,255,150,0.9)"], [0.25, "rgba(190,240,110,0.35)"], [1, "rgba(190,240,110,0)"]]);

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#04070f"], [0.7, "#0a1322"], [1, "#101b2e"]]);
      drawStars(ctx, stars, w, h, t, "200,215,255");

      // resplandor urbano sobre el horizonte
      const glow = ctx.createLinearGradient(0, h * 0.45, 0, h);
      glow.addColorStop(0, "rgba(255,150,70,0)");
      glow.addColorStop(1, "rgba(255,150,70,0.09)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, h * 0.45, w, h * 0.55);

      // skyline lejano
      ctx.fillStyle = "#101b30";
      for (const b of backBld) {
        ctx.fillRect(b.x * w, (1 - b.h) * h, b.w * w + 1, b.h * h);
      }

      // edificios cercanos con ventanas vivas
      for (const b of frontBld) {
        const bx = b.x * w, bw2 = b.w * w, bt = (1 - b.h) * h;
        ctx.fillStyle = "#070c16";
        ctx.fillRect(bx, bt, bw2 + 1, b.h * h);
        for (const win of b.windows) {
          const flick = 0.7 + 0.3 * Math.sin(t * 0.8 + win.phase);
          const on = Math.sin(t * 0.11 + win.phase * 7) > -0.85;
          if (!on) continue;
          ctx.fillStyle = win.warm
            ? `rgba(255,208,120,${(0.85 * flick).toFixed(3)})`
            : `rgba(160,210,255,${(0.75 * flick).toFixed(3)})`;
          ctx.fillRect(bx + win.cx * bw2 - 1.6, bt + win.cy * b.h * h - 2.2, 3.2, 4.4);
        }
      }

      // luciérnagas
      ctx.globalCompositeOperation = "lighter";
      for (const f of flies) {
        const fx = (f.x0 + Math.sin(t * f.fx + f.px) * f.ax) * w;
        const fy = (f.y0 + Math.sin(t * f.fy + f.py) * f.ay) * h;
        const a = 0.25 + 0.75 * Math.max(0, Math.sin(t * f.pulse + f.pp));
        const s = 10 + 8 * a;
        ctx.globalAlpha = a;
        ctx.drawImage(flySprite, fx - s / 2, fy - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      vignette(ctx, w, h, 0.42);
    },
  };
}

/* ══════════ JARDÍN CINÉTICO ══════════ */
function makeJardin(seed) {
  const rand = mulberry32(seed);
  const noise = makeNoise1D(rand);
  const stems = [];
  for (let i = 0; i < 16; i++) {
    stems.push({
      x: rand(), hgt: 0.28 + rand() * 0.42,
      sway: 0.008 + rand() * 0.02, phase: rand() * Math.PI * 2, speed: 0.4 + rand() * 0.5,
      head: rand() < 0.5, headHue: 20 + rand() * 40, lean: (rand() - 0.5) * 0.06,
    });
  }
  const petals = [];
  const cols = ["232,167,184", "242,234,216", "232,207,138", "205,225,180"];
  for (let i = 0; i < 90; i++) {
    petals.push({
      x: rand(), y: rand(),
      fall: 0.018 + rand() * 0.03, drift: 0.01 + rand() * 0.02,
      rot: rand() * Math.PI * 2, rotSpeed: (rand() - 0.5) * 1.6,
      size: 3 + rand() * 4.5, color: cols[Math.floor(rand() * cols.length)],
      phase: rand() * Math.PI * 2,
    });
  }
  const groundOff = rand() * 60;

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#0a140e"], [0.6, "#122318"], [1, "#1a3022"]]);

      // haces de luz diagonales
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const bx = (0.15 + i * 0.24) * w + Math.sin(t * 0.1 + i) * 20;
        const g = ctx.createLinearGradient(bx, 0, bx - w * 0.18, h);
        g.addColorStop(0, "rgba(220,240,190,0.05)");
        g.addColorStop(1, "rgba(220,240,190,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - w * 0.03, 0);
        ctx.lineTo(bx + w * 0.03, 0);
        ctx.lineTo(bx - w * 0.13, h);
        ctx.lineTo(bx - w * 0.23, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // suelo
      fillRidge(ctx, w, h, (nx) => h * (0.88 + (fbm(noise, nx * 3 + groundOff, 2) - 0.5) * 0.05), "#08130c");

      // tallos que se mecen
      for (const s of stems) {
        const bx = s.x * w;
        const topY = (0.9 - s.hgt) * h;
        const sway = Math.sin(t * s.speed + s.phase) * s.sway * w;
        const topX = bx + s.lean * w + sway;
        ctx.strokeStyle = "#16321e";
        ctx.lineWidth = Math.max(2.5, s.hgt * 8);
        ctx.beginPath();
        ctx.moveTo(bx, 0.92 * h);
        ctx.quadraticCurveTo(bx + s.lean * w * 0.3, (0.9 - s.hgt * 0.5) * h, topX, topY);
        ctx.stroke();
        // hojas
        ctx.fillStyle = "#1a3b24";
        for (let l = 1; l <= 2; l++) {
          const ly = 0.92 * h - s.hgt * h * (l * 0.33);
          const lx = bx + s.lean * w * 0.3 * l + sway * 0.4 * l;
          ctx.beginPath();
          ctx.ellipse(lx + 8, ly, 11, 4, -0.5 + Math.sin(t * s.speed + s.phase) * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        if (s.head) {
          ctx.fillStyle = `hsla(${s.headHue},65%,62%,0.9)`;
          ctx.beginPath();
          ctx.arc(topX, topY, Math.max(3, s.hgt * 9), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // pétalos a la deriva
      for (const p of petals) {
        const y = ((p.y + t * p.fall) % 1.1) - 0.05;
        const x = ((p.x + Math.sin(t * 0.6 + p.phase) * p.drift + t * 0.006) % 1.05);
        const rot = p.rot + t * p.rotSpeed;
        ctx.save();
        ctx.translate(x * w, y * h);
        ctx.rotate(rot);
        ctx.fillStyle = `rgba(${p.color},0.85)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      vignette(ctx, w, h, 0.45);
    },
  };
}

/* ══════════ ISLA VOLTA ══════════ */
function makeVolta(seed) {
  const rand = mulberry32(seed);
  const noise = makeNoise1D(rand);
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    clouds.push({ x: rand(), y: rand() * 0.22, r: 0.12 + rand() * 0.16, speed: 0.006 + rand() * 0.008 });
  }
  const drops = [];
  for (let i = 0; i < 320; i++) {
    drops.push({ x: rand(), y: rand(), len: 0.012 + rand() * 0.014, speed: 0.9 + rand() * 0.7 });
  }
  const islandX = 0.38 + rand() * 0.24;
  const islandOff = rand() * 40;
  const cloudSprite = makeSprite(256, [[0, "rgba(16,22,30,0.9)"], [0.6, "rgba(16,22,30,0.5)"], [1, "rgba(16,22,30,0)"]]);
  const rand2 = mulberry32(seed ^ 0x51ed270b);
  let bolt = { next: 2.5 + rand2() * 4, active: false, start: 0, pts: [] };

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#0e1420"], [0.6, "#1b2636"], [1, "#121a28"]]);

      // nubes bajas
      for (const c of clouds) {
        const cx = (((c.x + t * c.speed) % 1.3) - 0.15) * w;
        const r = c.r * w;
        ctx.drawImage(cloudSprite, cx - r, c.y * h - r * 0.4, r * 2, r * 1.1);
      }

      // mar
      const seaY = 0.72 * h;
      const sg = ctx.createLinearGradient(0, seaY, 0, h);
      sg.addColorStop(0, "#16242f");
      sg.addColorStop(1, "#0e1621");
      ctx.fillStyle = sg;
      ctx.fillRect(0, seaY, w, h - seaY);
      ctx.strokeStyle = "rgba(180,205,225,0.16)";
      ctx.lineWidth = 1;
      for (let r = 0; r < 14; r++) {
        const y = seaY + (r + 0.5) * (h - seaY) / 14;
        const drift = (t * (0.02 + r * 0.004) + r * 0.13) % 1;
        for (let i = 0; i < 9; i++) {
          const x0 = ((i / 9 + drift * (r % 2 ? 1 : -1)) % 1) * w;
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x0 + w * 0.03, y);
          ctx.stroke();
        }
      }

      // isla con faro
      const ix = islandX * w;
      fillRidge(ctx, w, h, (nx) => {
        const d = Math.abs(nx - islandX);
        const hill = Math.max(0, 1 - d * 6.5);
        return seaY - hill * hill * h * 0.16 * (0.8 + fbm(noise, nx * 5 + islandOff, 2) * 0.4) + 2;
      }, "#070b11");
      const towerH = h * 0.13;
      const towerTop = seaY - h * 0.15 - towerH;
      ctx.fillStyle = "#0a0f16";
      ctx.fillRect(ix - 5, towerTop, 10, towerH + h * 0.16);
      ctx.fillRect(ix - 8, towerTop, 16, 6);

      // haz del faro barriendo el horizonte, a un lado y a otro
      const sweep = Math.sin(t * 0.55);
      const bx = ix, by = towerTop + 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(bx, by);
      ctx.scale(sweep < 0 ? -1 : 1, 1);
      ctx.rotate(-0.03 + Math.abs(sweep) * -0.14);
      const bg = ctx.createLinearGradient(0, 0, w * 0.55, 0);
      bg.addColorStop(0, "rgba(255,240,190,0.3)");
      bg.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.55, -w * 0.035);
      ctx.lineTo(w * 0.55, w * 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,240,190,0.9)";
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();

      // lluvia
      ctx.strokeStyle = "rgba(170,195,220,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of drops) {
        const y = ((d.y + t * d.speed * 0.5) % 1);
        const x = ((d.x + t * 0.05) % 1);
        ctx.moveTo(x * w, y * h);
        ctx.lineTo(x * w - w * 0.004, y * h + d.len * h);
      }
      ctx.stroke();

      // relámpago
      if (!bolt.active && t > bolt.next) {
        bolt.active = true;
        bolt.start = t;
        bolt.pts = [];
        let px = (0.1 + rand2() * 0.8) * w;
        let py = 0.05 * h;
        bolt.pts.push([px, py]);
        while (py < seaY) {
          px += (rand2() - 0.5) * w * 0.06;
          py += (0.04 + rand2() * 0.08) * h;
          bolt.pts.push([px, py]);
        }
      }
      if (bolt.active) {
        const dt = t - bolt.start;
        if (dt > 0.35) {
          bolt.active = false;
          bolt.next = t + 2.5 + rand2() * 5;
        } else {
          const fade = 1 - dt / 0.35;
          ctx.fillStyle = `rgba(200,215,255,${(0.16 * fade).toFixed(3)})`;
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = `rgba(235,242,255,${(0.9 * fade).toFixed(3)})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(bolt.pts[0][0], bolt.pts[0][1]);
          for (const [qx, qy] of bolt.pts) ctx.lineTo(qx, qy);
          ctx.stroke();
        }
      }
      vignette(ctx, w, h, 0.4);
    },
  };
}

/* ══════════ ESTACIÓN CERO ══════════ */
function makeCero(seed) {
  const rand = mulberry32(seed);
  const flakes = [];
  for (let i = 0; i < 150; i++) {
    flakes.push({
      x: rand(), y: rand(),
      fall: 0.008 + rand() * 0.02, drift: 0.004 + rand() * 0.012,
      size: 0.8 + rand() * 1.6, phase: rand() * Math.PI * 2,
    });
  }
  const beaconX = 0.5 + (rand() - 0.5) * 0.5;

  return {
    init() {},
    draw(ctx, w, h, t) {
      skyGradient(ctx, w, h, [[0, "#04050a"], [0.68, "#090b12"], [1, "#0c0f16"]]);

      const horizon = 0.68 * h;

      // baliza solitaria con pulso lento
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
      const bx = beaconX * w;
      const glow = ctx.createRadialGradient(bx, horizon, 0, bx, horizon, 90 + pulse * 60);
      glow.addColorStop(0, `rgba(255,182,56,${(0.4 + pulse * 0.3).toFixed(3)})`);
      glow.addColorStop(0.25, `rgba(255,182,56,${(0.1 + pulse * 0.08).toFixed(3)})`);
      glow.addColorStop(1, "rgba(255,182,56,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(bx - 160, horizon - 160, 320, 320);
      ctx.fillStyle = `rgba(255,210,120,${(0.7 + pulse * 0.3).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(bx, horizon, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // reflejo tenue bajo el horizonte
      ctx.save();
      ctx.translate(bx, horizon + h * 0.055);
      ctx.scale(1, 4.2);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.016);
      rg.addColorStop(0, `rgba(255,182,56,${(0.09 * pulse + 0.03).toFixed(3)})`);
      rg.addColorStop(1, "rgba(255,182,56,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(-h * 0.02, -h * 0.02, h * 0.04, h * 0.04);
      ctx.restore();

      // línea de horizonte
      ctx.strokeStyle = "#252c3a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      // nieve lentísima
      for (const f of flakes) {
        const y = ((f.y + t * f.fall) % 1.05) - 0.02;
        const x = ((f.x + Math.sin(t * 0.4 + f.phase) * f.drift) % 1);
        const a = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.9 + f.phase));
        ctx.fillStyle = `rgba(225,232,240,${a.toFixed(3)})`;
        ctx.fillRect(x * w, y * h, f.size, f.size);
      }
      vignette(ctx, w, h, 0.55);
    },
  };
}

export const SCENES = {
  aurora: makeAurora,
  niebla: makeNiebla,
  dunas: makeDunas,
  nebulosa: makeNebulosa,
  ciudad: makeCiudad,
  jardin: makeJardin,
  volta: makeVolta,
  cero: makeCero,
};
