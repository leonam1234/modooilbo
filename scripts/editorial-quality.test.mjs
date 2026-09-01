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
  reviewedBy: "김영환",
  reviewedAt: "2026-09-01 09:05",
  reporterInsight: "이 공고의 핵심은 지원 규모보다 두 공식 화면의 마감 시각이 다르다는 점이다. 신청자는 더 이른 시각을 기준으로 서류를 준비하는 편이 안전하다.",
  category: "grants",
  readerChecklist: "신청 대상과 소재지 요건 확인 | 실제 접수 화면의 마감 시각 확인 | 필수 첨부서류와 문의처 확인",
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

const missingMethod = assessEditorialQuality({
  file: "missing-method.md",
  fm: { ...goodFrontmatter, category: "industry", reporting: "direct", reportingType: "data-analysis" },
  paragraphs: goodParagraphs,
  publishedAt: "2026-09-01T09:12:00Z",
  sameMinuteCount: 1,
});
assert.ok(missingMethod.errors.some((e) => e.includes("methodologyNote")), "자체 데이터 분석은 방법과 한계를 공개해야 한다.");

const lateReview = assessEditorialQuality({
  file: "late-review.md",
  fm: { ...goodFrontmatter, reviewedAt: "2026-09-01 09:11" },
  paragraphs: goodParagraphs,
  publishedAt: "2026-09-01T09:10:00Z",
  sameMinuteCount: 1,
});
assert.ok(lateReview.errors.some((e) => e.includes("배포 전에 검수")), "배포 뒤 검수시각을 허용하면 안 된다.");

// 회귀: publishedAt 을 정규화하지 않은 형태로 넘겨도 판정이 같아야 한다.
// 종전엔 리포트 스크립트가 "2026-09-01T09:10"(Z 없음)을 넘겨 로컬시각으로 파싱되는 바람에
// 검수가 발행보다 9시간 늦은 것처럼 보여 정상 원고 24편이 전부 오탐으로 잡혔다.
for (const raw of ["2026-09-01T09:10:00Z", "2026-09-01T09:10", "2026-09-01 09:10"]) {
  const r = assessEditorialQuality({
    file: "tz-" + raw + ".md",
    fm: { ...goodFrontmatter, reviewedAt: "2026-09-01 09:05" },
    paragraphs: goodParagraphs,
    publishedAt: raw,
    sameMinuteCount: 1,
  });
  assert.ok(!r.errors.some((e) => e.includes("배포 전에 검수")),
    `publishedAt 표기(${raw})에 따라 검수 시각 판정이 달라지면 안 된다.`);
}

console.log(`편집 품질 게이트 테스트 통과: 정상 ${passing.score}점 · 누락 ${missingEvidence.score}점 · 허위 인터뷰·배포 후 검수 차단`);
