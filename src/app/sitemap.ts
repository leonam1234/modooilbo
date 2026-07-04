import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { ALL_ARTICLES } from "@/lib/news";

// 정적 export 호환: 빌드 타임에 sitemap.xml 생성
export const dynamic = "force-static";

const BASE = "https://modooilbo.com";

const latest = (list: typeof ALL_ARTICLES): Date | undefined =>
  list.length ? new Date(Math.max(...list.map((a) => new Date(a.publishedAt).getTime()))) : undefined;

type PathPolicy = {
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const STATIC_PATH_POLICY: Record<string, PathPolicy> = {
  "": { changeFrequency: "daily", priority: 1 }, // 홈 — priority 1 보존
  // 불변 회사/정책 페이지
  "/about": { changeFrequency: "monthly", priority: 0.3 },
  "/careers": { changeFrequency: "monthly", priority: 0.3 },
  "/ethics": { changeFrequency: "monthly", priority: 0.3 },
  "/transparency": { changeFrequency: "monthly", priority: 0.3 },
  "/corrections": { changeFrequency: "monthly", priority: 0.3 },
  "/contact": { changeFrequency: "monthly", priority: 0.3 },
  "/terms": { changeFrequency: "monthly", priority: 0.3 },
  "/privacy": { changeFrequency: "monthly", priority: 0.3 },
  "/advertise": { changeFrequency: "monthly", priority: 0.3 },
  "/tips": { changeFrequency: "monthly", priority: 0.4 },
  // 주기적 갱신
  "/media": { changeFrequency: "weekly", priority: 0.5 },
  "/subscribe": { changeFrequency: "weekly", priority: 0.5 },
  "/newsletter": { changeFrequency: "weekly", priority: 0.5 },
  // noindex(thin) — 최소 신호
  "/search": { changeFrequency: "monthly", priority: 0.2 },
  "/login": { changeFrequency: "yearly", priority: 0.1 },
  "/register": { changeFrequency: "yearly", priority: 0.1 },
};

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
    "/transparency",
    "/corrections",
    "/terms",
    "/privacy",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => {
    const policy = STATIC_PATH_POLICY[p] ?? { changeFrequency: "monthly", priority: 0.3 };
    return {
      url: `${BASE}${p}/`, // URL 생성 그대로 — 끝슬래시 동작 불변(3단계 보존)
      ...(p === "" ? { lastModified: latest(ALL_ARTICLES) } : {}),
      changeFrequency: policy.changeFrequency,
      priority: policy.priority,
    };
  });

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
