// Avisa a los buscadores de que hay páginas nuevas o cambiadas, vía IndexNow
// (Bing, Yandex, Seznam, Naver; Google no participa y va por su cuenta).
//
// Por qué existe este archivo: la clave de verificación llevaba desde el 06/08
// publicada en `public/`, pero **nunca hubo nada que hiciera la llamada**. Es
// decir, teníamos la mitad del mecanismo —la que no sirve de nada sola— y
// ninguna página nueva se había notificado jamás. Se descubrió auditando el
// SEO, no por un fallo: un trozo de infraestructura que no hace nada no
// avisa de que no hace nada.
//
// Uso:  node scripts/indexnow.mjs [url ...]
// Sin argumentos envía todas las URL del sitemap.

import { readFileSync } from "node:fs";

const KEY = "53290f5cdcc787900654633e0e843362";
const HOST = "gate32.autoritasai.com";
const SITEMAP = new URL("../public/sitemap.xml", import.meta.url);

/** URLs del sitemap, que es la lista que ya mantenemos a mano. */
export function urlsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const urlList = process.argv.slice(2);
  const list = urlList.length ? urlList : urlsFromSitemap(readFileSync(SITEMAP, "utf8"));

  if (list.length === 0) {
    console.error("Sin URLs que enviar.");
    process.exit(1);
  }
  // Todas tienen que ser del mismo host o IndexNow rechaza el lote entero.
  const ajenas = list.filter((u) => !u.startsWith(`https://${HOST}/`));
  if (ajenas.length) {
    console.error(`URLs de otro host, no se envía nada: ${ajenas.join(", ")}`);
    process.exit(1);
  }

  console.log(`Enviando ${list.length} URL a IndexNow:`);
  for (const u of list) console.log(`  ${u}`);

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: list,
    }),
  });

  // 200 y 202 son las dos respuestas buenas: aceptado y aceptado-en-cola.
  if (res.ok) {
    console.log(`IndexNow respondió ${res.status}.`);
  } else {
    // Nada de tragarse el error: si el aviso no sale, que se vea. El radar ya
    // nos enseñó lo que cuesta un fallo silencioso en verde.
    console.error(`IndexNow respondió ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
}
