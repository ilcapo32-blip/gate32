// Núcleo del radar de Reddit: todo lo que no toca la red vive aquí, para poder
// probarlo sin credenciales ni conexión.
//
// Qué hace y qué NO hace: encuentra conversaciones donde Gate32 sería una
// respuesta útil, las puntúa y sugiere qué plantilla encaja. **No publica
// nada.** Publicar automáticamente en Reddit viola las normas de la mayoría de
// subreddits (ya nos avisaron en r/podcasting), quema la cuenta y contradice lo
// que nos dijeron dos usuarios: que se nota cuando el texto no lo escribe una
// persona. El radar ahorra la búsqueda; la respuesta la escribe un humano.

/** Búsquedas que se lanzan contra Reddit, con el subreddit cuando conviene. */
export const QUERIES = [
  { q: "transcription tool free", sort: "new" },
  { q: "transcribe interview privacy", sort: "new" },
  { q: "otter alternative", sort: "new" },
  { q: "whisper local install", sort: "new" },
  { q: "srt subtitles free no watermark", sort: "new" },
  { q: "transcribe podcast episode", sort: "new" },
  { q: "transcribir audio gratis", sort: "new" },
  { q: "transcripción entrevista", sort: "new" },
];

/**
 * Competidores. Un hilo donde alguien compara o se queja de uno de estos es
 * más valioso que cualquier búsqueda genérica: la persona ya tiene el problema
 * identificado y está eligiendo. Idea tomada del "competitor monitoring" de
 * RedditMaster, que es de lo poco de ese producto que no depende de engañar a
 * nadie.
 */
export const COMPETITORS = [
  "otter.ai",
  "happyscribe",
  "notta ai",
  "descript transcription",
  "trint",
  "transcrisper",
];

/**
 * Señales que hacen que un hilo merezca respuesta. El peso alto va a la
 * intención (alguien pide ayuda), no al tema: un hilo de noticias sobre
 * transcripción no necesita nuestra respuesta.
 */
const SIGNALS = [
  { re: /\b(recommend|suggestion|looking for|any tool|what do you use|alternativa|recomend|qué uso|que uso)\b/i, weight: 30, tag: "pregunta" },
  // Alguien comparando herramientas ya está decidiendo: es el momento de más
  // valor de todo el embudo.
  { re: /\b(vs\.?|versus|alternative to|better than|switch from|migrar de|mejor que)\b/i, weight: 28, tag: "comparando" },
  { re: /\b(privacy|private|confidential|sensitive|hipaa|gdpr|privacidad|confidencial)\b/i, weight: 25, tag: "privacidad" },
  { re: /\b(free|gratis|cheap|budget|paywall|limit|límite|limite)\b/i, weight: 20, tag: "coste" },
  { re: /\b(subtitle|caption|srt|vtt|subtítulo|subtitulo)\b/i, weight: 18, tag: "subtítulos" },
  { re: /\b(install|python|cuda|terminal|command line|instalar)\b/i, weight: 15, tag: "fricción" },
  { re: /\b(interview|podcast|lecture|meeting|entrevista|clase|reunión|reunion)\b/i, weight: 10, tag: "caso de uso" },
];

/**
 * "Transcripción" también se dice de documentos manuscritos, y ahí no tenemos
 * nada que ofrecer: aparecer en esos hilos es exactamente el spam que evitamos.
 * Apareció un caso real en X (Historia Social, transcribiendo manuscritos con
 * Gemini) que a simple vista parecía nuestro y no lo era.
 */
const NOT_AUDIO = /\b(handwrit|manuscript|palaeograph|paleograph|OCR|Transkribus|manuscrito|paleograf|caligraf)/i;

/** Restas: cosas que hacen que responder sea mala idea. */
const PENALTIES = [
  { re: /\b(hiring|for hire|job|freelance|se busca|contrato)\b/i, weight: -40, tag: "oferta de empleo" },
  { re: /\b(i built|i made|my app|check out my|he creado|mi herramienta)\b/i, weight: -25, tag: "promo ajena" },
  // Quien se desahoga no busca una recomendación: responderle con una
  // herramienta es justo lo que hace que la gente odie el marketing en Reddit.
  { re: /\b(rant|venting|so frustrated|hate that|me da rabia|estoy harto)\b/i, weight: -30, tag: "desahogo" },
];

/** Palabras que en las normas de un subreddit anuncian problemas al promocionar. */
const PROMO_RULE = /(promot|advertis|self.?promo|spam|referral|marketing|publicidad|autopromo)/i;

/**
 * Detecta si un subreddit restringe la autopromoción, leyendo sus normas. El
 * aviso de r/podcasting llegó después de publicar; esto lo pone antes.
 */
export function promoRisk(rules = []) {
  const hits = rules
    .filter((r) => PROMO_RULE.test(`${r.short_name ?? ""} ${r.description ?? ""}`))
    .map((r) => (r.short_name ?? "").trim())
    .filter(Boolean);
  return hits.length ? hits.slice(0, 2) : null;
}

/**
 * Puntúa un hilo. Devuelve la puntuación y las etiquetas que la explican, para
 * que el resumen diga *por qué* aparece cada hilo y no solo que aparece.
 */
export function scoreThread(thread) {
  const text = `${thread.title ?? ""}\n${thread.selftext ?? ""}`;
  // Descarte duro: si va de texto manuscrito u OCR, no es nuestro problema por
  // mucho que aparezca la palabra "transcripción".
  if (NOT_AUDIO.test(text)) return { score: -100, tags: ["no es audio"], hours: 0 };
  let score = 0;
  const tags = [];
  for (const s of [...SIGNALS, ...PENALTIES]) {
    if (s.re.test(text)) {
      score += s.weight;
      tags.push(s.tag);
    }
  }
  // Un hilo con muchas respuestas ya está resuelto y la nuestra queda enterrada.
  // Los feeds RSS no traen el número de comentarios: sin el dato no se ajusta
  // nada, porque suponer "pocos" sería premiar hilos que no hemos mirado.
  const comments = thread.num_comments;
  if (typeof comments === "number") {
    if (comments > 40) score -= 25;
    else if (comments < 8) score += 10;
  }

  // Frescura: por debajo de un día es cuando responder rinde.
  const hours = thread.created_utc ? (Date.now() / 1000 - thread.created_utc) / 3600 : 999;
  if (hours < 12) score += 20;
  else if (hours < 36) score += 8;
  else if (hours > 120) score -= 20;

  return { score, tags: [...new Set(tags)], hours: Math.round(hours) };
}

/** Plantillas de X_CAMPAIGN.md, elegidas por la señal dominante del hilo. */
export const TEMPLATES = {
  coste: "R1 · se quejan del límite o del precio",
  privacidad: "R2 · audio sensible o privacidad",
  subtítulos: "R3 · piden subtítulos para vídeo",
  fricción: "R4 · Whisper local es un lío de instalar",
  "caso de uso": "R2 · audio sensible o privacidad",
  pregunta: "R1 · se quejan del límite o del precio",
};

export function pickTemplate(tags) {
  for (const key of ["privacidad", "fricción", "subtítulos", "coste", "pregunta", "caso de uso"]) {
    if (tags.includes(key)) return TEMPLATES[key];
  }
  return null;
}

/**
 * Filtra, puntúa y ordena. `seen` son ids ya reportados: un hilo se enseña una
 * vez y no vuelve a molestar.
 */
export function rank(threads, seen = [], minScore = 45) {
  const seenSet = new Set(seen);
  return threads
    .filter((t) => t.id && !seenSet.has(t.id))
    .map((t) => ({ ...t, ...scoreThread(t) }))
    .filter((t) => t.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

/**
 * Comentarios nuevos en hilos propios. Es la mitad del problema que el radar
 * de búsqueda no cubría: encontrar dónde empezar una conversación no sirve de
 * nada si las que ya tienes abiertas se quedan sin contestar un día entero.
 */
export function newComments(comments, seen = [], selfAuthor = "") {
  const seenSet = new Set(seen);
  const author = selfAuthor.toLowerCase();
  return comments
    .filter((c) => c.id && !seenSet.has(c.id))
    // Los comentarios propios vuelven en la misma consulta: no son respuestas.
    .filter((c) => (c.author ?? "").toLowerCase() !== author)
    .filter((c) => !(c.author ?? "").toLowerCase().includes("automoderator"))
    .sort((a, b) => (b.created_utc ?? 0) - (a.created_utc ?? 0));
}

/**
 * Qué se marca como visto tras una pasada.
 *
 * La regla es una sola y no admite matices: **solo se olvida lo que se ha
 * llegado a contar.** El 13/08/2026 el radar encontró una respuesta real en un
 * hilo propio, la apuntó como vista y no la reportó nunca —el `gh issue create`
 * había fallado por una etiqueta inexistente y un `|| true` se comió el error—.
 * Esa respuesta quedó invisible para siempre. Marcar como visto es una promesa
 * de haber avisado, así que aquí se rompe la promesa a propósito cuando no ha
 * habido aviso: se prefiere repetir un hilo a perder una conversación.
 *
 * Por eso, si Reddit bloqueó la pasada, no se recuerda nada: lo poco que llegó
 * no aparece en el resumen (que es el aviso de bloqueo), así que tampoco puede
 * darse por contado.
 */
export function nextSeen(seen, { blocked = false, reported = true, ids = [] } = {}) {
  if (blocked || !reported) return [...seen];
  return [...seen, ...ids.filter(Boolean)].slice(-1500);
}

/** Resumen de respuestas pendientes, lo primero que hay que leer del correo. */
export function formatReplies(items, now = new Date()) {
  if (items.length === 0) return "";
  const lines = [
    `## ${items.length} respuesta(s) sin leer en tus hilos`,
    "",
    "Esto va primero: alguien te está hablando y lleva esperando.",
    "",
  ];
  for (const c of items.slice(0, 15)) {
    const hours = c.created_utc ? Math.round((now.getTime() / 1000 - c.created_utc) / 3600) : 0;
    const body = (c.body ?? "").trim().replace(/\s+/g, " ");
    lines.push(
      `- **u/${c.author}** en [${c.threadTitle ?? "tu hilo"}](https://reddit.com${c.permalink}) · hace ${hours} h`,
      `  > ${body.slice(0, 320)}${body.length > 320 ? "…" : ""}`,
      "",
    );
  }
  return lines.join("\n");
}

/** Menciones sueltas de la marca, aunque no sea un hilo donde responder. */
export function formatMentions(items) {
  if (items.length === 0) return "";
  const lines = ["## Alguien ha mencionado Gate32", ""];
  for (const m of items.slice(0, 10)) {
    lines.push(`- [${m.title ?? m.body?.slice(0, 80)}](https://reddit.com${m.permalink}) · r/${m.subreddit}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** Resumen en Markdown, pensado para leerse en el móvil sin abrir nada más. */
export function formatDigest(items, now = new Date()) {
  if (items.length === 0) {
    return `Sin hilos que merezcan respuesta en esta pasada (${now.toISOString().slice(0, 16).replace("T", " ")} UTC).`;
  }
  const lines = [
    `**${items.length} hilo(s)** donde responder tendría sentido · ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    "Responde con tus palabras. La plantilla es un punto de partida, no un texto para pegar.",
    "",
  ];
  for (const it of items.slice(0, 10)) {
    const template = pickTemplate(it.tags);
    lines.push(
      `### [${it.title}](https://reddit.com${it.permalink})`,
      `r/${it.subreddit} · ${it.num_comments ?? 0} respuestas · hace ${it.hours} h · puntuación ${it.score}`,
      `Señales: ${it.tags.join(", ") || "—"}`,
      template ? `Plantilla sugerida: **${template}** (ver X_CAMPAIGN.md)` : "Sin plantilla clara: responde a lo que pregunten y ya está.",
      // Un enlace por subreddit permite saber después qué comunidad convierte,
      // que es lo único que dice dónde vale la pena volver.
      `Si acabas enlazando: \`gate32.autoritasai.com/?ref=r_${it.subreddit}\``,
    );
    if (it.promoRules) {
      lines.push(
        `> ⚠️ **r/${it.subreddit} restringe la autopromoción** (${it.promoRules.join(", ")}). Responde sin enlace, o léete las normas antes.`,
      );
    }
    lines.push("");
    const body = (it.selftext ?? "").trim().replace(/\s+/g, " ");
    if (body) lines.push(`> ${body.slice(0, 280)}${body.length > 280 ? "…" : ""}`, "");
  }
  lines.push("---", "_Radar de Gate32. No publica nada: solo busca._");
  return lines.join("\n");
}

/**
 * Extrae entradas de un feed Atom de Reddit. Se escribe a mano en vez de
 * añadir una dependencia de XML: el formato que sirve Reddit es fijo y solo
 * hacen falta cinco campos.
 *
 * Usar RSS en vez de la API elimina el registro de aplicación, la aceptación
 * de políticas y los secretos en el repositorio. A cambio no viene el número
 * de comentarios, que la puntuación ya sabe tratar como desconocido.
 */
export function parseAtom(xml) {
  const out = [];
  const entries = String(xml).split("<entry>").slice(1);
  for (const raw of entries) {
    const body = raw.split("</entry>")[0] ?? "";
    const pick = (tag) => {
      const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m?.[1]?.trim() ?? "";
    };
    const href = body.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "";
    const id = pick("id").replace(/^.*[/:]/, "") || href;
    const permalink = href.replace(/^https?:\/\/(www\.)?reddit\.com/, "").split("?")[0] ?? "";
    const subreddit = permalink.match(/^\/r\/([^/]+)/)?.[1] ?? "";
    const updated = pick("updated") || pick("published");
    out.push({
      id,
      title: decodeEntities(pick("title")),
      // El cuerpo viene con el HTML escapado dentro del XML: hay que
      // descodificar, quitar etiquetas y volver a descodificar lo que quedaba
      // escapado dos veces (&amp;#39; → &#39; → ').
      selftext: decodeEntities(stripTags(decodeEntities(pick("content")))),
      author: decodeEntities(pick("name")),
      permalink,
      subreddit,
      created_utc: updated ? Date.parse(updated) / 1000 : undefined,
    });
  }
  return out;
}

function stripTags(html) {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text) {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
