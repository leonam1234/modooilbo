/**
 * POST /api/comments/remove {id} — 본인 댓글 삭제(소프트).
 * 내용은 지우고 행은 남긴다(답글 스레드 유지). → { ok }
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

  const r = await env.DB.prepare(
    "UPDATE comments SET is_deleted = 1, body = '' WHERE id = ?1 AND user_id = ?2 AND is_deleted = 0",
  )
    .bind(id, me.id)
    .run();
  if (!r.meta || r.meta.changes === 0) return json({ error: "삭제할 수 없는 댓글입니다." }, 404);
  return json({ ok: true });
}
