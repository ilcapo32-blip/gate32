import { describe, expect, it } from "vitest";
// @ts-expect-error módulo JS puro compartido con los scripts
import {
  scoreThread,
  rank,
  pickTemplate,
  formatDigest,
  newComments,
  formatReplies,
  promoRisk,
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
    expect(rank(threads).map((t: { id: string }) => t.id)).toEqual(["a"]);
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
    const flagged = rank(threads).map((t: object) => ({ ...t, promoRules: ["No self-promotion"] }));
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
    expect(out.map((c: { id: string }) => c.id)).toEqual(["c1"]);
  });

  it("no repite lo ya reportado", () => {
    expect(newComments(comments, ["c1"], "HpartidaB")).toHaveLength(0);
  });

  it("las respuestas pendientes van antes que nada en el resumen", () => {
    const out = newComments(comments, [], "HpartidaB").map((c: object) => ({
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
