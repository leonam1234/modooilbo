/**
 * GET /api/comments/mine — 내가 쓴 댓글(마이페이지). 최신 500건.
 * 500은 소비처(MyCommentsCard)가 "최근 6개월"을 월별로 전량 표시하기 위한 여유 상한이다
 * (개수가 아니라 기간으로 자르므로 50으로 줄이면 6개월치가 잘릴 수 있다).
 * → { items: [{article_id, body, created_at}] }
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  // D1 일시 장애가 Cloudflare 원시 500으로 새 나가지 않게 — comments/index.ts와 같은 규약.
  try {
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
  } catch {
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
