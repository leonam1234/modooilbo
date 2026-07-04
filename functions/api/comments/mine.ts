/**
 * GET /api/comments/mine — 내가 쓴 댓글(마이페이지). 최신 50건.
 * → { items: [{article_id, body, created_at}] }
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  if (!me) return json({ error: "로그인이 필요합니다." }, 401);

  const rows = (
    await env.DB.prepare(
      "SELECT article_id, body, created_at FROM comments WHERE user_id = ?1 AND is_deleted = 0 ORDER BY created_at DESC LIMIT 500",
    )
      .bind(me.id)
      .all()
  ).results;
  return json({ items: rows });
}
