/** 기자 목록 페이지의 title/description 정본. Metadata와 OG/Twitter가 같은 값을 공유한다. */
export function reporterSeoText(
  reporter: { name: string; role: string; beat: string; expertise: string },
  page = 1,
): { title: string; description: string } {
  const baseTitle = `${reporter.name} ${reporter.role}`;
  // 빙 웹마스터 지적(2026-08-20) 반영 — 한 줄 소개만으로는 설명문이 너무 짧다.
  // 전문 분야와 확인 절차를 덧붙여 검색 결과에서 저자 전문성이 드러나게 한다.
  const pageLabel = page > 1 ? ` 기사 목록 ${page}페이지` : "";
  const description = `모두일보 ${reporter.name} ${reporter.role}${pageLabel} — ${reporter.beat} 전문 분야는 ${reporter.expertise}입니다. 공공 원자료를 직접 확인해 쓴 기사 목록과 취재윤리·이해상충 원칙, 편집국 연락 창구를 함께 안내합니다.`;

  if (page <= 1) {
    return { title: baseTitle, description };
  }

  return {
    title: `${baseTitle} (${page}페이지)`,
    description,
  };
}
