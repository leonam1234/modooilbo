/**
 * Cloudflare Pages Function — 기사 조회수 집계.
 * POST {article} → IP 해시 + KST 날짜로 "하루 1회"만 카운트(새로고침·봇 과다 방지) → views:<article> +1.
 * 저장: KV(binding REACTIONS 재사용). IP 원문 저장 안 함(SHA-256 해시).
 */
const SALT = "modooilbo-view-v1";

function json(o: unknown, s = 200): Response {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function kstDate(ms: number): string {
  const d = new Date(ms + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function clean(a: unknown): string | null {
  return typeof a === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/i.test(a) ? a : null;
}

// GET ?article=<id> → 누적 조회수(기사 상세 표기용)
export async function onRequestGet(ctx: any): Promise<Response> {
  const kv = ctx.env.REACTIONS;
  if (!kv) return json({ ok: false });
  const article = clean(new URL(ctx.request.url).searchParams.get("article"));
  if (!article) return json({ ok: false });
  const count = parseInt((await kv.get(`views:${article}`)) || "0", 10) || 0;
  return json({ ok: true, count });
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const kv = ctx.env.REACTIONS;
  if (!kv) return json({ ok: false });
  let b: any;
  try {
    b = await ctx.request.json();
  } catch {
    return json({ ok: false });
  }
  const article = clean(b?.article);
  if (!article) return json({ ok: false });

  const ip = await sha256(SALT + (ctx.request.headers.get("CF-Connecting-IP") || ""));
  const day = kstDate(Date.now());
  const dkey = `viewed:${article}:${ip}:${day}`;
  if (await kv.get(dkey)) return json({ ok: true, counted: false });

  const k = `views:${article}`;
  const cur = parseInt((await kv.get(k)) || "0", 10) || 0;
  await kv.put(k, String(cur + 1));
  await kv.put(dkey, "1", { expirationTtl: 172800 }); // 2일
  return json({ ok: true, counted: true });
}
