# 06 · 배포 (Deployment) — Cloudflare 최적화

상세: [DEPLOY.md](../DEPLOY.md). 이 문서는 요약 + 의사결정 근거.

## 1. 왜 정적 export + Cloudflare Pages 인가
- 전 페이지가 정적(SSR 불필요) → **정적 호스팅이 최적**: 서버비용 0, 전 세계 엣지 CDN, 즉시 캐싱, 운영 단순.
- `next.config.mjs`: `output: "export"` + `trailingSlash: true` + `images.unoptimized`.

## 2. 배포 절차
```bash
npm run build            # → out/ (90 정적 페이지 + robots.txt + sitemap.xml + _headers)
npm run preview:static   # 로컬 검증 (localhost:3001)
npx wrangler login       # CF 계정 1회 로그인
npm run deploy:cf        # build + wrangler pages deploy out → *.pages.dev
```
또는 **대시보드 Git 연동**: Build command `npm run build`, Output dir `out`, `NODE_VERSION=20+`.

## 3. Cloudflare 설정 파일
| 파일 | 역할 |
|------|------|
| [wrangler.jsonc](../wrangler.jsonc) | `pages_build_output_dir: "out"` |
| [public/_headers](../public/_headers) | `/_next/static/*` 1년 불변 캐시 + 보안헤더(X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) |

## 4. export 호환을 위해 적용된 것 (회귀 주의)
- 동적 라우트(`[category]`, `[slug]`): `export const dynamicParams = false`.
- 메타 라우트(`sitemap.ts`, `robots.ts`): `export const dynamic = "force-static"`.
- 이미지: `unoptimized`(Next 이미지 서버 미사용).
- ⚠️ 정적 export에서 **불가**: 동적 SSR/route handler, 서버 액션, 미들웨어 런타임, `next start`.

## 5. 승급 경로 — 동적 기능이 필요해지면
인증·댓글·서버 검색·ISR 등이 필요해지면 **`@opennextjs/cloudflare`(Cloudflare Workers)** 로 승급:
1. `output: "export"` 제거.
2. `npm i -D @opennextjs/cloudflare wrangler` + `open-next.config.ts`.
3. `npx opennextjs-cloudflare build && ... deploy`. 캐시는 Workers KV/R2.

## 6. 운영 체크리스트
- [ ] 커스텀 도메인 연결
- [ ] `images.unoptimized` → **Cloudflare Images** 로더로 교체
- [ ] Cloudflare Web Analytics
- [ ] 실데이터 소스(CMS/API) 연동 → [00-direction 로드맵](00-direction.md)
