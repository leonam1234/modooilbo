/**
 * 모두일보 콘텐츠 이용 정책의 사람이 읽는 정본.
 *
 * robots.txt의 크롤러 분류, 기사 하단, 푸터, 약관·운영정책이 이 원칙을
 * 서로 다르게 설명하지 않도록 공통 문구는 여기서 가져간다.
 */
export const CONTENT_USE_POLICY = {
  shortLabel: "검색·인용 허용 / AI 모델 학습 금지",
  attribution:
    "검색 결과와 AI 답변에서의 요약·인용은 ‘모두일보’와 해당 기사 원문 URL을 함께 표시하는 조건으로 허용합니다.",
  training:
    "기사·이미지를 AI 모델의 학습 또는 미세조정 데이터로 수집·이용하는 것은 허용하지 않습니다.",
  articleNotice:
    "ⓒ 모두일보(modooilbo.com) — 출처·원문 링크를 표시한 검색·요약·인용 허용 / 무단 전재·재배포 및 AI 모델 학습 금지",
} as const;

/** 검색 색인·실시간 답변·사용자 요청에만 쓰이는 크롤러. */
export const SEARCH_AND_CITATION_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
] as const;

/** 학습 또는 검색+학습 혼합 용도로 공지된 크롤러. */
export const TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "meta-externalagent",
] as const;
