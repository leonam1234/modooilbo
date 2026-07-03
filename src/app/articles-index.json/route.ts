import { ALL_ARTICLES } from "@/lib/news";

// 정적 export 시 /articles-index.json 파일로 생성 — 스크랩 목록 등에서 id→기사 메타 매핑용.
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const items = ALL_ARTICLES.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    publishedAt: a.publishedAt,
    tags: a.tags,
  }));
  return Response.json(items, {
    headers: { "cache-control": "public, max-age=600" },
  });
}
