/**
 * Cloudflare Pages Function — 기사 반응("이 기사를 추천합니다").
 *
 * 로그인 없이 반응. **한 기사에 한 IP당 하나만 선택**(단일 선택):
 *   - 아무것도 안 골랐으면 → 선택.
 *   - 다른 걸 누르면 → 갈아타기(이전 것 -1, 새 것 +1).
 *   - 같은 걸 다시 누르면 → 취소(-1).
 * 남용 방지 = IP 해시 + KST 날짜 키(하루 단위, 자정 리셋). IP 원문은 저장하지 않고 SHA-256 해시만.
 * 전부 긍정·중립 반응(찬반 없음).
 *
 * 저장: Cloudflare KV(binding REACTIONS)
 *   - 카운트: react:<article>:<type>            → 정수 문자열
 *   - 선택:   choice:<article>:<ipHash>:<KST날짜> → 선택한 type (자정까지 TTL)
 *
 * GET  /api/reactions?article=<id>      → { counts, chosen }
 * POST /api/reactions  {article, type}  → { counts, chosen }
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

function kstDate(ms: number): string {
  const d = new Date(ms + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

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

async function ipHashOf(request: any): Promise<string> {
  return sha256(SALT + (request.headers.get("CF-Connecting-IP") || ""));
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env.REACTIONS;
  const url = new URL(context.request.url);
  const article = cleanArticle(url.searchParams.get("article"));
  if (!kv || !article) return json({ error: "bad request" }, 400);

  const ipHash = await ipHashOf(context.request);
  const day = kstDate(Date.now());
  const [counts, chosen] = await Promise.all([
    readCounts(kv, article),
    kv.get(`choice:${article}:${ipHash}:${day}`),
  ]);
  return json({ counts, chosen: chosen || null });
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

  const ipHash = await ipHashOf(context.request);
  const day = kstDate(Date.now());
  const choiceKey = `choice:${article}:${ipHash}:${day}`;

  const [counts, prev] = await Promise.all([readCounts(kv, article), kv.get(choiceKey)]);
  let chosen: string | null = prev || null;

  if (prev === type) {
    // 같은 걸 다시 → 취소
    counts[type] = Math.max(0, (counts[type] || 0) - 1);
    await kv.put(`react:${article}:${type}`, String(counts[type]));
    await kv.delete(choiceKey);
    chosen = null;
  } else {
    // 갈아타기 or 신규 선택
    if (prev && (TYPES as readonly string[]).includes(prev)) {
      counts[prev] = Math.max(0, (counts[prev] || 0) - 1);
      await kv.put(`react:${article}:${prev}`, String(counts[prev]));
    }
    counts[type] = (counts[type] || 0) + 1;
    await kv.put(`react:${article}:${type}`, String(counts[type]));
    await kv.put(choiceKey, type, { expirationTtl: secsToKstMidnight(Date.now()) });
    chosen = type;
  }
  return json({ counts, chosen });
}
