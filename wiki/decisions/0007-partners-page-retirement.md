# 0007 · 광고·후원 계약사 명단(/partners) 폐지와 기존 광고 표시 유지

- **날짜**  2026-09-25
- **상태**  적용됨
- **결정자**  오너
- **관련**  `e3fa0a2`(2026-08-11 명단 신설) · `43f5ccd`(월간 리포트) · 이번 커밋 · HANDOVER §7-b · §3-E

## 배경

오너 지시: "계약 다 해지했어 거래도 안하고 진짜 공평한 뉴스글 발행만 할거 같아".
2026-08-11 에 광고·후원 계약사 5사(비씨모빌리티·브리찌·제이크루·포어스바이크·한국모터사이클리스)의
상호·사업 내용·발행인 이해관계를 `/partners/` 에 공개했다. 계약이 전부 끝났으니 "누가 모두일보에
돈을 내는가"라는 이 페이지의 존재 이유가 사라졌고, 남겨 두면 오히려 거짓이 된다.

## 근거 데이터

```bash
grep -l "^sponsor:" content/articles/*.md | wc -l        # 광고 기사 2편(둘 다 bridzzi)
grep -rn "/partners" src --include='*.tsx' --include='*.ts' # 참조 8곳(페이지·데이터·푸터·편집국·사이트맵·고지·JSON-LD·게이트)
curl -s https://modooilbo.com/sitemap-pages.xml | grep -c partners   # 1
gh repo view --json visibility                          # PUBLIC
```

## 선택지

| 안 | 내용 | 비용 | 리스크 |
|---|---|---|---|
| A | 페이지·데이터·로고·링크 전부 삭제, 광고 기사 2편은 표시 유지 | 작음 | 08-11 기사의 이해관계 고지 경로가 끊김 → 고지 박스에 직접 출력해 해소 |
| B | A + 광고 기사 2편도 비공개 | 작음 | 오너 지시 밖. 광고비 받은 콘텐츠를 지우는 것은 별개 결정 |
| C | A + `/advertise`·`/subscribe` 후원 등급까지 정리 | 중간 | 오너 지시 밖 → §3-E 결정 대기로 남김 |
| D | 페이지만 숨기고 데이터·링크는 둠 | 최소 | "비공개"가 아님. 소스·사이트맵·푸터에 흔적 |

## 결정

**A.** 페이지·데이터·로고·리포트 스크립트·링크를 전부 지우고, `/partners/*` 는 Pages Function 으로
`410 Gone` 을 준다. 광고 기사 2편은 그대로 두되 표시명·이해관계 한 줄만 `src/lib/sponsors.ts` 에
남긴다 — 광고비를 받고 게재한 콘텐츠는 남아 있는 한 광고이고, 표시 의무(신문법 §6③·인터넷신문위
광고자율규약·표시광고법)는 콘텐츠에 붙지 계약에 붙지 않는다.
"신규 광고 안 받음"은 말로 두지 않고 `build-content.mjs` 가 기존 2편 밖의 `sponsor:` 를 빌드
실패로 막는다.

**버리는 안** — B·C 는 오너가 지시하지 않았다(§3-E). D 는 "완전 비공개"가 아니다.

## 구현

- 삭제: `src/app/partners/`, `src/lib/partners.ts`, `public/partners/`, `scripts/partner-report.mjs`,
  `reports/snapshots.json`, 푸터·`/newsroom`·`sitemap-parts` 링크, SponsorFooter 「계약사 전체 보기」 링크
- 추가: `src/lib/sponsors.ts`(SPONSOR_NAMES·SPONSOR_RELATIONS), `functions/partners/[[path]].ts`(410),
  `build-content.mjs` `LEGACY_SPONSORED` 잠금
- 수정: `/transparency` 메타 설명에서 "광고·후원 계약사" 삭제, wiki 01·03·05
- 하지 않은 것: `/advertise`·`/subscribe` 정리, git 이력 재작성, 코덱스 정본의 광고 규약·계약서 서식 수정

## 검증

- `npm run build`(콘텐츠 게이트·next build·테스트 85건)·`tsc`·`tsc functions` 통과
- `out/` 에 `partners/` 없음, `sitemap-pages.xml` 항목 0, HTML 내 `/partners` 링크 0
- 광고 기사 2편: 배지·고지·AdvertiserContentArticle·상호 유지, 08-11 기사에 이해관계 고지 문장 출력
- 5개 렌즈 × 3 반박 검증(81 에이전트) — `ASSETS.fetch("/404.html")` 이 308 리다이렉트를 탄다는 지적은
  로컬 `wrangler pages dev` 재현(410·본문 65KB·Location 없음)으로 기각
- **확인하지 못한 것**: 라이브 410 (배포 후 확인), 검색엔진 색인 제거 시점(오너의 삭제 요청 필요)

## 되돌리는 법

`functions/partners/[[path]].ts` 를 **먼저** 지운 뒤(남아 있으면 새 페이지가 410 에 가려진다)
`git revert` 로 이 커밋을 되돌리면 페이지·데이터·로고가 돌아온다. `LEGACY_SPONSORED` 도 함께 풀어야
새 광고 원고가 빌드된다. git 이력은 재작성하지 않았으므로 되돌릴 수 없는 부분은 없다 —
단, 저장소가 PUBLIC 이라 옛 명단은 이력에 계속 공개돼 있다.
