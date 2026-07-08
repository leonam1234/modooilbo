/**
 * 기자 구독 API — 로그인 회원 전용.
 * GET  /api/reporter-subs            → { items: [{reporter_slug, created_at}] }
 * GET  /api/reporter-subs?slug=X     → { subscribed: boolean } (비로그인 false)
 * POST /api/reporter-subs {slug}     → 토글 → { subscribed }
 */
import { json, getUser, type AuthEnv } from "../_lib/auth";

// 로스터 6명 고정(src/lib/reporters.ts와 동일) — 함수 번들 독립성 위해 화이트리스트 복제
const SLUGS = new Set([
  "kim-younghwan", "yoo-seunghyun", "kim-sungwoo",
  "park-yuju", "nam-dongkyun", "yoo-suhwa",
]);

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  const slug = new URL(ctx.request.url).searchParams.get("slug");

  if (slug) {
    if (!me) return json({ subscribed: false });
    const row = await env.DB.prepare(
      "SELECT 1 AS x FROM reporter_subs WHERE user_id = ?1 AND reporter_slug = ?2",
    )
      .bind(me.id, slug)
      .first();
    return json({ subscribed: !!row });
  }

  if (!me) return json({ error: "로그인이 필요합니다." }, 401);
  const rows = (
    await env.DB.prepare(
      "SELECT reporter_slug, created_at FROM reporter_subs WHERE user_id = ?1 ORDER BY created_at ASC",
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

  let slug = "";
  try {
    slug = String((await ctx.request.json())?.slug || "");
  } catch {
    /* noop */
  }
  if (!SLUGS.has(slug)) return json({ error: "존재하지 않는 기자입니다." }, 400);

  const del = await env.DB.prepare(
    "DELETE FROM reporter_subs WHERE user_id = ?1 AND reporter_slug = ?2",
  )
    .bind(me.id, slug)
    .run();
  if (del.meta && del.meta.changes > 0) return json({ subscribed: false });

  await env.DB.prepare(
    "INSERT OR IGNORE INTO reporter_subs (user_id, reporter_slug) VALUES (?1, ?2)",
  )
    .bind(me.id, slug)
    .run();
  return json({ subscribed: true });
}
