import type { MetadataRoute } from "next";
import { CATEGORIES, BIZ_CATEGORIES } from "@/lib/categories";
import { ALL_ARTICLES } from "@/lib/news";

// 정적 export 호환: 빌드 타임에 sitemap.xml 생성
export const dynamic = "force-static";

const BASE = "https://modooilbo.com";

// publishedAt은 KST 벽시계-as-Z 규약 — 9시간 빼서 실제 UTC로 보정(기사 엔트리와 동일 규약)
const latest = (list: typeof ALL_ARTICLES): Date | undefined =>
  list.length
    ? new Date(Math.max(...list.map((a) => new Date(a.updatedAt ?? a.publishedAt).getTime())) - 9 * 3600 * 1000)
    : undefined;

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
  "/policy": { changeFrequency: "monthly", priority: 0.3 },
  "/contact": { changeFrequency: "monthly", priority: 0.3 },
  "/terms": { changeFrequency: "monthly", priority: 0.3 },
  "/privacy": { changeFrequency: "monthly", priority: 0.3 },
  "/advertise": { changeFrequency: "monthly", priority: 0.3 },
  "/tips": { changeFrequency: "monthly", priority: 0.4 },
  // 주기적 갱신
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
    "/policy",
    "/terms",
    "/privacy",
  ];

  // trailingSlash: true 설정과 일치하도록 모든 URL에 끝 슬래시 — 308 리다이렉트/non-canonical 경고 방지
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => {
    const policy = STATIC_PATH_POLICY[p] ?? { changeFrequency: "monthly", priority: 0.3 };
    return {
      url: `${BASE}${p}/`,
      ...(p === "" ? { lastModified: latest(ALL_ARTICLES) } : {}),
      changeFrequency: policy.changeFrequency,
      priority: policy.priority,
    };
  });

  // 종합뉴스 + 사업 축(정부지원금 등, 기사가 붙어 승격된 것) 카테고리 목록 페이지
  const categoryEntries: MetadataRoute.Sitemap = [...CATEGORIES, ...BIZ_CATEGORIES].map((c) => ({
    url: `${BASE}/${c.slug}/`,
    lastModified: latest(ALL_ARTICLES.filter((a) => a.category === c.slug)),
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
