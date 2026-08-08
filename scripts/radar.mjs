// Radar de Reddit: busca conversaciones donde Gate32 sería una respuesta útil
// y deja un resumen. No publica nada en Reddit.
//
// Uso local:  REDDIT_CLIENT_ID=... REDDIT_CLIENT_SECRET=... node scripts/radar.mjs
// En CI:      .github/workflows/radar.yml (cada 6 h)
//
// Las credenciales llegan por variables de entorno y nunca se escriben en el
// repositorio. Sin credenciales el script no falla: avisa y sale con 0, para
// que el workflow no dé la lata con correos de error.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  QUERIES,
  COMPETITORS,
  rank,
  formatDigest,
  newComments,
  formatReplies,
  formatMentions,
  promoRisk,
} from "./radar-core.mjs";

const SEEN_FILE = new URL("../.radar-seen.json", import.meta.url);
const OUT_FILE = new URL("../.radar-digest.md", import.meta.url);
// La cuenta cuyos hilos se vigilan. Es pública: no es un secreto.
const ACCOUNT = process.env["REDDIT_ACCOUNT"] ?? "HpartidaB";
const USER_AGENT = `web:gate32-radar:1.0 (by /u/${ACCOUNT})`;

const id = process.env["REDDIT_CLIENT_ID"];
const secret = process.env["REDDIT_CLIENT_SECRET"];

if (!id || !secret) {
  console.log("Sin REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET: no se busca nada.");
  writeFileSync(OUT_FILE, "");
  process.exit(0);
}

async function token() {
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Reddit no devolvió token: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function search(access, { q, sort }) {
  const url = new URL("https://oauth.reddit.com/search");
  url.searchParams.set("q", q);
  url.searchParams.set("sort", sort);
  url.searchParams.set("limit", "25");
  url.searchParams.set("t", "week");
  url.searchParams.set("type", "link");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access}`, "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    console.warn(`Búsqueda "${q}" falló: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return (data?.data?.children ?? []).map((c) => c.data).filter(Boolean);
}

async function get(access, path, params = {}) {
  const url = new URL(path, "https://oauth.reddit.com");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access}`, "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    console.warn(`${path} devolvió ${res.status}`);
    return null;
  }
  return res.json();
}

/**
 * Respuestas nuevas en los hilos que ha abierto la cuenta. Se descubren solos
 * a partir del perfil público: no hay que mantener ninguna lista a mano, y no
 * hacen falta las credenciales de la cuenta, solo las de la aplicación.
 */
async function repliesToOwnThreads(access, seen) {
  const submitted = await get(access, `/user/${ACCOUNT}/submitted`, { limit: 15, sort: "new" });
  const posts = (submitted?.data?.children ?? []).map((c) => c.data).filter(Boolean);
  const out = [];
  for (const post of posts) {
    // Los hilos muy viejos ya no reciben nada: no gastamos peticiones en ellos.
    const days = (Date.now() / 1000 - (post.created_utc ?? 0)) / 86400;
    if (days > 21) continue;
    const thread = await get(access, `${post.permalink}`, { limit: 50, sort: "new" });
    const listing = Array.isArray(thread) ? thread[1] : null;
    const comments = (listing?.data?.children ?? [])
      .map((c) => c.data)
      .filter((c) => c && c.body);
    for (const c of newComments(comments, seen, ACCOUNT)) {
      out.push({ ...c, threadTitle: post.title });
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return out;
}

const seen = existsSync(SEEN_FILE) ? JSON.parse(readFileSync(SEEN_FILE, "utf8")) : [];

let access;
try {
  access = await token();
} catch (err) {
  console.error(String(err));
  writeFileSync(OUT_FILE, "");
  process.exit(0);
}

// 1 · Lo urgente: gente esperando respuesta en hilos propios.
const replies = await repliesToOwnThreads(access, seen);

// 2 · Menciones de la marca en cualquier parte.
const mentions = (await search(access, { q: "gate32", sort: "new" })).filter(
  (m) => !seen.includes(m.id),
);
await new Promise((r) => setTimeout(r, 1200));

// 3 · Hilos nuevos donde tendría sentido aparecer, incluyendo a quien está
// comparando competidores: ahí la persona ya está eligiendo.
const found = [];
for (const query of [...QUERIES, ...COMPETITORS.map((q) => ({ q, sort: "new" }))]) {
  found.push(...(await search(access, query)));
  // El plan gratuito de Reddit permite 100 peticiones por minuto: sobra, pero
  // no hay razón para ir al límite.
  await new Promise((r) => setTimeout(r, 1200));
}
const items = rank(found, seen);

// Normas de cada subreddit implicado: saber si restringe la autopromoción
// **antes** de responder, no después de que te avise un moderador.
const rulesCache = new Map();
for (const item of items.slice(0, 10)) {
  const sub = item.subreddit;
  if (!sub) continue;
  if (!rulesCache.has(sub)) {
    const data = await get(access, `/r/${sub}/about/rules`);
    rulesCache.set(sub, promoRisk(data?.rules ?? []));
    await new Promise((r) => setTimeout(r, 1200));
  }
  item.promoRules = rulesCache.get(sub);
}

const digest = [formatReplies(replies), formatMentions(mentions), formatDigest(items)]
  .filter(Boolean)
  .join("\n");
const worthReporting = replies.length > 0 || mentions.length > 0 || items.length > 0;
writeFileSync(OUT_FILE, worthReporting ? digest : "");
console.log(digest);

// La memoria se recorta para que el fichero no crezca sin fin.
const updated = [
  ...seen,
  ...items.map((i) => i.id),
  ...replies.map((r) => r.id),
  ...mentions.map((m) => m.id),
].slice(-1500);
writeFileSync(SEEN_FILE, JSON.stringify(updated, null, 0));
