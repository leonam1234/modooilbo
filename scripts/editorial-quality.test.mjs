#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { assessEditorialQuality, QUALITY_PASS } from "./lib/editorial-quality.mjs";

const goodFrontmatter = {
  reporting: "desk",
  verificationNote: "정부 공고문과 실제 신청 화면의 마감 시각과 자격 조건을 대조했다.",
  addedValue: "신청자가 놓치기 쉬운 마감 시각 차이와 필수 자격을 한눈에 정리했다.",
  sourceBasis: "primary",
  visualType: "ai-illustration",
  aiRole: "research-assist, draft-assist, copyedit, image",
  summary: "공식 원문 두 개를 대조해 신청 자격과 실제 마감 시각의 차이를 정리한 기사다.",
  imageCaption: "AI 생성 이미지. 실제 현장 사진이 아닙니다.",
  tags: "정부지원, 신청자격, 마감시각, 원문검증, 기업지원",
};
const goodParagraphs = [
  "신청자가 이해할 수 있는 충분한 본문이다. ".repeat(50),
  "## 신청 자격",
  "공고의 조건과 예외를 설명한다.",
  "## 독자가 볼 차이",
  "두 공식 화면의 마감 표기를 비교한다.",
  "## 출처 메모 - 기관: https://example.go.kr/a - 신청처: https://example.go.kr/b",
];

const passing = assessEditorialQuality({
  file: "passing.md",
  fm: goodFrontmatter,
  paragraphs: goodParagraphs,
  publishedAt: "2026-09-01T09:10:00Z",
  sameMinuteCount: 1,
});
assert.equal(passing.errors.length, 0, passing.errors.join("\n"));
assert.ok(passing.score >= QUALITY_PASS, `통과 샘플 점수 ${passing.score}`);

const missingEvidence = assessEditorialQuality({
  file: "missing-evidence.md",
  fm: { reporting: "desk" },
  paragraphs: ["짧은 본문"],
  publishedAt: "2026-09-01T09:10:00Z",
  sameMinuteCount: 5,
});
assert.ok(missingEvidence.errors.length >= 7, "필수 증거 누락과 동시발행을 차단해야 한다.");
assert.ok(missingEvidence.score < QUALITY_PASS, `실패 샘플 점수 ${missingEvidence.score}`);

const falseInterview = assessEditorialQuality({
  file: "false-interview.md",
  fm: { ...goodFrontmatter, reporting: "direct", reportingType: "interview", contactStatus: "contacted" },
  paragraphs: goodParagraphs,
  publishedAt: "2026-09-01T09:12:00Z",
  sameMinuteCount: 1,
});
assert.ok(falseInterview.errors.some((e) => e.includes("contactStatus: replied")), "답변 없는 인터뷰를 direct로 분류하면 안 된다.");

console.log(`편집 품질 게이트 테스트 통과: 정상 ${passing.score}점 · 누락 ${missingEvidence.score}점 · 허위 인터뷰 차단`);
