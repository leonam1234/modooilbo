/**
 * 제보·문의·채용·광고 접수 엔드포인트 (2026-08-11 신설).
 *
 * [왜 생겼나] 그 전까지 /tips · /contact · /careers · /advertise 네 폼은 서버로 아무것도
 * 보내지 않으면서 "정상적으로 접수되었습니다"와 클라이언트가 만든 가짜 접수번호를 띄웠다.
 * 언론사 제보 창구이고 /contact 가 정정요청까지 이 폼으로 유도하는데 데이터는 브라우저
 * 메모리에서 사라졌다. 접수번호는 이제 **서버가** 발급하고, 그 번호로 DB를 조회할 수 있다.
 *
 * [메일 제약] 알림은 help@modooilbo.com 으로 보낸다 — 우리 도메인이고 Email Routing 의
 * 검증된 목적지라 send_email 바인딩 제약(검증된 주소로만 발송)에 걸리지 않는다.
 * 가입 인증 메일이 실패하는 것과 다른 경로다. 접수자에게 회신 메일은 보내지 않는다.
 *
 * [보관 우선] 메일 발송 실패는 접수 실패가 아니다. DB 저장이 성공하면 200 을 준다.
 * 메일만 실패한 건은 inquiries.mail_sent=0 으로 남아 나중에 찾을 수 있다.
 */
import { json } from "../_lib/auth";
import { clientIp, hitRateLimits, rateBucket, type RateLimitEnv, type RateLimitRule } from "../_lib/rate-limit";
import { escapeHtml, mailShell, sendMail, type MailerEnv } from "../_lib/mailer";

type Env = MailerEnv & RateLimitEnv & { DB?: D1Database };

const KINDS = {
  tip: { label: "제보", limitIp: 5 },
  contact: { label: "문의", limitIp: 5 },
  careers: { label: "채용 지원", limitIp: 3 },
  advertise: { label: "광고·제휴 문의", limitIp: 5 },
} as const;
type Kind = keyof typeof KINDS;

/** 길이 상한 — 본문만 넉넉히 두고 나머지는 짧게. 초과분은 자른다(거절하지 않는다). */
const CAP = { title: 200, body: 8000, name: 80, email: 200, phone: 40, category: 80, attachment_name: 260 };
// 본문 전용 — 개행은 살리고 그 외 제어문자만 제거.
const cut = (v: unknown, n: number) =>
  String(v ?? "").replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/g, " ").trim().slice(0, n);
// 한 줄 필드 전용 — 개행·제어문자를 전부 제거한다. 특히 title은 메일 **제목**으로
// 흘러가므로 CRLF가 남으면 메일 헤더 인젝션 여지가 된다(2026-08-14 점검).
const cutLine = (v: unknown, n: number) =>
  String(v ?? "").replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * 접수번호 MI-YYYYMMDD-NNNN.
 * ⚠️ 클라이언트에서 만들지 않는다. 종전 TipForm 은 브라우저 시각으로 만들어
 *    해외 제보의 접수번호가 하루 어긋났고, 무엇보다 DB 에 대응 행이 없었다.
 *    KST 벽시계 규약(UTC+9)을 서버에서 적용한다.
 */
function makeReceiptNo(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${kst.getUTCFullYear()}${p(kst.getUTCMonth() + 1)}${p(kst.getUTCDate())}`;
  const rand = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");
  return `MI-${ymd}-${rand}`;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const env = ctx.env;
  if (!env.DB) return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);

  let b: Record<string, unknown>;
  try {
    b = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "요청을 처리하지 못했습니다." }, 400);
  }

  const kind = cutLine(b.kind, 20) as Kind;
  if (!(kind in KINDS)) return json({ error: "요청을 처리하지 못했습니다." }, 400);

  const body = cut(b.body, CAP.body);
  const agree = b.agree === true;
  if (!body) return json({ error: "내용을 입력해 주세요." }, 400);
  if (!agree) return json({ error: "개인정보 수집·이용에 동의해 주세요." }, 400);

  const ip = clientIp(ctx.request);
  const email = cutLine(b.email, CAP.email).toLowerCase();

  // 레이트리밋: IP 축은 항상, 이메일 축은 값이 있을 때만. 뉴스레터와 같은 규약을 쓴다.
  let allowed = true;
  try {
    const rules: RateLimitRule[] = [
      { bucket: await rateBucket("inquiry", "ip", ip), limit: KINDS[kind].limitIp, windowSecs: 3600 },
    ];
    if (email) {
      rules.push({ bucket: await rateBucket("inquiry", "acct", email), limit: 10, windowSecs: 86400 });
    }
    // ⚠️ nowMs 는 필수 인자다(빠뜨리면 D1 쿼리가 던져 503 으로 떨어진다).
    //    waitUntil 을 넘겨야 만료 버킷 청소가 응답을 붙잡지 않는다 — 뉴스레터와 같은 규약.
    allowed = await hitRateLimits(env, rules, Date.now(), ctx.waitUntil?.bind(ctx));
  } catch {
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!allowed) return json({ error: "잠시 후 다시 시도해 주세요." }, 429);

  const rec = {
    receipt_no: makeReceiptNo(),
    kind,
    category: cutLine(b.category, CAP.category) || null,
    title: cutLine(b.title, CAP.title) || null,
    body,
    name: cutLine(b.name, CAP.name) || null,
    email: email || null,
    phone: cutLine(b.phone, CAP.phone) || null,
    attachment_name: cutLine(b.attachmentName, CAP.attachment_name) || null,
    client_ip: ip || null,
    user_agent: cutLine(ctx.request.headers.get("user-agent"), 300) || null,
  };

  // ── 저장이 먼저다. 여기서 실패하면 접수 실패로 알린다.
  // 접수번호 난수가 일 4자리뿐이라 PK 충돌이 확률적으로 난다(하루 ~100건이면 40%,
  // 생일 역설). 충돌은 번호를 다시 뽑아 재시도한다 — 사용자에게 503을 돌려줄 일이 아니다.
  let saved = false;
  for (let attempt = 0; attempt < 3 && !saved; attempt++) {
    if (attempt > 0) rec.receipt_no = makeReceiptNo();
    try {
      await env.DB.prepare(
        `INSERT INTO inquiries
           (receipt_no, kind, category, title, body, name, email, phone, attachment_name, client_ip, user_agent)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
      )
        .bind(
          rec.receipt_no, rec.kind, rec.category, rec.title, rec.body,
          rec.name, rec.email, rec.phone, rec.attachment_name, rec.client_ip, rec.user_agent,
        )
        .run();
      saved = true;
    } catch (e) {
      // PK 충돌만 재시도, 그 외(D1 장애 등)는 즉시 실패로 알린다.
      if (!String((e as Error)?.message ?? e).includes("UNIQUE constraint")) break;
    }
  }
  if (!saved) {
    return json({ error: "접수에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }

  // ── 알림 메일은 부가 기능. 실패해도 접수는 유효하므로 200 을 유지한다.
  let sent = false;
  try {
    const rows: Array<[string, string | null]> = [
      ["접수번호", rec.receipt_no],
      ["유형", KINDS[kind].label + (rec.category ? ` · ${rec.category}` : "")],
      ["제목", rec.title],
      ["이름", rec.name],
      ["이메일", rec.email],
      ["연락처", rec.phone],
      ["첨부(파일명만)", rec.attachment_name],
    ];
    const table = rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<p style="margin:4px 0"><b>${escapeHtml(k)}</b> ${escapeHtml(String(v))}</p>`)
      .join("");
    sent = await sendMail(env, {
      to: "help@modooilbo.com",
      subject: `[${KINDS[kind].label}] ${rec.title || rec.receipt_no}`,
      text: `${rec.receipt_no}\n${KINDS[kind].label}\n\n${body}`,
      html: mailShell(
        `${table}<hr style="border:0;border-top:1px solid #ddd;margin:14px 0">
         <div style="white-space:pre-wrap">${escapeHtml(body)}</div>`,
        `접수 시각 기준 KST · 원본은 D1 inquiries 테이블에 있습니다.`,
      ),
    });
    if (sent) {
      await env.DB.prepare("UPDATE inquiries SET mail_sent = 1 WHERE receipt_no = ?1")
        .bind(rec.receipt_no)
        .run();
    }
  } catch {
    // 무시 — 저장은 이미 끝났다.
  }

  return json({ ok: true, receiptNo: rec.receipt_no });
};
