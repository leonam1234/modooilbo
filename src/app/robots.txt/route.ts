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

function allowedGroup(userAgent: string) {
  return [`User-agent: ${userAgent}`, "Allow: /", `Disallow: ${CRAWL_BLOCK}`].join("\n");
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
