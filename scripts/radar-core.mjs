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
 * Señales que hacen que un hilo merezca respuesta. El peso alto va a la
 * intención (alguien pide ayuda), no al tema: un hilo de noticias sobre
 * transcripción no necesita nuestra respuesta.
 */
const SIGNALS = [
  { re: /\b(recommend|suggestion|looking for|any tool|what do you use|alternativa|recomend|qué uso|que uso)\b/i, weight: 30, tag: "pregunta" },
  { re: /\b(privacy|private|confidential|sensitive|hipaa|gdpr|privacidad|confidencial)\b/i, weight: 25, tag: "privacidad" },
  { re: /\b(free|gratis|cheap|budget|paywall|limit|límite|limite)\b/i, weight: 20, tag: "coste" },
  { re: /\b(subtitle|caption|srt|vtt|subtítulo|subtitulo)\b/i, weight: 18, tag: "subtítulos" },
  { re: /\b(install|python|cuda|terminal|command line|instalar)\b/i, weight: 15, tag: "fricción" },
  { re: /\b(interview|podcast|lecture|meeting|entrevista|clase|reunión|reunion)\b/i, weight: 10, tag: "caso de uso" },
];

/** Restas: cosas que hacen que responder sea mala idea. */
const PENALTIES = [
  { re: /\b(hiring|for hire|job|freelance|se busca|contrato)\b/i, weight: -40, tag: "oferta de empleo" },
  { re: /\b(i built|i made|my app|check out my|he creado|mi herramienta)\b/i, weight: -25, tag: "promo ajena" },
];

/**
 * Puntúa un hilo. Devuelve la puntuación y las etiquetas que la explican, para
 * que el resumen diga *por qué* aparece cada hilo y no solo que aparece.
 */
export function scoreThread(thread) {
  const text = `${thread.title ?? ""}\n${thread.selftext ?? ""}`;
  let score = 0;
  const tags = [];
  for (const s of [...SIGNALS, ...PENALTIES]) {
    if (s.re.test(text)) {
      score += s.weight;
      tags.push(s.tag);
    }
  }
  // Un hilo con muchas respuestas ya está resuelto y la nuestra queda enterrada.
  const comments = thread.num_comments ?? 0;
  if (comments > 40) score -= 25;
  else if (comments < 8) score += 10;

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
      "",
    );
    const body = (it.selftext ?? "").trim().replace(/\s+/g, " ");
    if (body) lines.push(`> ${body.slice(0, 280)}${body.length > 280 ? "…" : ""}`, "");
  }
  lines.push("---", "_Radar de Gate32. No publica nada: solo busca._");
  return lines.join("\n");
}
