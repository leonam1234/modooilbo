/** POST /api/auth/update-name — 닉네임 변경(로그인 필요). */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

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
  const name = String(b?.name ?? "").trim();
  if (name.length < 1 || name.length > 20) return json({ error: "닉네임은 1~20자로 입력해 주세요." }, 400);

  await env.DB.prepare("UPDATE users SET name = ?1 WHERE id = ?2").bind(name, user.id).run();
  return json({ user: { name, email: user.email } });
}
