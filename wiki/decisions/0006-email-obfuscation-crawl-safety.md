# 0006 · 공개 이메일 링크와 Cloudflare 난독화의 크롤 안전성

- **날짜** 2026-09-02
- **상태** 구현·로컬 검증 완료, 배포 대기
- **결정자** 개발
- **관련** Ahrefs Site Audit 2026-09-02 · `src/components/PlainEmail.tsx`

## 배경

2026-09-02 Ahrefs 크롤에서 Cloudflare Email Address Obfuscation이 공개 `mailto:` 링크를
`/cdn-cgi/l/email-protection#…` 형태로 바꾸면서 이를 사이트 내부 base path로 해석한 404가
발생했다. 감사 결과는 broken page 링크 1,378페이지, broken links 1,397건이었다.

발행인·정정·고충처리 연락처는 JavaScript 차단 환경과 텍스트 클라이언트에서도 주소와 실제
`mailto:` 목적지가 남아야 한다. 동시에 사용자 입력을 raw HTML로 렌더하는 범용 우회는 금지한다.

Cloudflare 공식 문서는 전체 zone의 Email Address Obfuscation을 끄는 방법과 특정 구간을
`<!--email_off-->…<!--/email_off-->`로 제외하는 방법을 모두 지원한다.

- https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/

## 근거 데이터

```bash
rg -n --glob '!out/**' --glob '!node_modules/**' 'mailto:|@modooilbo\.com' src
```

- Ahrefs 직접 오류: 링크 대상 404 1,378페이지, broken links 1,397건
- 현재 코드에는 푸터·기사·기자·정정·정책·문의 등 여러 공개 이메일 경로가 있다.
- 기존 `PlainEmail`은 텍스트만 예외 처리하므로 같은 위치의 `mailto:` 링크 전체를 보호하지 못한다.

## 선택지

| 안 | 내용 | 비용 | 리스크 |
|---|---|---|---|
| A | Cloudflare zone의 Email Address Obfuscation을 OFF | 코드 변경이 작음 | 운영 설정 승인이 필요하고 모든 공개 이메일의 스팸 수집 방어를 한꺼번에 제거하며, 로컬에서 변환 중단을 증명할 수 없음 |
| B | 신뢰된 주소 상수만 받는 `PlainEmailLink`가 실제 HTML 주석 범위 안에 링크 전체를 출력 | 공개 이메일 렌더 경로를 컴포넌트로 교체하고 산출 HTML 검사 필요 | 예외 처리한 주소는 수집 봇에도 평문으로 보여 스팸 노출이 늘어남 |

## 결정

**B안을 선택한다.** 운영 zone 설정을 바꾸지 않고 문제 링크만 코드에서 결정적으로 제외할 수 있고,
JavaScript가 없어도 평문 주소와 클릭 가능한 `mailto:` 링크를 유지한다. zone 전체 OFF보다 변경 반경이
작으며, 향후 실수로 추가된 비공개성 이메일은 Cloudflare의 기본 보호를 계속 받는다.

`PlainEmailLink`는 저장소가 정의한 신뢰된 이메일 상수만 받는다. `href`, 표시 문자열, 주제·본문을
포함한 링크 전체가 실제 `<!--email_off-->` 주석 사이에 있어야 한다. 링크 텍스트만 감싸거나 출력에서
사라지는 JSX 주석을 쓰지 않는다.

**버리는 A안의 이유** — 이번 착수 승인은 Cloudflare 운영 설정 변경 권한이 아니며, 모든 주소의
보호를 동시에 끄는 것은 필요한 범위보다 넓다. A안은 승인 후 대체안으로만 남긴다.

## 구현

- `PUBLIC_EMAILS` 허용 목록에 공개 연락 주소 9개만 둔다.
- `PlainEmailLink`가 주소·표시 문자열·CSS 속성을 HTML escape하고 subject/body를 URI 인코딩한
  뒤, 실제 주석 범위 안에 앵커 전체를 출력한다. 푸터의 메일 SVG도 같은 앵커 안에 유지한다.
- 푸터·기사·기자·정정·정책·문의·광고·구독·윤리·고충처리인 등 공개 `mailto:`를 모두
  `PlainEmailLink`로 교체했다. 공개 평문 주소는 `PlainEmail` 또는 `PlainEmailText`로 감쌌다.
- `PlainEmailText`는 허용 목록 주소만 찾으므로 기사에 인용된 제3자 이메일은 Cloudflare 보호
  대상에서 빠지지 않는다.
- production build 뒤 `scripts/email-obfuscation.test.mjs`가 전체 산출 HTML을 검사하며,
  `postbuild`에서 SEO 회귀 검사와 함께 자동 실행된다.
- robots, 학습 봇 허용, 기사 slug·외부 출처 URL은 변경하지 않는다.

## 검증

- production build 1,414개 정적 페이지 생성 성공.
- 산출 HTML 1,406개에서 보호 링크 4,025개와 보호 평문 1,416개를 확인했다. 주석 밖 first-party
  `mailto:`·평문 주소·정적 `/cdn-cgi/l/email-protection`은 0건이며, 제3자 이메일 텍스트 34건은
  의도대로 Cloudflare 보호 대상으로 남았다.
- 로컬 static preview의 홈·기사·reporter 2페이지·contact·policy raw HTML이 모두 HTTP 200이고,
  각 표본에서 실제 `email_off` 주석이 남는 것을 확인했다.
- 현재 Production은 아직 종전 코드라 같은 5개 표본에서 `/cdn-cgi/l/email-protection`이 남고,
  fragment를 제외한 대상은 HTTP 404다. 승인된 배포 뒤 raw HTTP에서 이 값이 0인지 확인해야 닫는다.
- Cloudflare zone 설정은 변경하지 않았다.

## 승인 뒤 적용 순서와 A안 예비 절차

B안의 기본 순서는 **Cloudflare Email Address Obfuscation을 ON으로 유지**한 채 승인된 코드만
Preview에 배포하고, raw HTML에서 `email_off`가 앵커 전체를 감싸는지와 JS 자산 200을 확인한 뒤
Production으로 승급하는 것이다. Production에서는 홈·기사·reporter·contact·policy에서
`/cdn-cgi/l/email-protection` 링크 0건, 실제 `mailto:`와 평문 주소 유지, reporter canonical과
`og:url` 일치, `/policy` 무슬래시 링크 0건을 다시 확인한다.

B안 주석이 Cloudflare에서 예외로 인정되지 않는 실제 증거가 나온 경우에만 A안을 다시 요청한다.
별도 명시 승인을 받은 뒤 Dashboard의 **Security → Settings → Client-side abuse → Email Address
Obfuscation**을 Off로 바꾸거나, 최소 권한 API 토큰으로 다음 zone setting을 적용한다. 지금 실행하지 않는다.

```bash
curl --request PATCH \
  "https://api.cloudflare.com/client/v4/zones/$MODOO_ZONE_ID/settings/email_obfuscation" \
  --header "Authorization: Bearer $MODOO_CF_API_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"value":"off"}'
```

A안을 쓰게 되면 설정 응답만으로 완료 처리하지 않고 같은 Production raw HTTP 표본을 다시 읽어
변환 0건을 증명한다. 스팸 수집 노출이 zone 전체로 넓어지는 점도 승인 요청에 다시 명시한다.

## 되돌리는 법

공개 이메일 렌더 위치를 일반 `<a href="mailto:…">`로 되돌리고 `PlainEmailLink`를 제거한다.
zone 설정은 이 결정으로 변경하지 않으므로 별도 되돌림이 없다.
