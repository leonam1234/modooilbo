import type { Article } from "./types";
import { NEWEST_PUBLISHED_AT } from "./newest.generated";

/**
 * 속보 시효 판정 — 전체 기사 배열이 아니라 "가장 최신 발행 시각" 상수 하나에만 의존한다.
 *
 * ⚠️ 이 모듈은 `lib/news`·`lib/queries`를 임포트하지 않는다(하면 안 된다).
 *    속보 배지(TypeBadge)는 ArticleCard가 그리고, ArticleCard는 클라이언트 컴포넌트에서도 쓰인다.
 *    여기서 전체 기사 배열을 끌어오면 그 경계를 넘는 라우트마다 코퍼스(수 MB)가 통째로 번들된다.
 *    (실제로 /search 청크가 3.5MB까지 부풀었던 원인)
 */

/** 속보 시효(48시간) — 벽시계(Date.now) 대신 '가장 최신 발행 시각' 기준이라 빌드 결정적.
 *  발행이 이어지는 한 이틀 지난 기사는 속보 취급이 자동 해제된다. */
export const BREAKING_TTL_MS = 48 * 60 * 60 * 1000;

export function isBreakingFresh(a: Pick<Article, "isBreaking" | "publishedAt">): boolean {
  if (!a.isBreaking) return false;
  return new Date(NEWEST_PUBLISHED_AT).getTime() - new Date(a.publishedAt).getTime() <= BREAKING_TTL_MS;
}
