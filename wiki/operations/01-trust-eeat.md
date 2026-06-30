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
- [ ] `/reporter/<slug>/` 정적 생성·sitemap 등재·자기경로 canonical
- [ ] ProfilePage+Person JSON-LD, 기사 author.url이 프로필로 연결
- [ ] 바이라인 클릭→프로필, 프로필→기자 기사 목록
- [ ] Rich Results Test 통과

### 위험
- 저자 페이지가 thin(기사 1~2건)이면 색인가치 낮음 — 최소 본문/약력 확보. 가짜 기자(더미)는 색인 전 실인물로 교체.

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
