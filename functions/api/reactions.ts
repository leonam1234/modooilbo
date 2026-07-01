/**
 * Cloudflare Pages Function — 기사 반응("이 기사를 추천합니다").
 *
 * 로그인 없이 반응 가능. 남용 방지 = IP 해시 + KST 날짜 키로 "기사×반응 하루 1회"(KST 자정 리셋).
 * IP 원문은 저장하지 않고 SHA-256 해시만 사용(개인정보 보호). 전부 긍정·중립 반응(찬반 없음).
 *
 * 저장: Cloudflare KV(binding REACTIONS)
 *   - 카운트:  react:<article>:<type>            → 정수 문자열
 *   - 중복방지: voted:<article>:<type>:<ipHash>:<KST날짜> → "1" (자정까지 TTL)
 *
 * GET  /api/reactions?article=<id>      → { counts, voted }
 * POST /api/reactions  {article, type}  → { counts, voted, counted }
 */

const TYPES = ["info", "interesting", "empathy", "insight", "followup"] as const;
type ReactionType = (typeof TYPES)[number];
const SALT = "modooilbo-react-v1"; // IP 해시용 정적 솔트(역추적 방지)

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// KST 날짜 문자열(YYYYMMDD)
function kstDate(ms: number): string {
  const d = new Date(ms + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// 다음 KST 자정까지 남은 초(중복키 TTL)
function secsToKstMidnight(ms: number): number {
  const kstMs = ms + 9 * 3600 * 1000;
  const d = new Date(kstMs);
  const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + 86400000;
  return Math.max(60, Math.ceil((nextMidnight - kstMs) / 1000));
}

function cleanArticle(a: unknown): string | null {
  if (typeof a !== "string") return null;
  return /^[a-z0-9][a-z0-9-]{0,80}$/i.test(a) ? a : null;
}

async function readCounts(kv: any, article: string): Promise<Record<string, number>> {
  const vals = await Promise.all(TYPES.map((t) => kv.get(`react:${article}:${t}`)));
  const counts: Record<string, number> = {};
  TYPES.forEach((t, i) => (counts[t] = parseInt(vals[i] || "0", 10) || 0));
  return counts;
}

async function readVoted(kv: any, article: string, ipHash: string, day: string): Promise<Record<string, boolean>> {
  const vals = await Promise.all(TYPES.map((t) => kv.get(`voted:${article}:${t}:${ipHash}:${day}`)));
  const voted: Record<string, boolean> = {};
  TYPES.forEach((t, i) => (voted[t] = !!vals[i]));
  return voted;
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env.REACTIONS;
  const url = new URL(context.request.url);
  const article = cleanArticle(url.searchParams.get("article"));
  if (!kv || !article) return json({ error: "bad request" }, 400);

  const ipHash = await sha256(SALT + (context.request.headers.get("CF-Connecting-IP") || ""));
  const day = kstDate(Date.now());
  const [counts, voted] = await Promise.all([readCounts(kv, article), readVoted(kv, article, ipHash, day)]);
  return json({ counts, voted });
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env.REACTIONS;
  if (!kv) return json({ error: "kv missing" }, 500);

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const article = cleanArticle(body?.article);
  const type = body?.type as ReactionType;
  if (!article || !TYPES.includes(type)) return json({ error: "bad request" }, 400);

  const ipHash = await sha256(SALT + (context.request.headers.get("CF-Connecting-IP") || ""));
  const day = kstDate(Date.now());
  const dedupKey = `voted:${article}:${type}:${ipHash}:${day}`;

  const [counts, voted, already] = await Promise.all([
    readCounts(kv, article),
    readVoted(kv, article, ipHash, day),
    kv.get(dedupKey),
  ]);

  let counted = false;
  if (!already) {
    await kv.put(`react:${article}:${type}`, String((counts[type] || 0) + 1));
    await kv.put(dedupKey, "1", { expirationTtl: secsToKstMidnight(Date.now()) });
    counts[type] = (counts[type] || 0) + 1; // 즉시 반영(KV 최종일관성 우회)
    voted[type] = true;
    counted = true;
  }
  return json({ counts, voted, counted });
}
