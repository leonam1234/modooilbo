/** GET /api/auth/me — 현재 로그인 사용자(없으면 user: null). 헤더 로그인 상태 표시용. */
import { json, getUser, type AuthEnv } from "../../_lib/auth";

export async function onRequestGet(ctx: any): Promise<Response> {
  const user = await getUser(ctx.env as AuthEnv, ctx.request);
  return json({ user: user ? { name: user.name, email: user.email } : null });
}
