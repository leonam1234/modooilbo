/**
 * modooilbo-mailer — 이메일 발송 전용 Worker (Pages Functions에서 내부 호출).
 * POST / {to, from:{email,name}, replyTo?, subject, text, html}
 * 인증: x-mailer-key === MAILER_KEY. from 도메인은 modooilbo.com만 허용.
 */
// 키 비교는 상수 시간으로 — functions/_lib/auth.ts verifyPassword와 같은 패턴.
async function keyMatches(given: string | null, expected: string): Promise<boolean> {
  if (!given) return false;
  const enc = new TextEncoder();
  const a = enc.encode(given);
  const b = enc.encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  const subtle = crypto.subtle as any;
  return typeof subtle.timingSafeEqual === "function" ? subtle.timingSafeEqual(a, b) : given === expected;
}

// 수신자 검증 — 키가 유출됐을 때 임의 주소로 스팸 릴레이가 되는 것을 한 겹 늦춘다.
// 문자열 "a@b.com" 또는 {email} 형태만, 단일 수신자만 허용(배열·리스트 거부).
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
function toEmail(to: unknown): string | null {
  const e = typeof to === "string" ? to : String((to as any)?.email || "");
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

// 헤더로 흘러가는 값(제목)의 개행·제어문자 제거 — 헤더 인젝션 봉쇄(호출부와 이중 방어).
const stripCtl = (s: string) => s.replace(/[\x00-\x1f\x7f]/g, " ");

export default {
  async fetch(req: Request, env: { EMAIL: any; MAILER_KEY?: string }): Promise<Response> {
    if (req.method !== "POST") return new Response("method", { status: 405 });
    if (!env.MAILER_KEY || !(await keyMatches(req.headers.get("x-mailer-key"), env.MAILER_KEY))) {
      return new Response("forbidden", { status: 403 });
    }
    let b: any;
    try {
      b = await req.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }
    const fromEmail = String(b?.from?.email || "");
    if (!fromEmail.endsWith("@modooilbo.com")) return new Response("bad from", { status: 400 });
    if (!b?.to || !b?.subject) return new Response("bad fields", { status: 400 });
    const toAddr = toEmail(b.to);
    if (!toAddr) return new Response("bad to", { status: 400 });
    // ⚠️ replyTo는 **정규화해서** 넘긴다(2026-07-15). 종전엔 호출부 값을 그대로 흘렸는데,
    //   Pages가 보내던 `{email}`(name 없음)을 send_email 바인딩이 거부해
    //   "Incorrect type for the 'name' field on 'EmailAddress'"로 던졌다 → 사이트 메일이 전부 실패.
    //   from은 이미 name을 강제하고 있었는데 replyTo만 빠져 있었다. 같은 규약으로 맞춘다.
    //   (문자열 형태 "a@b.com"도 받아 준다 — 호출부가 어떤 형태로 주든 워커가 책임지고 정규화.)
    const rt = b?.replyTo;
    const rtEmail = typeof rt === "string" ? rt : String(rt?.email || "");
    const replyTo = rtEmail
      ? { email: rtEmail, name: stripCtl(String((typeof rt === "object" && rt?.name) || "모두일보")) }
      : undefined;
    try {
      await env.EMAIL.send({
        to: toAddr,
        from: { email: fromEmail, name: stripCtl(String(b.from?.name || "모두일보")) },
        replyTo,
        subject: stripCtl(String(b.subject)),
        text: String(b.text || ""),
        html: b.html ? String(b.html) : undefined,
      });
      return Response.json({ ok: true });
    } catch (e: any) {
      return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
    }
  },
};
