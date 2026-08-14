# 01 · 신뢰·E-E-A-T (2순위)

> 구글 뉴스/검색은 "누가 썼고, 책임지는가, 틀리면 고치는가, 콘텐츠 권리는 적법한가"를 본다(E-E-A-T: Experience·Expertise·Authoritativeness·Trust). 이 셋은 **검색 신뢰 + 언론 법무**를 동시에 충족하는 운영 시스템이다. 전부 정적 export 안에서 가능.

---

## ④ 기자 프로필 시스템

### 왜 필요한가
저자 권위는 뉴스 E-E-A-T의 핵심 축. 구글은 `author` 엔티티(Person)와 저자 페이지를 연결해 신뢰·지식패널을 평가한다. 현재 기사 JSON-LD `author`는 이름만 있고 **연결된 프로필 URL이 없다**.

### 현재 상태
- `Article.author: { name, role }`(`src/lib/types.ts`). 기사 NewsArticle JSON-LD `author:[{ "@type":"Person", name }]` — URL 없음.
- 기자 목록/상세 페이지 부재.

### 정적 export 제약
없음. `[slug]`처럼 `generateStaticParams`로 정적 생성.

### 구현 방향
1. **데이터**: `Author`에 `slug`,`bio`,`avatarUrl`,`email?`,`sns?` 추가(또는 별도 `lib/authors.ts` + 기사와 join). CMS 도입 시 저자 컬렉션.
2. **라우트**: `src/app/reporter/[slug]/page.tsx` — `generateStaticParams`(전 저자) + `dynamicParams=false`. 프로필 + 해당 기자 기사 목록(`getByAuthor`).
3. **스키마**: 프로필 페이지에 `ProfilePage`+`Person`(name/jobTitle/worksFor `@id` #organization/sameAs/url). 기사 NewsArticle `author`에 `url: /reporter/<slug>/`(끝슬래시) 추가 → 엔티티 연결.
4. **링크**: 기사 바이라인·관련기사에서 기자명 → 프로필 링크. sitemap에 reporter 경로 추가.
5. **쿼리**: `getByAuthor(slug, n?)`를 `lib/queries.ts`에 추가(단일 출처 원칙).

### 완료 기준 ✅
- [x] `/reporter/<slug>/` 정적 생성·자기경로 canonical + **sitemap 등재**(2026-08-14, 33 URL — 6명 × 1페이지 + 실존 뒷페이지)
- [x] ProfilePage+Person JSON-LD, 기사 author.url이 프로필로 연결 (라이브 실측 확인)
- [x] 바이라인 클릭→프로필, 프로필→기자 기사 목록
- [ ] Rich Results Test 통과 — 색인 개방 후 남은 유일한 검증 단계

### 위험
- 저자 페이지가 thin(기사 1~2건)이면 색인가치 낮음 — 최소 본문/약력 확보.
  (2026-08-14 현재 6명 전원 63~254건 보유 → thin 문제 없음. 다만 프로필 본문이 `beat` 한 줄뿐이라
  약력 보강 여지는 남아 있다. 사실 창작 금지 원칙상 실제 경력만 기재할 것 — `src/lib/reporters.ts` 머리말.)

---

## ⑤ 정정·반론 보도 워크플로

### 왜 필요한가
언론중재법 대응 + 신선도/신뢰 신호. 오보 정정 이력을 투명 공개하는 매체를 구글이 더 신뢰한다. 현재 **정책문(텍스트)만** 있고 **운영 시스템이 없다**.

### 현재 상태
- `src/app/ethics/page.tsx`에 "제8조 오류의 정정" 등 정책문 존재.
- `Article.updatedAt?` 필드 + JSON-LD `dateModified = updatedAt ?? publishedAt` + 화면 '수정' 라벨 조건부 — **인프라는 4단계에서 깔아둠**. 실제로 채워 쓰면 됨.

### 정적 export 제약
없음(정정도 재빌드로 반영). 독자 정정요청 *접수*는 폼(데모) 또는 외부 폼/이메일.

### 구현 방향
1. **정정 표기**: 기사 수정 시 `updatedAt` 갱신 → '수정 {일시}' 라벨 자동 노출(이미 분기 존재). 본문 상/하단에 정정 사유 박스(`corrections: {date, note}[]` 필드 추가) 권장.
2. **정정 아카이브**: `src/app/corrections/page.tsx` — 정정된 기사 목록(투명성 페이지). E-E-A-T 신뢰 신호.
3. **반론/제보 동선**: 기존 `/tips`,`/contact` 폼을 실연동(→ [02 폼/ESP]) 하거나 정정요청 전용 경로 추가.
4. **스키마**: 정정 시 `dateModified` 갱신은 이미 반영. 대형 정정은 본문에 `<correction>` 명시.

### 완료 기준 ✅
- [ ] 기사 정정 시 `updatedAt`+정정사유 노출, `dateModified` 갱신
- [ ] `/corrections/` 아카이브 페이지(정적·sitemap)
- [ ] 정정요청 접수 동선이 실제로 도달(이메일/티켓)

### 위험
- `updatedAt`을 실제 수정 없이 남발하면 신선도 신호 오염 — 실제 변경 시에만.

---

## ⑥ 사진·콘텐츠 저작권 체계

### 왜 필요한가
현재 이미지는 AI 생성/스톡(`public/stock/*.jpg`, 본문 alt에 "AI 생성 이미지" 명시됨). 실보도에 출처 불명·무단 사진을 쓰면 **저작권 침해(통신사·작가)** 와 신뢰 훼손.

### 현재 상태
- 로컬 스톡 63장, `imageCaption`/`imageAlt`에 AI 생성 고지. `?v=` 캐시버스팅.

### 정적 export 제약
없음.

### 구현 방향
1. **출처 표기 필드**: `Article`에 `imageCredit`(예: "연합뉴스", "© 홍길동", "모두일보") 추가 → 캡션에 의무 표기. CMS 도입 시 미디어 메타.
2. **계약/소스**: 통신사(연합/뉴시스) 사진 계약, 자체 촬영, 또는 라이선스 명확한 스톡(Unsplash/게티)·CC 표기.
3. **AI 이미지 정책**: 실보도엔 사실 오인 방지 위해 AI 합성 이미지 사용 최소화·명시. 일러스트는 "그래픽" 라벨.
4. **본문 인용/저작물**: 인용·전재 규정 ethics에 반영.

### 완료 기준 ✅
- [ ] `imageCredit` 필드·캡션 표기 의무화
- [ ] 사진 소스의 라이선스 적법성 확보(계약/CC)
- [ ] AI/그래픽 이미지 라벨 정책 ethics 반영

### 위험
- 미표기 통신사 사진은 즉시 법적 리스크 — 실데이터 전환 시 게이트로 검사(크레딧 없는 이미지 빌드 경고).

---

## ⑦ 엔티티 확립 운영 체크리스트

> 브랜드 엔티티(조직 지식패널·sameAs 그래프)는 코드가 아니라 **실제 외부 자산**이 선행돼야 한다. 아래 순서대로 진행하고, 완료 즉시 코드 반영 지점을 갱신한다.

- [ ] **실SNS 공식 계정 개설** — 유튜브/X/인스타그램/페이스북/네이버 등. 각 프로필에 modooilbo.com 역링크 기재. 개설 즉시 `src/lib/site.ts`의 `SITE.sameAs`에 전체 URL 추가(추가 전까지 홈 JSON-LD sameAs 필드·Footer SNS는 자동 비노출 — 데드링크 금지 원칙).
- [ ] **위키데이터 항목 생성** — 법인 설립·정기간행물 등록(현재 자리표시 "서울 아00000" → 실번호) 후 wikidata.org에 신문사 항목 등재(P31=신문, P856=공식 웹사이트). 생성된 Q-ID URL(`https://www.wikidata.org/wiki/Q...`)도 `SITE.sameAs`에 추가.
- [ ] **구글 지식패널 소유권 신청** — 지식패널 생성 확인 후 'Claim this knowledge panel' 절차로 인증. 공식 SNS 계정 로그인 기반 인증이므로 1번 항목 선행 필수.
- [x] **기자 프로필 색인 개방 완료 (2026-08-14)** — 실명 기자 체제 확정(대표 확인)에 따라 `src/lib/reporters.ts`의 `REPORTER_INDEXABLE`을 true로 전환하고, `src/lib/sitemap-parts.ts`가 reporter 엔트리를 싣도록 했다(1페이지 daily/0.6 · 뒷페이지 weekly/0.3, 같은 상수로 게이트해 되돌릴 때 모순 신호 방지).
  ⚠️ 이 항목이 **오래 방치돼 실제 손해를 낸 사례**다: 실명 체제로 바뀐 뒤에도 스위치가 데모 단계 값(false)으로 남아, 기사 JSON-LD의 `author.url`이 noindex 페이지를 가리켰다 — 검색엔진에는 저자 신호가 비어 있는 것과 같다. 남은 단계는 Rich Results Test 검증뿐.
  (경로 표기 정정: 이 항목이 가리키던 `src/lib/authors.ts`·`src/app/sitemap.ts`는 각각 `src/lib/reporters.ts`·`src/lib/sitemap-parts.ts`로 이미 개편돼 있었다.)
