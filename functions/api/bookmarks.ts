/**
 * 스크랩(북마크) API — 로그인 회원 전용.
 * GET  /api/bookmarks            → { items: [{article_id, created_at}] } (최신순)
 * GET  /api/bookmarks?article=X  → { saved: boolean } (비로그인 false)
 * POST /api/bookmarks {article}  → 토글 → { saved }
 */
import { cleanArticleId } from "../_lib/article-ids";
import { json, getUser, type AuthEnv } from "../_lib/auth";

// 기사 id 검증은 공용 관문을 쓴다(_lib/article-ids.ts). 형식만 보면 실재하지 않는
// id로도 bookmarks 에 영구 행을 만들 수 있어 화이트리스트까지 통과시킨다.

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  const article = new URL(ctx.request.url).searchParams.get("article");

  if (article) {
    if (!cleanArticleId(article)) return json({ error: "잘못된 요청입니다." }, 400);
    if (!me) return json({ saved: false });
    const row = await env.DB.prepare(
      "SELECT 1 AS x FROM bookmarks WHERE user_id = ?1 AND article_id = ?2",
    )
      .bind(me.id, article)
      .first();
    return json({ saved: !!row });
  }

  if (!me) return json({ error: "로그인이 필요합니다." }, 401);
  const rows = (
    await env.DB.prepare(
      "SELECT article_id, created_at FROM bookmarks WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 100",
    )
      .bind(me.id)
      .all()
  ).results;
  return json({ items: rows });
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  if (!me) return json({ error: "로그인이 필요합니다." }, 401);

  let article = "";
  try {
    article = String((await ctx.request.json())?.article || "");
  } catch {
    /* noop */
  }
  if (!cleanArticleId(article)) return json({ error: "잘못된 요청입니다." }, 400);

  const del = await env.DB.prepare(
    "DELETE FROM bookmarks WHERE user_id = ?1 AND article_id = ?2",
  )
    .bind(me.id, article)
    .run();
  if (del.meta && del.meta.changes > 0) return json({ saved: false });

  await env.DB.prepare(
    "INSERT OR IGNORE INTO bookmarks (user_id, article_id) VALUES (?1, ?2)",
  )
    .bind(me.id, article)
    .run();
  return json({ saved: true });
}
