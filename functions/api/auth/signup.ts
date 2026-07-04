/**
 * POST /api/auth/signup — 이메일 회원가입(간편 회원가입 설계 대비: users + identities 분리).
 * 성공 시 바로 세션 발급(가입=로그인). 중복 이메일이면 409(로그인/연동 유도).
 * IP당 시도 제한(KV, 15분 5회) — 대량 가입·409 응답을 이용한 이메일 열거 완화.
 */
import { json, hashPassword, createSession, sessionCookie, sha256Hex, type AuthEnv } from "../../_lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_TRIES = 5;
const WINDOW_SECS = 900;

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 500);

  let b: any;
  try {
    b = await ctx.request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const newsletter = b?.newsletter ? 1 : 0;

  if (name.length < 1 || name.length > 20) return json({ error: "이름은 1~20자로 입력해 주세요." }, 400);
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  if (password.length < 8 || password.length > 72)
    return json({ error: "비밀번호는 8자 이상 72자 이하로 입력해 주세요." }, 400);

  // IP 시도 제한: 15분 5회 (형식 오류는 슬롯을 태우지 않게 검증 뒤에서 체크)
  if (env.REACTIONS) {
    const ipHash = await sha256Hex("modoo-signup-v1" + (ctx.request.headers.get("CF-Connecting-IP") || ""));
    const rlKey = `signup:${ipHash}`;
    const tries = parseInt((await env.REACTIONS.get(rlKey)) || "0", 10) || 0;
    if (tries >= MAX_TRIES)
      return json({ error: "가입 시도가 너무 많습니다. 15분 후 다시 시도해 주세요." }, 429);
    await env.REACTIONS.put(rlKey, String(tries + 1), { expirationTtl: WINDOW_SECS });
  }

  const dup = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
  if (dup) return json({ error: "이미 가입된 이메일입니다. 로그인해 주세요." }, 409);

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      ).bind(id, email, name, hash, salt, newsletter),
      env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
      ).bind(id, email),
    ]);
  } catch {
    // UNIQUE 경합 등
    return json({ error: "이미 가입된 이메일입니다. 로그인해 주세요." }, 409);
  }

  const token = await createSession(env, id);
  return json({ user: { name, email } }, 200, { "set-cookie": sessionCookie(token, ctx.request.url) });
}
