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
    // 광고 식별값 — 검색·자동완성·최근 본 기사 카드가 이 JSON만 받아 그리므로,
    // 여기서 빠지면 그 화면들만 광고 표시 없이 렌더된다(2026-08-19 게이트에서 적발).
    ...(a.sponsor ? { sponsor: a.sponsor } : {}),
  }));
  // ⚠️ 정적 export는 이 Response의 헤더를 파일로 굽지 않는다 — 실제 서빙 캐시는
  //    public/_headers 의 /articles-index.json 규칙이 정한다(여기 값은 dev 전용).
  //    소비처는 반드시 ARTICLES_INDEX_URL(버전 쿼리 포함)로 부를 것: src/lib/articles-index.ts
  return Response.json(items, {
    headers: { "cache-control": "public, max-age=600" },
  });
}
