/**
 * Cloudflare Pages Function — 기사 조회수 집계.
 * POST {article} → IP 해시 + KST 날짜로 "하루 1회"만 카운트(새로고침·봇 과다 방지) → article_views +1.
 * GET  ?article=<id> → 누적 조회수(기사 상세 표기용)
 * 저장: D1(binding DB). IP 원문 저장 안 함(SHA-256 해시).
 *
 * ⚠️ 2026-07-15 — KV(REACTIONS) → D1 이전. 왜:
 *   구 구현은 `kv.get(views:<id>)` → `+1` → `kv.put(...)`이었다. KV엔 원자 증감이 없어
 *   동시 요청이 같은 값을 읽고 같은 값을 쓰면 증가분이 통째로 사라진다(lost update).
 *   일일 중복방지(viewed:*)도 get→put 사이 경합으로 여러 요청이 동시에 통과했다.
 *   → 증감은 D1 단일 UPSERT(`views = views + 1`)로 원자화하고,
 *     중복방지는 PRIMARY KEY(article_id, ip_hash, day) 유니크 제약이 판정한다.
 *   ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요.
 *
 * 구 KV 데이터(views:*)는 이관하지 않았다 — 최대 조회수가 4라 이관 가치가 없다.
 * (그래도 필요하면 scripts/migrate-views-kv-to-d1.mjs — 기본 dry-run, 아직 미실행.)
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
  const db = ctx.env.DB;
  if (!db) return json({ ok: false });
  const article = clean(new URL(ctx.request.url).searchParams.get("article"));
  if (!article) return json({ ok: false });
  try {
    const row = (await db.prepare("SELECT views FROM article_views WHERE article_id = ?1")
      .bind(article)
      .first()) as { views?: number } | null;
    return json({ ok: true, count: Number(row?.views ?? 0) || 0 });
  } catch {
    // 표시용 수치일 뿐이라 실패는 조용히 0 취급(기사 페이지가 깨지지 않게).
    return json({ ok: false });
  }
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const db = ctx.env.DB;
  if (!db) return json({ ok: false });
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

  try {
    // 하루 1회 판정 = 유니크 제약. 동시 요청이 몰려도 INSERT에 성공한(=RETURNING이 행을 돌려준)
    // 정확히 하나만 통과한다. 나머지는 충돌 → DO NOTHING → 무반환.
    const claimed = await db
      .prepare(
        `INSERT INTO view_dedup (article_id, ip_hash, day) VALUES (?1, ?2, ?3)
         ON CONFLICT DO NOTHING RETURNING 1 AS ok`,
      )
      .bind(article, ip, day)
      .first();
    if (!claimed) return json({ ok: true, counted: false });

    // 원자 증감 — 단일 문이라 lost update가 원리적으로 불가능하다.
    await db
      .prepare(
        `INSERT INTO article_views (article_id, views) VALUES (?1, 1)
         ON CONFLICT(article_id) DO UPDATE
           SET views = views + 1, updated_at = datetime('now','+9 hours')`,
      )
      .bind(article)
      .run();

    // D1엔 KV 같은 TTL이 없다 → 이틀 지난 중복방지 행 청소(응답 경로 밖에서).
    ctx.waitUntil?.(
      db
        .prepare("DELETE FROM view_dedup WHERE day < ?1")
        .bind(kstDate(Date.now() - 2 * 86400_000))
        .run()
        .catch(() => {}),
    );
    return json({ ok: true, counted: true });
  } catch {
    return json({ ok: false });
  }
}
