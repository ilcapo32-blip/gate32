import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { urlsFromSitemap } from "../../../scripts/indexnow.mjs";
// Núcleo JS puro compartido con los scripts (tipado en radar-core.d.ts).
import {
  scoreThread,
  rank,
  pickTemplate,
  formatDigest,
  newComments,
  nextSeen,
  formatReplies,
  promoRisk,
  parseAtom,
} from "../../../scripts/radar-core.mjs";

const hoursAgo = (h: number) => Date.now() / 1000 - h * 3600;

describe("radar · puntuación", () => {
  it("premia a quien pide ayuda con audio confidencial", () => {
    const r = scoreThread({
      title: "Looking for a transcription tool for confidential interviews",
      selftext: "I can't upload these to the cloud, any recommendation?",
      num_comments: 3,
      created_utc: hoursAgo(2),
    });
    expect(r.score).toBeGreaterThan(60);
    expect(r.tags).toContain("privacidad");
    expect(r.tags).toContain("pregunta");
  });

  it("penaliza las ofertas de empleo aunque hablen de transcripción", () => {
    const job = scoreThread({
      title: "Hiring freelance transcription help for podcast",
      selftext: "Paid job, 5 hours weekly",
      num_comments: 2,
      created_utc: hoursAgo(1),
    });
    expect(job.tags).toContain("oferta de empleo");
    expect(job.score).toBeLessThan(45);
  });

  it("premia a quien está comparando herramientas", () => {
    const r = scoreThread({
      title: "Otter vs Descript for interview transcription?",
      selftext: "Trying to decide, the free tier limits are killing me",
      num_comments: 4,
      created_utc: hoursAgo(2),
    });
    expect(r.tags).toContain("comparando");
    expect(r.score).toBeGreaterThan(60);
  });

  it("se aparta de quien solo se está desahogando", () => {
    const rant = scoreThread({
      title: "Rant: I hate that every transcription app wants my email",
      selftext: "Just venting, so frustrated with all of them",
      num_comments: 3,
      created_utc: hoursAgo(1),
    });
    expect(rant.tags).toContain("desahogo");
  });

  it("descarta la transcripción de manuscritos, que no es nuestro problema", () => {
    const r = scoreThread({
      title: "Best tool to transcribe handwritten archive documents?",
      selftext: "Gemini hallucinates words, is Transkribus worth it?",
      num_comments: 3,
      created_utc: hoursAgo(2),
    });
    expect(r.tags).toContain("no es audio");
    expect(r.score).toBeLessThan(0);
  });

  it("penaliza los hilos ya enterrados en respuestas", () => {
    const base = {
      title: "Best free transcription tool? Looking for recommendations",
      selftext: "privacy matters",
      created_utc: hoursAgo(3),
    };
    const quiet = scoreThread({ ...base, num_comments: 2 });
    const crowded = scoreThread({ ...base, num_comments: 120 });
    expect(quiet.score).toBeGreaterThan(crowded.score);
  });

  it("penaliza lo viejo frente a lo reciente", () => {
    const base = {
      title: "Any free tool to transcribe an interview?",
      selftext: "",
      num_comments: 3,
    };
    const fresh = scoreThread({ ...base, created_utc: hoursAgo(2) });
    const stale = scoreThread({ ...base, created_utc: hoursAgo(240) });
    expect(fresh.score).toBeGreaterThan(stale.score);
  });
});

describe("radar · selección", () => {
  const threads = [
    {
      id: "a",
      title: "Free tool to transcribe interviews without uploading?",
      selftext: "privacy is the issue",
      num_comments: 2,
      created_utc: hoursAgo(1),
      subreddit: "podcasting",
      permalink: "/r/podcasting/a",
    },
    {
      id: "b",
      title: "My cat is cute",
      selftext: "",
      num_comments: 1,
      created_utc: hoursAgo(1),
      subreddit: "cats",
      permalink: "/r/cats/b",
    },
  ];

  it("descarta lo irrelevante y lo ya visto", () => {
    expect(rank(threads).map((t) => t.id)).toEqual(["a"]);
    expect(rank(threads, ["a"])).toHaveLength(0);
  });

  it("avisa de las normas de autopromoción antes de responder", () => {
    const rules = [
      { short_name: "Be civil", description: "Respect others" },
      { short_name: "No self-promotion", description: "Promotional posts only in the weekly thread" },
    ];
    expect(promoRisk(rules)).toEqual(["No self-promotion"]);
    expect(promoRisk([{ short_name: "Be civil", description: "Respect others" }])).toBeNull();
  });

  it("el resumen incluye el aviso de normas y un enlace medible", () => {
    const flagged = rank(threads).map((t) => ({ ...t, promoRules: ["No self-promotion"] }));
    const digest = formatDigest(flagged);
    expect(digest).toContain("restringe la autopromoción");
    expect(digest).toContain("?ref=r_podcasting");
  });

  it("sugiere plantilla según la señal dominante", () => {
    expect(pickTemplate(["coste", "privacidad"])).toContain("R2");
    expect(pickTemplate(["subtítulos"])).toContain("R3");
    expect(pickTemplate([])).toBeNull();
  });

  it("el resumen enlaza el hilo y recuerda que responde una persona", () => {
    const digest = formatDigest(rank(threads));
    expect(digest).toContain("https://reddit.com/r/podcasting/a");
    expect(digest).toContain("tus palabras");
    expect(formatDigest([])).toContain("Sin hilos");
  });
});

describe("radar · respuestas en hilos propios", () => {
  const comments = [
    { id: "c1", author: "MindFlayYourLunch", body: "Probé con un vídeo de 12 min", created_utc: hoursAgo(2) },
    { id: "c2", author: "HpartidaB", body: "Gracias por probarlo", created_utc: hoursAgo(1) },
    { id: "c3", author: "AutoModerator", body: "Recuerda las normas del sub", created_utc: hoursAgo(3) },
  ];

  it("ignora los comentarios propios y los del moderador automático", () => {
    const out = newComments(comments, [], "HpartidaB");
    expect(out.map((c) => c.id)).toEqual(["c1"]);
  });

  it("no repite lo ya reportado", () => {
    expect(newComments(comments, ["c1"], "HpartidaB")).toHaveLength(0);
  });

  it("las respuestas pendientes van antes que nada en el resumen", () => {
    const out = newComments(comments, [], "HpartidaB").map((c) => ({
      ...c,
      permalink: "/r/podcasting/a/c1",
      threadTitle: "Hice un transcriptor",
    }));
    const text = formatReplies(out);
    expect(text).toContain("u/MindFlayYourLunch");
    expect(text).toContain("lleva esperando");
    expect(formatReplies([])).toBe("");
  });

  it("las respuestas encabezan el resumen completo", () => {
    const replies = formatReplies([
      { id: "c1", author: "MindFlayYourLunch", body: "hola", created_utc: hoursAgo(2), permalink: "/r/x/c1" },
    ]);
    const full = [replies, formatDigest([])].join("\n");
    expect(full.indexOf("sin leer")).toBeLessThan(full.indexOf("Sin hilos"));
  });
});

describe("radar · feeds RSS de Reddit", () => {
  const feed = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <author><name>/u/Serious6Reason</name></author>
  <content type="html">&lt;p&gt;I&amp;#39;ve been using Rev but the per minute cost adds up&lt;/p&gt;</content>
  <id>t3_abc123</id>
  <link href="https://www.reddit.com/r/podcasting/comments/abc123/best_rev_alternatives/" />
  <updated>2026-08-11T10:00:00+00:00</updated>
  <title>Best Rev alternatives for transcribing podcasts?</title>
</entry>
</feed>`;

  it("extrae los campos que necesita la puntuación", () => {
    const [entry] = parseAtom(feed);
    expect(entry?.id).toBe("t3_abc123");
    expect(entry?.subreddit).toBe("podcasting");
    expect(entry?.permalink).toBe("/r/podcasting/comments/abc123/best_rev_alternatives/");
    expect(entry?.author).toBe("/u/Serious6Reason");
    expect(typeof entry?.created_utc).toBe("number");
  });

  it("descodifica el HTML escapado dos veces del cuerpo", () => {
    const [entry] = parseAtom(feed);
    expect(entry?.selftext).toBe("I've been using Rev but the per minute cost adds up");
    expect(entry?.selftext).not.toContain("<p>");
    expect(entry?.selftext).not.toContain("&#39;");
  });

  it("un feed vacío no revienta", () => {
    expect(parseAtom("<feed></feed>")).toEqual([]);
    expect(parseAtom("")).toEqual([]);
  });

  it("sin número de comentarios no se inventa que el hilo esté tranquilo", () => {
    const base = {
      title: "Any free tool to transcribe an interview?",
      selftext: "",
      created_utc: hoursAgo(2),
    };
    const unknown = scoreThread(base);
    const quiet = scoreThread({ ...base, num_comments: 2 });
    expect(quiet.score).toBeGreaterThan(unknown.score);
  });
});

// El 13/08/2026 el radar encontró una respuesta real, la apuntó como vista y
// no la reportó: `gh issue create` había fallado por una etiqueta inexistente
// y un `|| true` se comió el error. Estos casos fijan la regla que faltaba.
describe("radar · solo se olvida lo que se ha contado", () => {
  it("recuerda lo reportado en una pasada normal", () => {
    expect(nextSeen(["t3_viejo"], { ids: ["t3_nuevo", "t1_abc"] })).toEqual([
      "t3_viejo",
      "t3_nuevo",
      "t1_abc",
    ]);
  });

  it("no recuerda nada si el aviso no ha salido", () => {
    expect(nextSeen(["t3_viejo"], { reported: false, ids: ["t1_respuesta"] })).toEqual([
      "t3_viejo",
    ]);
  });

  it("con Reddit bloqueado no da por visto lo poco que llegó", () => {
    // El resumen de una pasada bloqueada es el aviso de bloqueo: los hilos que
    // sí se descargaron no aparecen en él, así que no están contados.
    expect(nextSeen([], { blocked: true, ids: ["t3_a", "t3_b"] })).toEqual([]);
  });

  it("descarta ids vacíos en vez de guardar huecos", () => {
    expect(nextSeen([], { ids: ["t3_a", undefined, ""] })).toEqual(["t3_a"]);
  });

  it("no crece sin límite", () => {
    const muchos = Array.from({ length: 1600 }, (_, i) => `t3_${i}`);
    const out = nextSeen(muchos, { ids: ["t3_ultimo"] });
    expect(out.length).toBe(1500);
    expect(out.at(-1)).toBe("t3_ultimo");
  });
});

// El 14/08/2026 el radar reportó 36 hilos: entre los diez primeros había
// cirugía de miopía, un servidor de Minecraft y un tutorial de Clip Studio,
// con puntuaciones de 70 a 101. Reddit devuelve el feed general cuando una
// búsqueda no le cuadra, y las señales genéricas disparaban solas.
describe("radar · puerta temática", () => {
  const fuera = {
    id: "t3_prk",
    title: "PRK for high myopia -9.75 and -8.75",
    selftext:
      "I'm 32 and have been dependent on glasses. LASIK vs PRK, my private clinic said it was free of extra cost.",
    created_utc: hoursAgo(1),
  };

  it("descarta un hilo que no va de pasar voz a texto, dispare lo que dispare", () => {
    const r = scoreThread(fuera);
    expect(r.tags).toContain("fuera de tema");
    expect(r.score).toBeLessThan(0);
    expect(rank([fuera])).toHaveLength(0);
  });

  it("deja pasar lo que sí lo es", () => {
    for (const title of [
      "Best free transcription tool for interviews?",
      "Need SRT subtitles without a watermark",
      "Running Whisper locally is a pain, alternatives?",
      "Otter.ai free tier keeps cutting me off",
      "¿Alguna app para transcribir una entrevista gratis?",
    ]) {
      expect(scoreThread({ title, selftext: "", created_utc: hoursAgo(2) }).tags).not.toContain(
        "fuera de tema",
      );
    }
  });

  it("un hilo que llega por dos búsquedas aparece una sola vez", () => {
    const hilo = {
      id: "t3_dup",
      title: "Free tool to transcribe interviews without uploading?",
      selftext: "privacy is the issue",
      created_utc: hoursAgo(1),
    };
    expect(rank([hilo, { ...hilo }])).toHaveLength(1);
  });
});

// IndexNow llevaba desde el 06/08 con la clave publicada y sin nada que
// hiciera la llamada: media infraestructura, que es igual que ninguna.
describe("indexnow · lista de URLs", () => {
  it("saca las URLs del sitemap que ya mantenemos", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://gate32.autoritasai.com/</loc><priority>1.0</priority></url>
      <url><loc>https://gate32.autoritasai.com/reuniones/</loc></url>
    </urlset>`;
    expect(urlsFromSitemap(xml)).toEqual([
      "https://gate32.autoritasai.com/",
      "https://gate32.autoritasai.com/reuniones/",
    ]);
  });

  it("un sitemap vacío no inventa nada", () => {
    expect(urlsFromSitemap("<urlset></urlset>")).toEqual([]);
  });

  it("el sitemap real incluye la página de reuniones", () => {
    const real = readFileSync(new URL("../../../public/sitemap.xml", import.meta.url), "utf8");
    expect(urlsFromSitemap(real)).toContain("https://gate32.autoritasai.com/reuniones/");
  });
});
