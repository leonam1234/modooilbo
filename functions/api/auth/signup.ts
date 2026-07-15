/**
 * POST /api/auth/signup — 이메일 회원가입(간편 회원가입 설계 대비: users + identities 분리).
 * 성공 시 바로 세션 발급(가입=로그인). 중복 이메일이면 409(로그인/연동 유도).
 * IP당 시도 제한(D1, 15분 5회) — 대량 가입·409 응답을 이용한 이메일 열거 완화.
 *
 * ⚠️ 2026-07-15 — 시도 제한을 KV → D1로(login.ts와 동일 규약). 왜:
 *  1) 비원자: 구 구현은 `kv.get(signup:<ip>)` → `+1` → `kv.put(...)`이라 동시 요청이 같은 값을
 *     읽고 같은 값을 써 시도 누적이 사라졌다 → 병렬로 쏘면 5회 제한이 무의미했다.
 *     → D1 단일 UPSERT + RETURNING n("올리고 나서 판정") = 경합에서도 한도 초과 불가.
 *  2) fail-open: `if (env.REACTIONS)`로 감싸여 **바인딩이 없으면 제한이 통째로 사라졌다**
 *     → 저장소를 못 쓰면 거부한다(fail-closed).
 *
 * ⚠️ 알려진 열거 경로(의도적 잔존): 중복 이메일에 409를 주는 것 자체가 "그 주소는 가입돼 있다"는
 *   신호다. 가입 UX상 불가피해(안 알려주면 사용자가 원인을 모른다) 제거하지 않고 **시도 제한으로
 *   비용을 매기는** 선택을 유지한다. 단 제한 판정은 **중복 조회보다 먼저** 수행하므로,
 *   차단 시 응답은 실재/미존재 계정에서 완전히 동일하다(429 · 같은 문구 · DB 조회 없음 = 같은 타이밍).
 *
 * ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요(rate_limits 테이블).
 */
import { json, hashPassword, createSession, sessionCookie, type AuthEnv } from "../../_lib/auth";
import { hasBanned } from "../../_lib/moderation";
import { isReservedEmail } from "../../_lib/reserved-email";
import { clientIp, hitRateLimits, rateBucket } from "../../_lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_TRIES = 5;
const WINDOW_SECS = 900;
const TOO_MANY = "가입 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.";
const TEMP_ERROR = "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.";

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
  if (b?.terms !== true) return json({ error: "필수 약관(이용약관·개인정보 수집)에 동의해 주세요." }, 400);

  if (name.length < 1 || name.length > 20) return json({ error: "이름은 1~20자로 입력해 주세요." }, 400);
  if (hasBanned(name)) return json({ error: "닉네임에 부적절한 표현이 포함되어 있습니다." }, 400);
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  // 합성 계정 전용 예약 도메인은 가입 불가(소유 증명 불가 주소).
  // 특히 deleted@users.modooilbo.com이 선점되면 탈퇴 처리가 영구 실패한다.
  // 문구는 형식 오류와 동일 — 예약 도메인의 존재·의미를 노출하지 않기 위함(열거 방지).
  if (isReservedEmail(email)) return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  if (password.length < 8 || password.length > 72)
    return json({ error: "비밀번호는 8자 이상 72자 이하로 입력해 주세요." }, 400);

  // IP 시도 제한: 15분 5회 (형식 오류는 슬롯을 태우지 않게 검증 뒤에서 체크).
  // 반드시 아래 중복 조회보다 **먼저** — 차단 응답이 계정 존재 여부와 무관해야 한다(열거 방지).
  let allowed: boolean;
  try {
    allowed = await hitRateLimits(
      env,
      [{ bucket: await rateBucket("signup", "ip", clientIp(ctx.request)), limit: MAX_TRIES, windowSecs: WINDOW_SECS }],
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
  } catch {
    // 저장소를 못 쓰면 제한을 못 건다 → 통과시키지 않는다(fail-closed).
    return json({ error: TEMP_ERROR }, 503);
  }
  if (!allowed) return json({ error: TOO_MANY }, 429);

  const dup = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
  if (dup) return json({ error: "이미 가입된 이메일입니다. 로그인해 주세요." }, 409);

  // 중복 닉네임 금지(대소문자 무시) — 간편가입 기본닉('네이버회원' 등)은 대상 아님
  const dupName = await env.DB.prepare("SELECT 1 FROM users WHERE lower(name) = lower(?1) LIMIT 1")
    .bind(name)
    .first();
  if (dupName) return json({ error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 골라 주세요." }, 409);

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, name, password_hash, password_salt, newsletter, terms_agreed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now','+9 hours'))",
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
