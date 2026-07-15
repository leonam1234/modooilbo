/**
 * Cloudflare Pages Function — 실시간 많이 본 뉴스.
 * 실제 조회수(article_views, /api/view가 집계) 상위 10건. KST '시' 단위 캐시(시간당 갱신).
 * 조회가 아직 없으면 최신순으로 채워 빈 목록 방지(C 혼합).
 * 데이터: src/lib/trending-data.generated.json 의 기사 id·발행시각.
 *
 * ⚠️ 2026-07-15 — 팬아웃 제거. 왜:
 *   구 구현은 기사 수만큼 `kv.get(views:<id>)`를 Promise.all로 병렬 발사했다(현재 154건 = 154회).
 *   Cloudflare Workers의 요청당 **서브리퀘스트 한도는 1000**이라 기사가 늘수록 한도에 부딪혀
 *   이 엔드포인트가 통째로 터진다(캐시 미스 때마다).
 *   → 조회수를 D1로 옮긴 김에 **단일 쿼리 1회**로 대체했다. 기사가 몇 건이든 서브리퀘스트 1회.
 *   ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요.
 */
import data from "../../src/lib/trending-data.generated.json";

// 조회수 있는 기사만 가져온다. 상한은 안전장치 — 여기 안 든 기사는 views=0으로 취급되는데,
// 그러려면 상한 밖 기사가 상한 안 기사보다 조회수가 많아선 안 된다(ORDER BY views DESC라 보장).
const TOP_ROWS = 500;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function kstParts(ms: number) {
  const d = new Date(ms + 9 * 3600 * 1000);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, da: d.getUTCDate(), h: d.getUTCHours() };
}

export async function onRequestGet(ctx: any): Promise<Response> {
  const now = Date.now();
  const k = kstParts(now);
  const hourKey = `${k.y}${pad(k.mo)}${pad(k.da)}${pad(k.h)}`;
  const cache = (caches as any).default;
  const cacheKey = new Request(`https://modooilbo.com/__mostread-cache/${hourKey}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const arts: any[] = (data as any).articles || [];

  // 단일 쿼리(구: 기사 수만큼 KV get). 랭킹은 보안 속성이 아니라 표시용이므로
  // 실패하면 조용히 최신순 폴백(홈 위젯이 빈 채로 남지 않게).
  let views = new Map<string, number>();
  try {
    if (ctx.env.DB) {
      const rows = (
        await ctx.env.DB.prepare(
          `SELECT article_id, views FROM article_views
           WHERE views > 0 ORDER BY views DESC LIMIT ${TOP_ROWS}`,
        ).all()
      ).results as { article_id: string; views: number }[];
      views = new Map(rows.map((r) => [r.article_id, Number(r.views) || 0]));
    }
  } catch {
    /* 폴백: 전부 0 → 최신순 */
  }

  const scored = arts.map((a) => ({
    id: a.id,
    views: views.get(a.id) ?? 0,
    pub: a.publishedAt || "",
  }));
  // 조회수 내림차순, 동률·0은 최신 발행순
  scored.sort((a, b) => b.views - a.views || (a.pub < b.pub ? 1 : a.pub > b.pub ? -1 : 0));

  const items = scored.slice(0, 10).map((s) => ({ id: s.id, views: s.views }));
  const body = {
    items,
    label: `${k.mo}월 ${k.da}일 ${k.h}시 기준`,
    basis: items.some((x) => x.views > 0) ? "views" : "recent",
  };
  const res = new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=1800" },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
