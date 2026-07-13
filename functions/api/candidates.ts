/**
 * 편집 대기열 내부 API (관리자 전용) — 기업 데이터 뉴스 계층3.
 *
 * GET  /api/candidates?status=&menu=&limit=   → 상태별/메뉴별 후보 목록 + 상태 집계
 * GET  /api/candidates?cand_id=<id>           → 단건 + 상태 전이 이력(candidate_events)
 * POST /api/candidates {cand_id, to, note?, publishedSlug?}
 *                                              → 상태 전이(사람 게이트: 초안 이후는 관리자만)
 * POST /api/candidates {action:"ingest", limit?, source?}
 *                                              → 원천(paseco RAW_DB, read-only) → 점수화 → 후보 적재
 *                                                 (자동은 수집→후보까지만. 저장만 등급은 수집에서 정지)
 *
 * 모든 엔드포인트 관리자(ADMIN_EMAILS) 인증 필수. 쓰기(전이·수집)도 관리자만.
 * 원천 D1은 read-only(SELECT만) — paseco 쓰기 경로 불간섭.
 */
import { json } from "../_lib/auth";
import { requireAdmin, type AdminEnv } from "../_lib/admin";
import { scoreProgram, type ProgramRow } from "../_lib/candidate-scoring";
import {
  applyTransition,
  insertEvent,
  isValidStatus,
  STATUSES,
  type CandidateStatus,
} from "../_lib/candidate-status";

// 원천 read-only 바인딩(env.RAW_DB = paseco-leads D1). 대시보드/래핑 바인딩은 그룹장이 등록.
type Env = AdminEnv & { RAW_DB?: any };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

/** 원천 소스 → 파일럿 메뉴 매핑. 나라장터=입찰·조달, 나머지=지원사업. */
function menuForSource(source?: string | null): string {
  return source === "nara" ? "입찰·조달" : "지원사업";
}

// ── GET ──────────────────────────────────────────────────────────────────
export async function onRequestGet(ctx: any): Promise<Response> {
  const env = ctx.env as Env;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const gate = await requireAdmin(env, ctx.request);
  if (gate instanceof Response) return gate;

  const url = new URL(ctx.request.url);
  const candId = url.searchParams.get("cand_id");

  // 단건 + 이력
  if (candId) {
    const cand = await env.DB.prepare(
      "SELECT * FROM article_candidates WHERE cand_id = ?1",
    )
      .bind(candId)
      .first();
    if (!cand) return json({ error: "후보를 찾을 수 없습니다." }, 404);
    const events = (
      await env.DB.prepare(
        "SELECT from_status, to_status, actor, note, at FROM candidate_events WHERE cand_id = ?1 ORDER BY id ASC",
      )
        .bind(candId)
        .all()
    ).results;
    return json({ candidate: shapeRow(cand), events });
  }

  // 목록
  const status = url.searchParams.get("status");
  const menu = url.searchParams.get("menu");
  const limit = clampLimit(url.searchParams.get("limit"));

  const where: string[] = [];
  const binds: any[] = [];
  if (status && isValidStatus(status)) {
    binds.push(status);
    where.push(`status = ?${binds.length}`);
  }
  if (menu) {
    binds.push(menu);
    where.push(`menu = ?${binds.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  binds.push(limit);
  const rows = (
    await env.DB.prepare(
      `SELECT * FROM article_candidates ${whereSql} ORDER BY score DESC, updated_at DESC LIMIT ?${binds.length}`,
    )
      .bind(...binds)
      .all()
  ).results;

  // 상태 집계(대기열 대시보드용)
  const countRows = (
    await env.DB.prepare(
      "SELECT status, COUNT(*) AS n FROM article_candidates GROUP BY status",
    ).all()
  ).results as { status: string; n: number }[];
  const counts: Record<string, number> = {};
  for (const s of STATUSES) counts[s] = 0;
  for (const r of countRows) counts[r.status] = r.n;

  return json({ candidates: rows.map(shapeRow), counts, limit });
}

function shapeRow(r: any) {
  let breakdown: unknown = null;
  try {
    breakdown = r.score_breakdown ? JSON.parse(r.score_breakdown) : null;
  } catch {
    breakdown = null;
  }
  return { ...r, score_breakdown: breakdown };
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function onRequestPost(ctx: any): Promise<Response> {
  const env = ctx.env as Env;
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const gate = await requireAdmin(env, ctx.request);
  if (gate instanceof Response) return gate;
  const admin = gate; // { id, email, name }

  let payload: any = {};
  try {
    payload = await ctx.request.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  if (payload?.action === "ingest") {
    return ingest(env, admin.email, payload);
  }

  // 상태 전이
  const candId = String(payload?.cand_id || "");
  const to = String(payload?.to || "");
  if (!candId || !isValidStatus(to)) {
    return json({ error: "cand_id와 유효한 to(상태)가 필요합니다." }, 400);
  }
  const result = await applyTransition(env, candId, to as CandidateStatus, admin.email, {
    note: payload?.note ? String(payload.note) : undefined,
    publishedSlug: payload?.publishedSlug ? String(payload.publishedSlug) : undefined,
  });
  if (!result.ok) return json({ error: result.error }, 409);
  return json({ ok: true, cand_id: candId, from: result.from, to: result.to });
}

/**
 * 원천 → 후보 수집(골격). RAW_DB(read-only)에서 활성 공고를 읽어 점수화 후 upsert.
 * 신규는 status='수집'로 넣고, 검토/브리핑묶음 등급은 자동으로 수집→후보. 저장만은 수집에서 정지.
 * 기존 후보는 content_hash가 바뀐 것만 재점수화(사람이 진행한 상태는 유지).
 */
async function ingest(env: Env, actor: string, payload: any): Promise<Response> {
  if (!env.RAW_DB) {
    return json(
      { error: "원천(RAW_DB) 바인딩이 아직 설정되지 않았습니다. paseco-leads read-only 바인딩 등록 필요." },
      503,
    );
  }
  const limit = clampLimit(payload?.limit != null ? String(payload.limit) : null);
  const source = payload?.source ? String(payload.source) : null;

  const where: string[] = ["active = 1"];
  const binds: any[] = [];
  if (source) {
    binds.push(source);
    where.push(`source = ?${binds.length}`);
  }
  binds.push(limit);
  const programs = (
    await env.RAW_DB.prepare(
      `SELECT id, title, org, field, region, target, target_type, biz_enyy, period_end_raw,
              recruiting, active, url, apply_url, content, source, source_id, content_hash,
              amount_min, amount_max, industry_code, first_seen, last_seen
       FROM programs ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY last_seen DESC LIMIT ?${binds.length}`,
    )
      .bind(...binds)
      .all()
  ).results as ProgramRow[];

  const now = Date.now();
  let inserted = 0;
  let updated = 0;
  let promoted = 0;
  let skipped = 0;

  for (const p of programs) {
    const srcId = p.source_id ?? p.id ?? null;
    if (!srcId) {
      skipped++;
      continue;
    }
    const candId = `${p.source ?? "unknown"}:${srcId}`;
    const res = scoreProgram(p, now);
    const breakdownJson = JSON.stringify(res.breakdown);
    const menu = menuForSource(p.source);
    const qualifies = res.grade === "검토" || res.grade === "브리핑묶음";

    const existing = (await env.DB.prepare(
      "SELECT status, raw_content_hash FROM article_candidates WHERE cand_id = ?1",
    )
      .bind(candId)
      .first()) as { status?: string; raw_content_hash?: string } | null;

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO article_candidates
           (cand_id, raw_source, raw_source_id, raw_content_hash, score, score_breakdown, status, menu, video_score)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, '수집', ?7, ?8)`,
      )
        .bind(
          candId,
          p.source ?? null,
          srcId,
          p.content_hash ?? null,
          res.score,
          breakdownJson,
          menu,
          res.videoScore,
        )
        .run();
      await insertEvent(env, candId, null, "수집", "system", `ingest score=${res.score} grade=${res.grade}`);
      inserted++;
      if (qualifies) {
        const t = await applyTransition(env, candId, "후보", "system", {
          note: `자동 승격(${res.grade})`,
        });
        if (t.ok) promoted++;
      }
    } else if ((existing.raw_content_hash ?? null) !== (p.content_hash ?? null)) {
      // 원천 변경 → 재점수화(사람이 진행한 상태는 건드리지 않음)
      await env.DB.prepare(
        `UPDATE article_candidates
           SET score = ?2, score_breakdown = ?3, raw_content_hash = ?4, video_score = ?5,
               updated_at = datetime('now','+9 hours')
         WHERE cand_id = ?1`,
      )
        .bind(candId, res.score, breakdownJson, p.content_hash ?? null, res.videoScore)
        .run();
      await insertEvent(
        env,
        candId,
        (existing.status as CandidateStatus) ?? null,
        (existing.status as CandidateStatus) ?? "수집",
        "system",
        `재점수화 score=${res.score} grade=${res.grade}`,
      );
      updated++;
      // 아직 수집 상태이고 이제 자격을 갖추면 자동 승격
      if (existing.status === "수집" && qualifies) {
        const t = await applyTransition(env, candId, "후보", "system", {
          note: `자동 승격(${res.grade})`,
        });
        if (t.ok) promoted++;
      }
    } else {
      skipped++;
    }
  }

  return json({ ok: true, scanned: programs.length, inserted, updated, promoted, skipped, actor });
}
