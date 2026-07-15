/**
 * POST /api/auth/verify-signup {token} — 가입 확인 메일의 링크로 **계정 확정**.
 * signup이 pending_signups에 남긴 대기 행을 **원자적으로 소비**하고 users + identities를 만든다.
 * 이 시점에 비로소 계정이 존재한다 → "확인 전에는 로그인 불가"가 분기가 아니라 구조로 보장된다.
 *
 * 토큰은 1회용. 로그인 여부와 무관하게 토큰만으로 동작한다(메일 링크를 다른 기기에서 열어도 됨).
 * 성공 시 세션을 발급한다(확인 = 로그인 — 구 signup의 "가입=로그인" UX를 그대로 유지).
 *
 * ⚠️ **GET이 아니라 POST**인 이유(3차 수신거부 GET 사고와 같은 교훈): 메일 보안 스캐너·프리페처가
 *   링크를 미리 긁는다. GET으로 계정을 만들면 사람이 누르지 않아도 계정이 생긴다.
 *   프론트(/verify-signup)도 **자동 전송이 아니라 사용자가 버튼을 눌러야** 이 API를 호출한다 —
 *   JS를 실행하는 스캐너까지 막고, 요청하지 않은 가입을 무심코 확정하는 일도 줄인다.
 *
 * ⚠️ 배포 전 db/migrations/0004_verified_signup.sql 원격 적용 필요(pending_signups·user_email_verified).
 */
import { json, createSession, sessionCookie, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { isReservedEmail } from "../../_lib/reserved-email";
import { markEmailVerifiedStmt } from "../../_lib/email-verified";
import { uniqueSignupName } from "../../_lib/names";

const GONE = "링크가 만료되었거나 이미 사용되었습니다. 회원가입을 다시 요청해 주세요.";
const TEMP_ERROR = "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: TEMP_ERROR }, 503);

  let token = "";
  try {
    token = String((await ctx.request.json())?.token || "").trim();
  } catch {
    /* noop */
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "링크가 올바르지 않습니다." }, 400);

  // 원자적 소비: 삭제에 성공한 요청만 값을 받는다 → 같은 링크를 동시에 눌러도 계정은 하나.
  // 만료분은 애초에 안 잡힌다(410).
  // ⚠️ 여기서 토큰이 먼저 소진된다. 아래 계정 생성이 **일시 오류**로 실패하면 되돌려 놓는다
  //    (reset.ts의 used=0 원복, verify-email.ts의 restore와 같은 규약).
  const th = await sha256Hex(token);
  let claimed: any;
  try {
    claimed = (await env.DB.prepare(
      `DELETE FROM pending_signups
        WHERE token_hash = ?1 AND expires_at > datetime('now','+9 hours')
        RETURNING email, name, password_hash, password_salt, newsletter, created_at, expires_at`,
    )
      .bind(th)
      .first()) as any;
  } catch {
    // D1 원시 오류를 그대로 흘리면 테이블명·SQLITE 코드가 클라이언트에 노출된다(4차 verify-email 교훈).
    return json({ error: TEMP_ERROR }, 503);
  }
  if (!claimed) return json({ error: GONE }, 410);

  const email = String(claimed.email || "").toLowerCase();
  const wantName = String(claimed.name || "").trim();
  const passwordHash = String(claimed.password_hash || "");
  const passwordSalt = String(claimed.password_salt || "");
  const newsletter = Number(claimed.newsletter) ? 1 : 0;
  // 약관 동의 시각은 **가입 요청 시각**이다(사용자가 실제로 체크한 순간). 확인 시각으로 덮지 않는다.
  const agreedAt = String(claimed.created_at || "");

  /** 일시 오류로 계정이 안 만들어졌을 때 링크 복구(같은 링크로 재시도 가능하게). 실패는 무시. */
  const restore = async () => {
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO pending_signups
           (token_hash, email, name, password_hash, password_salt, newsletter, created_at, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
        .bind(th, email, wantName, passwordHash, passwordSalt, newsletter, agreedAt, String(claimed.expires_at || ""))
        .run();
    } catch {
      /* noop */
    }
  };

  if (!email || !wantName || !passwordHash || !passwordSalt) return json({ error: "링크가 올바르지 않습니다." }, 400);
  // 방어적 재확인: 예약 도메인은 users.email이 될 수 없다(signup이 막으므로 정상 경로에선 불가능).
  if (isReservedEmail(email)) return json({ error: "링크가 올바르지 않습니다." }, 400);

  // TOCTOU: 요청 시점 이후 그 주소로 계정이 생겼을 수 있다(소셜 가입 등).
  // 여기서 알려줘도 열거가 아니다 — 이 링크는 **그 주소로만** 갔으므로 요청자 = 주소 소유자다.
  const taken = await env.DB.prepare("SELECT id FROM users WHERE email = ?1 LIMIT 1").bind(email).first();
  if (taken) return json({ error: "이미 가입된 이메일입니다. 로그인해 주세요." }, 409);

  // 닉네임은 signup에서 한 번 걸렀지만 그 사이 선점될 수 있다. 이미 이메일 소유를 증명한 사람을
  // 여기서 되돌려 보내는 건 손해가 크므로, 소셜 간편가입과 같은 규약(접미사)으로 회피하고
  // 확정된 닉네임을 응답으로 돌려준다(프론트가 그대로 보여 준다 — 조용히 바꾸지 않는다).
  const finalName = await uniqueSignupName(env, wantName, "모두일보회원");

  const id = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter, terms_agreed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      ).bind(id, email, finalName, passwordHash, passwordSalt, newsletter, agreedAt),
      env.DB.prepare(
        "INSERT INTO identities (user_id, provider, provider_user_id) VALUES (?1, 'email', ?2)",
      ).bind(id, email),
      // ★ 검증 사실 기록 — 계정 생성과 **같은 트랜잭션**이어야 한다.
      //   따로 넣다가 실패하면 "미검증인데 존재하는 로컬 계정"이 생겨 이 설계의 전제가 깨진다.
      markEmailVerifiedStmt(env, id, email, "signup"),
    ]);
  } catch {
    // UNIQUE(users.email NOCASE / identities) 경쟁 패배 또는 일시 오류. 계정이 안 만들어졌으므로
    // 링크를 되살려 같은 링크로 재시도할 수 있게 한다.
    await restore();
    return json({ error: "가입을 완료하지 못했습니다. 이미 사용 중이거나 일시적인 오류입니다. 다시 시도해 주세요." }, 409);
  }

  const session = await createSession(env, id);
  return json({ ok: true, user: { name: finalName, email } }, 200, {
    "set-cookie": sessionCookie(session, ctx.request.url),
  });
}
