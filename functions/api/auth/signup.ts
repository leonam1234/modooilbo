/**
 * POST /api/auth/signup — 이메일 회원가입 **요청**(계정은 아직 만들지 않는다).
 *
 * ⚠️ 2026-07-15 전면 개편 — "즉시 가입"에서 "이메일 인증 기반 가입"으로. 왜:
 *  1) **소유 증명 0**: 구 구현은 폼 제출 즉시 users 행을 만들고 세션까지 발급했다. users.email이
 *     그저 타이핑된 문자열이라 공격자가 victim@example.com으로 선가입할 수 있었고, 이것이
 *     계정 선점(pre-hijacking)의 뿌리였다(1차 감사). 1차는 google·kakao의 자동 병합을 제거해
 *     증상만 막았고, 그 대가로 "같은 주소인데 계정이 둘"이 되는 UX 손해가 남았다.
 *     → 뿌리(미검증 users.email)를 없애면 병합을 안전하게 되살릴 수 있다(google/kakao callback).
 *  2) **계정 열거**: 중복 이메일에 409 + "이미 가입된 이메일입니다"를 돌려줘 그 주소의 가입 여부를
 *     그대로 알려줬다(구 주석은 "가입 UX상 불가피"라고 봤으나, 불가피하지 않다 —
 *     아래처럼 **양쪽 다 메일로 안내**하면 UX를 잃지 않고 응답만 동일하게 만들 수 있다).
 *
 * 지금 동작:
 *   · 신규 주소 → pending_signups에 대기 행 + 확인 메일. 링크를 눌러야(verify-signup) 계정 확정.
 *   · 이미 가입된 주소 → 계정을 만들지 않고, **그 주소로** "이미 계정이 있습니다 + 재설정 링크"
 *     안내 메일. 알림은 주소 소유자에게만 가고, 요청자에게는 아무것도 알려주지 않는다.
 *   · **응답은 두 경우가 완전히 동일**(200 · 같은 문구 · 세션 쿠키 없음).
 *
 * ★ 열거 차단은 문구만이 아니라 **작업량까지** 같게 맞춰서 얻는다(타이밍 사이드채널).
 *   두 경로 모두 정확히: PBKDF2 1회 + pending INSERT 1 + purge 1 + users SELECT 1 + 메일 1통.
 *   분기는 **메일 본문 선택**에서만 일어난다. 아래 코드의 순서가 곧 그 보장이다 — 손대지 말 것.
 *
 * ⚠️ 새로 생긴 벡터와 대응: 이제 signup이 **임의의 주소로 메일을 보낸다**(구 구현은 안 보냈다).
 *   → request-reset.ts와 동일하게 **이메일 축 제한(15분 3회)** 을 IP 축(15분 5회)과 함께 건다.
 *
 * ⚠️ 배포 전 원격 적용 필요: 0002_counters.sql(rate_limits) + 0004_verified_signup.sql(pending_signups).
 */
import { json, hashPassword, sha256Hex, type AuthEnv } from "../../_lib/auth";
import { hasBanned } from "../../_lib/moderation";
import { isReservedName, RESERVED_NAME_ERROR } from "../../_lib/reserved-names";
import { isReservedEmail } from "../../_lib/reserved-email";
import { escapeHtml, mailButton, mailShell, randHex, sendMail, type MailerEnv } from "../../_lib/mailer";
import { clientIp, hitRateLimits, rateBucket } from "../../_lib/rate-limit";

type MailEnv = AuthEnv & MailerEnv;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_IP_TRIES = 5; // IP당 15분
const MAX_EMAIL_TRIES = 3; // 주소당 15분(메일 폭탄 억제 — request-reset과 동일 규약)
const WINDOW_SECS = 900;
/** 확인 링크 유효기간. 이 토큰이 하는 일은 "본인이 요청한 가입을 확정"뿐이라 길게 잡아도 위험이 낮다. */
const TOKEN_TTL_HOURS = 24;
/** 한 주소가 동시에 들고 있을 수 있는 살아있는 확인 링크 수(초과·만료분은 발급 시 정리). */
const MAX_LIVE_PENDING = 3;
const TOO_MANY = "가입 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.";
const TEMP_ERROR = "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.";
/** ★ 신규·기존 주소가 공유하는 단 하나의 성공 문구. 어느 쪽인지 절대 드러내지 않는다. */
const SENT_MSG = "입력하신 주소로 확인 메일을 보냈습니다. 메일함을 확인해 주세요.";

/** 신규 주소 — 가입 확인(계정 확정) 메일. */
async function sendConfirmMail(env: MailEnv, to: string, name: string, link: string): Promise<boolean> {
  const safeName = escapeHtml(name);
  return sendMail(env, {
    to,
    subject: "[모두일보] 회원가입 확인",
    text: `모두일보 회원가입 요청을 받았습니다. (닉네임: ${name})\n\n아래 링크를 열고 [가입 완료하기]를 누르면 가입이 끝납니다. 링크는 24시간 동안만 유효합니다.\n\n${link}\n\n본인이 요청한 가입이 아니라면 이 메일을 무시해 주세요. 링크를 누르지 않으면 계정은 만들어지지 않습니다.\n\n모두일보 드림 · help@modooilbo.com`,
    html: mailShell(
      `<p style="line-height:1.7">모두일보 <b>회원가입 요청</b>을 받았습니다. (닉네임: <b>${safeName}</b>)<br/>아래 버튼을 눌러 가입을 완료해 주세요. <b>24시간 동안만</b> 유효합니다.</p>
  ${mailButton(link, "가입 확인하기")}`,
      // ⚠️ 이 문장은 장식이 아니다 — 요청하지 않은 확인 링크를 누르는 것이 이 설계에 남는 유일한
      //   선점 경로다(공격자가 남의 주소로 가입 요청 → 주소 주인이 무심코 확인). 경고를 지우지 말 것.
      `<b>본인이 요청한 가입이 아니라면 링크를 누르지 마세요.</b> 누르지 않으면 계정은 만들어지지 않습니다.<br/>모두일보 · help@modooilbo.com`,
    ),
  });
}

/**
 * 이미 가입된 주소 — "계정이 이미 있습니다" 안내 메일.
 * 새 계정을 만들지 않고, 로그인·비밀번호 재설정으로 유도한다. 요청자가 주소 소유자가 아니면
 * 이 메일 자체가 "누군가 당신 주소로 가입을 시도했다"는 알림이 된다.
 */
async function sendAlreadyRegisteredMail(env: MailEnv, to: string, origin: string): Promise<boolean> {
  const login = `${origin}/login/`;
  const forgot = `${origin}/forgot/`;
  return sendMail(env, {
    to,
    subject: "[모두일보] 회원가입 확인",
    text: `이 주소(${to})로 모두일보 회원가입 요청이 들어왔습니다.\n\n이미 이 주소로 만들어진 계정이 있어 새로 가입하지 않았습니다. 아래에서 로그인해 주세요.\n\n${login}\n\n비밀번호가 기억나지 않으시면 재설정할 수 있습니다.\n\n${forgot}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 안전하며 변경된 것이 없습니다.\n\n모두일보 드림 · help@modooilbo.com`,
    html: mailShell(
      `<p style="line-height:1.7">이 주소(<b>${escapeHtml(to)}</b>)로 모두일보 <b>회원가입 요청</b>이 들어왔습니다.<br/><b>이미 이 주소로 만들어진 계정이 있어</b> 새로 가입하지 않았습니다. 아래에서 로그인해 주세요.</p>
  ${mailButton(login, "로그인")}
  <p style="line-height:1.7;font-size:14px">비밀번호가 기억나지 않으시면 <a href="${forgot}" style="color:#555">비밀번호 재설정</a>을 이용해 주세요.</p>`,
      `본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 안전하며 변경된 것이 없습니다.<br/>모두일보 · help@modooilbo.com`,
    ),
  });
}

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as MailEnv;
  if (!env.DB) return json({ error: TEMP_ERROR }, 503);

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

  // ── 형식 검증(계정 존재와 무관 = 열거에 쓸 수 없다) ──
  if (name.length < 1 || name.length > 20) return json({ error: "이름은 1~20자로 입력해 주세요." }, 400);
  if (hasBanned(name)) return json({ error: "닉네임에 부적절한 표현이 포함되어 있습니다." }, 400);
  // 소속 기자·편집국 사칭 차단(2026-07-21). 형식 검증이라 계정 존재와 무관 = 열거에 쓸 수 없다.
  if (isReservedName(name)) return json({ error: RESERVED_NAME_ERROR }, 400);
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  // 합성 계정 전용 예약 도메인은 가입 불가(소유 증명 불가 주소 = 확인 메일이 배달되지 않는다).
  // 특히 deleted@users.modooilbo.com이 선점되면 탈퇴 처리가 영구 실패한다.
  // 문구는 형식 오류와 동일 — 예약 도메인의 존재·의미를 노출하지 않기 위함(열거 방지).
  if (isReservedEmail(email)) return json({ error: "이메일 주소를 확인해 주세요." }, 400);
  if (password.length < 8 || password.length > 72)
    return json({ error: "비밀번호는 8자 이상 72자 이하로 입력해 주세요." }, 400);

  // ── 시도 제한: IP 15분 5회 + 주소 15분 3회 ──
  // 형식 오류는 슬롯을 태우지 않게 검증 뒤에 둔다. 단 아래 어떤 DB 조회보다는 **먼저** —
  // 차단 응답이 계정 존재 여부와 무관해야 한다(429 시 users 조회조차 없다 = 타이밍도 동일).
  let allowed: boolean;
  try {
    allowed = await hitRateLimits(
      env,
      [
        { bucket: await rateBucket("signup", "ip", clientIp(ctx.request)), limit: MAX_IP_TRIES, windowSecs: WINDOW_SECS },
        // 주소 축: 이제 signup이 임의 주소로 메일을 보내므로 메일 폭탄을 막아야 한다.
        // ⚠️ 트레이드오프(의도됨 — login·request-reset과 동일): 남이 대신 태울 수 있다.
        //   피해자 주소로 3회 요청하면 그 주소의 가입 메일이 최대 15분 막힌다(자가 해소).
        { bucket: await rateBucket("signup", "acct", email), limit: MAX_EMAIL_TRIES, windowSecs: WINDOW_SECS },
      ],
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
  } catch {
    // 저장소를 못 쓰면 제한을 못 건다 → 통과시키지 않는다(fail-closed).
    return json({ error: TEMP_ERROR }, 503);
  }
  if (!allowed) return json({ error: TOO_MANY }, 429);

  // 닉네임 중복은 **주소와 무관한 축**이라 여기서 알려줘도 계정 열거가 되지 않는다
  // (같은 닉네임이면 신규 주소든 기존 주소든 똑같이 이 응답이 나온다).
  // 확인 시점에 다시 검사한다 — 그 사이 선점될 수 있기 때문(verify-signup.ts).
  const dupName = await env.DB.prepare("SELECT 1 FROM users WHERE lower(name) = lower(?1) LIMIT 1")
    .bind(name)
    .first();
  if (dupName) return json({ error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 골라 주세요." }, 409);

  // ══════════════════════════════════════════════════════════════════════════
  // ★ 여기부터 끝까지, 신규 주소와 기존 주소는 **완전히 같은 일**을 한다.
  //   같은 응답(SENT), 같은 상태코드(200), 같은 PBKDF2 1회, 같은 DB 작업(INSERT+purge+SELECT),
  //   같은 메일 1통. 다른 것은 **메일 본문**뿐이고 그건 요청자가 볼 수 없다.
  //   → 응답 내용으로도, 응답 시간으로도 그 주소의 가입 여부를 알 수 없다.
  // ══════════════════════════════════════════════════════════════════════════
  const SENT = json({ ok: true, message: SENT_MSG }, 200);

  // 1) PBKDF2(10만회 · 수십 ms)는 **분기 전에** 무조건 수행한다.
  //    기존 주소일 때만 건너뛰면 그 시간차가 곧 "가입돼 있음" 신호가 된다.
  const { hash, salt } = await hashPassword(password);

  // 2) 대기 행도 **무조건** 넣는다(기존 주소여도).
  //    기존 주소로 들어온 행은 토큰이 메일로 나가지 않아 쓰일 수 없고, 설령 쓰여도
  //    verify-signup의 재검증(users.email 선점 확인)에서 막힌다. 만료·상한으로 저절로 정리된다.
  //    이 "쓸모없는 INSERT"가 두 경로의 DB 작업량을 같게 만드는 장치다.
  const token = randHex(32);
  try {
    await env.DB.prepare(
      `INSERT INTO pending_signups (token_hash, email, name, password_hash, password_salt, newsletter, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now','+9 hours', ?7))`,
    )
      .bind(await sha256Hex(token), email, name, hash, salt, newsletter, `+${TOKEN_TTL_HOURS} hours`)
      .run();
  } catch {
    return json({ error: TEMP_ERROR }, 503);
  }

  // 3) 정리: 만료분 전역 + 이 주소의 상한 초과분을 한 문장으로 purge.
  //    D1엔 KV 같은 TTL이 없어 두면 무한히 쌓인다. 방금 넣은 행은 최신이라 항상 살아남는다.
  //    실패해도 발송은 계속한다(청소는 요청 성패와 무관).
  try {
    await env.DB.prepare(
      `DELETE FROM pending_signups
        WHERE expires_at <= datetime('now','+9 hours')
           OR (email = ?1
               AND token_hash NOT IN (
                 SELECT token_hash FROM pending_signups
                  WHERE email = ?1 AND expires_at > datetime('now','+9 hours')
                  ORDER BY created_at DESC, rowid DESC
                  LIMIT ?2))`,
    )
      .bind(email, MAX_LIVE_PENDING)
      .run();
  } catch {
    /* noop */
  }

  // 4) 분기(=메일 본문 선택). 요청자에게 돌아가는 것은 어느 쪽이든 SENT 하나뿐이다.
  const origin = new URL(ctx.request.url).origin;
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1 LIMIT 1").bind(email).first();
  const sent = existing
    ? await sendAlreadyRegisteredMail(env, email, origin)
    : await sendConfirmMail(env, email, name, `${origin}/verify-signup/?token=${token}`);

  // 발송 실패를 삼키고 SENT를 주면 "보냈습니다"가 거짓말이 된다(2026-07-15 뉴스레터 '구독 완료'
  // 거짓 안내와 같은 실수). 실패는 양쪽 경로에서 같은 확률·같은 문구로 나므로 열거에 쓸 수 없다.
  if (!sent) return json({ error: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  return SENT;
}
