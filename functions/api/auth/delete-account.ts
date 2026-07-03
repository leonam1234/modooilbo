/**
 * POST /api/auth/delete-account — 회원 탈퇴(로그인 필요, confirm:"탈퇴" 필수).
 * 세션·로그인수단·계정을 삭제하고 쿠키를 제거한다.
 */
import { json, getUser, clearCookie, type AuthEnv } from "../../_lib/auth";

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
  if (String(b?.confirm ?? "") !== "탈퇴")
    return json({ error: "확인 문구가 일치하지 않습니다. '탈퇴'를 입력해 주세요." }, 400);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM identities WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": clearCookie(ctx.request.url) });
}
