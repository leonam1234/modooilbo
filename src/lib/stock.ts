import type { ArticleListItem } from "./types";

/**
 * 기사 표시용 이미지 해석.
 * - 실제 사진 URL이 있으면 그대로 사용.
 * - picsum 등 무작위 플레이스홀더면 → 무료 스톡(loremflickr, 카테고리 키워드·그레이스케일·기사 고정)으로 대체.
 *
 * ⚠️ 라이선스: loremflickr는 Flickr의 CC 라이선스 이미지를 키워드로 서빙한다(무료, 상업이용 가능 범위 다양·일부 저작자 표시 필요).
 *    "일단" 데모/운영 초기용. 본격 운영 시에는 Unsplash/Pexels API(깨끗한 라이선스) 또는 통신사 구독으로 교체하고,
 *    기사 데이터에 imageSource/license 필드를 함께 저장할 것(editorial/ 저작권·인용윤리 데스크 참조).
 */

const PLACEHOLDER = /picsum\.photos|placehold|placeholder|via\.placeholder|dummyimage/i;

export function isPlaceholderImage(url?: string): boolean {
  return !url || PLACEHOLDER.test(url);
}

// 카테고리 → 무료 스톡 검색 키워드(영문 단일 키워드 = 결과 풀 넓어 안정적)
const STOCK_KEYWORD: Record<string, string> = {
  politics: "parliament",
  economy: "finance",
  society: "city",
  world: "earth",
  culture: "art",
  sports: "stadium",
  tech: "technology",
  opinion: "newspaper",
};

// 기사 id → 안정적인 lock 숫자 (같은 기사 = 항상 같은 이미지)
function lockFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 900) + 1;
}

/** 카드/히어로/상세에 표시할 이미지 URL. 플레이스홀더면 무료 스톡(컬러)으로 대체. */
export function displayImageUrl(article: ArticleListItem, w = 1200, h = 800): string {
  if (!isPlaceholderImage(article.imageUrl)) return article.imageUrl;
  const kw = STOCK_KEYWORD[article.category] ?? "news";
  // 컬러 스톡(loremflickr). lock = 기사별 고정(새로고침해도 동일 이미지).
  return `https://loremflickr.com/${w}/${h}/${kw}?lock=${lockFromId(article.id)}`;
}
