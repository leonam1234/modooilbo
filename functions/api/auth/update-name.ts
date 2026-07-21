/** POST /api/auth/update-name — 닉네임 변경(로그인 필요). 금칙어·중복 닉네임 거부. */
import { json, getUser, type AuthEnv } from "../../_lib/auth";
import { hasBanned } from "../../_lib/moderation";
import { isReservedName, RESERVED_NAME_ERROR } from "../../_lib/reserved-names";

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  const user = await getUser(env, ctx.request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  let b: any;
  try {
    b = await ctx.request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  const name = String(b?.name ?? "").trim();
  if (name.length < 1 || name.length > 20) return json({ error: "닉네임은 1~20자로 입력해 주세요." }, 400);
  if (hasBanned(name)) return json({ error: "닉네임에 부적절한 표현이 포함되어 있습니다." }, 400);
  // 소속 기자·편집국 사칭 차단(2026-07-21). 닉네임 변경은 사칭의 주 경로다 —
  // 평범한 이름으로 가입해 신뢰를 쌓은 뒤 기자명으로 바꾸면 기존 댓글까지 소급해 사칭이 된다.
  if (isReservedName(name)) return json({ error: RESERVED_NAME_ERROR }, 400);

  // 중복 닉네임 금지(대소문자 무시, 본인 제외)
  const dup = await env.DB.prepare("SELECT 1 FROM users WHERE lower(name) = lower(?1) AND id != ?2 LIMIT 1")
    .bind(name, user.id)
    .first();
  if (dup) return json({ error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 골라 주세요." }, 409);

  await env.DB.prepare("UPDATE users SET name = ?1 WHERE id = ?2").bind(name, user.id).run();
  return json({ user: { name, email: user.email } });
}
