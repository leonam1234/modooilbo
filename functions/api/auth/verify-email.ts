/**
 * POST /api/auth/verify-email {token} — 이메일 등록 인증 완료.
 * request-email이 D1(email_verifications)에 남긴 {user_id, email}을 **원자적으로 소비**하고
 * users.email 교체 + identities(email) 추가.
 * 토큰은 1회용. 로그인 여부와 무관하게 토큰만으로 동작(메일 링크를 다른 브라우저에서 열어도 됨).
 *
 * ⚠️ 2026-07-15 — KV → D1. 소비를 `DELETE ... WHERE token_hash=?1 AND 미만료 RETURNING` **단일 문**으로
 *   바꿨다. 구 구현은 `kv.get` → 검증 → (성공 후) `kv.delete`라, 같은 토큰을 든 동시 요청 둘이
 *   **함께 get을 통과**할 수 있었다(경합). 지금은 DELETE에 성공한 요청만 값을 돌려받으므로
 *   승자가 정확히 하나다. 토큰 원문은 DB에 없다(SHA-256 비교).
 *
 * ⚠️ 배포 전 db/migrations/0003_auth_tokens.sql 원격 적용 필요(email_verifications 테이블).
 */
import { json, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";

const GONE = "링크가 만료되었거나 이미 사용되었습니다. 계정 페이지에서 다시 요청해 주세요.";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);

  let token = "";
  try {
    token = String((await ctx.request.json())?.token || "").trim();
  } catch {
    /* noop */
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "링크가 올바르지 않습니다." }, 400);

  // 원자적 소비: 삭제에 성공한 요청만 값을 받는다 → 동시 재사용 불가. 만료분은 애초에 안 잡힌다.
  // ⚠️ 여기서 토큰이 먼저 소진된다. 아래 등록이 일시 오류로 실패하면 토큰을 **되돌려 놓는다**
  //    (reset.ts의 used=0 원복과 같은 규약) — 링크만 죽고 등록은 안 되는 상태 방지.
  const th = await sha256Hex(token);
  let claimed: any;
  try {
    claimed = (await env.DB.prepare(
      `DELETE FROM email_verifications
        WHERE token_hash = ?1 AND expires_at > datetime('now','+9 hours')
        RETURNING user_id, email, expires_at`,
    )
      .bind(th)
      .first()) as any;
  } catch {
    // 저장소 오류를 그대로 흘리면 D1 내부 메시지·스택이 클라이언트에 노출된다
    // (테이블명·SQLITE 오류코드 등). 일반 문구로 덮고 거부한다(fail-closed).
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!claimed) return json({ error: GONE }, 410);

  const uid = String(claimed.user_id || "");
  const email = String(claimed.email || "").toLowerCase();
  const expiresAt = String(claimed.expires_at || "");
  /** 등록 실패 시 토큰 복구(같은 링크로 재시도 가능하게). 실패는 무시 — 재요청하면 된다. */
  const restore = async () => {
    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO email_verifications (token_hash, user_id, email, expires_at) VALUES (?1, ?2, ?3, ?4)",
      )
        .bind(th, uid, email, expiresAt)
        .run();
    } catch {
      /* noop */
    }
  };

  if (!uid || !email) return json({ error: "링크가 올바르지 않습니다." }, 400);
  // 방어적 재확인: 예약 도메인은 users.email로 승격될 수 없다(토큰은 서버 생성이라 정상 경로에선 불가능).
  if (isReservedEmail(email)) return json({ error: "링크가 올바르지 않습니다." }, 400);

  // 발송 시점 이후 상태 재확인 (TOCTOU): 대상 계정이 여전히 합성 이메일인지, 이메일이 선점되지 않았는지
  const me = (await env.DB.prepare("SELECT email FROM users WHERE id = ?1").bind(uid).first()) as any;
  // 아래 거절들은 **상태가 바뀌어서** 이 링크가 무의미해진 경우다 → 토큰은 소진된 채로 둔다
  // (되돌려도 결과가 같고, 재요청이 정상 경로다). 일시 오류(500)만 복구한다.
  if (!me) return json({ error: "계정을 찾을 수 없습니다." }, 404);
  if (!isReservedEmail(String(me.email))) {
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
    // UNIQUE(users.email NOCASE / identities provider+id) 경쟁 패배 또는 일시 오류 — 500 대신 안내.
    // 등록이 안 됐으므로 링크를 되살려 같은 링크로 재시도할 수 있게 한다.
    await restore();
    return json({ error: "이메일 등록에 실패했습니다. 이미 사용 중이거나 일시적인 오류입니다. 다시 시도해 주세요." }, 409);
  }
  // 성공: 이 계정의 남은 인증 토큰도 전부 무효화(다른 주소로 발급해 둔 링크가 살아있으면 안 된다).
  try {
    await env.DB.prepare("DELETE FROM email_verifications WHERE user_id = ?1").bind(uid).run();
  } catch {
    /* noop — 남아도 users.email이 이미 실주소라 위 TOCTOU 검사에서 걸러진다. */
  }
  return json({ ok: true, email });
}
