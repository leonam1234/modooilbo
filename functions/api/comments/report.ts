/**
 * POST /api/comments/report {id} — 댓글 신고(로그인 회원, 댓글당 1회).
 * 서로 다른 회원 3명 누적 시 자동 가림(is_hidden=1). → { ok, hidden }
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

const HIDE_THRESHOLD = 3;

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  if (!me) return json({ error: "로그인이 필요합니다." }, 401);

  let id = "";
  try {
    id = String((await ctx.request.json())?.id || "");
  } catch {
    /* noop */
  }
  if (!id) return json({ error: "잘못된 요청입니다." }, 400);

  const c = (await env.DB.prepare(
    "SELECT user_id, is_deleted, is_hidden FROM comments WHERE id = ?1",
  )
    .bind(id)
    .first()) as any;
  if (!c || c.is_deleted) return json({ error: "존재하지 않는 댓글입니다." }, 404);
  if (c.user_id === me.id) return json({ error: "본인 댓글은 신고할 수 없습니다." }, 400);

  await env.DB.prepare(
    "INSERT OR IGNORE INTO comment_reports (comment_id, user_id) VALUES (?1, ?2)",
  )
    .bind(id, me.id)
    .run();

  const n = (await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM comment_reports WHERE comment_id = ?1",
  )
    .bind(id)
    .first()) as any;

  let hidden = !!c.is_hidden;
  if (!hidden && (n?.n ?? 0) >= HIDE_THRESHOLD) {
    await env.DB.prepare("UPDATE comments SET is_hidden = 1 WHERE id = ?1").bind(id).run();
    hidden = true;
  }
  return json({ ok: true, hidden });
}
