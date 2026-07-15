/**
 * 예약 이메일 도메인 — 단일 정의(가드 누락 재발 방지).
 *
 * `@users.modooilbo.com`은 **수신 불가(비라우팅) 합성 계정 전용** 도메인이다.
 *  - 소셜 간편가입에서 제공자의 검증된 이메일을 쓸 수 없을 때의 계정 키
 *    (naver_<id>@…, kakao_<id>@…, google_<id>@…)
 *  - 탈퇴 회원 댓글의 FK 소유자인 시스템 계정(deleted@…)
 *
 * 이 도메인의 주소는 **사람이 소유를 증명할 수 없다**(메일이 배달되지 않는다).
 * 따라서 외부 입력(가입·이메일 등록·재설정 요청)으로 받아들이면 안 된다.
 * 특히 deleted@users.modooilbo.com이 선점되면 시스템 계정 생성이 UNIQUE 충돌로 막혀
 * 댓글을 쓴 회원의 탈퇴가 FK 위반으로 영구 실패한다(delete-account 참조).
 */
export const RESERVED_EMAIL_DOMAIN = "users.modooilbo.com";

const RESERVED_SUFFIX = `@${RESERVED_EMAIL_DOMAIN}`;

/** 합성(비수신) 계정 이메일인가 — 외부 입력 차단·합성 계정 판별의 공용 기준. */
export function isReservedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(RESERVED_SUFFIX);
}

/** 소셜 간편가입용 합성 이메일. 유일성은 provider_user_id가 보장한다. */
export function syntheticEmail(provider: "google" | "kakao" | "naver", providerUserId: string): string {
  return `${provider}_${providerUserId}${RESERVED_SUFFIX}`;
}
