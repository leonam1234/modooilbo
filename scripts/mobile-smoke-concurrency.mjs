import { normalizeInspectionTarget } from "./lib/inspection-safety.mjs";

export const DEFAULT_SMOKE_CONCURRENCY = 2;

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isEnabled(value) {
  return TRUE_VALUES.has(String(value ?? "").trim().toLowerCase());
}

function parseConcurrency(value, source) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
    throw new Error(`${source} 값은 1 이상의 정수여야 합니다: ${value}`);
  }
  return Number(normalized);
}

function normalizeSameOriginPath(rawPath, base) {
  if (!rawPath.startsWith("/")) {
    throw new Error(`검사 경로는 /로 시작해야 합니다: ${rawPath}`);
  }
  const resolved = new URL(rawPath, `${base}/`);
  if (resolved.origin !== base) {
    throw new Error(`검사 경로는 Preview와 같은 origin이어야 합니다: ${rawPath}`);
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function parseSmokeCli(argv, env = process.env, matrixSize = 4) {
  const positional = [];
  let flagConcurrency;
  let serial = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--serial") {
      serial = true;
      continue;
    }
    if (arg === "--concurrency") {
      if (index + 1 >= argv.length) {
        throw new Error("--concurrency 뒤에 1 이상의 정수가 필요합니다.");
      }
      flagConcurrency = parseConcurrency(argv[index + 1], "--concurrency");
      index += 1;
      continue;
    }
    if (arg.startsWith("--concurrency=")) {
      flagConcurrency = parseConcurrency(arg.slice("--concurrency=".length), "--concurrency");
      continue;
    }
    positional.push(arg);
  }

  const [rawBase, ...paths] = positional;
  const base = rawBase
    ? normalizeInspectionTarget(rawBase, "모바일 스모크 대상 URL").origin
    : undefined;
  const requestedConcurrency = flagConcurrency
    ?? (env.SMOKE_CONCURRENCY === undefined
      ? DEFAULT_SMOKE_CONCURRENCY
      : parseConcurrency(env.SMOKE_CONCURRENCY, "SMOKE_CONCURRENCY"));
  const concurrency = serial || isEnabled(env.SMOKE_SERIAL)
    ? 1
    : Math.min(requestedConcurrency, matrixSize);

  return {
    base,
    pages: paths.length ? paths.map((path) => normalizeSameOriginPath(path, base)) : ["/"],
    concurrency,
  };
}

export async function mapWithConcurrency(items, concurrency, worker) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`concurrency must be a positive integer: ${concurrency}`);
  }

  const results = new Array(items.length);
  const failures = [];
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        failures.push({ index, error });
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  if (failures.length > 0) {
    failures.sort((a, b) => a.index - b.index);
    throw failures[0].error;
  }

  return results;
}
