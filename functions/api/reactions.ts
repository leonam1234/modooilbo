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
 * 저장: D1(binding DB)
 *   - 카운트: reaction_counts(article_id, type) → n
 *   - 선택:   reaction_choices(article_id, ip_hash, day) → type(NULL=취소), prev_type
 *
 * GET  /api/reactions?article=<id>      → { counts, chosen }
 * POST /api/reactions  {article, type}  → { counts, chosen }
 *
 * ⚠️ 2026-07-15 — KV(REACTIONS) → D1 이전. 왜:
 *   구 구현은 `kv.get(react:<a>:<t>)` → `±1` → `kv.put(...)`이었다. KV엔 원자 증감이 없어
 *   동시 요청에서 증가분이 서로를 덮어써 반응 수가 유실됐고, '하루 1회' 선택 키도 get→put
 *   경합으로 이중 반영됐다(같은 사람이 여러 번 +1).
 *   → 카운트는 D1 단일 UPSERT(`n = n + 1`)로 원자화.
 *   → 선택 전이는 **단일 UPSERT 한 문장**으로 처리하고 RETURNING으로 (직전 선택, 새 선택)을
 *     돌려받는다. 각 요청이 자기 전이의 증감분만 반영하므로 경합해도 카운트가 어긋나지 않는다.
 *     (예: 같은 반응 동시 2연타 → 하나는 prev=NULL/new=A(+1), 다른 하나는 prev=A/new=NULL(-1)
 *      → 순증 0. 토글 의미와 정확히 일치.)
 *   ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요.
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

function cleanArticle(a: unknown): string | null {
  if (typeof a !== "string") return null;
  return /^[a-z0-9][a-z0-9-]{0,80}$/i.test(a) ? a : null;
}

/** 전체 타입을 0으로 채운 뒤 D1 값으로 덮는다(응답 형식은 종전과 동일). */
async function readCounts(db: any, article: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const t of TYPES) counts[t] = 0;
  const rows = (
    await db.prepare("SELECT type, n FROM reaction_counts WHERE article_id = ?1").bind(article).all()
  ).results as { type: string; n: number }[];
  for (const r of rows) {
    if ((TYPES as readonly string[]).includes(r.type)) counts[r.type] = Number(r.n) || 0;
  }
  return counts;
}

async function ipHashOf(request: any): Promise<string> {
  return sha256(SALT + (request.headers.get("CF-Connecting-IP") || ""));
}

export async function onRequestGet(context: any): Promise<Response> {
  const db = context.env.DB;
  const url = new URL(context.request.url);
  const article = cleanArticle(url.searchParams.get("article"));
  if (!db || !article) return json({ error: "bad request" }, 400);

  const ipHash = await ipHashOf(context.request);
  const day = kstDate(Date.now());
  try {
    const [counts, choice] = await Promise.all([
      readCounts(db, article),
      db
        .prepare(
          "SELECT type FROM reaction_choices WHERE article_id = ?1 AND ip_hash = ?2 AND day = ?3",
        )
        .bind(article, ipHash, day)
        .first() as Promise<{ type?: string | null } | null>,
    ]);
    return json({ counts, chosen: choice?.type ?? null });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

export async function onRequestPost(context: any): Promise<Response> {
  const db = context.env.DB;
  if (!db) return json({ error: "unavailable" }, 503);

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

  try {
    // ── 선택 전이(원자적, 단일 문) ──────────────────────────────────────────
    // DO UPDATE의 SET 식은 **갱신 전 행 값**으로 평가된다(표준 UPDATE 의미).
    // 그래서 prev_type에 옛 type을 적어 두고, type엔 토글 결과를 넣은 뒤
    // RETURNING으로 (옛 값, 새 값)을 함께 돌려받을 수 있다.
    //   같은 것 재클릭 → type = NULL(취소)  /  다른 것 → type = 새 값(갈아타기)
    // 행을 지우지 않고 NULL로 두는 이유: 지우면 "취소"를 한 문장으로 표현할 수 없다.
    const claim = (await db
      .prepare(
        `INSERT INTO reaction_choices (article_id, ip_hash, day, type, prev_type)
         VALUES (?1, ?2, ?3, ?4, NULL)
         ON CONFLICT(article_id, ip_hash, day) DO UPDATE
           SET prev_type = reaction_choices.type,
               type = CASE WHEN reaction_choices.type = excluded.type THEN NULL ELSE excluded.type END,
               updated_at = datetime('now','+9 hours')
         RETURNING prev_type AS prev, type AS next`,
      )
      .bind(article, ipHash, day, type)
      .first()) as { prev?: string | null; next?: string | null } | null;

    const prev = claim?.prev ?? null;
    const next = claim?.next ?? null;

    // ── 카운트 반영(각 문이 원자 증감) ─────────────────────────────────────
    const stmts: any[] = [];
    if (prev && (TYPES as readonly string[]).includes(prev)) {
      stmts.push(
        db
          .prepare(
            `UPDATE reaction_counts SET n = MAX(0, n - 1), updated_at = datetime('now','+9 hours')
             WHERE article_id = ?1 AND type = ?2`,
          )
          .bind(article, prev),
      );
    }
    if (next && (TYPES as readonly string[]).includes(next)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO reaction_counts (article_id, type, n) VALUES (?1, ?2, 1)
             ON CONFLICT(article_id, type) DO UPDATE
               SET n = n + 1, updated_at = datetime('now','+9 hours')`,
          )
          .bind(article, next),
      );
    }
    if (stmts.length) await db.batch(stmts);

    // 자정 지난 선택 행 청소(D1엔 TTL이 없다). 카운트는 누적이라 영향 없다.
    context.waitUntil?.(
      db
        .prepare("DELETE FROM reaction_choices WHERE day < ?1")
        .bind(kstDate(Date.now() - 2 * 86400_000))
        .run()
        .catch(() => {}),
    );

    return json({ counts: await readCounts(db, article), chosen: next });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
