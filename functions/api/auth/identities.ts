/** GET /api/auth/identities — 내 계정에 연결된 로그인 수단 목록 + 비밀번호 설정 여부. */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  const user = await getUser(env, ctx.request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  const rows = await env.DB.prepare(
    "SELECT provider FROM identities WHERE user_id = ?1 ORDER BY created_at",
  )
    .bind(user.id)
    .all();
  const pw = await env.DB.prepare("SELECT password_hash IS NOT NULL AS has_pw FROM users WHERE id = ?1")
    .bind(user.id)
    .first();

  return json({
    providers: ((rows as any).results || []).map((r: any) => r.provider),
    hasPassword: !!(pw as any)?.has_pw,
  });
}
