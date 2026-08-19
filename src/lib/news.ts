import type { Article } from "./types";
import { CONTENT_ARTICLES } from "./content.generated";

/** 전체 기사 데이터 (하드코딩 배치 + content/articles 에이전트 발행분) */
// 사이트 개설 초기 하드코딩 데모 기사 48편(articles.ts·articles2.ts)은 2026-08-19 제거했다.
// 날짜 없는 slug·실명 없는 일반화 본문이라 등록 유지 확인·포털 심사에서 자체 기사로 볼 수 없고,
// 원고(md) 945편 체제와 성격이 달랐다. 이제 기사는 content/articles/*.md 가 유일한 원천이다.
export const ALL_ARTICLES: Article[] = [...CONTENT_ARTICLES];

// slug 중복은 정적 라우트 충돌·조회 오동작으로 이어지므로 빌드에서 즉시 실패시킨다.
{
  const seen = new Set<string>();
  for (const a of ALL_ARTICLES) {
    if (seen.has(a.slug)) throw new Error(`중복 기사 slug: "${a.slug}" — content/articles와 하드코딩 배치를 확인하세요.`);
    seen.add(a.slug);
  }
}
