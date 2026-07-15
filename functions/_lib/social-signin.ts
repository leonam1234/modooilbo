/**
 * 소셜 간편가입/로그인의 **계정 결정 규칙** — google·kakao 공용 단일 정의.
 *
 * ⚠️ 왜 한 곳에 모았나: 이 규칙은 보안 규칙이다(잘못 느슨해지면 계정 선점이 열린다).
 *   google/callback.ts와 kakao/callback.ts에 같은 40여 줄이 복사돼 있으면 한쪽만 고쳐지는 순간
 *   두 제공자의 안전 수준이 조용히 갈라진다. 규칙은 여기서만 바꾼다.
 *   (naver는 이 함수를 쓰지 않는다 — 제공자 이메일 검증 플래그가 없어 애초에 이메일을 안 쓴다.
 *    naver/callback.ts의 주석 참조.)
 *
 * ★ 자동 병합 조건 — **양쪽이 다 증명됐을 때만**:
 *   ① verifiedEmail !== null — 제공자가 "이 주소는 검증됐다"고 단언(google=email_verified,
 *      kakao=is_email_verified). 호출부가 그 플래그를 확인해 null 여부로 넘긴다.
 *   ② findVerifiedUserByEmail(...) !== null — 그 주소를 **우리 쪽에서도** 검증한 계정이 존재
 *      (가입 확인 메일·이메일 등록 인증·비밀번호 재설정 중 하나를 통과 = 수신함 통제 증명).
 *   둘 다면 같은 주소의 수신함을 양쪽에서 증명한 것이므로 같은 사람이다 → 계정을 합친다.
 *
 * ⚠️ ②를 "users.email이 같다"로 바꾸면 2026-07-15 1차에서 막은 계정 선점이 그대로 되살아난다.
 *   users.email은 소유가 증명된 값이 아니기 때문이다(구 signup은 인증 없이 계정을 만들어 줬다).
 *   미검증 계정은 절대 병합 대상이 아니다 — 그때는 합성 이메일로 **별도 계정**을 만든다.
 */
import { type AuthEnv } from "./auth";
import { uniqueSignupName } from "./names";
import { syntheticEmail } from "./reserved-email";
import { findVerifiedUserByEmail, markEmailVerifiedStmt, type VerifyMethod } from "./email-verified";

export type SocialProvider = "google" | "kakao";

export interface SocialSignInResult {
  userId: string;
  /** 'merge' = 기존 검증 계정에 연결 · 'login' = 이미 연결된 계정 · 'signup' = 새 계정 */
  outcome: "merge" | "login" | "signup";
}

/**
 * 소셜 로그인 1회의 계정을 확정한다(연결 모드 link=1은 호출부가 먼저 처리한다).
 *
 * @param verifiedEmail 제공자가 **검증됨으로 단언한** 주소만. 미검증·미제공이면 반드시 null.
 *   ⚠️ 검증 안 된 주소를 여기 넘기면 병합 조건 ①이 무너진다. 호출부에서 걸러라.
 */
export async function resolveSocialUser(
  env: AuthEnv,
  provider: SocialProvider,
  providerUserId: string,
  verifiedEmail: string | null,
  profileName: string,
  fallbackName: string,
): Promise<SocialSignInResult> {
  // 1) 이미 연결된 소셜 계정 → 그냥 로그인.
  const ident = (await env.DB.prepare(
    "SELECT user_id FROM identities WHERE provider = ?1 AND provider_user_id = ?2",
  )
    .bind(provider, providerUserId)
    .first()) as { user_id?: string } | null;
  if (ident?.user_id) return { userId: String(ident.user_id), outcome: "login" };

  // 2) 자동 병합 판정 — 양방향 검증. (①은 verifiedEmail !== null, ②는 아래 조회)
  const verifiedOwner = verifiedEmail ? await findVerifiedUserByEmail(env, verifiedEmail) : null;
  if (verifiedOwner) {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, ?2, ?3)",
      ).bind(verifiedOwner, provider, providerUserId),
      // 병합 시 그 계정의 기존 세션을 전부 끊는다(update-password·reset과 동일 규약).
      // 병합은 계정에 새 로그인 수단이 붙는 중대한 변경이다. 만에 하나 이 계정을 남이 열어 둔
      // 상태였다면 그 세션이 살아 있으면 안 된다. 정상 사용자의 체감 손해는 다른 기기 재로그인뿐
      // (호출부가 바로 새 세션을 발급한다).
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(verifiedOwner),
    ]);
    return { userId: verifiedOwner, outcome: "merge" };
  }

  // 3) 신규 가입 — 병합 조건 미달이면 기존 계정에 붙이지 않는다.
  //    여기 걸리는 경우: 제공자가 이메일을 안 줬거나 미검증으로 줬거나, 그 주소를 쓰는 계정이
  //    **미검증**인 경우(인증 도입 이전 계정 등). 이때 이메일이 같다는 이유로 병합하면
  //    소유가 증명되지 않은 주소로 남의 계정에 들어가는 것 = 계정 선점이다.
  //    → 합성 이메일로 별도 계정. 기존 계정에 붙이려면 로그인 상태에서 /account의
  //      [연결하기](link=1) — 현재 세션 소유자 확인이 곧 소유 증명이다.
  const userId = crypto.randomUUID();
  const finalName = await uniqueSignupName(env, profileName, fallbackName);
  let accountEmail = verifiedEmail ?? syntheticEmail(provider, providerUserId);
  if (verifiedEmail) {
    const taken = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?1 LIMIT 1")
      .bind(verifiedEmail)
      .first();
    if (taken) accountEmail = syntheticEmail(provider, providerUserId); // 미검증 계정이 쓰는 중 → 분리
  }
  const stmts = [
    env.DB.prepare(
      "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter, terms_agreed_at) VALUES (?1, ?2, ?3, NULL, NULL, 0, datetime('now','+9 hours'))",
    ).bind(userId, accountEmail, finalName),
    env.DB.prepare(
      "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, ?2, ?3)",
    ).bind(userId, provider, providerUserId),
  ];
  // 제공자가 검증한 주소를 그대로 계정 키로 쓴 경우에만 검증됨으로 기록한다.
  // (합성 이메일은 수신 불가 주소라 검증 개념 자체가 없다 → 기록하지 않는다. 기록하면
  //  합성 주소가 병합 대상이 되어 버린다.)
  if (verifiedEmail && accountEmail === verifiedEmail) {
    stmts.push(markEmailVerifiedStmt(env, userId, verifiedEmail, `oauth:${provider}` as VerifyMethod));
  }
  await env.DB.batch(stmts);
  return { userId, outcome: "signup" };
}
