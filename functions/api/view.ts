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
import trending from "../../src/lib/trending-data.generated.json";

const SALT = "modooilbo-view-v1";

/**
 * 실재하는 기사 id 화이트리스트(2026-07-21 보안 감사).
 *
 * 구 동작: `clean()`의 형식 검사만 통과하면(영숫자·하이픈 81자 이내) 어떤 문자열이든
 *   article_views·view_dedup에 행을 만들었다. 무인증·무제한 POST라 임의 문자열을 흘려보내는
 *   것만으로 **D1 행을 영구히 무한 증식**시킬 수 있었다(view_dedup은 2일 청소가 있지만
 *   article_views는 지우는 코드가 없다 = 영구). 저장 한도·요금·백업 크기에 직접 영향.
 * → 실재하는 기사 id가 아니면 **D1에 닿기 전에** 거절한다.
 *
 * 데이터 출처는 most-read.ts와 동일한 생성 파일이다(prebuild가 하드코딩 기사 + content.generated를
 * 합쳐 만든다 = 사이트가 렌더하는 기사 전량). 여기 id 체계는 ViewBeacon이 보내는 `article.id`와
 * 같고, most-read가 `article_views.article_id`와 대조하는 값과도 같다.
 * ⚠️ 이 파일은 함수 번들에 **빌드 시점 값으로 박힌다** → 기사를 추가하면 재배포해야 집계된다
 *   (기사 추가는 어차피 정적 재빌드·재배포를 동반하므로 새로운 제약은 아니다).
 */
const VALID_IDS: Set<string> = new Set(
  ((trending as { articles?: { id?: string }[] }).articles ?? [])
    .map((a) => a.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0),
);

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
  // 실재하지 않는 기사 id는 D1에 닿기 전에 거절한다(무한 행 증식 차단 — 위 VALID_IDS 참조).
  // 400인 이유: 형식은 맞지만 대상이 없는 요청이라 클라이언트 오류다. ViewBeacon은 렌더된
  // 기사의 id만 보내므로 정상 사용자는 여기에 걸릴 수 없다.
  if (!VALID_IDS.has(article)) return json({ ok: false, error: "unknown article" }, 400);

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
