// Tipos del núcleo del radar. El script es JS puro (corre en Node sin compilar)
// pero las pruebas son TypeScript, así que la superficie pública se declara aquí.

export interface RedditThread {
  id?: string;
  title?: string;
  selftext?: string;
  /** Autor del hilo, tal y como lo da el feed: "/u/nombre". */
  author?: string;
  /** Los feeds RSS no lo aportan: `undefined` significa "no se sabe". */
  num_comments?: number;
  created_utc?: number;
  subreddit?: string;
  permalink?: string;
  promoRules?: string[] | null;
}

export interface RedditComment {
  id?: string;
  author?: string;
  body?: string;
  created_utc?: number;
  permalink?: string;
  threadTitle?: string;
}

export interface ScoredThread extends RedditThread {
  score: number;
  tags: string[];
  hours: number;
}

export interface SubredditRule {
  short_name?: string;
  description?: string;
}

export const QUERIES: { q: string; sort: string }[];
export const COMPETITORS: string[];
export const TEMPLATES: Record<string, string>;

export function scoreThread(thread: RedditThread): { score: number; tags: string[]; hours: number };
export function promoRisk(rules?: SubredditRule[]): string[] | null;
export function pickTemplate(tags: string[]): string | null;
export function rank(threads: RedditThread[], seen?: string[], minScore?: number): ScoredThread[];
export function newComments(
  comments: RedditComment[],
  seen?: string[],
  selfAuthor?: string,
): RedditComment[];
export function nextSeen(
  seen: string[],
  opts?: { blocked?: boolean; reported?: boolean; ids?: (string | undefined)[] },
): string[];
export function formatReplies(items: RedditComment[], now?: Date): string;
export function formatMentions(items: RedditThread[]): string;
export function formatDigest(items: ScoredThread[], now?: Date): string;
export function parseAtom(xml: string): RedditThread[];
