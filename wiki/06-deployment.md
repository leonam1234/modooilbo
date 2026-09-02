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

**GitHub = 코드 기록용, Cloudflare = 실배포.** 둘은 별개 동작입니다.

배포 스크립트는 **커밋되지 않은 변경이 있으면 배포를 중단**합니다.
즉 "현재 커밋 = 배포된 것"이 항상 보장됩니다. 그래서 운영 승급 순서는 항상:

> **먼저 커밋 → Preview 배포 → 모바일 4조합 스모크와 비교 이미지 확인 → Production 배포**

```bash
npm run deploy:preview
npm run smoke -- <Preview URL> / /policy/ /newsroom/
# 결론 PASS와 smoke-shots/<실행시각>/compare-*.png 육안 대조 뒤에만
npm run deploy:prod
npm run smoke -- https://modooilbo.com / /policy/ /newsroom/
```

스모크가 FAIL이거나 Chromium·WebKit 비교 이미지에서 레이아웃 차이가 확인되면
Production 배포를 중단합니다. 운영 배포 뒤에는 같은 경로를 다시 검사해 라이브 반영을 증명합니다.

## 3. 명령어

| 명령 | 대상 | 결과 |
|---|---|---|
| `npm run deploy:preview` | **Preview** | 미리보기 URL. 운영 도메인 영향 없음 |
| `npm run deploy:prod` | **Production** | **modooilbo.com** 반영 (`--branch master`) |
| `npm run deploy:cf` | = `deploy:prod` | 레거시 별칭. 게이트·로그 동일 적용 |
| `node scripts/deploy.mjs prod --dry-run` | — | 빌드·배포 없이 **실행될 명령만** 출력 |

내부 동작: ① `git status` 확인(미커밋이면 중단) → ② commit SHA·branch 캡처 →
③ `next build` → ④ `wrangler pages deploy out` → ⑤ 배포 URL 파싱 →
⑥ `deployments/deploy-log.jsonl` 기록 → ⑦ IndexNow 통지.

```bash
npm run build            # → out/ (정적 페이지 + robots.txt + sitemap.xml + _headers)
npm run preview:static   # 로컬 검증 (localhost:3001)
npx wrangler login       # CF 계정 1회 로그인
npm run deploy:prod
```

## 4. Preview vs Production
- Cloudflare Pages 프로젝트의 **production 브랜치 = `master`**.
- `deploy:prod` 는 로컬 git 브랜치와 무관하게 항상 `--branch master` 로 보냅니다.
  **현재 커밋이 그대로 운영에 올라갑니다.**
- `deploy:preview` 는 현재 git 브랜치 이름을 미리보기 별칭으로 씁니다.

## 5. 자동배포는 **의도적으로 없습니다**
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
- ⚠️ 이 폴더가 iCloud 동기화 대상이라 **환경에 따라 쓰기가 EPERM 으로 실패**합니다.
  **배포·푸시·라이브 반영은 정상**이므로 그 에러만 보고 실패로 오해하지 마십시오.

## 8. IndexNow 통지 — ⚠️ 네이버만 갑니다
배포 마지막에 `[indexnow] N개 URL 통지 → HTTP 200` 이 찍히는데 **그건 네이버입니다.**

- [`scripts/ping-indexnow.mjs`](../scripts/ping-indexnow.mjs) 는
  `searchadvisor.naver.com/indexnow` 로만 POST 합니다.
  공용 `api.indexnow.org` 는 **빙 검증 지연 403 이 계속돼 2026-07-07 에 일부러 뺐습니다.**
- URL 목록은 **RSS 기반 = 최신 기사 30개 + 홈**뿐이라 `/policy`·`/about` 같은
  정적 페이지는 애초에 안 들어갑니다.
- **빙 색인은 웹마스터에서 수동으로** 해야 합니다.
- ⚠️ **IndexNow 키(`public/df645….txt`)를 새로 만들거나 바꾸지 마십시오.**
  네이버 통지와 공유하는 키라, 빙 403 을 고치겠다고 갈면 **네이버 색인까지 깨집니다.**

## 9. export 호환을 위해 적용된 것 (회귀 주의)
- 동적 라우트(`[category]`, `[slug]`): `export const dynamicParams = false`.
- 메타 라우트(`sitemap.ts`, `robots.ts`): `export const dynamic = "force-static"`.
- 이미지: `unoptimized`(Next 이미지 서버 미사용).
- ⚠️ 정적 export 에서 **불가**: 동적 SSR/route handler, 서버 액션, 미들웨어 런타임, `next start`.

## 10. 승급 경로 — 동적 기능이 필요해지면
인증·댓글·서버 검색·ISR 등이 필요해지면 **`@opennextjs/cloudflare`(Cloudflare Workers)** 로 승급:
1. `output: "export"` 제거.
2. `npm i -D @opennextjs/cloudflare wrangler` + `open-next.config.ts`.
3. `npx opennextjs-cloudflare build && ... deploy`. 캐시는 Workers KV/R2.

## 11. 사전 준비 / 트러블슈팅
- `npm install` 로 의존성(특히 `wrangler`, `next`)이 설치돼 있어야 합니다.
  스크립트는 `node_modules/.bin` 의 로컬 바이너리를 씁니다.
- wrangler 로그인: `wrangler whoami` → 미인증이면 `wrangler login`.
- 계정이 여러 개라 비대화형에서 막히면: `export CLOUDFLARE_ACCOUNT_ID=<account-id>` 후 배포.
- "배포 중단(미커밋)" → `git status` 확인 후 커밋하거나 정리한 뒤 재배포.
- 배포 직후 첫 요청이 엣지 캐시로 404 가 날 수 있습니다. 20초 뒤
  `Cache-Control: no-cache` + **데스크톱 UA** 로 재확인하십시오(기본 UA 는 403).

## 12. 운영 체크리스트
- [x] 커스텀 도메인 연결
- [ ] `images.unoptimized` → **Cloudflare Images** 로더로 교체
- [ ] Cloudflare Web Analytics
- [ ] 실데이터 소스(CMS/API) 연동 → [00-direction 로드맵](00-direction.md)
