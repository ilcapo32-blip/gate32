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
import { QUERIES, rank, formatDigest } from "./radar-core.mjs";

const SEEN_FILE = new URL("../.radar-seen.json", import.meta.url);
const OUT_FILE = new URL("../.radar-digest.md", import.meta.url);
const USER_AGENT = "web:gate32-radar:1.0 (by /u/HpartidaB)";

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

const seen = existsSync(SEEN_FILE) ? JSON.parse(readFileSync(SEEN_FILE, "utf8")) : [];

let access;
try {
  access = await token();
} catch (err) {
  console.error(String(err));
  writeFileSync(OUT_FILE, "");
  process.exit(0);
}

const found = [];
for (const query of QUERIES) {
  found.push(...(await search(access, query)));
  // El plan gratuito de Reddit permite 100 peticiones por minuto: sobra, pero
  // no hay razón para ir al límite.
  await new Promise((r) => setTimeout(r, 1200));
}

const items = rank(found, seen);
const digest = formatDigest(items);
writeFileSync(OUT_FILE, items.length ? digest : "");
console.log(digest);

// La memoria se recorta para que el fichero no crezca sin fin.
const updated = [...seen, ...items.map((i) => i.id)].slice(-800);
writeFileSync(SEEN_FILE, JSON.stringify(updated, null, 0));
