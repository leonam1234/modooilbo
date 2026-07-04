/**
 * Cloudflare Pages Function — 실시간 많이 본 뉴스.
 * 각 기사의 실제 조회수(views:<id>, /api/view가 집계)를 읽어 상위 10건을 돌려준다.
 * KST '시' 단위 캐시(시간당 갱신). 조회가 아직 없으면 최신순으로 채워 빈 목록 방지(C 혼합).
 * 데이터: src/lib/trending-data.generated.json 의 기사 id·발행시각.
 */
import data from "../../src/lib/trending-data.generated.json";

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
  const kv = ctx.env.REACTIONS;
  const views = kv
    ? await Promise.all(arts.map((a) => kv.get(`views:${a.id}`)))
    : arts.map(() => null);

  const scored = arts.map((a, i) => ({
    id: a.id,
    views: parseInt(views[i] || "0", 10) || 0,
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
