/**
 * POST /api/auth/update-password — 비밀번호 변경/설정(로그인 필요).
 * - 비밀번호가 있는 계정: 현재 비밀번호 확인 후 변경.
 * - 소셜 전용 계정(비밀번호 없음): 현재 비밀번호 없이 "설정" — 이후 이메일 로그인도 가능.
 */
import { json, getUser, hashPassword, verifyPassword, type AuthEnv } from "../../_lib/auth";

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

  const row = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?1")
    .bind(user.id)
    .first();

  const hasPassword = !!(row as any)?.password_hash;
  if (hasPassword) {
    const ok = await verifyPassword(current, (row as any).password_salt, (row as any).password_hash);
    if (!ok) return json({ error: "현재 비밀번호가 올바르지 않습니다." }, 401);
  }

  const { hash, salt } = await hashPassword(next);
  await env.DB.prepare("UPDATE users SET password_hash = ?1, password_salt = ?2 WHERE id = ?3")
    .bind(hash, salt, user.id)
    .run();
  // 이메일 identity가 없던 소셜 전용 계정이면 이메일 로그인 경로도 열어준다
  await env.DB.prepare(
    "INSERT OR IGNORE INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
  )
    .bind(user.id, user.email)
    .run();
  return json({ ok: true, hadPassword: hasPassword });
}
