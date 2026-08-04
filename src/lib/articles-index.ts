import { CONTENT_VERSION } from "./newest.generated";

/**
 * 검색·자동완성·최근 본 기사·스크랩 목록이 받아오는 기사 목차 URL.
 *
 * 왜 상수로 묶었나 — 이 파일은 gzip 160KB가 넘는데 이름이 고정이라, 버전 쿼리 없이
 * public/_headers 에서 장기 캐시를 걸면 새 기사가 검색에 안 잡힌다. 반대로 캐시를
 * 안 걸면 Pages 기본값(max-age=0, must-revalidate)이라 검색할 때마다 재검증이 붙는다.
 * CONTENT_VERSION(목차 지문)을 쿼리로 달아 두 문제를 동시에 없앤다:
 *   - 목차가 그대로면 URL도 그대로 → 브라우저 캐시에서 즉시(네트워크 0)
 *   - 기사가 추가되면 URL이 바뀜 → 새 파일로 취급되어 즉시 반영
 * 소비처가 4곳이라 문자열을 흩뿌리면 한 곳만 빠뜨려도 그 화면만 옛 목차를 본다.
 *
 * ⚠️ 임포트 대상은 반드시 newest.generated(상수 2개짜리 초경량 모듈)여야 한다.
 *    @/lib/news 를 거치면 클라이언트 번들에 코퍼스 전체가 실린다.
 */
export const ARTICLES_INDEX_URL = `/articles-index.json?v=${CONTENT_VERSION}`;
