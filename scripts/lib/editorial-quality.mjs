/**
 * 모두일보 편집 품질 8.5 모델.
 *
 * 검색엔진의 비공개 평가식을 흉내 내는 점수가 아니다. 출처 추적성, 취재·검증 증거,
 * 원자료 대비 추가 가치, 기사 완결성, 투명성, 발행 위생을 100점으로 측정하는 내부 출고 기준이다.
 */
export const QUALITY_SINCE = "2026-09-01";
export const QUALITY_PASS = 80;
export const QUALITY_TARGET = 85;
export const MAX_SAME_MINUTE = 4;

export const SOURCE_BASIS = ["primary", "mixed", "secondary"];
export const CONTACT_STATUS = ["not-needed", "contacted", "replied", "no-response", "declined"];
export const VISUAL_TYPE = ["original-photo", "source-photo", "editorial-illustration", "ai-illustration", "stock-photo"];
export const AI_ROLE = ["research-assist", "draft-assist", "copyedit", "image", "none"];

const HUMAN_REPORTING = new Set(["inquiry", "interview", "field", "follow-up"]);
const RESPONSE_REQUIRED = new Set(["inquiry", "interview", "follow-up"]);

export function list(value) {
  return String(value || "")
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function sourceUrls(paragraphs) {
  const sourceStart = paragraphs.findIndex((p) => /^#{1,6}\s*(출처(?:\s*메모)?|자료\s*출처|참고\s*자료)(?:\s|$)/.test(p));
  if (sourceStart < 0) return [];
  return [...new Set(paragraphs.slice(sourceStart).join(" ").match(/https?:\/\/[^\s)\]}>]+/g) || [])];
}

export function assessEditorialQuality({ file, fm, paragraphs, publishedAt, sameMinuteCount = 1 }) {
  const pubDay = publishedAt.slice(0, 10);
  const inScope = pubDay >= QUALITY_SINCE;
  const errors = [];
  const warnings = [];
  const reporting = String(fm.reporting || "").trim();
  const reportingType = String(fm.reportingType || "").trim();
  const verificationNote = String(fm.verificationNote || "").trim();
  const addedValue = String(fm.addedValue || "").trim();
  const sourceBasis = String(fm.sourceBasis || "").trim();
  const contactStatus = String(fm.contactStatus || "").trim();
  const visualType = String(fm.visualType || "").trim();
  const aiRoles = list(fm.aiRole);
  const urls = sourceUrls(paragraphs);
  const sourceIndex = paragraphs.findIndex((p) => /^#{1,6}\s*출처/.test(p));
  const bodyOnly = paragraphs.slice(0, sourceIndex < 0 ? paragraphs.length : sourceIndex).join(" ");
  const textLength = bodyOnly.replace(/[#*_`]/g, "").length;
  const sectionCount = paragraphs.filter((p) => /^##\s+/.test(p) && !/^##\s*출처/.test(p)).length;
  const tags = list(fm.tags);

  if (inScope) {
    if (verificationNote.length < 20) errors.push("verificationNote는 실제 확인 행위를 20자 이상으로 적어야 합니다.");
    if (addedValue.length < 20) errors.push("addedValue는 원자료에 더한 독자 가치를 20자 이상으로 적어야 합니다.");
    if (!SOURCE_BASIS.includes(sourceBasis)) errors.push(`sourceBasis가 필요합니다(${SOURCE_BASIS.join(", ")}).`);
    if (!VISUAL_TYPE.includes(visualType)) errors.push(`visualType이 필요합니다(${VISUAL_TYPE.join(", ")}).`);
    if (!aiRoles.length || aiRoles.some((v) => !AI_ROLE.includes(v)) || (aiRoles.includes("none") && aiRoles.length > 1)) {
      errors.push(`aiRole이 필요합니다(${AI_ROLE.join(", ")}; none은 단독 사용).`);
    }
    if (!["sponsored", "wire"].includes(reporting) && urls.length < 1) errors.push("본문의 출처 메모에 원문 URL이 1개 이상 필요합니다.");
    if (reporting === "direct" && reportingType === "data-analysis" && urls.length < 2) {
      errors.push("자체 데이터 분석은 서로 구분되는 원문 URL이 2개 이상 필요합니다.");
    }
    if (reporting === "direct" && RESPONSE_REQUIRED.has(reportingType) && contactStatus !== "replied") {
      errors.push(`${reportingType}을 직접취재로 분류하려면 contactStatus: replied가 필요합니다.`);
    }
    if (reporting === "direct" && HUMAN_REPORTING.has(reportingType) && !CONTACT_STATUS.includes(contactStatus)) {
      errors.push(`contactStatus가 필요합니다(${CONTACT_STATUS.join(", ")}).`);
    }
    if (sameMinuteCount > MAX_SAME_MINUTE) {
      errors.push(`같은 분에 ${sameMinuteCount}편이 배정됐습니다(상한 ${MAX_SAME_MINUTE}편). 발행 시각을 실제 출고 흐름에 맞게 분산하세요.`);
    }
    if (visualType === "ai-illustration" && !/AI\s*생성|인공지능\s*생성/i.test(String(fm.imageCaption || ""))) {
      errors.push("visualType: ai-illustration이면 imageCaption에 AI 생성 사실을 밝혀야 합니다.");
    }
  }

  const sourceScore = Math.min(15, urls.length * 5 + (urls.length ? 5 : 0)) + (["primary", "mixed"].includes(sourceBasis) ? 5 : 0);
  let evidenceScore = 0;
  if (reporting === "direct") {
    evidenceScore = HUMAN_REPORTING.has(reportingType) ? 20 : reportingType === "data-analysis" || reportingType === "document-verification" ? 18 : 10;
    if (contactStatus === "replied") evidenceScore += 5;
  } else if (reporting === "desk") {
    evidenceScore = 8 + (urls.length >= 2 ? 5 : 0);
  } else if (reporting) {
    evidenceScore = 5;
  }
  if (verificationNote.length >= 20) evidenceScore = Math.min(25, evidenceScore + 5);

  const valueScore = (addedValue.length >= 20 ? 10 : 0) + (sectionCount >= 2 ? 5 : 0) + (textLength >= 700 ? 5 : 0);
  const completenessScore = (String(fm.summary || "").trim().length >= 40 ? 5 : 0) + (textLength >= 500 ? 5 : 0) + (tags.length >= 5 ? 5 : 0);
  const transparencyScore = (reporting ? 4 : 0) + (sourceBasis ? 3 : 0) + (visualType ? 3 : 0);
  const hygieneScore = (sameMinuteCount <= MAX_SAME_MINUTE ? 5 : 0) + (aiRoles.length ? 5 : 0);
  const breakdown = {
    sources: Math.min(20, sourceScore),
    evidence: Math.min(25, evidenceScore),
    readerValue: Math.min(20, valueScore),
    completeness: Math.min(15, completenessScore),
    transparency: Math.min(10, transparencyScore),
    hygiene: Math.min(10, hygieneScore),
  };
  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  if (inScope && score < QUALITY_PASS) errors.push(`편집 품질 ${score}점으로 출고선 ${QUALITY_PASS}점 미달입니다.`);
  if (!inScope && score < QUALITY_TARGET) warnings.push(`현재 메타데이터 기준 ${score}점(목표 ${QUALITY_TARGET}점). 과거 기사 소급 보정은 선택 사항입니다.`);

  return { file, pubDay, inScope, score, breakdown, errors, warnings, urls: urls.length, reporting, reportingType };
}
