export const EDITORIAL_SERIES = [
  {
    slug: "notice-check",
    name: "공고 원문검증",
    description: "공고문과 실제 신청 화면을 함께 대조해 자격·마감·예외·서로 다른 표기를 확인합니다.",
  },
  {
    slug: "data-crosscheck",
    name: "데이터 교차검증",
    description: "서로 다른 공식 데이터의 기준을 맞추고 계산법과 한계를 공개해 숫자 뒤의 의미를 확인합니다.",
  },
  {
    slug: "on-the-record",
    name: "답변을 받았습니다",
    description: "당사자·기관·전문가에게 직접 묻고 실제 답변을 받은 사안만 기록합니다.",
  },
] as const;

export type EditorialSeriesSlug = (typeof EDITORIAL_SERIES)[number]["slug"];

export function getEditorialSeries(slug?: string) {
  return EDITORIAL_SERIES.find((series) => series.slug === slug);
}
