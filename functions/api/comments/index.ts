/**
 * 댓글 API — 로그인 회원 전용 작성, 네이버식 답글 1단.
 *
 * GET  /api/comments?article=<id>&limit=&cursor=
 *   → { count, me, comments: [...], hasMore, nextCursor }
 *   원댓글을 최신순으로 페이지네이션(키셋)하고, 그 페이지의 답글만 함께 싣는다.
 *   삭제 정책: 답글은 숨김. 원댓글은 살아있는 답글이 있을 때만 "삭제된 댓글" 자리 표시.
 * POST /api/comments  {article, body, parent?}
 *   → 첫 페이지 + 방금 쓴 댓글의 스레드. 답글은 원댓글에만(1단 제한). 같은 회원 15초 1회.
 *
 * ⚠️ 2026-07-15 두 가지를 고쳤다:
 *  1) 도배 제한이 KV `get→비교→put`이라 동시 요청으로 무력화됐고, 무엇보다
 *     `if (env.REACTIONS)`로 감싸여 **바인딩이 없으면 제한이 통째로 사라졌다(fail-open)**.
 *     → D1 원자 카운터(_lib/rate-limit.ts) + 저장소 접근 실패 시 **거부**(fail-closed).
 *  2) 조회에 LIMIT이 없어 기사 하나의 댓글을 **전부** 실어 보냈다(+ 공감 집계까지).
 *     댓글이 폭증하면 응답과 D1 부하가 그대로 터진다. → LIMIT + 키셋 페이지네이션.
 *  ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요(rate_limits + 댓글 인덱스).
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";
import { hitRateLimit } from "../../_lib/rate-limit";
// 댓글 본문은 금칙어 자동 차단 없이 등록(대표님 방침 2026-07-04) — 안내문 + 사후 삭제로 운영. 닉네임 필터는 moderation.ts 유지.

const MAX_BODY = 500;
const ARTICLE_RE = /^[a-z0-9][a-z0-9-]{0,80}$/i; // 기사 id 형식 — reactions.ts와 동일 규칙

// 도배 제한: 같은 회원 15초에 1건. 고정 창이라 창 경계에서 최대 2건까지 붙을 수 있으나
// (분당 4건 수준) 정상 사용자에겐 걸리지 않고 도배는 확실히 막힌다.
const RL_WINDOW_SECS = 15;
const RL_LIMIT = 1;

// 원댓글 페이지 크기. 답글은 그 페이지의 원댓글에 달린 것만 싣는다.
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
// 한 페이지가 실어 나르는 답글 총량 상한(응답 폭주 방지). 원댓글별 답글 페이지네이션은
// 현재 UI에 없어 상한만 둔다 — 넘치는 답글은 잘린다.
const MAX_REPLIES = 300;

// ⚠️ D1은 쿼리 하나당 **바운드 파라미터 100개**가 상한이다(초과 시
//    "variable number must be between ?1 and ?100" 로 통째로 실패).
//    `IN (?1,?2,...)`에 댓글 id를 그대로 늘어놓으면 한 페이지가 100건에 가까워지는 순간
//    조회가 500으로 터진다 — 즉 "댓글 폭증" 상황에서만 터지는 지뢰라 평시엔 안 보인다.
//    → id 목록은 항상 이 크기로 쪼개서 여러 문으로 나눠 던진다(여유분 확보해 90).
const PARAM_CHUNK = 90;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type Row = {
  id: string;
  parent_id: string | null;
  body: string;
  is_deleted: number;
  is_hidden: number;
  created_at: string;
  author: string;
  user_id: string;
  rid: number;
};

const SELECT_COLS = `c.id, c.parent_id, c.body, c.is_deleted, c.is_hidden, c.created_at,
                     u.name AS author, c.user_id, c.rowid AS rid`;

function parseLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

/** 커서 = "<created_at>|<rowid>". created_at은 KST 벽시계 문자열이라 사전순 비교가 곧 시간순. */
function parseCursor(raw: string | null): { at: string; rid: number } | null {
  if (!raw) return null;
  const i = raw.lastIndexOf("|");
  if (i <= 0) return null;
  const at = raw.slice(0, i);
  const rid = Number(raw.slice(i + 1));
  if (!at || !Number.isSafeInteger(rid)) return null;
  return { at, rid };
}
const makeCursor = (r: Row) => `${r.created_at}|${r.rid}`;

/** 원댓글 한 페이지(최신순). hasMore 판정용으로 limit+1건을 읽는다. */
async function fetchRoots(env: AuthEnv, article: string, limit: number, cursor: string | null) {
  const cur = parseCursor(cursor);
  const rows = cur
    ? ((
        await env.DB.prepare(
          `SELECT ${SELECT_COLS}
           FROM comments c JOIN users u ON u.id = c.user_id
           WHERE c.article_id = ?1 AND c.parent_id IS NULL
             AND (c.created_at < ?2 OR (c.created_at = ?2 AND c.rowid < ?3))
           ORDER BY c.created_at DESC, c.rowid DESC
           LIMIT ?4`,
        )
          .bind(article, cur.at, cur.rid, limit + 1)
          .all()
      ).results as Row[])
    : ((
        await env.DB.prepare(
          `SELECT ${SELECT_COLS}
           FROM comments c JOIN users u ON u.id = c.user_id
           WHERE c.article_id = ?1 AND c.parent_id IS NULL
           ORDER BY c.created_at DESC, c.rowid DESC
           LIMIT ?2`,
        )
          .bind(article, limit + 1)
          .all()
      ).results as Row[]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { page, hasMore, nextCursor: hasMore && page.length ? makeCursor(page[page.length - 1]) : null };
}

/** 원댓글 1건(방금 쓴 답글의 부모가 첫 페이지 밖일 때 끌어오기 위함). */
async function fetchRootById(env: AuthEnv, article: string, rootId: string): Promise<Row | null> {
  return (await env.DB.prepare(
    `SELECT ${SELECT_COLS}
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.article_id = ?1 AND c.id = ?2 AND c.parent_id IS NULL`,
  )
    .bind(article, rootId)
    .first()) as Row | null;
}

/** 주어진 원댓글들의 답글(오래된 순) — 상한까지만. id 목록은 D1 파라미터 상한 때문에 쪼개서 던진다. */
async function fetchReplies(env: AuthEnv, rootIds: string[]): Promise<Row[]> {
  if (!rootIds.length) return [];
  const groups = chunk(rootIds, PARAM_CHUNK);
  const results = await env.DB.batch(
    groups.map((ids) =>
      env.DB.prepare(
        `SELECT ${SELECT_COLS}
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.parent_id IN (${ids.map((_, i) => `?${i + 1}`).join(",")})
         ORDER BY c.created_at ASC, c.rowid ASC
         LIMIT ${MAX_REPLIES}`,
      ).bind(...ids),
    ),
  );
  const rows: Row[] = results.flatMap((r: any) => (r.results ?? []) as Row[]);
  // 쪼개 던진 탓에 청크별로 상한이 걸리므로 전체 기준으로 다시 정렬·절단한다.
  rows.sort((a: Row, b: Row) => a.created_at.localeCompare(b.created_at) || a.rid - b.rid);
  return rows.slice(0, MAX_REPLIES);
}

/** 페이지에 실린 댓글들의 공감 수·내 공감 여부(전체 스캔 대신 페이지 id로 한정). */
async function fetchLikes(env: AuthEnv, ids: string[], me: { id: string } | null) {
  const likes = new Map<string, number>();
  let myLikes = new Set<string>();
  if (!ids.length) return { likes, myLikes };

  // D1 파라미터 상한(100) 때문에 id 목록을 쪼개 던진다. me.id를 함께 바인딩하는 쪽은
  // 자리 하나를 더 쓰므로 청크를 1 줄인다.
  const likeRows: { comment_id: string; n: number }[] = (
    await env.DB.batch(
      chunk(ids, PARAM_CHUNK).map((g) =>
        env.DB.prepare(
          `SELECT comment_id, COUNT(*) AS n FROM comment_likes
           WHERE comment_id IN (${g.map((_, i) => `?${i + 1}`).join(",")}) GROUP BY comment_id`,
        ).bind(...g),
      ),
    )
  ).flatMap((r: any) => (r.results ?? []) as { comment_id: string; n: number }[]);
  for (const r of likeRows) likes.set(r.comment_id, r.n);

  if (me) {
    const mineRows: { comment_id: string }[] = (
      await env.DB.batch(
        chunk(ids, PARAM_CHUNK - 1).map((g) =>
          env.DB.prepare(
            `SELECT comment_id FROM comment_likes
             WHERE user_id = ?${g.length + 1} AND comment_id IN (${g.map((_, i) => `?${i + 1}`).join(",")})`,
          ).bind(...g, me.id),
        ),
      )
    ).flatMap((r: any) => (r.results ?? []) as { comment_id: string }[]);
    myLikes = new Set(mineRows.map((r) => r.comment_id));
  }
  return { likes, myLikes };
}

/** 기사 전체의 보이는 댓글 수(원댓글+답글) — 페이지와 무관한 총계라 헤더 표기에 쓴다. */
async function fetchCount(env: AuthEnv, article: string): Promise<number> {
  const row = (await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM comments WHERE article_id = ?1 AND is_deleted = 0 AND is_hidden = 0",
  )
    .bind(article)
    .first()) as { n?: number } | null;
  return Number(row?.n ?? 0) || 0;
}

/**
 * 원댓글 목록(이미 정해진 페이지) → 응답 형태로 조립.
 * 삭제·가림 정책: 답글은 그냥 숨김. 원댓글은 살아있는 답글이 있으면 자리만 유지.
 * (종전과 동일한 규칙을 페이지 범위 안에서 적용한다.)
 */
async function buildPage(
  env: AuthEnv,
  article: string,
  me: { id: string; name: string } | null,
  roots: Row[],
  hasMore: boolean,
  nextCursor: string | null,
) {
  const replies = await fetchReplies(env, roots.map((r) => r.id));
  const rows = [...roots, ...replies];
  const { likes, myLikes } = await fetchLikes(env, rows.map((r) => r.id), me);

  const blocked = (r: Row) => !!r.is_deleted || !!r.is_hidden;
  const aliveReplyParents = new Set(
    replies.filter((r) => !blocked(r)).map((r) => r.parent_id as string),
  );
  const visible = rows.filter((r) =>
    blocked(r) ? !r.parent_id && aliveReplyParents.has(r.id) : true,
  );

  const comments = visible.map((r) => ({
    id: r.id,
    parent_id: r.parent_id,
    author: blocked(r) ? "" : r.author,
    body: blocked(r) ? "" : r.body,
    created_at: r.created_at,
    likes: likes.get(r.id) ?? 0,
    liked: myLikes.has(r.id),
    mine: !!me && r.user_id === me.id && !blocked(r),
    deleted: !!r.is_deleted,
    hidden: !r.is_deleted && !!r.is_hidden,
  }));

  return { count: await fetchCount(env, article), comments, hasMore, nextCursor };
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const url = new URL(ctx.request.url);
  const article = url.searchParams.get("article") || "";
  if (!ARTICLE_RE.test(article)) return json({ error: "article이 필요합니다." }, 400);

  const me = await getUser(env, ctx.request);
  const { page, hasMore, nextCursor } = await fetchRoots(
    env,
    article,
    parseLimit(url.searchParams.get("limit")),
    url.searchParams.get("cursor"),
  );
  const data = await buildPage(env, article, me, page, hasMore, nextCursor);
  return json({ ...data, me: me ? { name: me.name } : null });
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  if (!me) return json({ error: "로그인이 필요합니다." }, 401);

  let payload: any = {};
  try {
    payload = await ctx.request.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const article = String(payload?.article || "");
  const body = String(payload?.body || "").trim();
  const parent = payload?.parent ? String(payload.parent) : null;
  if (!ARTICLE_RE.test(article)) return json({ error: "잘못된 요청입니다." }, 400);
  if (!body) return json({ error: "내용을 입력해 주세요." }, 400);
  if (body.length > MAX_BODY) return json({ error: `댓글은 ${MAX_BODY}자까지 쓸 수 있습니다.` }, 400);
  if (parent) {
    const p = (await env.DB.prepare(
      "SELECT article_id, parent_id, is_deleted FROM comments WHERE id = ?1",
    )
      .bind(parent)
      .first()) as any;
    if (!p || p.article_id !== article || p.parent_id || p.is_deleted) {
      return json({ error: "답글을 달 수 없는 댓글입니다." }, 400);
    }
  }

  // 도배 방지: 같은 회원 15초 1건 (검증 전 실패 요청이 슬롯을 태우지 않게 맨 뒤에서 체크)
  // 저장소에 접근할 수 없으면 **거부**한다 — 구 KV 구현은 여기서 조용히 통과시켰다(fail-open).
  let rl;
  try {
    rl = await hitRateLimit(env, `comment:${me.id}`, RL_LIMIT, RL_WINDOW_SECS, Date.now(), ctx.waitUntil?.bind(ctx));
  } catch {
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!rl.allowed) {
    return json({ error: "너무 빠르게 연속 작성할 수 없습니다. 잠시 후 다시 시도해 주세요." }, 429);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO comments (id, article_id, user_id, parent_id, body) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(id, article, me.id, parent, body)
    .run();

  // 방금 쓴 글이 응답에 반드시 들어가게 한다. 새 원댓글은 최신순 첫 페이지에 항상 잡히지만,
  // 오래된 원댓글에 단 답글은 그 원댓글이 첫 페이지 밖일 수 있다 → 그 스레드만 따로 끌어와 앞에 붙인다.
  const { page, hasMore, nextCursor } = await fetchRoots(env, article, DEFAULT_LIMIT, null);
  const rootId = parent ?? id;
  let roots = page;
  if (!page.some((r) => r.id === rootId)) {
    const root = await fetchRootById(env, article, rootId);
    if (root) roots = [root, ...page];
  }
  const data = await buildPage(env, article, me, roots, hasMore, nextCursor);
  return json({ ...data, me: { name: me.name }, created: id }, 201);
}
