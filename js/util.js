// ── utilidades compartidas: azar con semilla, ruido y sonido ──

export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ruido de valor 1D suave; devuelve una función x → [0,1)
export function makeNoise1D(rand) {
  const g = new Float32Array(512);
  for (let i = 0; i < 512; i++) g[i] = rand();
  return function (x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = g[i & 511];
    const b = g[(i + 1) & 511];
    return a + (b - a) * u;
  };
}

// ruido fractal (2-3 octavas) a partir de un ruido base
export function fbm(noise, x, octaves = 3) {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    v += noise(x * freq) * amp;
    freq *= 2.1;
    amp *= 0.5;
  }
  return v;
}

export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

export function seedLabel(rand) {
  const chars = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(rand() * 16)];
  return s;
}

// ── megafonía sonora: campanillas sintetizadas, sin ficheros ──

let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(ac, freq, start, dur, gainPeak) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// "bing-bong" de aeropuerto al seleccionar vuelo
export function chimeBoarding() {
  try {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime;
    tone(ac, 784, t, 0.5, 0.06);        // sol5
    tone(ac, 659.25, t + 0.28, 0.7, 0.05); // mi5
  } catch (_) { /* sin audio, sin drama */ }
}

// clic breve para acciones menores
export function clickTick() {
  try {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime;
    tone(ac, 1180, t, 0.09, 0.03);
  } catch (_) { /* silencio */ }
}
