/**
 * Cloudflare 이메일 난독화를 끄고 주소를 평문으로 노출한다.
 *
 * ⚠️ Cloudflare(Scrape Shield)의 Email Address Obfuscation 이 **엣지에서** 본문 이메일을
 *    `[email protected]` + 자바스크립트 디코더로 바꿔치기한다. 빌드 산출물(out/)에는
 *    평문이 그대로 있어서 로컬 확인으로는 절대 잡히지 않고, 배포 후 라이브에서만 드러난다.
 *
 *    문제는 스크립트가 막힌 환경(소스 보기, 텍스트 브라우저, 일부 크롤러·검수 도구)에서는
 *    주소가 끝내 안 보인다는 점이다. 신문법상 필요적 게재사항(발행인 연락처)과
 *    청소년보호책임자·고충처리인·정정보도 접수 주소는 등록기관이 확인하는 항목이라
 *    그 자리에서만 난독화를 끈다. 나머지 이메일은 그대로 보호받는다.
 *
 *    `<!--email_off-->` 는 Cloudflare 가 정한 구간 제외 표기다. **진짜 HTML 주석**이어야 하는데
 *    JSX 주석 `{/* *\/}` 는 출력에 남지 않으므로 dangerouslySetInnerHTML 로 직접 심는다.
 *    address 는 코드 상수(SITE·리터럴)만 들어오므로 주입 위험이 없다 — 사용자 입력을 넘기지 말 것.
 */
export function PlainEmail({ address }: { address: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{ __html: `<!--email_off-->${address}<!--/email_off-->` }}
    />
  );
}
