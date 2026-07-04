import type { Article } from "./types";
import { ARTICLES as BATCH_1 } from "./articles";
import { ARTICLES_2 as BATCH_2 } from "./articles2";
import { CONTENT_ARTICLES } from "./content.generated";

/** 전체 기사 데이터 (하드코딩 배치 + content/articles 에이전트 발행분) */
export const ALL_ARTICLES: Article[] = [...CONTENT_ARTICLES, ...BATCH_1, ...BATCH_2];

// slug 중복은 정적 라우트 충돌·조회 오동작으로 이어지므로 빌드에서 즉시 실패시킨다.
{
  const seen = new Set<string>();
  for (const a of ALL_ARTICLES) {
    if (seen.has(a.slug)) throw new Error(`중복 기사 slug: "${a.slug}" — content/articles와 하드코딩 배치를 확인하세요.`);
    seen.add(a.slug);
  }
}
