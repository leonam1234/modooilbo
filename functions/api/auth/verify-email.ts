/**
 * POST /api/auth/verify-email {token} — 이메일 등록 인증 완료.
 * request-email이 KV에 저장한 {uid, email}을 확인하고 users.email 교체 + identities(email) 추가.
 * 토큰은 1회용(사용 즉시 삭제). 로그인 여부와 무관하게 토큰만으로 동작(메일 링크를 다른 브라우저에서 열어도 됨).
 */
import { json, type AuthEnv } from "../../_lib/auth";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB || !env.REACTIONS) return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);

  let token = "";
  try {
    token = String((await ctx.request.json())?.token || "").trim();
  } catch {
    /* noop */
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "링크가 올바르지 않습니다." }, 400);

  const key = `emailreg:${token}`;
  const raw = await env.REACTIONS.get(key);
  if (!raw) return json({ error: "링크가 만료되었거나 이미 사용되었습니다. 계정 페이지에서 다시 요청해 주세요." }, 410);
  // 토큰 소각은 batch 성공 후에 — 일시 오류로 등록이 안 됐는데 링크만 죽는 것 방지.
  // (동시 재사용 경쟁은 아래 UNIQUE 제약 + try/catch가 409로 흡수)

  let uid = "";
  let email = "";
  try {
    const p = JSON.parse(raw);
    uid = String(p.uid || "");
    email = String(p.email || "").toLowerCase();
  } catch {
    return json({ error: "링크가 올바르지 않습니다." }, 400);
  }
  if (!uid || !email) return json({ error: "링크가 올바르지 않습니다." }, 400);

  // 발송 시점 이후 상태 재확인 (TOCTOU): 대상 계정이 여전히 합성 이메일인지, 이메일이 선점되지 않았는지
  const me = (await env.DB.prepare("SELECT email FROM users WHERE id = ?1").bind(uid).first()) as any;
  if (!me) return json({ error: "계정을 찾을 수 없습니다." }, 404);
  if (!String(me.email).endsWith("@users.modooilbo.com")) {
    return json({ error: "이미 이메일이 등록된 계정입니다." }, 400);
  }
  const dup = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?1 AND id != ?2 LIMIT 1").bind(email, uid).first();
  if (dup) return json({ error: "그 사이 다른 계정이 이 이메일을 사용하게 되었습니다. 다른 이메일로 다시 시도해 주세요." }, 409);

  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET email = ?1 WHERE id = ?2").bind(email, uid),
      env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
      ).bind(uid, email),
    ]);
  } catch {
    // UNIQUE(users.email NOCASE / identities provider+id) 경쟁 패배 등 — 500 대신 안내
    return json({ error: "이메일 등록에 실패했습니다. 이미 사용 중이거나 일시적인 오류입니다. 다시 시도해 주세요." }, 409);
  }
  await env.REACTIONS.delete(key); // 성공 후 소각
  return json({ ok: true, email });
}
