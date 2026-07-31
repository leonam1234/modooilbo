import { ALL_ARTICLES } from "@/lib/news";
import type { ArticleIndexItem } from "@/lib/types";

/**
 * 정적 export 시 /articles-index.json 파일로 생성.
 *
 * 소비처: 헤더 검색 오버레이(자동완성) · /search(전체 검색) · 최근 본 기사 · 계정 스크랩 목록.
 * 본문(body)은 담지 않는다 — 본문이 전체 데이터의 83%라, 넣는 순간 이 파일이 수 MB가 된다.
 * 대신 카드 렌더에 필요한 필드까지 담아(ArticleIndexItem) 검색 화면이 이 JSON만으로 결과를 그린다.
 *
 * ⚠️ 인덱스를 쓰는 화면은 반드시 fetch로 받아야 한다.
 *    클라이언트 컴포넌트가 `@/lib/news`를 임포트하면 코퍼스가 그대로 번들에 실린다.
 */
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const items: ArticleIndexItem[] = ALL_ARTICLES.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    category: a.category,
    publishedAt: a.publishedAt,
    tags: a.tags,
    author: a.author,
    imageUrl: a.imageUrl,
    ...(a.type ? { type: a.type } : {}),
    ...(a.isBreaking ? { isBreaking: true } : {}),
  }));
  return Response.json(items, {
    headers: { "cache-control": "public, max-age=600" },
  });
}
