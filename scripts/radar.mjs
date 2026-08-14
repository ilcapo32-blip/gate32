// Radar de Reddit: busca conversaciones donde Gate32 sería una respuesta útil
// y deja un resumen. No publica nada en Reddit.
//
// Usa los **feeds RSS públicos** de Reddit, que no piden registro de
// aplicación, ni aceptar políticas de desarrollador, ni guardar secretos en
// ningún sitio. La versión anterior usaba la API con OAuth y se quedó bloqueada
// en el formulario de alta: una herramienta interna que depende de un trámite
// no es una herramienta, es una intención.
//
// Lo que se pierde respecto a la API: el número de comentarios de cada hilo y
// las normas del subreddit. La puntuación ya trata el primero como desconocido;
// el aviso de autopromoción se pide aparte al endpoint público de reglas.
//
// Uso local:  node scripts/radar.mjs
// En CI:      .github/workflows/radar.yml

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  QUERIES,
  COMPETITORS,
  rank,
  formatDigest,
  newComments,
  nextSeen,
  formatReplies,
  formatMentions,
  promoRisk,
  parseAtom,
} from "./radar-core.mjs";

const SEEN_FILE = new URL("../.radar-seen.json", import.meta.url);
const OUT_FILE = new URL("../.radar-digest.md", import.meta.url);
const ACCOUNT = process.env["REDDIT_ACCOUNT"] ?? "HpartidaB";
// Reddit rechaza los agentes genéricos: uno descriptivo y con contacto es lo
// que pide su propia documentación.
const USER_AGENT = `web:gate32-radar:2.0 (by /u/${ACCOUNT})`;

// Reddit puede bloquear las IP de los centros de datos. Si eso pasa, el radar
// no encontraría nada y el resumen diría "sin hilos": exactamente el error de
// leer una ausencia de datos como un dato. Se cuentan los intentos para poder
// distinguir "no hay nada" de "no hemos podido mirar".
let attempts = 0;
let failures = 0;

// Cortacircuitos. El 14/08/2026 la IP del ejecutor venía ya limitada: la
// primera petición dio 403 y las quince siguientes 429, una detrás de otra.
// Cuando eso pasa, reintentar durante veinte minutos produce exactamente el
// mismo informe que rendirse en uno. Se abandona pronto y se dice por qué.
const GIVE_UP_AFTER = 5;
let streak = 0;
const givenUp = () => streak >= GIVE_UP_AFTER;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Descarga un recurso de Reddit, devolviendo null en vez de reventar.
 *
 * Un 429 desde un centro de datos no es un "no" definitivo: la IP del ejecutor
 * es compartida y la cuota se recupera sola. Por eso se reintenta con espera
 * creciente, respetando `Retry-After` si Reddit lo manda.
 */
async function fetchText(url, tries = 3) {
  attempts++;
  if (givenUp()) {
    failures++;
    return null;
  }
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        streak = 0;
        return await res.text();
      }
      const retriable = res.status === 429 || res.status >= 500;
      const last = !retriable || i === tries - 1;
      console.warn(`${url} → ${res.status}${last ? "" : " (reintento)"}`);
      if (last) break;
      const after = Number(res.headers.get("retry-after"));
      await sleep(after > 0 ? Math.min(after, 60) * 1000 : 10000 * 2 ** i);
    } catch (err) {
      console.warn(`${url} → ${String(err)}`);
      if (i === tries - 1) break;
      await sleep(10000 * 2 ** i);
    }
  }
  failures++;
  streak++;
  if (givenUp()) console.warn(`${GIVE_UP_AFTER} fallos seguidos: la IP está limitada, se abandona.`);
  return null;
}

/** Pausa entre peticiones: los feeds públicos también tienen límites. */
const pause = () => sleep(4000);

async function search(query) {
  const url = new URL("https://www.reddit.com/search.rss");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", "week");
  url.searchParams.set("type", "link");
  const xml = await fetchText(url);
  return xml ? parseAtom(xml) : [];
}

/**
 * Respuestas nuevas en los hilos propios. Se descubren desde el feed público
 * del perfil, sin credenciales de la cuenta.
 */
async function repliesToOwnThreads(seen) {
  const xml = await fetchText(`https://www.reddit.com/user/${ACCOUNT}/submitted.rss?limit=15`);
  if (!xml) return [];
  const posts = parseAtom(xml);
  const out = [];
  for (const post of posts) {
    const days = post.created_utc ? (Date.now() / 1000 - post.created_utc) / 86400 : 999;
    if (days > 21) continue;
    await pause();
    const thread = await fetchText(`https://www.reddit.com${post.permalink}.rss?sort=new&limit=50`);
    if (!thread) continue;
    // La primera entrada del feed de un hilo es el propio post.
    const comments = parseAtom(thread)
      .slice(1)
      .map((c) => ({ ...c, body: c.selftext, author: (c.author ?? "").replace(/^\/u\//, "") }));
    for (const c of newComments(comments, seen, ACCOUNT)) {
      out.push({ ...c, threadTitle: post.title });
    }
  }
  return out;
}

/** Normas del subreddit, para avisar de la autopromoción antes de responder. */
async function subredditRules(sub) {
  const raw = await fetchText(`https://www.reddit.com/r/${sub}/about/rules.json`);
  if (!raw) return null;
  try {
    return promoRisk(JSON.parse(raw).rules ?? []);
  } catch {
    return null;
  }
}

const seen = existsSync(SEEN_FILE) ? JSON.parse(readFileSync(SEEN_FILE, "utf8")) : [];

// 1 · Lo urgente: gente esperando respuesta en hilos propios.
const replies = await repliesToOwnThreads(seen);

// 2 · Menciones de la marca.
await pause();
const mentions = (await search("gate32")).filter((m) => !seen.includes(m.id));

// 3 · Hilos nuevos donde tendría sentido aparecer, competidores incluidos.
const found = [];
for (const query of [...QUERIES.map((q) => q.q), ...COMPETITORS]) {
  if (givenUp()) break;
  await pause();
  found.push(...(await search(query)));
}
const items = rank(found, seen);

// Normas de cada subreddit implicado, una sola vez por subreddit.
const rulesCache = new Map();
for (const item of items.slice(0, 10)) {
  if (!item.subreddit) continue;
  if (!rulesCache.has(item.subreddit)) {
    await pause();
    rulesCache.set(item.subreddit, await subredditRules(item.subreddit));
  }
  item.promoRules = rulesCache.get(item.subreddit);
}

// Si Reddit ha rechazado casi todo, se avisa en vez de callar: un silencio
// indistinguible de "no hay nada" es peor que un error.
const blocked = attempts > 0 && failures / attempts > 0.8;
const digest = blocked
  ? `## El radar no ha podido consultar Reddit\n\nReddit rechazó ${failures} de ${attempts} peticiones (429 = cuota agotada para esta IP), incluso reintentando con esperas crecientes. Es el límite de las IP compartidas de GitHub Actions, no un problema del código.\n\n**Esto no significa que no haya hilos: significa que no hemos podido mirar.** Mientras dure, la forma fiable es ejecutarlo desde tu propio equipo, donde la IP es doméstica y Reddit no la limita:\n\n\`\`\`bash\ngit clone https://github.com/ilcapo32-blip/gate32 && cd gate32\nnode scripts/radar.mjs\n\`\`\`\n\nEl resumen sale por pantalla. Si esto se repite varios días seguidos, la alternativa es volver a la API con credenciales.`
  : [formatReplies(replies), formatMentions(mentions), formatDigest(items)]
      .filter(Boolean)
      .join("\n");
const worthReporting = blocked || replies.length > 0 || mentions.length > 0 || items.length > 0;
writeFileSync(OUT_FILE, worthReporting ? digest : "");
console.log(digest);

// Solo se olvida lo que se ha llegado a contar (ver `nextSeen`). En CI el
// aviso es la issue, así que el flujo de trabajo solo hace commit de este
// archivo cuando la issue se ha creado de verdad; en local el aviso es esta
// misma salida por pantalla.
const updated = nextSeen(seen, {
  blocked,
  ids: [...items.map((i) => i.id), ...replies.map((r) => r.id), ...mentions.map((m) => m.id)],
});
writeFileSync(SEEN_FILE, JSON.stringify(updated, null, 0));
