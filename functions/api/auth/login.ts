/**
 * POST /api/auth/login — 이메일 로그인.
 * 실패 메시지는 계정 존재 여부를 노출하지 않도록 통일. IP당 시도 제한(KV, 15분 창).
 */
import { json, verifyPassword, createSession, sessionCookie, sha256Hex, type AuthEnv } from "../../_lib/auth";

const MAX_FAILS = 8;
const WINDOW_SECS = 900;
const GENERIC = "이메일 또는 비밀번호가 올바르지 않습니다.";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 500);

  let b: any;
  try {
    b = await ctx.request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  if (!email || !password) return json({ error: GENERIC }, 400);

  // IP 시도 제한
  const ipHash = await sha256Hex("modoo-login-v1" + (ctx.request.headers.get("CF-Connecting-IP") || ""));
  const failKey = `loginfail:${ipHash}`;
  if (env.REACTIONS) {
    const fails = parseInt((await env.REACTIONS.get(failKey)) || "0", 10) || 0;
    if (fails >= MAX_FAILS)
      return json({ error: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요." }, 429);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?1",
  )
    .bind(email)
    .first();

  const ok =
    user && user.password_hash && user.password_salt
      ? await verifyPassword(password, user.password_salt, user.password_hash)
      : false;

  if (!ok) {
    if (env.REACTIONS) {
      const fails = parseInt((await env.REACTIONS.get(failKey)) || "0", 10) || 0;
      await env.REACTIONS.put(failKey, String(fails + 1), { expirationTtl: WINDOW_SECS });
    }
    return json({ error: GENERIC }, 401);
  }

  if (env.REACTIONS) await env.REACTIONS.delete(failKey);
  const token = await createSession(env, user.id);
  return json(
    { user: { name: user.name, email: user.email } },
    200,
    { "set-cookie": sessionCookie(token, ctx.request.url) },
  );
}
