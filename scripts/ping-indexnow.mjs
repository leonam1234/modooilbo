#!/usr/bin/env node
/**
 * IndexNow 핑 — 프로덕션 배포 직후 최신 기사 URL을 네이버·빙에 즉시 통지(색인 가속).
 * 키 파일: public/<KEY>.txt (IndexNow 스펙 — 호스트 소유 증명). 실패해도 배포엔 영향 없음.
 */
const KEY = "df645cf54bac68ff110e9353c3e4f8b7";
const HOST = "modooilbo.com";
try {
  const rss = await (await fetch(`https://${HOST}/rss.xml`)).text();
  const urls = [...rss.matchAll(/<link>(https:\/\/modooilbo\.com\/[^<]+)<\/link>/g)]
    .map((m) => m[1])
    .slice(0, 30);
  urls.unshift(`https://${HOST}/`);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  console.log(`[indexnow] ${urls.length}개 URL 통지 → HTTP ${res.status}`);
} catch (e) {
  console.warn("[indexnow] 통지 실패(배포에는 영향 없음):", e?.message ?? e);
}
