import { describe, expect, it } from "vitest";
// @ts-expect-error módulo JS puro compartido con los scripts
import { scoreThread, rank, pickTemplate, formatDigest } from "../../../scripts/radar-core.mjs";

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
