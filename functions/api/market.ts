/**
 * Cloudflare Pages Function — 증시·환율 위젯 데이터 (경제 섹션 상단 스트립).
 *
 * 1차 소스: Yahoo Finance 차트 API(비공식·무키·지연시세). 언제든 끊길 수 있어
 * 원/달러는 open.er-api.com(무키·일 1회 갱신)으로 폴백한다. 종목별 실패는 그냥
 * 그 항목만 빼고 응답 — UI는 있는 것만 그린다.
 *
 * 캐시: KST 10분 버킷(caches.default) → 방문자가 몇 명이든 외부 호출은 10분에 1번.
 * 비용 0원 고정, 어떤 무료 한도에도 안 걸린다.
 *
 * GET /api/market → { updated: "MM.DD HH:mm", items: [{key,label,value,prev}] }
 */

const SYMBOLS: { key: string; label: string; symbol: string }[] = [
  { key: "kospi", label: "코스피", symbol: "^KS11" },
  { key: "kosdaq", label: "코스닥", symbol: "^KQ11" },
  { key: "usdkrw", label: "원/달러", symbol: "USDKRW=X" },
  { key: "nasdaq", label: "나스닥", symbol: "^IXIC" },
  { key: "sp500", label: "S&P 500", symbol: "^GSPC" },
];

const UA = { "user-agent": "Mozilla/5.0 (compatible; modooilbo-widget/1.0)" };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

async function fromYahoo(symbol: string): Promise<{ value: number; prev: number | null } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return null;
    const d = (await res.json()) as any;
    const meta = d?.chart?.result?.[0]?.meta;
    const value = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose);
    if (!Number.isFinite(value)) return null;
    return { value, prev: Number.isFinite(prev) ? prev : null };
  } catch {
    return null;
  }
}

/** 원/달러 폴백 — 공식성 높은 무키 환율(전일 대비는 제공 안 하므로 prev=null). */
async function usdkrwFallback(): Promise<{ value: number; prev: number | null } | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { headers: UA });
    if (!res.ok) return null;
    const d = (await res.json()) as any;
    const v = Number(d?.rates?.KRW);
    return Number.isFinite(v) ? { value: v, prev: null } : null;
  } catch {
    return null;
  }
}

export async function onRequestGet(): Promise<Response> {
  const nowMs = Date.now();
  const k = new Date(nowMs + 9 * 3600 * 1000); // KST 벽시계
  const bucket = `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}${pad(k.getUTCHours())}${pad(Math.floor(k.getUTCMinutes() / 10))}`;

  const cache = (caches as any).default;
  const cacheKey = new Request(`https://modooilbo.com/__market-cache/${bucket}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const results = await Promise.all(SYMBOLS.map((s) => fromYahoo(s.symbol)));
  const items: { key: string; label: string; value: number; prev: number | null }[] = [];
  for (let i = 0; i < SYMBOLS.length; i++) {
    let r = results[i];
    if (!r && SYMBOLS[i].key === "usdkrw") r = await usdkrwFallback();
    if (r) items.push({ key: SYMBOLS[i].key, label: SYMBOLS[i].label, value: r.value, prev: r.prev });
  }

  const updated = `${pad(k.getUTCMonth() + 1)}.${pad(k.getUTCDate())} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
  const body = JSON.stringify({ updated, items });

  // 전부 실패면 캐시하지 않고 즉시 반환(다음 요청에서 재시도)
  if (items.length === 0) {
    return new Response(body, {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const res = new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=120, s-maxage=660",
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
}
