/**
 * 메일 발송 공용 유틸 — Pages Functions 전용.
 *
 * 경로: Pages는 send_email 바인딩을 지원하지 않는다(2026-07 확인) → 전용 Worker
 *   (modooilbo-mailer, MAILER_URL + MAILER_KEY) 경유. 바인딩(EMAIL)이 생기면 그쪽 우선.
 * 발신은 항상 no-reply@modooilbo.com, 회신은 help@modooilbo.com.
 *
 * request-reset.ts · request-email.ts · newsletter.ts가 같은 본문 조립·발송 코드를
 * 각자 복사해 두고 있어 하나로 합쳤다(동작은 종전과 동일).
 */

export interface MailerEnv {
  /** CF Email 바인딩(현재 Pages 미지원 — 생기면 자동으로 우선 사용). */
  EMAIL?: any;
  MAILER_URL?: string;
  MAILER_KEY?: string;
}

export const MAIL_FROM = { email: "no-reply@modooilbo.com", name: "모두일보" } as const;
/**
 * ⚠️ 2026-07-15 — `name`이 **필수**다. 빼지 말 것(뺐다가 사이트 메일이 통째로 죽어 있었다).
 *
 * Cloudflare send_email 바인딩의 EmailAddress는 `name`이 있으면 **문자열이어야** 한다.
 * `{ email }`만 주면 name === undefined가 되어 바인딩이 던진다:
 *   "Incorrect type for the 'name' field on 'EmailAddress': the provided value is not of type 'string'."
 * → 메일러 워커가 502 → sendMail이 false → 호출부가 발송 실패로 처리.
 *
 * 이 결함은 초기 메일 구현부터 있었고(3차에서 이 파일로 옮겨질 때 형태 그대로 승계),
 * **모든 발송 경로가 프로덕션에서 계속 실패**하고 있었다. 그런데도 안 드러난 이유:
 *   · request-reset은 발송 결과를 무시하고 {ok:true}를 준다(열거 방지) → 조용히 실패
 *   · request-email·newsletter는 502를 주지만 거의 호출되지 않았다
 *   · 실사용 회원 0명이라 아무도 메일을 기다리지 않았다
 * 5차에서 가입이 메일에 의존하게 되자 signup이 매번 502로 터지며 비로소 드러났다.
 * (실측: replyTo에 name 포함 → 200 {"ok":true} / name 없음 → 502. 실제 워커로 확인)
 */
export const MAIL_REPLY_TO = { email: "help@modooilbo.com", name: "모두일보" } as const;

/** 메일 HTML에 들어가는 사용자 입력(닉네임·이메일 등) 이스케이프 — HTML 주입 방지. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 랜덤 토큰(hex). 메일 링크용 1회용 토큰 생성에 쓴다. */
export function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 모두일보 메일 공통 레이아웃(로고 + 본문 + 꼬리말). */
export function mailShell(bodyHtml: string, footerHtml: string): string {
  return `<div style="font-family:'Apple SD Gothic Neo',AppleGothic,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#191919">
  <h2 style="font-weight:800;margin:0 0 16px">모두<span style="color:#6b6b73">일보</span></h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
  <p style="font-size:12px;color:#999;line-height:1.7">${footerHtml}</p>
</div>`;
}

/** 검정 알약 버튼(메일 CTA). */
export function mailButton(link: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#191919;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">${label}</a></p>
  <p style="font-size:13px;color:#777;line-height:1.7">버튼이 안 되면 링크를 복사해 주소창에 붙여넣으세요:<br/><a href="${link}" style="color:#555">${link}</a></p>`;
}

/**
 * 발송. 성공 여부만 돌려준다(예외는 삼키고 false).
 *
 * ⚠️ 실패 사유는 **반드시 로그로 남긴다**(2026-07-15). 왜: 종전엔 실패를 통째로 삼켜
 *   `false`만 돌려줬다 → 프로덕션에서 메일이 전부 실패하는데도 `wrangler pages deployment tail`에
 *   아무 단서가 안 찍혀, 원인(replyTo의 name 누락)을 찾으려면 메일러 워커에 수동 프로브를
 *   쏴야 했다. 사유를 남기면 tail 한 번으로 끝난다.
 *   로그에 **수신자 주소(PII)는 남기지 않는다** — 상태코드와 오류 본문만.
 */
export async function sendMail(
  env: MailerEnv,
  msg: { to: string; subject: string; text: string; html: string },
): Promise<boolean> {
  const { to, subject, text, html } = msg;
  try {
    if (env.EMAIL?.send) {
      await env.EMAIL.send({ to, from: MAIL_FROM, subject, text, html, replyTo: MAIL_REPLY_TO });
      return true;
    }
    if (env.MAILER_URL && env.MAILER_KEY) {
      const res = await fetch(env.MAILER_URL, {
        method: "POST",
        headers: { "x-mailer-key": env.MAILER_KEY, "content-type": "application/json" },
        body: JSON.stringify({ to, from: MAIL_FROM, replyTo: MAIL_REPLY_TO, subject, text, html }),
      });
      if (!res.ok) {
        // 본문은 워커가 돌려준 사유(예: send_email 바인딩 오류 원문). 앞부분만 잘라 남긴다.
        const why = await res.text().catch(() => "");
        console.error(`[mailer] send failed: HTTP ${res.status} ${why.slice(0, 300)}`);
      }
      return res.ok;
    }
    console.error("[mailer] not configured: EMAIL 바인딩도 MAILER_URL/MAILER_KEY도 없음");
  } catch (e: any) {
    console.error(`[mailer] send threw: ${String(e?.message || e).slice(0, 300)}`);
  }
  return false;
}
