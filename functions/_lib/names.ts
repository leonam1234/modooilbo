/**
 * 간편가입(네이버/카카오/구글) 닉네임 정리 — 금칙어 제거 + 중복 회피.
 * "네이버회원" 같은 기본닉이 전원 동일해 댓글창에서 구분 불가하던 문제(2026-07-04):
 * 이미 쓰이는 이름이면 `이름_a3f2` 식 4자리 접미사를 붙여 고유하게 만든다.
 */
import type { AuthEnv } from "./auth";
import { hasBanned } from "./moderation";
import { isReservedName } from "./reserved-names";

function rand4(): string {
  const a = new Uint8Array(2);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function nameTaken(env: AuthEnv, name: string): Promise<boolean> {
  const r = await env.DB.prepare("SELECT 1 FROM users WHERE lower(name) = lower(?1) LIMIT 1")
    .bind(name)
    .first();
  return !!r;
}

/**
 * 프로필 이름을 소셜 가입용으로 확정: 금칙어·사칭어면 fallback, 중복이면 접미사. 최대 20자 보장.
 *
 * ⚠️ `raw`는 **외부 제공자가 준 값**이라 신뢰할 수 없다. 공격자가 네이버·카카오 프로필 이름을
 *   "김영환"으로 바꾸고 간편가입하면 소속 기자 사칭 계정이 만들어진다 — 이메일 가입 경로만
 *   막아 봐야 소셜 경로가 열려 있으면 소용없다(2026-07-21 보안 감사).
 *   여기서는 **거부하지 않고 fallback으로 대체**한다. 소셜 로그인은 사용자가 이름을 고치는
 *   화면이 없어 400을 주면 로그인 자체가 막히기 때문(금칙어 처리와 같은 규약). 가입 후
 *   /account에서 직접 바꿀 수 있고, 그 경로(update-name)는 예약어를 정상적으로 거부한다.
 *
 * ⚠️ `fallback`은 **호출부가 주는 시스템 값**이라 검사하지 않는다("네이버회원"·"모두일보회원" 등).
 *   → 호출부는 반드시 사칭 소지 없는 값을 넘길 것.
 */
export async function uniqueSignupName(env: AuthEnv, raw: string, fallback: string): Promise<string> {
  let base = raw.trim().slice(0, 20) || fallback;
  if (hasBanned(base) || isReservedName(base)) base = fallback;
  if (!(await nameTaken(env, base))) return base;
  const stem = base.slice(0, 15); // "_xxxx" 5자 여유
  for (let i = 0; i < 5; i++) {
    const cand = `${stem}_${rand4()}`;
    if (!(await nameTaken(env, cand))) return cand;
  }
  return `${stem}_${rand4()}`; // 5회 충돌은 사실상 불가 — 마지막 후보 그대로 사용
}
