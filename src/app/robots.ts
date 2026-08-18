import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// 정적 export 호환: 빌드 타임에 robots.txt 생성
export const dynamic = "force-static";

// 정책: 뉴스 인용·발견성(GEO/AEO) 극대화를 위해 주요 AI 크롤러를 명시 허용한다.
const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
];

// ⚠️ /search 는 크롤을 막는다(2026-08-18).
// 기사마다 태그 10개가 `/search/?q=<태그>` 링크로 걸려 산출물에 고유 검색 URL이 6,350개 생긴다.
// 구글이 그중 1,479개를 실제로 크롤했고(GSC 'NOINDEX 제외' 항목의 정체가 전부 이 URL이었다),
// noindex라 색인은 안 되지만 **크롤 예산을 통째로 태웠다**. 같은 시점 기사 968편 중 색인은 546편,
// 357편은 '발견됨-색인 안 됨' 상태였다. 검색 결과 페이지는 색인 가치가 0이므로 크롤 자체를 끊는다.
// (noindex 메타는 그대로 두되, robots 차단으로 크롤러가 애초에 방문하지 않게 한다.)
// 태그 링크 쪽에도 rel="nofollow"를 달아 링크 신호가 새지 않게 이중으로 막았다.
const CRAWL_BLOCK = ["/search"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: CRAWL_BLOCK },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: CRAWL_BLOCK })),
    ],
    sitemap: [
      `${SITE.url}/sitemap.xml`,
      `${SITE.url}/news-sitemap.xml`,
    ],
  };
}
