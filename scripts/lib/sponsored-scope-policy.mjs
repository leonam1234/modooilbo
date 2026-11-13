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
    const originalDate = index < 10 ? "2026-11-11" : "2026-11-12";
    const resumed = day === "2026-11-13" && (index < 9 || index === 12 || index === 17);
    const expectedDate = resumed ? day : originalDate;
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

// DOCX source members and visible captions from the three approved manuscripts.
const BRAND_ORIGINAL_IMAGES = {
  "brand20-appliancerentalhub-com": {"groups":[[["3","jpg","e7f80189eca413fa6c3a6bec03a16f22073d4e21de0efdb1510143f256106841"],["4","jpg","ff1e1d68134f8d36da7000127c98c2362c24f6c2fc27c93248935451746dc355"]]],"captions":["왼쪽은 식기세척기, 오른쪽은 로봇청소기 출시 자료사진. 본문의 DW30FB305CW0·VR70F00AGG98C는 요금 사례이며 사진 속 모델 번호는 확인되지 않았다. 사진 삼성전자 뉴스룸."],"representativeCaption":"식기세척기 출시 자료사진. 본문의 요금 사례 모델과 동일한지는 확인되지 않았다. 사진 삼성전자 뉴스룸."},
  "brand20-brandmap-co-kr": {"groups":[[["1","png","1d6c401fc4b904be1aaca89ec83936f17fb5ccd3a6fe123971f0622383d73746"]],[["2","png","19dc2a63e6d6cb790045922d8f3065b94bf87c812e7fda1b111efb9e0093b6db"]]],"captions":["브랜드맵 삼성 저장 결과. 91.58은 추천 빈도와 순서 등으로 계산한 브랜드맵 지수다. 11월 11일 캡처. [1]","제공 원고에 포함된 퍼플렉시티 답변의 비교표 일부. 표에 표시된 인용은 이 답변 화면의 일부이며 제조사가 답변 전체를 확인했다는 뜻은 아니다."]},
  "brand20-worktool-wiki": {"groups":[[["3","png","02089bbab1597d6f60613650642412174e0fd104de1b28b0a5557b45b1646024"]],[["5","png","8734c1bd532955be0ebbf1ed028a0d1e0acb253eeccb3539aef46a32905d7e04"]],[["1","png","3e82b2b6367100deb288e7862a76965b84ad46ec25ce041d3404e15ed8010fb0"]],[["2","png","cacd8d830952794e1b3c5a550777c90c7713bef38aea307fb87aeb76ea24584e"]]],"captions":["Zoom 공식 도움말의 PC 녹화 메뉴 안내. 11월 11일 화면 캡처.","Google Meet 회의 중 녹화 시작 버튼. 말레이시아 정부 MyGovUC 이용 안내서 32쪽 그림 41 발췌."]},
};

export function brandOriginalAssets(slug, date) {
  const original = Object.hasOwn(BRAND_ORIGINAL_IMAGES, slug) && BRAND_ORIGINAL_IMAGES[slug];
  if (date !== "2026-11-13" || !original) return [];
  return original.groups.flatMap(group => group.map(([member, ext, sha256]) => ({
    objectKey: date + "-" + slug + "-original-" + member + "." + ext,
    sha256,
  })));
}

// One block per source paragraph. The last WorkTool block is editorial reference material.
export function validateBrandOriginalImages(fm, day, filename, body, duplicateKeys = []) {
  const slug = fm.slug;
  const expected = brandOriginalAssets(slug, day);
  const usesOriginals = Object.hasOwn(fm, "sponsorOriginalImages");
  const hasBlock = /(?:^|\n):::brand-images\b/.test(body);
  if (!expected.length && !usesOriginals && !hasBlock) return { errors: [], assets: [] };
  const errors = [];
  const brand = validateBrandSupport(fm, day, filename, duplicateKeys);
  if (fm.sponsorOriginalImages === "single-approved-representative") {
    const representative = "/stock/" + day + "-" + slug + ".jpg";
    if (!expected.length || !brand.disclosure || fm.image !== representative ||
        fm.visualType !== "source-photo" || !fm.imageCaption?.trim() ||
        fm.inlineImages || fm.inlineImagesApprovedBy ||
        duplicateKeys.some(key => ["sponsorOriginalImages", "image", "imageCaption", "visualType", "inlineImages", "inlineImagesApprovedBy"].includes(key)) ||
        /:::brand-images\b|!\[|<\/?(?:img|picture|source)\b|\/stock\/[^\s)]+-original-\d+\.(?:jpg|png)/i.test(body)) {
      return { errors: ["승인 무상 광고 단일 대표 이미지 범위 또는 본문 이미지 혼용"], assets: [] };
    }
    return { errors: [], assets: [] };
  }
  if (!expected.length || fm.sponsorOriginalImages !== "docx-originals" || !brand.disclosure ||
      duplicateKeys.includes("sponsorOriginalImages") || duplicateKeys.includes("image")) {
    return { errors: ["승인된 무상 광고 원본 이미지 범위 불일치"], assets: [] };
  }
  const original = BRAND_ORIGINAL_IMAGES[slug];
  const blocks = body.split(/\n\s*\n+/).map(part => part.trim());
  const sourceIndex = blocks.indexOf("## 출처 메모");
  const images = blocks.map((block, index) => ({ block, index })).filter(({block}) => block.startsWith(":::brand-images"));
  if (images.length !== original.groups.length || sourceIndex < 0 || images.some(({index}) => index >= sourceIndex)) {
    errors.push("DOCX 본문 이미지 묶음과 배치 누락");
  }
  let offset = 0;
  images.forEach(({block}, index) => {
    const group = original.groups[index];
    if (!group) return;
    const keys = expected.slice(offset, offset + group.length).map(asset => "/stock/" + asset.objectKey);
    offset += group.length;
    const match = block.match(/^:::brand-images (\/stock\/[^\s]+(?: \/stock\/[^\s]+)*)\n([^\n]+)\n:::$/);
    if (!match || match[1] !== keys.join(" ")) {
      errors.push("DOCX 이미지 순서 또는 원본 파일명 불일치");
      return;
    }
    if (index < original.captions.length) {
      if (match[2] !== original.captions[index]) errors.push("검수 고정 캡션 불일치");
    } else if (!match[2].startsWith("참고 이미지. ") || match[2].length <= "참고 이미지. ".length) {
      errors.push("원 DOCX 미참조 이미지는 검수한 참고 이미지 캡션 필요");
    }
  });
  if (fm.image !== "/stock/" + expected[0].objectKey || fm.imageCaption !== (original.representativeCaption ?? original.captions[0]) ||
      fm.visualType !== "source-photo" || fm.inlineImages || fm.inlineImagesApprovedBy ||
      /!\[[^\]]*\]\(/.test(body) || (body.match(/:::brand-images\b/g) || []).length !== images.length) {
    errors.push("DOCX 대표 메타 또는 원본 이외 이미지 참조 불일치");
  }
  return { errors, assets: errors.length ? [] : expected };
}
