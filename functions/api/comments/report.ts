/**
 * POST /api/comments/report {id} — 댓글 신고(로그인 회원, 댓글당 1회).
 * 서로 다른 회원 5명 누적 시 자동 가림(is_hidden=1). → { ok, hidden }
 *
 * ⚠️ 2026-07-21 보안 감사 — 신고 남용(집단 은폐)이 확정 결함으로 잡혀 3가지를 고쳤다.
 *   구 상태: ①신고엔 레이트리밋이 없었다(댓글 작성엔 있는데) ②3표면 가림
 *   ③되돌리는 코드가 저장소 어디에도 없다 ④탈퇴 시 comment_reports를 **삭제**해 신고자
 *   추적 근거까지 사라졌다. → 계정 3개만 만들면 임의의 댓글을 무제한·영구·무흔적으로
 *   은폐할 수 있었다(가림은 사실상 되돌릴 수 없으므로 남용 비용이 0에 수렴).
 *   고친 것: (1) 회원당 24시간 10건 레이트리밋(fail-closed) (2) 임계값 3 → 5
 *   (3) 탈퇴 시 신고 이력을 삭제하지 않고 툼스톤 계정으로 이관(delete-account.ts).
 *
 * ⚠️ **가림 해제 경로가 아직 수동뿐이다.** 자동 가림을 되돌리는 API는 존재하지 않는다.
 *   현재 유일한 해제 방법:
 *     wrangler d1 execute modooilbo-members --remote --command "UPDATE comments SET is_hidden=0 WHERE id='...'"
 *   👉 **관리자 해제 엔드포인트 신설은 별건 과제**다(새 API 표면 = 별도 인가 설계가 필요해
 *      이번 보안 수정 범위에서 의도적으로 제외했다). 오남용 신고가 실제로 발생하면
 *      그때 관리자 게이트(ADMIN_EMAILS 방식)와 함께 설계할 것.
 *
 * 남은 한계(의도적으로 이번 범위 밖): 계정 연령·활동 조건이 없어 갓 만든 계정도 신고할 수 있다.
 *   5명분 계정을 만들면 여전히 가림이 가능하다 — 다만 이제 비용이 들고 **흔적이 남는다**
 *   (comment_reports의 신고자 user_id가 탈퇴 후에도 보존된다).
 */
import { json, getUser, type AuthEnv } from "../../_lib/auth";
import { hitRateLimit } from "../../_lib/rate-limit";

const HIDE_THRESHOLD = 5;
// 회원당 24시간 10건. 정상 이용자가 하루 10건 넘게 신고할 일은 없고(신고마다 확인창을 거친다),
// 대량 신고 계정을 만들어도 하루 10건으로 묶인다.
const REPORT_LIMIT = 10;
const REPORT_WINDOW_SECS = 86400;

export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as AuthEnv;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const me = await getUser(env, ctx.request);
  if (!me) return json({ error: "로그인이 필요합니다." }, 401);

  let id = "";
  try {
    id = String((await ctx.request.json())?.id || "");
  } catch {
    /* noop */
  }
  if (!id) return json({ error: "잘못된 요청입니다." }, 400);

  const c = (await env.DB.prepare(
    "SELECT user_id, is_deleted, is_hidden FROM comments WHERE id = ?1",
  )
    .bind(id)
    .first()) as any;
  if (!c || c.is_deleted) return json({ error: "존재하지 않는 댓글입니다." }, 404);
  if (c.user_id === me.id) return json({ error: "본인 댓글은 신고할 수 없습니다." }, 400);

  // 이미 신고한 댓글이면 **제한 슬롯을 태우지 않고** 그대로 성공 처리한다.
  // 신고는 원래 멱등(INSERT OR IGNORE)이라 재요청은 상태를 바꾸지 않는데, 슬롯만 깎으면
  // 새로고침 후 다시 누른 정상 이용자가 애꿎게 하루 한도를 잃는다(응답은 구 동작과 동일).
  const already = await env.DB.prepare(
    "SELECT 1 AS x FROM comment_reports WHERE comment_id = ?1 AND user_id = ?2",
  )
    .bind(id, me.id)
    .first();
  if (already) return json({ ok: true, hidden: !!c.is_hidden });

  // 남용 제한: 회원당 24시간 10건. 형식·권한 검증을 통과한 **새 신고**만 슬롯을 소모한다.
  // 저장소에 접근할 수 없으면 **거부**한다(fail-closed) — comments/index.ts와 동일 패턴.
  // 여기서 통과시키면 제한이 없는 것과 같아진다(구 KV 구현의 fail-open 버그가 그 정체였다).
  let rl;
  try {
    rl = await hitRateLimit(
      env,
      `report:${me.id}`,
      REPORT_LIMIT,
      REPORT_WINDOW_SECS,
      Date.now(),
      ctx.waitUntil?.bind(ctx),
    );
  } catch {
    return json({ error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!rl.allowed) {
    return json({ error: "신고가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO comment_reports (comment_id, user_id) VALUES (?1, ?2)",
  )
    .bind(id, me.id)
    .run();

  const n = (await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM comment_reports WHERE comment_id = ?1",
  )
    .bind(id)
    .first()) as any;

  let hidden = !!c.is_hidden;
  if (!hidden && (n?.n ?? 0) >= HIDE_THRESHOLD) {
    await env.DB.prepare("UPDATE comments SET is_hidden = 1 WHERE id = ?1").bind(id).run();
    hidden = true;
  }
  return json({ ok: true, hidden });
}
