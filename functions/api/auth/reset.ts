/**
 * POST /api/auth/reset {token, password} — 재설정 토큰으로 새 비밀번호 설정.
 * 성공 시: 비밀번호 교체 + 모든 기존 세션 무효화(전 기기 로그아웃) + 새 세션 발급(자동 로그인).
 * 소셜 전용 계정이었다면 이메일 로그인도 함께 열린다(identities email 추가).
 *
 * ⚠️ 2026-07-15 — 성공 시 **이메일 검증 상태도 기록**한다. 재설정 링크는 users.email로만 발송되므로
 *   그 링크를 들고 왔다는 것 자체가 **그 수신함을 통제한다는 증명**이다(가입 확인 메일과 동등한 근거).
 *   이 한 줄이 하는 일:
 *     · 인증 도입 **이전에 만들어진 미검증 계정**(테스트 4건 포함)의 정상 승격 경로가 된다
 *       — 사용자가 비밀번호를 한 번 재설정하면 그 계정은 검증됨이 되고 소셜 자동 병합이 열린다.
 *     · 구 signup으로 남이 선점해 둔 계정도, 주소의 진짜 주인이 재설정하는 순간 주인에게 넘어온다
 *       (비밀번호 교체 + 전 세션 무효화 → 선점자는 쫓겨난다). 즉 이 기록은 안전한 쪽으로만 작동한다.
 *
 * ⚠️ 배포 전 db/migrations/0004_verified_signup.sql 원격 적용 필요(user_email_verified 테이블).
 */
import { json, sha256Hex, hashPassword, createSession, sessionCookie, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";
import { markEmailVerifiedStmt } from "../../_lib/email-verified";

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
  const stmts = [
    env.DB.prepare("UPDATE users SET password_hash = ?2, password_salt = ?3 WHERE id = ?1").bind(row.user_id, hash, salt),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(row.user_id), // 전 기기 로그아웃
    env.DB.prepare(
      "INSERT OR IGNORE INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
    ).bind(row.user_id, row.email),
  ];
  // 방어적 확인: 합성 주소(수신 불가)는 메일이 배달되지 않으므로 소유 증명이 될 수 없다.
  // request-reset이 애초에 토큰을 안 만들어 주지만, 검증 기록은 병합의 근거라 여기서도 못 박는다.
  if (!isReservedEmail(String(row.email))) {
    stmts.push(markEmailVerifiedStmt(env, row.user_id, String(row.email), "password-reset"));
  }
  try {
    await env.DB.batch(stmts);
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
