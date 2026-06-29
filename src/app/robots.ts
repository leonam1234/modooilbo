import type { MetadataRoute } from "next";

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: "https://modooilbo.com/sitemap.xml",
  };
}
