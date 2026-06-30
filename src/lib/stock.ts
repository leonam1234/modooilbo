import type { ArticleListItem } from "./types";

/**
 * 기사 표시용 이미지 해석.
 * - 실제 사진 URL이 있으면 그대로 사용.
 * - picsum 등 무작위 플레이스홀더면 → 셀프호스팅 스톡(`/stock/<id>.jpg`)으로 대체.
 *
 * 스톡 이미지는 `scripts/fetch-stock.mjs`로 loremflickr에서 한 번 받아 public/stock/에 저장한다.
 * → 우리 도메인(Cloudflare CDN)에서 서빙되어 빠르고 캐시된다(외부 핫링크 지연 제거).
 *
 * ⚠️ 라이선스: 원본은 loremflickr가 서빙한 Flickr CC 이미지(무료, 일부 저작자 표시 필요).
 *    본격 운영 시 Unsplash/Pexels API 또는 통신사 구독으로 교체하고 imageSource/license 기록 권장.
 */

const PLACEHOLDER = /picsum\.photos|placehold|placeholder|via\.placeholder|dummyimage/i;

export function isPlaceholderImage(url?: string): boolean {
  return !url || PLACEHOLDER.test(url);
}

/** 카드/히어로/상세에 표시할 이미지 URL. 플레이스홀더면 셀프호스팅 스톡(/stock/<id>.jpg). */
export function displayImageUrl(article: ArticleListItem): string {
  if (!isPlaceholderImage(article.imageUrl)) return article.imageUrl;
  return `/stock/${article.id}.jpg`;
}
