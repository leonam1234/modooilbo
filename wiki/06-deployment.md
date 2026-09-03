# 06 · 배포 (Deployment) — Cloudflare

> 이 문서가 배포 **정본**입니다. 종전 루트의 `DEPLOY.md`(기술 설명)와
> `DEPLOYMENT.md`(운영 규칙)를 2026-08-21 에 여기로 합쳤습니다.
> 원문은 [`wiki/archive/`](archive/) 에 있습니다.

## 1. 왜 정적 export + Cloudflare Pages 인가
- 전 페이지가 정적(SSR 불필요) → **정적 호스팅이 최적**: 서버비용 0, 전 세계 엣지 CDN, 즉시 캐싱, 운영 단순.
- `next.config.mjs`: `output: "export"` + `trailingSlash: true` + `images.unoptimized`.

## 2. 가장 중요한 규칙

```
커밋해줘  = GitHub 에 코드 기록을 남긴다 (git commit, 필요 시 push)
배포해줘  = 현재 커밋을 Cloudflare 에 올린다 (wrangler)
```

**GitHub = 코드 기록용, Cloudflare = 실배포.** 둘은 별개 동작입니다. 기사 패키지는 독립
리뷰·최종 게이트가 PASS·HOLD 0이면 **2026-09-02 상시 자동 배포 승인**에 따라 별도 승인 질문
없이 CMS·Git·빌드·Preview·Production·라이브 검증을 이어서 수행합니다.

배포 스크립트는 미커밋 변경을 막지만, 승인 여부·원격 `master` 최신성·라이브 응답은 검사하지
않습니다. 안전한 기사 승급 순서는 다음과 같습니다.

> **독립 리뷰·최종 게이트 PASS → CMS·코드 게이트 → 비-master 릴리스 브랜치 커밋 → Preview → 전건 검증 →
> 검증한 SHA를 master에 push·3자 대조 → 통제된 Production → 라이브 재검증 → 색인 인계**

```bash
# zsh 기준. 원격이 현재 릴리스의 선조인지 확인하고 변경 기사 경로를 자동 생성한다.
set -euo pipefail
MODOO_RELEASE_BRANCH="$(git branch --show-current)"
[[ -n "$MODOO_RELEASE_BRANCH" && "$MODOO_RELEASE_BRANCH" != master ]]
test -z "$(git status --porcelain)"
git fetch -q origin master
MODOO_BASE_SHA="$(git rev-parse origin/master)"
MODOO_RELEASE_SHA="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$MODOO_BASE_SHA" "$MODOO_RELEASE_SHA"
MODOO_ARTICLE_PATHS=(${(f)"$(git diff --diff-filter=AM --name-only \
  "$MODOO_BASE_SHA" "$MODOO_RELEASE_SHA" -- 'content/articles/*.md' \
  | sed -nE '/\/_/d; s#^content/articles/(.*)\.md$#/article/\1/#p')"})
(( ${#MODOO_ARTICLE_PATHS[@]} > 0 ))
print -l -- "${MODOO_ARTICLE_PATHS[@]}" # 승인 범위·건수와 전건 대조
npm run release:preview
# 위 출력의 `release id`를 그대로 보관한다. deploy-log에도 같은 값이 기록된다.
MODOO_RELEASE_ID="<release id>"
MODOO_PREVIEW_URL="$(node -e '
const fs = require("fs");
const rows = fs.readFileSync("deployments/deploy-log.jsonl", "utf8").trim().split("\n").reverse();
for (const line of rows) { try { const r = JSON.parse(line); if (r.env === "Preview" && r.commit === process.argv[1] && r.url) { process.stdout.write(r.url); process.exit(0); } } catch {} }
process.exit(1);
' "$MODOO_RELEASE_SHA")"
[[ "$MODOO_PREVIEW_URL" == https://*.pages.dev* ]]
npm run smoke -- "$MODOO_PREVIEW_URL" / /policy/ /newsroom/ "${MODOO_ARTICLE_PATHS[@]}"
npm run check:preview-assets -- "$MODOO_PREVIEW_URL"
# PASS·비교 이미지·HTTP/canonical/index/follow/OG/이미지 전건 확인 뒤에만
test "$(git rev-parse HEAD)" = "$MODOO_RELEASE_SHA"
test -z "$(git status --porcelain)"
git push origin HEAD:master
git fetch -q origin master
MODOO_REMOTE_MASTER="$(git ls-remote origin refs/heads/master | awk '{print $1}')"
test "$MODOO_RELEASE_SHA" = "$MODOO_REMOTE_MASTER"
test "$MODOO_RELEASE_SHA" = "$(git rev-parse origin/master)"
test "$MODOO_RELEASE_SHA" = "$(git ls-remote origin refs/heads/master | awk '{print $1}')"
npm run release:prod -- --reuse-artifact="$MODOO_RELEASE_ID" --smoke-approved --force-branch
npm run smoke -- https://modooilbo.com / /policy/ /newsroom/ "${MODOO_ARTICLE_PATHS[@]}"
```

스모크가 FAIL이거나 Chromium·WebKit 비교 이미지에서 레이아웃 차이가 확인되면
Production 배포를 중단합니다. 운영 배포 뒤에는 같은 경로와 메타데이터를 다시 검사해 라이브
반영을 증명합니다. `release:preview`는 빌드·R2 동기화·prune을 한 번만 실행하고 실제 Preview에
올린 `out/`을 Git common dir에 봉인합니다. 스모크 PASS 뒤 `release:prod`는 그 산출물을 다시
빌드하지 않고 그대로 승급합니다.

현재 `mobile-smoke.mjs`는 Chromium·WebKit × 402×874·402×660을 돌리되 네 조합 모두
iPhone Safari UA를 씁니다. `app`·`browser`는 높이 프리셋일 뿐 실제 Android·설치 PWA·주소창·
키보드·인앱브라우저를 재현하지 않습니다. 자동 FAIL은 접속 실패, 사이트 JS `pageerror`, 본문
100자 미만만 잡습니다. HTTP 상태·canonical·robots·OG·이미지 응답은 별도 검사해야 하며,
`compare-*.png`는 874px 조합만 합성하므로 660px 원본 PNG도 눈으로 확인합니다.

## 3. 명령어

| 명령 | 대상 | 결과 |
|---|---|---|
| `npm run deploy:preview` | **Preview** | 비-master 브랜치에서만 격리된 미리보기 URL |
| `npm run deploy:prod` | **Production** | **modooilbo.com** 반영 (`--branch master`) |
| `npm run deploy:cf` | = `deploy:prod` | 레거시 별칭. 게이트·로그 동일 적용 |
| `npm run release:preview` | **Preview** | 한 번 빌드한 `out/`을 SHA-256 manifest와 함께 봉인하고 배포 |
| `npm run release:prod -- --reuse-artifact=<release-id> --smoke-approved` | **Production** | Preview에서 검증한 동일 산출물 승급(재빌드 없음) |
| `node scripts/deploy.mjs prod --dry-run` | — | 빌드·배포 없이 **실행될 명령만** 출력 |

정상 실행의 내부 동작: ① git SHA·브랜치·미커밋 확인 → ② Production이면 로컬 `master`
브랜치 확인(`--force-branch`일 때만 생략) → ③ Functions TypeScript 검사 → ④ `npm run build`(prebuild 체인 포함) →
⑤ 신규 스톡 R2 동기화 → ⑥ `out/stock` 정리 → ⑦ Cloudflare Pages 2만 파일 게이트 →
⑧ `wrangler pages deploy out` → ⑨ `deployments/deploy-log.jsonl` 기록 →
⑩ Production에서만 IndexNow 통지. 스크립트는 fetch·push·승인 확인·라이브 검증을 대신하지 않습니다.

### Build-once 산출물 안전장치

봉인 산출물은 저장소 밖의 `git rev-parse --git-common-dir` 아래
`modooilbo-release-artifacts/`에 저장되어 모든 worktree가 공유합니다. 승급은 다음 조건이 모두
맞을 때만 가능합니다.

- 워킹트리가 clean이고 현재 HEAD가 manifest의 전체 commit SHA와 같음
- `index.html`, `404.html`, `_headers`, `_redirects`, Next.js JS 자산이 모두 존재함
- 파일 목록·크기·파일별 SHA-256과 전체 artifact SHA-256이 manifest와 정확히 같음
- 같은 Wrangler v4 버전을 사용하고, 성공한 Preview URL·commit·artifact hash 영수증이 있음
- 생성 후 24시간 안이며 외부 스모크 PASS를 뜻하는 `--smoke-approved`를 명시함

하나라도 다르면 Production 전에 즉시 중단합니다. manifest는 artifact 밖에 있어 Preview 영수증을
기록해도 배포 바이트는 변하지 않습니다. Pages Functions는 기존처럼 같은 clean HEAD에서 Wrangler가
배포 시 번들하며, GA4 직접 스니펫·토큰 경로 middleware·AdSense `afterInteractive` 경로도 바꾸지 않습니다.
기존 `deploy:preview`·`deploy:prod`는 호환을 위해 종전처럼 매번 빌드합니다.

R2 동기화의 확인 완료 목록은 기본적으로 `git rev-parse --git-common-dir` 아래
`modooilbo-cache/r2-synced.json`에 저장합니다. linked worktree들이 같은 Git common dir를
공유하므로 새 릴리스 worktree도 기존 수천 개 이미지를 다시 HEAD 검사하지 않고 신규 파일만
확인합니다. 저장할 때는 잠금을 잡은 뒤 공용·현재 worktree·기본 worktree의 레거시
`scripts/.r2-synced.json`을 다시 합치고, 임시 파일을 원자적으로 교체해 동시 실행의 갱신 유실을
막습니다. Git 밖에서 실행하거나 common dir에 쓸 수 없으면 기존 로컬 경로로 폴백합니다.

```bash
npm run build            # → out/ (정적 페이지 + robots.txt + sitemap.xml + _headers)
npm run preview:static   # 로컬 검증 (localhost:3001)
npx wrangler login       # CF 계정 1회 로그인
npm run deploy:prod      # clean master에서 실행. 릴리스 브랜치 경로는 §4 참조
```

## 4. Preview vs Production
- Cloudflare Pages 프로젝트의 **production 브랜치 = `master`**.
- `deploy:prod`는 로컬 브랜치가 `master`가 아니면 중단합니다. 별도 릴리스 worktree에서는
  Preview를 통과한 HEAD를 `origin/master`에 push한 뒤 로컬·원격 SHA의 3자 일치를 확인하고
  `npm run deploy:prod -- --force-branch`를 사용합니다. **SHA 검사를 생략한 우회는 금지합니다.**
- `deploy:preview`는 현재 git 브랜치 이름을 Cloudflare 미리보기 별칭으로 씁니다.
  **`master`에서 실행하면 `--branch master`가 되어 Preview 격리가 보장되지 않으므로, 반드시
  비-master 릴리스 브랜치에서 실행합니다.**
- clean master worktree를 쓸 수 있으면 같은 SHA에서 일반 `deploy:prod`를 실행해도 됩니다.

### Ahrefs 재크롤 전용 2시간 무배포 창

Next.js 해시 자산은 배포마다 이름이 달라질 수 있습니다. 크롤 도중 Production이 교체되면 배포
전에 읽은 HTML이 가리키는 이전 `/_next/static/*.js`와 교체 뒤 자산이 섞여, 정상 배포 두 건도
크롤 결과에서는 broken JavaScript로 집계될 수 있습니다. 이전 해시 자산을 장기 보존하는 변경보다
먼저 아래 안정화 창을 사용합니다.

1. 상시 자동 배포 승인에 따라 Production 배포와 라이브 검증을 모두 끝낸다.
2. 운영 SHA·배포 URL·시작 시각을 기록하고 **그 시각부터 최소 2시간 동안 Preview와 Production을
   포함한 모든 Pages 배포를 중단**한다. 기사 발행도 새 Production을 만들므로 같은 창에서 멈춘다.
3. 창 시작 직전에 `npm run check:preview-assets -- https://modooilbo.com --all-articles`로 사이트맵
   전 페이지가 현재 참조하는 JavaScript를 HTTP 200·무리디렉션으로 다시 확인한 뒤 Ahrefs 재크롤을
   시작한다.
4. 크롤 완료 시각과 결과를 기록한 뒤 창을 해제한다. 긴급 배포가 필요하면 재크롤을 중단하고,
   배포·라이브 자산 검사 후 새 2시간 창에서 다시 시작한다.

이 절은 재크롤 중 배포 혼재를 막는 운영 게이트입니다. Production은 상시 자동 배포 승인 범위지만,
외부 Ahrefs 재크롤 실행은 별도 지시 범위이며 자동 승인에 포함하지 않습니다.

## 5. 인프라 자동배포는 **의도적으로 없습니다**
- 상시 자동 배포 승인은 담당자가 검수·게이트 뒤 배포 절차를 계속 수행하라는 운영 승인입니다.
  Git push만으로 무검증 Production이 실행되는 Git 연동·CI 자동배포를 뜻하지 않습니다.
- **GitHub Actions 배포 워크플로 없음**(`.github/` 폴더 자체가 없음) → push 는 코드 기록일 뿐.
- **Cloudflare Pages Git 연동 없음**(프로젝트 `Git Provider: No`) → CF 가 깃을 감시하지 않음.
- ⚠️ 대시보드에서 **Git 연동을 붙이거나** `.github/workflows` 에 배포 워크플로를 추가하면
  이 원칙이 깨집니다. 그럴 경우 연동을 끊거나 워크플로를 `workflow_dispatch`(수동) 전용으로
  바꾸세요. (테스트·보안 점검용 워크플로는 무방 — `deploy` 만 하지 않게.)

## 6. Cloudflare 설정 파일
| 파일 | 역할 |
|------|------|
| [wrangler.jsonc](../wrangler.jsonc) | `pages_build_output_dir: "out"` |
| [public/_headers](../public/_headers) | `/_next/static/*` 1년 불변 캐시 + 보안헤더(X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) |

## 7. 배포 로그 — `deployments/deploy-log.jsonl`
배포 1건당 JSON 1줄(JSONL). 최근 확인: `tail -n 5 deployments/deploy-log.jsonl`

- **git 추적 대상이 아닙니다**(`.gitignore`) — 배포할 때마다 트리가 더러워져
  다음 배포 게이트를 스스로 막는 사고를 방지.
- 로그 쓰기는 Wrangler 성공 뒤, IndexNow 전에 실행됩니다. append 권한 오류가 나면 Cloudflare
  배포는 이미 끝났을 수 있지만 스크립트는 완료 문구와 IndexNow 전에 중단됩니다. Cloudflare
  배포 상태를 확인하고 로그 경로 권한을 고친 뒤, 라이브 검증과 IndexNow를 별도로 수행합니다.

## 8. IndexNow 통지와 필수 색인 인계

Production 배포가 끝나면 [`scripts/ping-indexnow.mjs`](../scripts/ping-indexnow.mjs)가 라이브
RSS에서 기사 URL을 최대 30개 읽고 홈을 앞에 추가해 Bing/IndexNow와 Naver에 병렬 POST합니다.

- `[indexnow] 31개 URL 통지 → Bing/IndexNow HTTP … · Naver HTTP …`처럼 엔진별 응답을 기록합니다.
- HTTP 200·202는 **요청 접수** 증거일 뿐 크롤링·`indexed_current` 증거가 아닙니다.
- 이 스크립트는 best-effort 알림이라 HTTP 오류·개별 네트워크 실패를 출력해도 배포를 차단하지
  않고, RSS `res.ok`도 게이트로 검사하지 않습니다. URL 건수가 1개뿐이면 RSS 취득부터 재확인합니다.
- 자동 목록은 RSS 최신 기사 최대 30개 + 홈뿐입니다. 정적 페이지와 신규 기사 전건을 보장하지 않습니다.
- 라이브 HTTP 200·self-canonical·index/follow를 확인한 **신규 기사 canonical URL 전건**을
  `색인 담당자` 작업 `019ef3e0-e684-7be0-a164-3cdfacfeb6fa`로 반드시 보냅니다. 발행일·건수·
  사이트 커밋·IndexNow 결과를 함께 적고 `handoff_sent`·`requested`·`submitted`·
  `indexed_current`를 분리해 기록합니다.
- `public/df645….txt`와 `public/fc303….txt` 두 키 파일은 기존 엔진 검증을 위해 모두 유지합니다.

## 9. export 호환을 위해 적용된 것 (회귀 주의)
- 동적 라우트(`[category]`, `[slug]`): `export const dynamicParams = false`.
- XML·robots 라우트(`sitemap.xml/route.ts`, `news-sitemap.xml/route.ts`,
  `sitemap-pages.xml/route.ts`, `robots.txt/route.ts`, `rss.xml/route.ts`)는
  `export const dynamic = "force-static"`으로 빌드 시 정적 생성.
- 이미지: `unoptimized`(Next 이미지 서버 미사용).
- ⚠️ 정적 export 에서 **불가**: 동적 SSR/route handler, 서버 액션, 미들웨어 런타임, `next start`.

## 10. 승급 경로 — 동적 기능이 필요해지면
현재 인증·댓글·뉴스레터·조회수는 Pages Functions로 제공합니다. Next.js SSR·ISR·Server
Actions처럼 Next 서버 런타임이 꼭 필요한 기능을 도입할 때만
**`@opennextjs/cloudflare`(Cloudflare Workers)** 로 승급합니다.

1. `output: "export"` 제거.
2. `npm i -D @opennextjs/cloudflare wrangler` + `open-next.config.ts`.
3. `npx opennextjs-cloudflare build && ... deploy`. 캐시는 Workers KV/R2.

## 11. 사전 준비 / 트러블슈팅
- `npm install` 로 의존성(특히 `wrangler`, `next`)이 설치돼 있어야 합니다.
  스크립트는 `node_modules/.bin` 의 로컬 바이너리를 씁니다.
- 모바일 스모크 최초 설치: `npx playwright install chromium webkit`.
- wrangler 로그인: `wrangler whoami` → 미인증이면 `wrangler login`.
- 계정이 여러 개라 비대화형에서 막히면: `export CLOUDFLARE_ACCOUNT_ID=<account-id>` 후 배포.
- "배포 중단(미커밋)" → `git status` 확인 후 커밋하거나 정리한 뒤 재배포.
- 배포 직후 첫 요청이 엣지 캐시로 404 가 날 수 있습니다. 20초 뒤
  `Cache-Control: no-cache`로 재확인하십시오. UA 지정은 차단 증상을 재현·우회할 때만
  선택적으로 사용하며, 기본 UA가 항상 403이라고 가정하지 않습니다.
- R2 확인 캐시의 정본은 Git common dir의 `modooilbo-cache/r2-synced.json`입니다. Git 메타데이터
  안의 비추적 속도 캐시이므로 어느 worktree의 미커밋 게이트에도 걸리지 않습니다.
  `scripts/.r2-synced.json`은 기존 캐시 병합과 비-Git 폴백을 위해 계속 gitignore 합니다.
  캐시는 지워도 안전하며, 다음 실행이 실제 서빙 URL을 다시 HEAD 검사합니다. 캐시를 무시해
  전수 확인하려면 `node scripts/sync-stock-r2.mjs --verify-all`을 사용합니다.

## 12. 운영 체크리스트
- [x] 커스텀 도메인 연결
- [ ] `images.unoptimized` → **Cloudflare Images** 로더로 교체
- [ ] Cloudflare Web Analytics
- [ ] 실데이터 소스(CMS/API) 연동 → [00-direction 로드맵](00-direction.md)
