/**
 * modooilbo-mailer — 이메일 발송 전용 Worker (Pages Functions에서 내부 호출).
 * POST / {to, from:{email,name}, replyTo?, subject, text, html}
 * 인증: x-mailer-key === MAILER_KEY. from 도메인은 modooilbo.com만 허용.
 */
export default {
  async fetch(req: Request, env: { EMAIL: any; MAILER_KEY?: string }): Promise<Response> {
    if (req.method !== "POST") return new Response("method", { status: 405 });
    if (!env.MAILER_KEY || req.headers.get("x-mailer-key") !== env.MAILER_KEY) {
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
    // ⚠️ replyTo는 **정규화해서** 넘긴다(2026-07-15). 종전엔 호출부 값을 그대로 흘렸는데,
    //   Pages가 보내던 `{email}`(name 없음)을 send_email 바인딩이 거부해
    //   "Incorrect type for the 'name' field on 'EmailAddress'"로 던졌다 → 사이트 메일이 전부 실패.
    //   from은 이미 name을 강제하고 있었는데 replyTo만 빠져 있었다. 같은 규약으로 맞춘다.
    //   (문자열 형태 "a@b.com"도 받아 준다 — 호출부가 어떤 형태로 주든 워커가 책임지고 정규화.)
    const rt = b?.replyTo;
    const rtEmail = typeof rt === "string" ? rt : String(rt?.email || "");
    const replyTo = rtEmail
      ? { email: rtEmail, name: String((typeof rt === "object" && rt?.name) || "모두일보") }
      : undefined;
    try {
      await env.EMAIL.send({
        to: b.to,
        from: { email: fromEmail, name: String(b.from?.name || "모두일보") },
        replyTo,
        subject: String(b.subject),
        text: String(b.text || ""),
        html: b.html ? String(b.html) : undefined,
      });
      return Response.json({ ok: true });
    } catch (e: any) {
      return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
    }
  },
};
