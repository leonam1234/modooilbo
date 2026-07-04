/**
 * 간편가입(네이버/카카오/구글) 닉네임 정리 — 금칙어 제거 + 중복 회피.
 * "네이버회원" 같은 기본닉이 전원 동일해 댓글창에서 구분 불가하던 문제(2026-07-04):
 * 이미 쓰이는 이름이면 `이름_a3f2` 식 4자리 접미사를 붙여 고유하게 만든다.
 */
import type { AuthEnv } from "./auth";
import { hasBanned } from "./moderation";

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

/** 프로필 이름을 소셜 가입용으로 확정: 금칙어면 fallback, 중복이면 접미사. 최대 20자 보장. */
export async function uniqueSignupName(env: AuthEnv, raw: string, fallback: string): Promise<string> {
  let base = raw.trim().slice(0, 20) || fallback;
  if (hasBanned(base)) base = fallback;
  if (!(await nameTaken(env, base))) return base;
  const stem = base.slice(0, 15); // "_xxxx" 5자 여유
  for (let i = 0; i < 5; i++) {
    const cand = `${stem}_${rand4()}`;
    if (!(await nameTaken(env, cand))) return cand;
  }
  return `${stem}_${rand4()}`; // 5회 충돌은 사실상 불가 — 마지막 후보 그대로 사용
}
