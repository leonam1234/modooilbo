import type { MetadataRoute } from "next";

// 정적 export 호환: 빌드 타임에 robots.txt 생성
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://signaljournal.kr/sitemap.xml",
  };
}
