/**
 * Cloudflare Pages Function — 인기 해시태그 (검색창 하단).
 *
 * 정적 사이트라 빌드 때 고정된 순위 대신, 이 함수가 접속 시각(KST) 기준으로
 * 최신성 가중 순위를 매겨 상위 10개를 돌려준다. 결과는 KST '시(hour)' 단위로
 * 캐시(caches.default) → 그 시간 안엔 모두 같은 목록("N시 기준"), 다음 시각에 자동 재계산.
 * = 시간당 갱신.
 *
 * "인기" 기준(C 혼합): 현재는 기사 빈도 + 최신성(recency). 트래픽이 쌓이면
 * context.env.CF_ANALYTICS_TOKEN 으로 '최근 많이 본 기사 경로 → 태그'를 합산할 예정(아래 TODO).
 *
 * 데이터 원천: src/lib/trending-data.generated.json (scripts/build-trending-data.mjs 생성).
 */
import data from "../../src/lib/trending-data.generated.json";

const HALF_LIFE_DAYS = 14; // 최신성 반감기

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// UTC ms → KST(+9h) 벽시계 구성요소
function kstParts(ms: number) {
  const d = new Date(ms + 9 * 3600 * 1000);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, da: d.getUTCDate(), h: d.getUTCHours() };
}

export async function onRequestGet(context: any): Promise<Response> {
  const nowMs = Date.now();
  const k = kstParts(nowMs);
  const hourKey = `${k.y}${pad(k.mo)}${pad(k.da)}${pad(k.h)}`;

  const cache = (caches as any).default;
  const cacheKey = new Request(`https://modooilbo.com/__trending-cache/${hourKey}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // 점수 = count * (0.4 + 0.6*recency), recency = exp(-경과일 / 반감기)
  const scored = ((data as any).tags || []).map((t: any) => {
    const ageDays = t.latest ? Math.max(0, (nowMs - Date.parse(t.latest)) / 86400000) : 999;
    const recency = Math.exp(-ageDays / HALF_LIFE_DAYS);
    return { tag: t.tag, score: t.count * (0.4 + 0.6 * recency) };
  });

  // TODO(C 혼합): context.env.CF_ANALYTICS_TOKEN 있으면 CF 분석에서 최근 조회 많은
  //   기사 경로를 받아 data.articles(slug→tags)로 매핑해 score 에 트래픽 가중을 더한다.
  //   현재는 트래픽이 얇아(하루 수명) 최신성 기반만 사용.

  scored.sort((a: any, b: any) => b.score - a.score);
  const tags = scored.slice(0, 10).map((s: any) => s.tag);

  const body = {
    tags,
    label: `${k.mo}월 ${k.da}일 ${k.h}시 기준`,
    asOf: `${k.y}-${pad(k.mo)}-${pad(k.da)}T${pad(k.h)}:00:00+09:00`,
    basis: "recent",
  };
  const res = new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
