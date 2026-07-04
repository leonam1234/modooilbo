/**
 * POST /api/auth/reset {token, password} — 재설정 토큰으로 새 비밀번호 설정.
 * 성공 시: 비밀번호 교체 + 모든 기존 세션 무효화(전 기기 로그아웃) + 새 세션 발급(자동 로그인).
 * 소셜 전용 계정이었다면 이메일 로그인도 함께 열린다(identities email 추가).
 */
import { json, sha256Hex, hashPassword, createSession, sessionCookie, type AuthEnv } from "../../_lib/auth";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);

  let token = "";
  let password = "";
  try {
    const b = await ctx.request.json();
    token = String(b?.token || "");
    password = String(b?.password || "");
  } catch {
    /* noop */
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "링크가 올바르지 않습니다. 메일의 링크를 다시 확인해 주세요." }, 400);
  if (password.length < 8) return json({ error: "비밀번호는 8자 이상이어야 합니다." }, 400);

  const th = await sha256Hex(token);
  const row = (await env.DB.prepare(
    `SELECT pr.user_id, pr.used, (pr.expires_at > datetime('now','+9 hours')) AS alive, u.email, u.name
     FROM password_resets pr JOIN users u ON u.id = pr.user_id
     WHERE pr.token_hash = ?1`,
  )
    .bind(th)
    .first()) as any;

  if (!row) return json({ error: "유효하지 않은 링크입니다. 재설정을 다시 요청해 주세요." }, 400);
  if (row.used) return json({ error: "이미 사용된 링크입니다. 재설정을 다시 요청해 주세요." }, 400);
  if (!row.alive) return json({ error: "링크가 만료되었습니다(1시간 유효). 재설정을 다시 요청해 주세요." }, 400);

  // 원자적 사용 처리 — used/만료 검사와 사용 표시를 한 문장으로 묶어 TOCTOU(동시 요청 이중 사용) 제거.
  // 위 검사는 안내 메시지용이고, 실제 판정은 이 UPDATE의 변경 행수(meta.changes)로 한다.
  const claim = (await env.DB.prepare(
    "UPDATE password_resets SET used = 1 WHERE token_hash = ?1 AND used = 0 AND expires_at > datetime('now','+9 hours')",
  )
    .bind(th)
    .run()) as any;
  if (!claim?.meta?.changes) {
    return json({ error: "이미 사용된 링크입니다. 재설정을 다시 요청해 주세요." }, 400);
  }

  const { hash, salt } = await hashPassword(password);
  try {
    await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?2, password_salt = ?3 WHERE id = ?1").bind(row.user_id, hash, salt),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(row.user_id), // 전 기기 로그아웃
    env.DB.prepare(
      "INSERT OR IGNORE INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
    ).bind(row.user_id, row.email),
    ]);
  } catch {
    // 일시 오류로 비밀번호가 안 바뀌었는데 링크만 소진되는 것 방지 — 토큰 원복 후 재시도 유도
    await env.DB.prepare("UPDATE password_resets SET used = 0 WHERE token_hash = ?1").bind(th).run();
    return json({ error: "일시적인 오류로 변경하지 못했습니다. 같은 링크로 다시 시도해 주세요." }, 500);
  }

  const session = await createSession(env, row.user_id);
  return json(
    { ok: true, user: { name: row.name, email: row.email } },
    200,
    { "set-cookie": sessionCookie(session, ctx.request.url) },
  );
}
