/**
 * JSON 요청 본문 공용 관문.
 *
 * Cloudflare의 요청 본문 상한(플랜에 따라 100MB 이상)은 Workers isolate 메모리
 * 상한보다 클 수 있다. `request.json()`은 검증 전에 본문 전체를 버퍼링하므로,
 * 작은 API 입력을 먼저 바이트 단위로 제한한 뒤 JSON 객체만 반환한다.
 *
 * Content-Type은 강제하지 않는다. sendBeacon과 기존 클라이언트가
 * `text/plain`으로 JSON을 보낼 수 있기 때문이다.
 */

export const DEFAULT_JSON_BODY_LIMIT = 64 * 1024;

export type JsonObject = Record<string, unknown>;
export type JsonObjectResult =
  | { ok: true; value: JsonObject }
  | { ok: false; status: 400 | 413 };

export async function readJsonObject(
  request: Request,
  maxBytes = DEFAULT_JSON_BODY_LIMIT,
): Promise<JsonObjectResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    return { ok: false, status: 413 };
  }

  if (!request.body) return { ok: false, status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // 공격자가 취소 완료를 지연하는 스트림을 보낼 수 있으므로 기다리지 않는다.
        // 이미 상한을 넘었다는 판정은 확정됐고, 취소 실패도 응답 상태를 바꾸면 안 된다.
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, status: 400 };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, status: 400 };
  }
  return { ok: true, value: value as JsonObject };
}
