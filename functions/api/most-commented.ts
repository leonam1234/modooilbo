/**
 * GET /api/most-commented — 댓글 많은 뉴스 랭킹(사이드바 탭용).
 * 삭제·가림 제외 댓글 수 내림차순. KST 10분 버킷 캐시.
 * → { items: [{id, count}] }
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as { DB?: any };
  if (!env.DB) {
    return new Response(JSON.stringify({ items: [] }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const k = new Date(Date.now() + 9 * 3600 * 1000);
  const bucket = `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}${pad(k.getUTCHours())}${pad(Math.floor(k.getUTCMinutes() / 10))}`;
  const cache = (caches as any).default;
  const cacheKey = new Request(`https://modooilbo.com/__most-commented-cache/${bucket}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const rows = (
    await env.DB.prepare(
      `SELECT article_id AS id, COUNT(*) AS count FROM comments
       WHERE is_deleted = 0 AND is_hidden = 0
       GROUP BY article_id ORDER BY count DESC, MAX(created_at) DESC LIMIT 8`,
    ).all()
  ).results;

  const res = new Response(JSON.stringify({ items: rows }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=120, s-maxage=660",
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
}
