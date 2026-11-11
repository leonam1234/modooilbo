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

// MOD-SPONSORED-20261111-BRAND20: NOW.md의 DOCX 원본 순번, 대상 도메인과 SHA.
// 배열의 앞 10개와 뒤 10개는 각각 KST 11월 11일과 12일 발행 후보입니다.
const BRAND_SUPPORT_SOURCES = [
  ["aisubclub.com", "AI구독클럽", "5d78bcccf895ebe49b980f212e2ea6582e12552e75b466aa107f080925e5137f"],
  ["smarttvrental.com", "TV렌탈", "2b485c78b6366d2505658794098644d4d7855a25f44055f6442af94ab22ef61e"],
  ["appliancesubscription.com", "가전구독", "6fd2d52b748071302c5861286c66ee4aa2f0057a7c0f62f258540b803a1277ba"],
  ["appliancerentalhub.com", "가전렌탈", "aca062ba2c72854f07e8d649ff275a003a14c37e93473ce7f1c756f54cc970e6"],
  ["airpurifierrental.com", "공기청정기렌탈", "340d3b93218fb2ac59ba8b3e856a112184712a635d50e59fa8e87c44ed841817"],
  ["grochi.wiki", "그로치", "b1fcea29325a73ef3d2edf05408f0d5e5f87489819460c5d7564fea46a81560f"],
  ["kimchifridgerental.com", "김치냉장고렌탈", "367efa0d2eb624b9b782c08174f79de8367c36ea832882d136ea70e99445ee17"],
  ["fridgesubscription.com", "냉장고렌탈", "77e6fb3b00db01559669167be4bf36c3bb41718fff22f6c57c2a97e07d78af78"],
  ["laptopsubscription.com", "노트북컴퓨터렌탈", "6fcc876b7dea7f7f4c3b2fef4aa355e9d74ae8af3095181a93d4d50ab5714193"],
  ["dubomflower.com", "두봄플라워", "d709ecaefb7b120abf841ee9ad21d47156f62470a8ffa9bb1778ec09416f223f"],
  ["rental.wiki", "렌탈위키", "bd0f0227f21352a33b6c7876f7293ef1d3db6aef492bfc815920f69152334302"],
  ["robotvacuumrental.com", "로봇청소기렌탈", "76705d95939197c24462ca176c9ee6fb1a9228c324cd49df1814b7786cc44b88"],
  ["brandmap.co.kr", "브랜드맵", "6fa31f4ab6b716b230c45d237e5c983536e1a3d1111db7f6ae325d32594ae801"],
  ["washersubscription.com", "세탁기렌탈", "e0004d65637ef330cad009c2229f948881f404c82ecea936add4ac7d3e131c1a"],
  ["dishwasherrent.com", "식기세척기렌탈", "a1f1ebd0b0ddccabe2a38e2402c21a272fdbbf91d4faec11230a6ac5ab663d3e"],
  ["icepurifier.com", "얼음정수기렌탈", "1be824d019e4ef89a3e0b989c423e65774ef20834ae85e27ec7afc429ec874b1"],
  ["airconsubscription.com", "에어컨렌탈", "883b72f25c7f51c62e36bfb009ccedad8f2f9bdb63676da330388d916f05015d"],
  ["worktool.wiki", "워크툴", "b71e5157b01c75d2201bfad4234d195a1c99ff2cda75adcc51fb3f32980915f0"],
  ["purifierrental.com", "정수기렌탈", "5b14016d275c1f7d2dd593f4eb766b8a55ef77b95939ac66d51bcc15b3ea7b21"],
  ["cleanerrentals.com", "청소기렌탈", "f49157c217772bf1afc9cd95ff025720705772b43644da28107124353d0b257f"],
];
const BRAND_SUPPORT_WORK = "MOD-SPONSORED-20261111-BRAND20";
export const BRAND_SUPPORT_FIELDS = [
  "sponsorMode", "sponsorSourceSHA256", "sponsorPublisherRelation", "sponsorRelationEvidence",
];

export function validateBrandSupport(fm, day, filename, duplicateKeys = []) {
  const index = BRAND_SUPPORT_SOURCES.findIndex(([domain]) => domain === fm.sponsor);
  if (index === -1 && !BRAND_SUPPORT_FIELDS.some(key => Object.hasOwn(fm, key))) return { errors: [] };

  const errors = [];
  const source = BRAND_SUPPORT_SOURCES[index];
  if (fm.sponsorMode !== BRAND_SUPPORT_WORK || !source || source[2] !== fm.sponsorSourceSHA256) {
    errors.push("무상 광고 업무 ID·대상 도메인·승인 DOCX SHA가 일치해야 합니다");
  }

  if (source) {
    const expectedDate = index < 10 ? "2026-11-11" : "2026-11-12";
    const expectedSlug = "brand20-" + source[0].replaceAll(".", "-");
    if (day !== expectedDate || fm.slug !== expectedSlug || filename !== expectedDate + "-" + expectedSlug + ".md") {
      errors.push("무상 광고의 승인 후보 날짜·slug·CMS 파일명이 일치해야 합니다");
    }
    if (fm.publishedAt && !fm.publishedAt.startsWith(expectedDate + " ")) {
      errors.push("무상 광고 발행 시각은 해당 승인 후보일의 KST 시각이어야 합니다");
    }
  }
  if (duplicateKeys.some(key => [...BRAND_SUPPORT_FIELDS, "sponsor", "slug", "reporting", "author", "title", "publishedAt"].includes(key))) {
    errors.push("무상 광고 고지 또는 식별 필드가 중복되었습니다");
  }
  if (fm.reporting !== "sponsored" || fm.author !== "김영환 / 경제부 기자" || !fm.title?.startsWith("[광고] ")) {
    errors.push("무상 광고는 reporting: sponsored, 김영환 / 경제부 기자, [광고] 제목을 사용해야 합니다");
  }

  const relation = fm.sponsorPublisherRelation?.trim();
  const evidence = fm.sponsorRelationEvidence?.trim();
  if (!relation || !relation.includes("발행인") || /미확인|미정|확인되지 않|확인 중|확인할 수 없/.test(relation) || !evidence || /^(?:없음|미정|미확인|TODO|TBD|N\/?A|-)$/i.test(evidence)) {
    errors.push("무상 광고는 기사별로 확인한 발행인 관계 고지와 검수 근거 참조가 필요합니다");
  }
  if (errors.length) return { errors };
  return { errors, disclosure: { mode: "unpaid-brand-support", name: source[1], publisherRelation: relation } };
}
