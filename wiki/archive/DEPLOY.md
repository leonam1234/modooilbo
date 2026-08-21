# 배포 가이드 — Cloudflare 최적화

모두일보는 전 페이지가 **정적(SSG/Static)** 이므로 **Cloudflare Pages 정적 호스팅**에 최적화되어 있습니다. (서버 비용 0, 전 세계 엣지 CDN, 즉시 캐싱)

## 권장: Cloudflare Pages (정적 export)

`next.config.mjs`에 `output: "export"`가 적용되어 `next build` 시 `out/` 디렉터리에 완전한 정적 사이트가 생성됩니다.

### 1) 빌드
```bash
npm run build      # → out/ 생성 (HTML/CSS/JS + robots.txt + sitemap.xml + _headers)
```

### 2) 로컬에서 정적 결과 확인
```bash
npm run preview:static   # http://localhost:3001 에서 out/ 서빙
```

### 3) 배포 (둘 중 하나)
- **CLI (Wrangler)**
  ```bash
  npx wrangler pages deploy out --project-name modooilbo
  # 또는
  npm run deploy:cf
  ```
- **Git 연동 (대시보드)** — Cloudflare Pages > Create > Connect to Git
  - Build command: `npm run build`
  - Build output directory: `out`
  - 환경변수 `NODE_VERSION=20`(이상)

### 최적화 포인트
- `public/_headers` — `/_next/static/*` 1년 불변 캐시 + 전역 보안 헤더(X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- 이미지: `images.unoptimized`(정적). 운영 시 **Cloudflare Images** 로더로 교체 권장.
- `wrangler.jsonc` — `pages_build_output_dir: "out"`.
- `robots.txt` / `sitemap.xml` 자동 생성.

## 대안: 동적 기능이 필요해질 때 — Cloudflare Workers (OpenNext)

댓글/검색 API/실시간 등 SSR·ISR·서버 로직이 필요해지면 `@opennextjs/cloudflare`로 승급합니다.

```bash
npm i -D @opennextjs/cloudflare wrangler
# open-next.config.ts + wrangler.jsonc(워커) 설정 후
npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```
- 이 경우 `next.config.mjs`의 `output: "export"`를 제거하고 노드 런타임 라우트를 사용.
- 캐시는 Workers KV / R2, 정적 자산은 동일하게 엣지 캐시.

## 체크리스트
- [x] 전 페이지 정적 export (`out/`)
- [x] 엣지 캐시 + 보안 헤더(`_headers`)
- [x] robots / sitemap
- [x] PC·모바일 반응형, 라이트·다크
- [ ] (운영) 커스텀 도메인, Cloudflare Images, Web Analytics
