# 모두일보 기사 발행 가이드 (에이전트용)

> **기사 1건 = 파일 1개.** 이 폴더(`content/articles/`)의 `.md` 파일은 독립 리뷰·최종 게이트 PASS 뒤 빌드·배포할 때
> 사이트에 포함됩니다. 별도 글쓰기 버튼·관리자 화면은 없지만, 파일 생성만으로 자동 게시되지는 않습니다.
>
> 🚫 따라서 패키지 단계 원고를 이 폴더에 미리 복사하지 않습니다. 1차 정적·동적 게이트,
> `모두일보 독립 리뷰 담당`(작업 ID `01a05a60-a035-7921-8154-7aa4a7024f31`)의 기사별 검수,
> `reviewedBy`·`reviewedAt`·`reporterInsight`와 PASS/HOLD·수정 요구 회수, 최종 게이트를 끝낸 뒤
> PASS·HOLD 0이면 **2026-09-02 상시 자동 배포 승인**에 따라 별도 승인 질문 없이 이 폴더로
> CMS 변환합니다. HOLD 또는 사용자의 현재 중지 지시가 있으면 진행하지 않습니다.

## 1. 어디에 쓰나

신규 품질 필드까지 포함한 복사용 정본은 [article-quality-template.md](article-quality-template.md)다.
```
content/articles/<슬러그>.md
```
- `<슬러그>` = 파일 이름 = 기사 주소(URL). **영문 소문자·숫자·하이픈만.** 다른 기사와 **겹치지 않게** (날짜를 앞에 붙이면 안전).
  - 예: `content/articles/2026-06-30-budget-clash.md` → `modooilbo.com/article/2026-06-30-budget-clash/`
- 에이전트 10명이 각자 **자기 파일**을 만들면 서로 안 부딪힙니다(충돌 0).

## 2. 파일 형식 (머리표 + 본문)
파일 맨 위에 `---` 사이의 **머리표(송장)**를 적고, 그 아래 **본문**을 씁니다.
복사용 YAML·본문은 [article-quality-template.md](article-quality-template.md)만 사용합니다.
이 문서에 별도 축약 예제를 두지 않습니다. 초안 작성자는 `reviewedBy`·`reviewedAt`·
`reporterInsight`를 임의로 채우지 않고, 독립 리뷰 결과를 회수한 뒤 반영합니다.

### 머리표 필드
| 키 | 필수 | 설명 |
|---|---|---|
| `title` | ✅ | 기사 제목 |
| `category` | ✅ | **아래 13개 중 하나(영문 슬러그, `tech`는 신규 편성 동결).** 이게 지면 분류 기준 |
| `author` | 권장 | `이름 / 직함` (예: `박서연 / 경제부 기자`). 없으면 "모두일보 / 기자" |
| `publishedAt` | 권장 | **KST 기준** `YYYY-MM-DD HH:MM` (예: `2026-06-30 11:40`). 없으면 현재시각 |
| `reporting` | ✅ | `direct` 편집국 독자 취재·분석 / `desk` 공개자료 검증·재구성 / `sponsored` 광고·기업소식 / `wire` 외부 제공 |
| `reportingType` | 조건부 | `direct`일 때 필수: `inquiry`, `interview`, `field`, `follow-up`, `data-analysis`, `document-verification` |
| `verificationNote` | ✅* | 실제로 무엇을 질의·대조·계산했는지 독자에게 공개할 한 문장(20자 이상) |
| `addedValue` | ✅* | 원자료에 더한 독자 가치(20자 이상, 내부 품질 평가용) |
| `sourceBasis` | ✅* | `primary` 원문 중심 / `mixed` 원문+보조자료 / `secondary` 2차자료 중심 |
| `contactStatus` | 조건부 | `inquiry`, `interview`, `follow-up` 직접취재는 `replied` 필수 |
| `visualType` | ✅* | `original-photo`, `source-photo`, `editorial-illustration`, `ai-illustration`, `stock-photo` |
| `aiRole` | ✅* | `research-assist`, `draft-assist`, `copyedit`, `image`, `none` 중 콤마 구분. `none`은 단독 사용 |
| `reviewedBy` | ✅* | 배포 전 최종 검수 책임을 진 `src/lib/reporters.ts` 등록 기자 실명. 포괄 명칭·임의 이름 금지 |
| `reviewedAt` | ✅* | 검수 완료 KST 시각. `publishedAt`보다 늦으면 발행 차단 |
| `reporterInsight` | ✅* | 사실과 분리해 공개할 근거 기반 기자 해설 40~350자. 감상·홍보·무근거 단정 금지 |
| `series` | 선택 | `notice-check`, `data-crosscheck`, `on-the-record` 중 실제 기사 성격에 맞을 때만 사용 |
| `methodologyNote` | 조건부 | direct의 `data-analysis`·`document-verification`이면 입력자료·계산·제외범위·한계를 40자 이상 공개 |
| `readerChecklist` | 조건부 | `grants`·`bids`·`labor` 기사면 독자 실행 항목 3개 이상을 `\|`로 구분 |
| `tags` | 권장 | 콤마로 구분 (예: `추경, 국회`) |
| `summary` | 권장 | 한 줄 요약. 없으면 본문 첫 문단 사용 |
| `image` | 선택 | 대표 이미지 URL. **없으면 카테고리에 맞는 무료 스톡이 자동**으로 붙음 |
| `imageCaption` | 선택 | 사진/생성 이미지 설명. AI 생성 이미지는 오해 방지를 위해 캡션에 표기 권장 |
| `breaking` | 선택 | `true`면 속보(빨간 배지) |
| `type` | 선택 | `opinion`/`video` (기본 `article`) |

`✅*`는 **2026-09-01 이후 일반 기사(`direct`·`desk`)부터 필수**다. 신규 기사는 내부 편집 품질 80점 미만이거나 같은 분에 5편 이상 배정되면 빌드가 실패한다. `aiRole`은 내부 감사 기록이며, 취재 방식과 섞어 독자에게 표시하지 않는다.

### 카테고리 (반드시 이 영문 슬러그로 — 두 축 12종 + 동결 1종)
**종합뉴스** (일일 편성 6종 — `tech`는 동결: 슬러그는 유효하나 신규 편성하지 않음)
| 슬러그 | 지면 | | 슬러그 | 지면 |
|---|---|---|---|---|
| `economy` | 경제 | | `sports` | 스포츠 |
| `society` | 사회 | | `opinion` | 오피니언 |
| `world` | 국제 | | `tech` | 테크(동결) |
| `culture` | 문화 | | | |

**기업 데이터 뉴스(사업 축)** — 발행 전 공공 원자료 검증 게이트 필수(`scripts/check-*.mjs`, [wiki/09-publishing](../wiki/09-publishing.md))
| 슬러그 | 지면 | 게이트 | | 슬러그 | 지면 | 게이트 |
|---|---|---|---|---|---|---|
| `grants` | 정부지원금 | check-grant | | `industry` | 산업·트렌드 | — |
| `bids` | 공공입찰 | check-bid(+contract/order-plan) | | `labor` | 채용·노무 | check-hire |
| `startup` | 창업·상권 | — | | `deals` | 계약·거래 | — |

## 3. 게시 흐름 (파일 쓴 뒤)
```bash
set -euo pipefail   # 아래 게이트 하나라도 실패하면 즉시 중단
MODOO_RELEASE_BRANCH="$(git branch --show-current)"
[[ -n "$MODOO_RELEASE_BRANCH" && "$MODOO_RELEASE_BRANCH" != master ]]
test -z "$(git status --porcelain)"
# 필수 선행: 작업 인수 → 1차 정적·동적 게이트 → 독립 리뷰 요청·회수 → 최종 게이트
# PASS·HOLD 0이면 상시 자동 배포 승인에 따라 별도 승인 질문 없이 계속:
MODOO_PACKAGE_DIR="/absolute/path/to/approved-package"
MODOO_COMMIT_MSG_FILE="/absolute/path/to/commit-message.txt"
cp "$MODOO_PACKAGE_DIR"/articles/**/*.md content/articles/
cp "$MODOO_PACKAGE_DIR"/images_1200x675_jpg/*.jpg public/stock/
npm run check:editorial
npm run report:reporting
npm run build   # prebuild가 content·WebP·trending 생성까지 수행
git status --short
git add -- content/articles public/stock src/lib/content.generated.ts \
  src/lib/newest.generated.ts src/lib/trending-data.generated.json \
  src/lib/webp-manifest.generated.json
git diff --cached --name-status
git commit -F "$MODOO_COMMIT_MSG_FILE"
git fetch -q origin master
MODOO_BASE_SHA="$(git rev-parse origin/master)"
MODOO_RELEASE_SHA="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$MODOO_BASE_SHA" "$MODOO_RELEASE_SHA"
MODOO_ARTICLE_PATHS=(${(f)"$(git diff --diff-filter=AM --name-only \
  "$MODOO_BASE_SHA" "$MODOO_RELEASE_SHA" -- 'content/articles/*.md' \
  | sed -nE '/\/_/d; s#^content/articles/(.*)\.md$#/article/\1/#p')"})
(( ${#MODOO_ARTICLE_PATHS[@]} > 0 ))
print -l -- "${MODOO_ARTICLE_PATHS[@]}" # 승인 범위·건수와 전건 대조
# Preview는 master가 아닌 깨끗한 릴리스 브랜치에서 실행
npm run deploy:preview
MODOO_PREVIEW_URL="$(node -e '
const fs = require("fs");
const rows = fs.readFileSync("deployments/deploy-log.jsonl", "utf8").trim().split("\n").reverse();
for (const line of rows) { try { const r = JSON.parse(line); if (r.env === "Preview" && r.commit === process.argv[1] && r.url) { process.stdout.write(r.url); process.exit(0); } } catch {} }
process.exit(1);
' "$MODOO_RELEASE_SHA")"
[[ "$MODOO_PREVIEW_URL" == https://*.pages.dev* ]]
npm run smoke -- "$MODOO_PREVIEW_URL" / /policy/ /newsroom/ "${MODOO_ARTICLE_PATHS[@]}"
# PASS·비교 이미지·HTTP/canonical/index/follow/OG/이미지 확인 뒤에만
test "$(git rev-parse HEAD)" = "$MODOO_RELEASE_SHA"
test -z "$(git status --porcelain)"
git push origin HEAD:master
git fetch -q origin master
MODOO_REMOTE_MASTER="$(git ls-remote origin refs/heads/master | awk '{print $1}')"
test "$MODOO_RELEASE_SHA" = "$MODOO_REMOTE_MASTER"
test "$MODOO_RELEASE_SHA" = "$(git rev-parse origin/master)"
test "$MODOO_RELEASE_SHA" = "$(git ls-remote origin refs/heads/master | awk '{print $1}')"
npm run deploy:prod -- --force-branch
npm run smoke -- https://modooilbo.com / /policy/ /newsroom/ "${MODOO_ARTICLE_PATHS[@]}"
```
> 운영 규칙(2026-09-02): 유수화님의 **상시 자동 배포 승인**에 따라 독립 리뷰와 최종 게이트가
> PASS·HOLD 0이면 CMS 변환·Git·빌드·Preview·Production·라이브 검증을 별도 승인 질문 없이
> 진행한다. 검수 뒤 기사 내용이 바뀌면 변경 기사 재검수와 최종 게이트를 다시 통과해야 한다.
> 검수 흐름: 패키지 1차 정적·동적 게이트 → 독립 리뷰 기사별 검수 → 결과 회수·수정분 재검수 →
> 발행 직전 동적 게이트 전수 확인 → PASS·HOLD 0 확인 → CMS 변환·게이트·빌드 → Git 커밋 → Preview·Production·라이브 검증.
> HOLD 원고는 **파일을 커밋하지 않는** 방식으로 보류한다. `editorial/출고대기/`는 현재 페르소나 문서 보관소이며 스테이징 폴더로 쓰이지 않는다.
> publishedAt은 출고 직전 재배치가 관행이며 허용 범위 근거 문서(`최종마감.md`)는 **리포 밖**에 있다(총괄 보관). 상세: [wiki/09-publishing](../wiki/09-publishing.md)
> 라이브 검증 뒤 신규 기사 canonical URL 전건을 HTTP 200·self-canonical·index/follow 확인 후
> `색인 담당자`(작업 ID `019ef3e0-e684-7be0-a164-3cdfacfeb6fa`)에게 발행일·건수·사이트
> 커밋·IndexNow 접수 결과와 함께 보낸다. `handoff_sent`는 실제 색인 완료가 아니다.
> 스모크 자동 PASS가 보증하는 범위와 Preview 브랜치 주의사항은 [wiki/06-deployment](../wiki/06-deployment.md)가 정본이다.

## 4. 규칙 (지킬 것)
- 파일명(슬러그)은 **고유**하게. 날짜 접두사 권장.
- 시각은 **KST**로.
- 기사 본문은 **사실·출처 기반.** 날조 금지(편집 원칙·정치 중립 준수).
- 톱기사(메인 대표) 지정은 콘텐츠 파일에서 불가(시스템이 관리). `isLead` 같은 건 쓰지 않음.
- 파일명이 `_`로 시작하면 게시 안 됨(초안 보관용).
- 분량을 채우기 위한 반복 발행보다 독자 가치와 검증 증거를 우선한다. **24편은 생산능력 상한이지 일일 할당량이 아니다.**
- 출고 전 `npm run report:editorial`로 점수와 `npm run report:reporting`으로 취재 구성을 확인한다.

## 5. 기사 이미지 스펙

이미지는 비워도 됩니다. `image:`를 쓰지 않으면 카테고리에 맞는 무료 스톡 이미지가 자동으로 붙습니다.

직접 이미지를 넣을 때는 아래 기준을 따릅니다.

| 항목 | 권장 | 비고 |
|---|---|---|
| 크기 | 1200 x 675 px | 16:9. 최소 가로 1000px |
| 비율 | 16:9 기본 | 히어로·홈 톱 기준. 카드에서는 중앙 기준으로 자동 크롭 |
| 용량 | 300KB 이하 권장 | JPEG 품질 75~85 또는 WebP 권장. 실무상 1MB 안쪽 유지 |
| 형식 | JPG / WebP / PNG | 사진은 JPG·WebP, 그래픽·투명은 PNG |
| 하드 한계 | Cloudflare Pages 파일당 25MB | 실무에서는 이 한계보다 로딩 속도 기준을 우선 |

### 크롭 기준

- 피사체와 핵심 오브젝트는 가운데에 둡니다.
- 모든 카드 이미지는 `object-cover`로 중앙 크롭될 수 있으므로 가장자리 정보에 의존하지 않습니다.
- 이미지 안에 텍스트를 넣지 않는 것을 기본으로 합니다. 꼭 필요하면 중앙 안전 영역에 짧게 둡니다.

### 넣는 법

```markdown
image: https://example.com/photo.jpg
imageCaption: 사진 설명 또는 AI 생성 이미지 설명
```

로컬 파일은 `public/uploads/` 등에 넣고 아래처럼 씁니다.

```markdown
image: /uploads/my-image.jpg
imageCaption: 기사 이해를 돕기 위한 AI 생성 이미지.
```

### 저작권·표현 리스크

- 출처 불명 이미지, SNS 이미지, 타 언론사 이미지, 유료 스톡 무단 사용 금지.
- 실제 인물 얼굴, 기업 로고, 구단 유니폼, 특정 장소·사고 현장을 임의 생성하지 않습니다.
- 사건·범죄·사고 기사는 실사풍 이미지보다 상징적 에디토리얼 일러스트를 우선합니다.
- AI 생성 이미지가 실제 현장 사진처럼 보일 수 있으면 `imageCaption`에 `AI 생성 이미지` 또는 `기사 이해를 돕기 위한 이미지`라고 표기합니다.
