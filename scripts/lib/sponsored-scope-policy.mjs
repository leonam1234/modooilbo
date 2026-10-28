// Approved scope only; no filesystem or network side effects.
export const SPONSORED_SCOPE = Object.freeze({
  workId: "MOD-SPONSORED-20261028-321-325", date: "2026-10-28",
  author: "유수화", authorRole: "광고콘텐츠 책임 작성자",
  items: Object.freeze([
    { id: 321, slug: "rentalwiki-contract-comparison-guide", sponsor: "rentalwiki" },
    { id: 322, slug: "dubomflower-flower-store-preview", sponsor: "dubomflower" },
    { id: 323, slug: "brandmap-search-ai-observation-beta", sponsor: "brandmap" },
    { id: 324, slug: "grochi-pet-information-source-guide", sponsor: "grochi" },
    { id: 325, slug: "worktool-business-software-comparison", sponsor: "worktool" },
  ].map(Object.freeze)),
});
const names = new Set(SPONSORED_SCOPE.items.map(i => i.sponsor));
const person = v => String(v || "").normalize("NFKC").split("/")[0].trim();
const GROCHI_APPROVED_SCREENSHOT_CAPTION = "그로치 홈페이지 제공화면. 화면 속 반려동물 이미지는 사이트가 AI 생성 이미지로 안내한다. 2026년 10월 28일 확인.";
export function scopedSponsoredRole(fm, day) {
  return day === SPONSORED_SCOPE.date && fm.author === SPONSORED_SCOPE.author &&
    fm.reporting === "sponsored" && SPONSORED_SCOPE.items.some(i => i.slug === fm.slug && i.sponsor === fm.sponsor)
    ? SPONSORED_SCOPE.authorRole : undefined;
}
export function validateScopedSponsoredFields(fm, day, body = "") {
  const errors = [];
  const candidate = SPONSORED_SCOPE.items.find(i => i.slug === fm.slug);
  const relevant = names.has(fm.sponsor) || Boolean(candidate) ||
    (person(fm.author) === SPONSORED_SCOPE.author && day >= SPONSORED_SCOPE.date);
  if (fm.reporting === "sponsored" && day >= SPONSORED_SCOPE.date && !fm.sponsor) errors.push("sponsored에는 sponsor 광고주 식별자가 필요합니다");
  if (!relevant) return errors;
  if (day !== SPONSORED_SCOPE.date || !candidate || candidate.sponsor !== fm.sponsor) errors.push("이번 광고321~325의 날짜/slug/sponsor 범위를 벗어났습니다");
  if (fm.author !== SPONSORED_SCOPE.author || fm.reporting !== "sponsored") errors.push("유수화 책임 명의는 승인5편 sponsored에만 허용하며 기자 직함을 만들지 않습니다");
  if (!String(fm.title || "").startsWith("[광고] ")) errors.push("승인 광고5편 제목의 [광고] 표시가 필요합니다");
  const first = String(body).trim().replace(/^#{1,6}[^\n]*\n+/, "").split(/\n\s*\n/)[0] || "";
  if (!/광고/.test(first) || !/(유료|비용|광고비)/.test(first)) errors.push("첫 문단에 유료 제작 광고 고지가 필요합니다");
  const caption=String(fm.imageCaption || "");
  const approvedEmbeddedAI=day===SPONSORED_SCOPE.date && candidate?.id===324 && fm.sponsor==='grochi' && fm.author===SPONSORED_SCOPE.author && fm.reporting==='sponsored' && fm.visualType==='source-photo' && caption===GROCHI_APPROVED_SCREENSHOT_CAPTION;
  if(candidate?.id===324 && !approvedEmbeddedAI) errors.push("324 제공화면은 승인된 정확한 캡션으로 화면 속 AI 이미지 고지를 유지해야 합니다");
  if (fm.visualType !== "source-photo" || !caption.trim() || (!approvedEmbeddedAI && /AI\s*생성|가상\s*(?:사진|이미지)/i.test(caption))) errors.push("실제 제공/사이트 화면은 source-photo와 사실에 맞는 캡션을 사용해야 합니다");
  return errors;
}
export function validateScopedSponsoredManifest(manifest, rows, day) {
  const relevant = manifest.workId === SPONSORED_SCOPE.workId ||
    rows.some(r => names.has(r.fm?.sponsor) || (person(r.fm?.author) === SPONSORED_SCOPE.author && day >= SPONSORED_SCOPE.date));
  if (!relevant) return [];
  const errors = [];
  if (manifest.workId !== SPONSORED_SCOPE.workId || manifest.date !== SPONSORED_SCOPE.date || manifest.items?.length !== 5 || rows.length !== 5) errors.push("광고5편 책임 명의는 정확한 업무/날짜/전체5 manifest에 결속해야 합니다");
  for (const item of SPONSORED_SCOPE.items) if (manifest.items?.filter(i => i.id === item.id && i.slug === item.slug).length !== 1 ||
    rows.filter(r => r.fm?.slug === item.slug && r.fm?.sponsor === item.sponsor).length !== 1) errors.push("광고321~325 ID/slug/sponsor manifest 불일치: " + item.id);
  return errors;
}
export function sponsorNamesFromSource(source) {
  const body = String(source).match(/export const SPONSOR_NAMES[^=]*=\s*\{([\s\S]*?)\};/)?.[1];
  if (body === undefined) return new Set();
  return new Set([...body.matchAll(/^\s*"?([a-z][a-z0-9-]*)"?\s*:\s*"/gm)].map(m => m[1]));
}
export function packageImageFolders(rows) {
  const scoped=rows.length===5&&SPONSORED_SCOPE.items.every(i=>rows.filter(r=>r.fm?.slug===i.slug&&r.fm?.sponsor===i.sponsor&&scopedSponsoredRole(r.fm,SPONSORED_SCOPE.date)).length===1);
  return scoped ? [['images','.jpg'],['images','.png']] : [['images_1200x675_jpg','.jpg'],['images_png_source','.png']];
}
