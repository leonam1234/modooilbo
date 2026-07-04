/**
 * 댓글 API — 로그인 회원 전용 작성, 네이버식 답글 1단.
 *
 * GET  /api/comments?article=<id>
 *   → { count, me, comments: [{id, parent_id, author, body, created_at, likes, liked, mine, deleted}] }
 *   삭제 정책: 답글은 숨김. 원댓글은 살아있는 답글이 있을 때만 "삭제된 댓글" 자리 표시.
 * POST /api/comments  {article, body, parent?}
 *   → 생성된 댓글 1건. 답글은 원댓글에만(1단 제한). 같은 회원 15초 1회(KV).
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

const MAX_BODY = 500;
const ARTICLE_RE = /^[a-z0-9][a-z0-9-]{0,80}$/i; // 기사 id 형식 — reactions.ts와 동일 규칙

// 클린봇 v1 — 금칙어(욕설·혐오) 포함 시 등록 거부. 공백·특수문자·숫자 끼워넣기 우회 방지용 정규화.
const BANNED = [
  "씨발", "시발", "씨빨", "씨팔", "병신", "븅신", "개새끼", "개새키", "개색기", "지랄",
  "좆", "존나", "썅", "니미", "미친놈", "미친년", "창녀", "걸레같",
  "한남충", "김치녀", "틀딱", "급식충", "맘충", "짱깨", "쪽바리",
];

function hasBanned(s: string): boolean {
  const norm = s.toLowerCase().replace(/[\s.,\-_*+~!@#$%^&()[\]{}|\\/:;'"<>?0-9]/g, "");
  return BANNED.some((w) => norm.includes(w));
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
};

async function loadComments(env: AuthEnv, article: string, me: { id: string; name: string } | null) {
  const rows = (
    await env.DB.prepare(
      `SELECT c.id, c.parent_id, c.body, c.is_deleted, c.is_hidden, c.created_at, u.name AS author, c.user_id
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.article_id = ?1
       ORDER BY c.created_at ASC, c.rowid ASC`,
    )
      .bind(article)
      .all()
  ).results as Row[];

  const likeRows = (
    await env.DB.prepare(
      `SELECT comment_id, COUNT(*) AS n FROM comment_likes
       WHERE comment_id IN (SELECT id FROM comments WHERE article_id = ?1)
       GROUP BY comment_id`,
    )
      .bind(article)
      .all()
  ).results as { comment_id: string; n: number }[];
  const likes = new Map(likeRows.map((r) => [r.comment_id, r.n]));

  let myLikes = new Set<string>();
  if (me) {
    const mine = (
      await env.DB.prepare(
        `SELECT comment_id FROM comment_likes
         WHERE user_id = ?2 AND comment_id IN (SELECT id FROM comments WHERE article_id = ?1)`,
      )
        .bind(article, me.id)
        .all()
    ).results as { comment_id: string }[];
    myLikes = new Set(mine.map((r) => r.comment_id));
  }

  // 삭제·가림 정책: 답글은 그냥 숨김. 원댓글은 살아있는 답글이 있으면 자리만 유지.
  const blocked = (r: Row) => !!r.is_deleted || !!r.is_hidden;
  const aliveReplyParents = new Set(
    rows.filter((r) => r.parent_id && !blocked(r)).map((r) => r.parent_id as string),
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

  return { count: comments.filter((c) => !c.deleted && !c.hidden).length, comments };
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const article = new URL(ctx.request.url).searchParams.get("article") || "";
  if (!ARTICLE_RE.test(article)) return json({ error: "article이 필요합니다." }, 400);
  const me = await getUser(env, ctx.request);
  const data = await loadComments(env, article, me);
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
  if (hasBanned(body)) {
    return json({ error: "부적절한 표현이 포함되어 등록할 수 없습니다. 표현을 다듬어 주세요." }, 400);
  }

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

  // 도배 방지: 같은 회원 15초에 1건 (검증 전 실패 요청이 슬롯을 태우지 않게 맨 뒤에서 체크)
  if (env.REACTIONS) {
    const rlKey = `crl:${me.id}`;
    const last = await env.REACTIONS.get(rlKey);
    if (last && Date.now() - Number(last) < 15_000) {
      return json({ error: "너무 빠르게 연속 작성할 수 없습니다. 잠시 후 다시 시도해 주세요." }, 429);
    }
    await env.REACTIONS.put(rlKey, String(Date.now()), { expirationTtl: 60 });
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO comments (id, article_id, user_id, parent_id, body) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(id, article, me.id, parent, body)
    .run();

  const data = await loadComments(env, article, me);
  return json({ ...data, me: { name: me.name }, created: id }, 201);
}
