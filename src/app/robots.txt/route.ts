import {
  SEARCH_AND_CITATION_CRAWLERS,
  TRAINING_CRAWLERS,
} from "@/lib/content-use-policy";
import { SITE } from "@/lib/site";

// 정적 export 호환: 빌드 타임에 robots.txt를 일반 텍스트로 생성한다.
export const dynamic = "force-static";

// ⚠️ /search 는 크롤을 막는다(2026-08-18).
// 기사 태그 링크가 만든 수천 개 검색 URL이 크롤 예산을 소모했으므로 결과 페이지는 차단한다.
const CRAWL_BLOCK = "/search";
// ⚠️ /api/ 는 색인 대상이 아니다(2026-09-03).
// 네이버 Yeti 가 JS 를 렌더하며 /api/comments·reactions·bookmarks·view 를 하루 ~800회 호출해
// D1 을 두드리고 조회수를 부풀렸다(Cloudflare 실측). 기사 본문은 정적 HTML 이라 차단해도
// 색인에 영향이 없다 — 댓글·반응·많이 본 뉴스 위젯만 크롤러 렌더에서 비어 보일 뿐이다.
const API_BLOCK = "/api/";

function allowedGroup(userAgent: string) {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    `Disallow: ${CRAWL_BLOCK}`,
    `Disallow: ${API_BLOCK}`,
  ].join("\n");
}

function blockedGroup(userAgent: string) {
  return [`User-agent: ${userAgent}`, "Disallow: /"].join("\n");
}

export function GET() {
  const body = [
    // Cloudflare Content Signals: 일반 검색과 실시간 AI 인용은 허용하고 학습은 금지한다.
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference",
    "Allow: /",
    `Disallow: ${CRAWL_BLOCK}`,
    `Disallow: ${API_BLOCK}`,
    "",
    ...SEARCH_AND_CITATION_CRAWLERS.flatMap((userAgent) => [allowedGroup(userAgent), ""]),
    ...TRAINING_CRAWLERS.flatMap((userAgent) => [blockedGroup(userAgent), ""]),
    `Sitemap: ${SITE.url}/sitemap.xml`,
    `Sitemap: ${SITE.url}/news-sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
