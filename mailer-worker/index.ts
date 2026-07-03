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
    try {
      await env.EMAIL.send({
        to: b.to,
        from: { email: fromEmail, name: String(b.from?.name || "모두일보") },
        replyTo: b.replyTo,
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
