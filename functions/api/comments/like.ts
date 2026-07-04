/**
 * POST /api/comments/like {id} — 댓글 공감 토글(로그인 회원, 댓글당 1회).
 * → { likes, liked }
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

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

  const c = (await env.DB.prepare("SELECT is_deleted FROM comments WHERE id = ?1").bind(id).first()) as any;
  if (!c || c.is_deleted) return json({ error: "존재하지 않는 댓글입니다." }, 404);

  const del = await env.DB.prepare(
    "DELETE FROM comment_likes WHERE comment_id = ?1 AND user_id = ?2",
  )
    .bind(id, me.id)
    .run();
  let liked = false;
  if (!del.meta || del.meta.changes === 0) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?1, ?2)",
    )
      .bind(id, me.id)
      .run();
    liked = true;
  }

  const n = (await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM comment_likes WHERE comment_id = ?1",
  )
    .bind(id)
    .first()) as any;
  return json({ likes: n?.n ?? 0, liked });
}
