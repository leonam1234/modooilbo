// 자동 생성 파일 — 직접 수정 금지. `npm run content`로 생성.
// 전체 기사 중 가장 늦은 발행 시각(속보 시효 기준점).
export const NEWEST_PUBLISHED_AT = "2026-08-08T12:16:00Z";

// 코퍼스 지문 — /articles-index.json 의 캐시 무효화 키.
// 인덱스는 이름이 고정된 대용량 파일(gzip 160KB+)이라, 버전 쿼리 없이는
// public/_headers 에서 장기 캐시를 걸 수 없다(새 기사가 안 보임).
// 목차가 바뀔 때만 값이 바뀌므로 `?v=` 를 붙이면 장기 캐시가 안전해진다.
export const CONTENT_VERSION = "ef5f3e9e0dea";
