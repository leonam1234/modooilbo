/**
 * 이메일 검증 상태 — 단일 정의(판정 규칙이 갈라지지 않게).
 *
 * ⚠️ 이 모듈의 존재 이유: users.email은 **소유가 증명된 값이 아니다**. 가입 폼에 타이핑된
 *   문자열이거나(구 signup), 소셜 제공자가 넘긴 값이거나, 수신 불가 합성 주소일 수 있다.
 *   "그 주소를 정말 그 사람이 통제하는가"를 users만 보고는 알 수 없다 → 검증 사실을
 *   user_email_verified에 따로 기록하고, 그 판정을 여기 한 곳에서만 한다.
 *
 * ★ 핵심 안전 속성 — 판정은 항상 **`v.email = u.email`**(검증된 주소 = 현재 계정 주소)이다.
 *   계정 단위 boolean이 아니라 (계정, 주소) 쌍으로 보기 때문에, users.email이 나중에 바뀌면
 *   (verify-email.ts) 옛 검증 기록이 새 주소의 검증으로 승계되지 않고 **자동으로 미검증**이 된다.
 *   이 속성이 깨지면 소셜 자동 병합(google/kakao callback)이 곧바로 계정 선점 통로가 된다.
 *
 * 행이 없으면 미검증(기본값이 안전한 쪽). 기존 계정은 백필 없이 자동으로 미검증이다.
 *
 * ⚠️ 배포 전 db/migrations/0004_verified_signup.sql 원격 적용 필요(user_email_verified 테이블).
 */
import type { AuthEnv } from "./auth";

/** 검증 근거(주소 소유가 증명된 경로). 값은 감사·디버깅용이며 판정에는 쓰지 않는다. */
export type VerifyMethod =
  | "signup" // 가입 확인 메일 링크 클릭
  | "email-register" // 합성 이메일 계정의 실주소 등록 인증
  | "password-reset" // 재설정 메일 링크로 비밀번호 변경(= 수신함 통제 증명)
  | "oauth:google" // 구글이 email_verified=true로 단언
  | "oauth:kakao"; // 카카오가 is_email_verified=true로 단언

/**
 * 검증 사실 기록용 D1 문(배치에 넣어 쓴다 — 계정 생성과 같은 트랜잭션이어야 한다).
 * 계정당 1행(PK user_id)이라 주소가 바뀌면 그 행을 덮어쓴다 → 묵은 기록이 남지 않는다.
 */
export function markEmailVerifiedStmt(env: AuthEnv, userId: string, email: string, method: VerifyMethod): any {
  return env.DB.prepare(
    `INSERT INTO user_email_verified (user_id, email, method, verified_at)
     VALUES (?1, ?2, ?3, datetime('now','+9 hours'))
     ON CONFLICT(user_id) DO UPDATE
       SET email = excluded.email, method = excluded.method, verified_at = excluded.verified_at`,
  ).bind(userId, email, method);
}

/** 검증 사실 기록(단독 실행). 실패는 호출부 정책에 맡긴다 — 예외를 그대로 던진다. */
export async function markEmailVerified(
  env: AuthEnv,
  userId: string,
  email: string,
  method: VerifyMethod,
): Promise<void> {
  await markEmailVerifiedStmt(env, userId, email, method).run();
}

/**
 * 이 주소를 **검증한 계정**을 찾는다. 소셜 자동 병합의 유일한 판정 기준.
 * users.email이 같기만 한 계정(미검증)은 잡히지 않는다 — 그게 이 함수의 요점이다.
 * @returns users.id 또는 null
 */
export async function findVerifiedUserByEmail(env: AuthEnv, email: string): Promise<string | null> {
  const row = (await env.DB.prepare(
    `SELECT u.id FROM users u
       JOIN user_email_verified v ON v.user_id = u.id AND v.email = u.email
      WHERE u.email = ?1
      LIMIT 1`,
  )
    .bind(email)
    .first()) as { id?: string } | null;
  return row?.id ? String(row.id) : null;
}
