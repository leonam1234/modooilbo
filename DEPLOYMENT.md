# 배포 운영 가이드 (DEPLOYMENT)

> 모두일보는 **GitHub = 코드 기록용**, **Cloudflare = 실배포** 로 운영합니다.
> 배포는 GitHub Actions가 아니라 **로컬/Codex 환경에서 wrangler 직접 실행**입니다.
> (정적 배포 자체의 기술 설명은 [`DEPLOY.md`](DEPLOY.md) 참고.)

## 가장 중요한 규칙

```
커밋해줘  = GitHub 에 코드 기록을 남긴다 (git commit, 필요 시 push)
배포해줘  = 현재 커밋을 Cloudflare 에 올린다 (wrangler)
```

그래서 운영은 항상 이 순서:

> **“먼저 커밋해줘. 그다음 production 배포해줘.”**

배포 스크립트는 **커밋되지 않은 변경이 있으면 배포를 중단**합니다. 즉 "현재 커밋 = 배포된 것"이 항상 보장됩니다.

## 명령어

| 명령 | 대상 | 결과 |
|---|---|---|
| `npm run deploy:preview` | Cloudflare **Preview** | 미리보기 URL (`<branch>.modooilbo.pages.dev` / 고유 해시 URL). 운영 도메인엔 영향 없음 |
| `npm run deploy:prod` | Cloudflare **Production** | **modooilbo.com** 운영 반영 (`--branch master`) |
| `npm run deploy:cf` | = `deploy:prod` (레거시 별칭, 동일하게 게이트·로그 적용) |
| `node scripts/deploy.mjs prod --dry-run` | — | 빌드/배포 없이 **실행될 명령만** 출력 (점검용) |

각 명령은 내부적으로: ① `git status` 확인(미커밋이면 중단) → ② commit SHA·branch 캡처 → ③ `next build` → ④ `wrangler pages deploy out` → ⑤ 배포 URL 파싱 → ⑥ `deployments/deploy-log.jsonl` 에 기록.

### 자주 쓰는 흐름

```bash
# 1) 변경 작업 후 커밋 (GitHub 기록)
git add -A && git commit -m "feat: ..."

# 2) 먼저 미리보기로 확인
npm run deploy:preview          # → 미리보기 URL 확인

# 3) 이상 없으면 운영 배포
npm run deploy:prod             # → modooilbo.com 반영
```

## Preview vs Production

- Cloudflare Pages 프로젝트의 **production 브랜치 = `master`**. `--branch master` 로 배포하면 운영(modooilbo.com), 다른 `--branch` 값이면 미리보기.
- `deploy:prod` 는 항상 `--branch master` 로 보냅니다(로컬 git 브랜치와 무관). **운영 배포는 가급적 `master` 코드 기준**으로 하세요(현재 커밋이 운영에 그대로 올라갑니다).
- `deploy:preview` 는 현재 git 브랜치 이름을 미리보기 별칭으로 사용합니다.

## 배포 로그 — `deployments/deploy-log.jsonl`

배포 1건당 JSON 1줄(JSONL). 예:

```json
{"time":"2026-06-30T05:00:00.000Z","env":"Production","project":"modooilbo","gitBranch":"master","cfBranch":"master","commit":"<full-sha>","shortCommit":"52959fd","commitMessage":"...","url":"https://<hash>.modooilbo.pages.dev","deployedFrom":"<hostname>"}
```

- 이 파일은 **git 추적 대상이 아닙니다(`.gitignore`)** — 배포할 때마다 트리가 더러워져 다음 배포 게이트를 스스로 막는 사고를 막기 위함. iCloud 공유 폴더라 Mac↔Codex 간에는 파일로 공유됩니다.
- 최근 배포 확인: `tail -n 5 deployments/deploy-log.jsonl`

## 자동배포에 대하여 (의도적으로 없음)

- **GitHub Actions 배포 워크플로 없음** (`.github/` 폴더 자체가 없음). → GitHub push는 코드 기록일 뿐, 배포되지 않습니다.
- **Cloudflare Pages Git 연동 없음** (프로젝트 `Git Provider: No`). → Cloudflare가 깃을 감시해 자동 빌드하지 않습니다.
- ⚠️ 누군가 나중에 Cloudflare 대시보드에서 **Git 연동**을 붙이거나 `.github/workflows`에 배포 워크플로를 추가하면 이 원칙이 깨집니다. 그럴 경우 연동을 끊거나 워크플로를 `workflow_dispatch`(수동) 전용으로 바꾸세요. (테스트/보안 점검용 워크플로는 추가해도 무방 — 단 `deploy`를 하지 않게.)

## 사전 준비 / 트러블슈팅

- `npm install` 로 의존성(특히 `wrangler`, `next`)이 설치돼 있어야 합니다. 스크립트는 `node_modules/.bin` 의 로컬 바이너리를 사용합니다.
- wrangler 로그인: `wrangler whoami` 로 확인. 미인증이면 `wrangler login`.
- 계정이 여러 개라 비대화형에서 막히면: `export CLOUDFLARE_ACCOUNT_ID=<account-id>` 후 배포.
- "배포 중단(미커밋)" 메시지 → `git status` 로 변경 확인 후 커밋하거나 정리한 뒤 다시 배포.
