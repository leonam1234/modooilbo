/**
 * POST /api/auth/update-password — 비밀번호 변경/설정(로그인 필요).
 * - 비밀번호가 있는 계정: 현재 비밀번호 확인 후 변경.
 * - 소셜 전용 계정(비밀번호 없음): 현재 비밀번호 없이 "설정" — 이후 이메일 로그인도 가능.
 * 성공 시 기존 세션을 전부 무효화하고 새 세션을 발급한다(reset.ts와 동일 규약) —
 * 비밀번호를 바꾼 이유가 '세션 탈취 의심'인데 탈취된 세션이 살아남으면 변경이 무의미하다.
 */
import {
  json,
  getUser,
  hashPassword,
  verifyPassword,
  createSession,
  sessionCookie,
  type AuthEnv,
} from "../../_lib/auth";
import { hitRateLimits, rateBucket } from "../../_lib/rate-limit";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  const user = await getUser(env, ctx.request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  let b: any;
  try {
    b = await ctx.request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  const current = String(b?.current ?? "");
  const next = String(b?.next ?? "");
  if (next.length < 8 || next.length > 72)
    return json({ error: "새 비밀번호는 8자 이상 72자 이하로 입력해 주세요." }, 400);

  // ⚠️ 2026-08-11 신설. 종전에는 여기 상한이 없어서 세션 쿠키를 탈취한 공격자가
  //    현재 비밀번호를 무제한 대입할 수 있었다. 게다가 시도마다 PBKDF2 검증이 돌아
  //    한 계정을 겨냥한 요청만으로 CPU를 계속 태울 수 있었다(비용 증폭).
  //    사용자 축으로 건다 — IP는 바꿔 가며 시도할 수 있어도 대상 계정은 고정이다.
  try {
    const ok = await hitRateLimits(
      env as any,
      [{ bucket: await rateBucket("update-password", "user", String(user.id)), limit: 10, windowSecs: 3600 }],
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
    if (!ok) return json({ error: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
  } catch {
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }

  const row = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?1")
    .bind(user.id)
    .first();

  const hasPassword = !!(row as any)?.password_hash;
  if (hasPassword) {
    const ok = await verifyPassword(current, (row as any).password_salt, (row as any).password_hash);
    if (!ok) return json({ error: "현재 비밀번호가 올바르지 않습니다." }, 401);
  }

  const { hash, salt } = await hashPassword(next);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?1, password_salt = ?2 WHERE id = ?3").bind(
      hash,
      salt,
      user.id,
    ),
    // 전 기기 로그아웃 — 현재 세션 포함해 모두 지우고 아래에서 새로 발급(세션 토큰 교체 효과).
    // 비밀번호 변경 후에도 탈취된 세션 쿠키가 그대로 살아 있는 구멍을 막는다.
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user.id),
    // 이메일 identity가 없던 소셜 전용 계정이면 이메일 로그인 경로도 열어준다
    env.DB.prepare(
      "INSERT OR IGNORE INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
    ).bind(user.id, user.email),
  ]);

  // 방금 비밀번호를 바꾼 본인은 로그아웃되지 않도록 새 세션 재발급
  const session = await createSession(env, user.id);
  return json({ ok: true, hadPassword: hasPassword }, 200, {
    "set-cookie": sessionCookie(session, ctx.request.url),
  });
}
