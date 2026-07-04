/** POST /api/auth/logout — 세션 삭제 + 쿠키 제거. */
import { json, deleteSession, clearCookie, type AuthEnv } from "../../_lib/auth";

export async function onRequestPost(ctx: any): Promise<Response> {
  await deleteSession(ctx.env as AuthEnv, ctx.request);
  return json({ ok: true }, 200, { "set-cookie": clearCookie(ctx.request.url) });
}
