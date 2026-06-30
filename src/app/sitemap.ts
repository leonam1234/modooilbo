import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { ALL_ARTICLES } from "@/lib/news";

// 정적 export 호환: 빌드 타임에 sitemap.xml 생성
export const dynamic = "force-static";

const BASE = "https://modooilbo.com";

const latest = (list: typeof ALL_ARTICLES): Date | undefined =>
  list.length ? new Date(Math.max(...list.map((a) => new Date(a.publishedAt).getTime()))) : undefined;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/media",
    "/about",
    "/careers",
    "/subscribe",
    "/newsletter",
    "/advertise",
    "/tips",
    "/contact",
    "/ethics",
    "/terms",
    "/privacy",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}/`,
    ...(p === "" ? { lastModified: latest(ALL_ARTICLES) } : {}),
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.6,
  }));

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE}/${c.slug}/`,
    lastModified: latest(ALL_ARTICLES.filter((a) => a.category === c.slug)),
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  const articleEntries: MetadataRoute.Sitemap = ALL_ARTICLES.map((a) => ({
    url: `${BASE}/article/${a.slug}/`,
    lastModified: new Date(a.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...articleEntries];
}
