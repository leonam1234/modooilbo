import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { ALL_ARTICLES } from "@/lib/news";

// 정적 export 호환: 빌드 타임에 sitemap.xml 생성
export const dynamic = "force-static";

const BASE = "https://modooilbo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/search",
    "/media",
    "/about",
    "/careers",
    "/subscribe",
    "/newsletter",
    "/advertise",
    "/tips",
    "/contact",
    "/ethics",
    "/login",
    "/register",
    "/terms",
    "/privacy",
  ];

  // trailingSlash: true 설정과 일치하도록 모든 URL에 끝 슬래시 — 308 리다이렉트/non-canonical 경고 방지
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}/`,
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.6,
  }));

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE}/${c.slug}/`,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  const articleEntries: MetadataRoute.Sitemap = ALL_ARTICLES.map((a) => ({
    url: `${BASE}/article/${a.slug}/`,
    // publishedAt은 KST 벽시계-as-Z 규약 — 9시간 빼서 실제 UTC 시각으로 보정
    lastModified: new Date(new Date(a.updatedAt ?? a.publishedAt).getTime() - 9 * 3600 * 1000),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...articleEntries];
}
