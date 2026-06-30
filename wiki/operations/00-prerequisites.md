# 00 · 선행조건 (Prerequisites) — 1순위

> 2·3순위 작업의 **전제**. 이게 없으면 신뢰·성장 작업이 공중에 뜬다. CMS는 기술 척추, 유통·법적등록은 한국에서 "뉴스"를 영리 발행하기 위한 운영 면허 레이어다.

---

## A. CMS 실데이터화 (매체의 척추)

### 왜 필요한가
지금은 기사가 `src/lib/articles.ts`/`articles2.ts`에 하드코딩된 더미 62건이다. 기자가 글을 발행할 수단이 없으면 매체가 아니다. **나머지 모든 항목(기자 프로필·정정보도·뉴스레터·수익)이 실데이터를 전제**한다.

### 현재 상태
- 데이터 단일 출처: `lib/news.ts`(`ALL_ARTICLES`) → `lib/queries.ts` → 페이지. → [03-content-model](../03-content-model.md)
- 타입: `Article`(id/slug/title/summary/body/category/author/publishedAt/imageUrl/tags/isLead/isBreaking/readCount/type/imageCaption?/imageAlt?/updatedAt?).

### 정적 export 제약
- **빌드타임 주입은 가능**: 빌드 시 CMS API를 호출해 `getAllArticles()` 소스만 교체하면 정적 export 유지 가능. 발행→재빌드(웹훅 트리거) 흐름.
- **실시간 반영(발행 즉시 노출)은 불가**: ISR/온디맨드 재검증이 필요 → `@opennextjs/cloudflare`(Workers) 승급. → [03 실시간성](03-supplementary.md), [06-deployment §5](../06-deployment.md)

### 구현 방향
1. **CMS 선택**: Sanity / Contentful / Strapi(자체호스팅) / Payload. 한국어·이미지·역할권한 고려. 초기엔 Sanity(무료티어·구조화 콘텐츠) 권장.
2. **어댑터 레이어**: `lib/queries.ts`의 시그니처를 유지한 채 내부 구현만 CMS fetch로 교체(컴포넌트 변경 0). 더미데이터는 폴백/시드로 보존.
3. **빌드 트리거**: CMS 발행 웹훅 → Cloudflare Pages Deploy Hook → 재빌드. 잦은 발행이면 Workers 승급 후 ISR.
4. **이미지**: CMS 미디어 → Cloudflare Images 로더(현재 `images.unoptimized` 대체). → [03 이미지](03-supplementary.md)

### 완료 기준 ✅
- [ ] 기자가 CMS UI에서 기사 작성→발행→사이트 반영(재빌드 포함)
- [ ] `queries.ts` 시그니처 불변, 컴포넌트 무수정
- [ ] 더미데이터 완전 제거 또는 시드로 격리, `isLead` 1건 불변식 유지
- [ ] sitemap/news-sitemap/RSS가 실기사 자동 반영

### 위험
- 불변식 위반(렌더중 `new Date()`/`Math.random()`) 재발 주의 — CMS 날짜는 ISO로 받아 `formatKoreanDateTime`(UTC) 사용. → [08](../08-conventions.md)

---

## B. 한국 뉴스 유통 채널 등록

### 왜 필요한가
**한국 뉴스 트래픽의 대부분은 구글이 아니라 네이버·다음**이다. 구글 SEO만으로는 국내 도달이 절반도 안 된다.

### 채널별 액션
| 채널 | 단계 | 비고 |
|------|------|------|
| **네이버** | 서치어드바이저 사이트등록 → **뉴스 검색제휴 → CP(콘텐츠제휴)** | 뉴스제휴평가위원회 심사(발행이력·자체기사 비율·등록증 요구). 가장 중요·가장 어려움 |
| **다음(카카오)** | 다음 검색등록 → 뉴스 제휴 | |
| **Google News** | Publisher Center 등록 + News sitemap 제출 | `news-sitemap.xml` 이미 생성됨(`src/app/news-sitemap.xml/route.ts`) → 바로 활용 |
| **네이버 RSS** | RSS 제출 | `rss.xml` 존재(dc:creator/enclosure 보강됨) |

### 현재 상태
- `google`/`naver-site-verification` 토큰은 `src/app/layout.tsx`에 이미 존재.
- news-sitemap·RSS 준비 완료. **남은 건 운영측 등록 절차**(코드 아님).

### 완료 기준 ✅
- [ ] 네이버 서치어드바이저 sitemap·RSS 제출, CP 신청
- [ ] Google News Publisher Center 등록·news-sitemap 제출
- [ ] 다음 검색·뉴스 제휴 신청

### 위험
- 제휴 심사는 **실제 발행 이력·등록증**을 요구 → A(CMS)·C(법적등록) 선행 필요.

---

## C. 인터넷신문 법적 등록 (한국)

### 왜 필요한가
한국에서 뉴스를 영리 목적으로 정기 발행하려면 **신문법상 인터넷신문 등록**(관할 시·도청)이 사실상 필수. 미등록 시 언론 활동·제휴·광고에 제약. 언론중재법 적용 대상도 됨.

### 액션 / 표기 의무
- 인터넷신문 등록(발행인·편집인·발행 정보), **등록번호** 푸터 표기.
- **청소년보호책임자** 지정·표기(정보통신망법).
- 발행인/편집인/사업자 정보 일관 표기 — 이미 `src/lib/site.ts`(SITE 상수)로 일원화됨 → 실값으로 교체만.
- `src/app/ethics/page.tsx`에 편집위원회·청소년보호·정정반론 정책문 골격 존재 → 실제 운영 주체·연락처로 갱신.

### 정적 export 제약
없음(전부 정적 텍스트/표기). `src/lib/site.ts` 한 곳을 실값으로 채우면 Footer/about/contact/JSON-LD가 일괄 반영.

### 완료 기준 ✅
- [ ] 인터넷신문 등록 완료, 등록번호 `SITE` 상수에 반영·푸터 표기
- [ ] 청소년보호책임자 표기
- [ ] `SITE`의 placeholder(전화 `02-1234-5678` 등)를 실값으로 교체
- [ ] ethics 페이지를 실제 정책·연락처로 갱신

### 위험
- placeholder 연락처가 운영 전환 후에도 남으면 NAP/신뢰 훼손 → 등록 직후 최우선 교체.
