/**
 * POST /api/auth/login — 이메일 로그인.
 * 실패 메시지는 계정 존재 여부를 노출하지 않도록 통일. 시도 제한은 **IP + 계정** 두 축(D1, 15분 창).
 *
 * ⚠️ 2026-07-15 — 시도 제한을 KV → D1로. 왜:
 *  1) 비원자: 구 구현은 `kv.get(loginfail:<ip>)` → `+1` → `kv.put(...)`이라 동시 요청이
 *     같은 값을 읽고 같은 값을 써 실패 누적이 사라졌다 → 병렬로 쏘면 8회 제한이 무의미했다.
 *     → D1 단일 UPSERT + RETURNING n("올리고 나서 판정") = 경합에서도 한도 초과 불가.
 *  2) IP 전용: 봇넷·프록시로 IP를 흩뿌리면 한 계정에 무제한 시도가 가능했다(크리덴셜 스터핑).
 *     → **계정(이메일) 단위 제한**을 IP 제한과 함께 적용.
 *
 * 계정 열거 방지: 계정 버킷 키는 **제출된 이메일의 해시**라 계정이 실재하든 아니든 똑같이
 *   증가·차단된다. 차단 응답 문구·상태코드도 IP/계정 구분 없이 동일 → 응답으로 존재 여부를
 *   알아낼 수 없다. 비밀번호 검증 전에 차단하므로 차단 시 타이밍도 서로 같다.
 *
 * ⚠️ 2026-07-15 — "미검증 계정 로그인 차단" 게이트를 **일부러 두지 않았다**. 코드가 아니라
 *   구조가 이미 보장하기 때문이다:
 *     · 이메일 가입은 확인 링크를 눌러야 users 행이 생긴다(pending_signups → verify-signup).
 *       즉 **미검증 로컬 계정은 존재할 수 없다** → 차단할 대상이 없다. "확인 전 로그인 불가"는
 *       이 파일의 분기가 아니라 "계정이 아직 없음"으로 달성된다(로그인 시도 시 GENERIC 401 —
 *       미가입 주소와 응답이 같아 열거에도 쓸 수 없다).
 *     · 반대로 게이트를 두면 검증 개념이 없는 계정만 애꿎게 막힌다: 소셜 합성 이메일 계정
 *       (@users.modooilbo.com — 수신 불가라 검증 자체가 불가능. 재설정으로 비밀번호를 만들면
 *       이메일 로그인이 열린다)과 인증 도입 **이전에 만들어진 계정**(테스트 4건)이다.
 *     · 검증 상태(user_email_verified)는 **소셜 자동 병합의 근거**로만 쓴다. 로그인 인가와는
 *       무관하다 — 자기 계정에 자기 비밀번호로 들어오는 데 이메일 검증을 요구할 이유가 없다.
 *   구 계정의 정상 승격 경로는 비밀번호 재설정이다(reset.ts가 검증됨으로 기록한다).
 *
 * ⚠️ 2026-07-21 — 성공 시 리셋은 **계정축에만** 적용한다(구: IP축까지 리셋).
 *   구 코드 `resetRateLimit(env, [ipBucket, acctBucket])`는 로그인 1회 성공으로 그 IP의 현재 창
 *   카운터를 통째로 지웠다(resetRateLimit의 DELETE엔 window_start 조건이 없다). 그래서:
 *     공격자가 자기 계정 하나를 만든다 → 피해자 계정 7개에 1회씩 스터핑(계정축은 각 1이라 무사)
 *     → 8번째로 **자기 계정에 정상 로그인** → IP 버킷 삭제 → 무한 반복.
 *   즉 단일 IP에서 사실상 무제한 시도가 됐고, 위 (2)에서 IP축을 남겨 둔 이유가 통째로 무력화됐다.
 *   → IP축은 "이 IP가 15분간 몇 번 시도했나"라는 **소진형 예산**이라 성공으로 상쇄되면 안 된다.
 *
 *   ⚠️ 이 변경의 실제 비용(정직하게): 카운터는 비밀번호 검증 **전에** 오르므로 이제 **성공한
 *     시도도 IP 예산을 소모한다**. 즉 한 IP에서 15분 내 로그인 시도가 8회(성패 무관)를 넘으면
 *     429다. 단독 사용자에겐 무해하지만, **NAT/CGNAT로 IP를 공유하는 환경**(통신사 모바일망·
 *     사무실)에서는 여러 사람의 정상 로그인이 합산될 수 있다. 수용한 근거:
 *       · 이 버킷은 **이메일+비밀번호 로그인 전용**이다. 소셜 로그인(카카오·구글·네이버)은
 *         이 엔드포인트를 타지 않으며 실사용자의 절대다수가 소셜이라 실트래픽이 거의 없다.
 *       · 구 코드에서도 **실패 8회**면 같은 IP가 이미 통째로 막혔다 — IP축은 원래 NAT에 불리했고,
 *         이번 변경은 그 노출을 성공 시도까지로 넓힌 것이지 새 종류의 위험이 아니다.
 *       · 창이 15분이라 스스로 풀린다.
 *     ⏳ 후속 과제(별건): NAT 부담을 없애려면 리셋 대신 **성공 시 IP 카운터를 1만 차감**하면 된다
 *       (자기 성공은 자기 +1만 환불 → 남의 계정 실패 7회는 그대로 남아 우회 불가). rate-limit.ts에
 *       차감 프리미티브 신설이 필요해 이번 범위 밖으로 뒀다.
 *
 * ⚠️ 트레이드오프(의도됨): 계정 제한은 **시도**를 세고 성공 시 리셋한다. 공격자가 남의 계정에
 *   일부러 10회 실패를 쌓으면 그 계정은 최대 15분간 로그인이 막힌다(계정 잠금 DoS).
 *   창이 짧고 스스로 풀리므로, 분산 스터핑을 막는 이득이 더 크다고 보고 수용했다.
 *
 * ⚠️ 배포 전 db/migrations/0002_counters.sql 원격 적용 필요(rate_limits 테이블).
 */
import { json, verifyPassword, createSession, sessionCookie, type AuthEnv } from "../../_lib/auth";
import { clientIp, hitRateLimits, rateBucket, resetRateLimit } from "../../_lib/rate-limit";

const MAX_IP_TRIES = 8; // IP당 15분
const MAX_ACCOUNT_TRIES = 10; // 이메일당 15분(분산 IP 대응). IP 한도보다 느슨하게 둬 정상 사용자 오탐 억제.
const WINDOW_SECS = 900;
const GENERIC = "이메일 또는 비밀번호가 올바르지 않습니다.";
const TOO_MANY = "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.";
// 계정 미존재 시에도 같은 비용의 PBKDF2를 1회 수행해 응답 시간으로 존재 여부가 새지 않게 하는 더미 값
const DUMMY_SALT = "00000000000000000000000000000000";
const DUMMY_HASH = "0".repeat(64);

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

  // 시도 제한 — IP축 + 계정축. 비밀번호 검증(PBKDF2 10만회) **전에** 차단해 CPU 소모도 막는다.
  // 시도 자체를 세고 성공 시 리셋하므로, 정상 사용자는 성공하는 한 절대 걸리지 않는다.
  const ipBucket = await rateBucket("login", "ip", clientIp(ctx.request));
  const acctBucket = await rateBucket("login", "acct", email);
  let allowed: boolean;
  try {
    allowed = await hitRateLimits(
      env,
      [
        { bucket: ipBucket, limit: MAX_IP_TRIES, windowSecs: WINDOW_SECS },
        { bucket: acctBucket, limit: MAX_ACCOUNT_TRIES, windowSecs: WINDOW_SECS },
      ],
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
  } catch {
    // 저장소를 못 쓰면 제한을 못 건다 → 통과시키지 않는다(fail-closed).
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!allowed) return json({ error: TOO_MANY }, 429);

  const user = await env.DB.prepare(
    "SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?1",
  )
    .bind(email)
    .first();

  let ok = false;
  if (user && user.password_hash && user.password_salt) {
    ok = await verifyPassword(password, user.password_salt, user.password_hash);
  } else {
    // 타이밍 사이드채널 제거: 계정이 없거나 비밀번호 미설정(소셜 전용)이어도 더미 검증 수행
    await verifyPassword(password, DUMMY_SALT, DUMMY_HASH);
  }

  if (!ok) return json({ error: GENERIC }, 401);

  // ⚠️ **계정축만** 리셋한다. IP축은 절대 리셋하지 않는다 — 아래 주석(2026-07-21) 참조.
  await resetRateLimit(env, [acctBucket]);
  const token = await createSession(env, user.id);
  return json(
    { user: { name: user.name, email: user.email } },
    200,
    { "set-cookie": sessionCookie(token, ctx.request.url) },
  );
}
