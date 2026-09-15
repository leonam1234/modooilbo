import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const LEGACY_RELATIVE_PATH = join("scripts", ".r2-synced.json");
const SHARED_CACHE_DIRECTORY = "modooilbo-cache";
const SHARED_CACHE_FILENAME = "r2-synced.json";
const LOCK_TIMEOUT_MS = 10_000;
const STALE_LOCK_MS = 30_000;
const WAIT_BUFFER = new Int32Array(new SharedArrayBuffer(4));
const FALLBACK_ERROR_CODES = new Set(["EACCES", "EPERM", "EROFS", "ENOTDIR"]);

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean).map((path) => resolve(path)))];
}

function validCacheEntry(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("\0") &&
    !/[\\/]/.test(value)
  );
}

function normalizeCacheEntries(values) {
  return [...new Set(values.filter(validCacheEntry))].sort();
}

function validContentHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function emptySnapshot() {
  return { files: {}, legacy: [] };
}

function normalizeHashedFiles(value, onWarning, path) {
  const files = {};
  let ignored = 0;
  if (!value || typeof value !== "object" || Array.isArray(value)) return { files, ignored: 1 };
  for (const [name, hash] of Object.entries(value)) {
    if (!validCacheEntry(name) || !validContentHash(hash)) {
      ignored += 1;
      continue;
    }
    files[name] = hash;
  }
  if (ignored) onWarning(`[r2] 캐시의 잘못된 해시 항목 ${ignored}개 무시: ${path}`);
  return { files, ignored };
}

function mergeSnapshots(...snapshots) {
  const legacy = new Set();
  const files = {};
  for (const snapshot of snapshots) {
    for (const name of snapshot.legacy ?? []) legacy.add(name);
    Object.assign(files, snapshot.files ?? {});
  }
  for (const name of Object.keys(files)) legacy.delete(name);
  return { files, legacy: [...legacy].sort() };
}

function readCacheFile(path, onWarning) {
  if (!existsSync(path)) return emptySnapshot();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(parsed)) {
      const normalized = normalizeCacheEntries(parsed);
      if (normalized.length !== parsed.length) {
        onWarning(`[r2] 캐시의 잘못되었거나 중복된 항목 ${parsed.length - normalized.length}개 무시: ${path}`);
      }
      return { files: {}, legacy: normalized };
    }
    if (parsed?.schemaVersion !== 2) {
      onWarning(`[r2] 지원하지 않는 캐시 형식 무시: ${path}`);
      return emptySnapshot();
    }
    const files = normalizeHashedFiles(parsed.files, onWarning, path).files;
    const legacy = normalizeCacheEntries(Array.isArray(parsed.legacy) ? parsed.legacy : [])
      .filter((name) => !files[name]);
    return { files, legacy };
  } catch (error) {
    onWarning(`[r2] 읽을 수 없는 캐시 무시: ${path} (${error.message})`);
    return emptySnapshot();
  }
}

export function createR2CacheConfig({ repoRoot, gitCommonDir = null, mainWorktreeRoot = null }) {
  const localCachePath = join(repoRoot, LEGACY_RELATIVE_PATH);
  if (!gitCommonDir) {
    return {
      repoRoot,
      mode: "local",
      cachePath: localCachePath,
      localCachePath,
      legacyPaths: [localCachePath],
    };
  }

  const cachePath = join(gitCommonDir, SHARED_CACHE_DIRECTORY, SHARED_CACHE_FILENAME);
  return {
    repoRoot,
    mode: "git-common",
    cachePath,
    localCachePath,
    legacyPaths: uniquePaths([
      localCachePath,
      mainWorktreeRoot ? join(mainWorktreeRoot, LEGACY_RELATIVE_PATH) : null,
    ]),
  };
}

function gitOutput(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/** Git 저장소면 common dir를 쓰고, Git 밖이거나 쓸 수 없으면 기존 로컬 경로로 폴백한다. */
export function discoverR2Cache(repoRoot, { onWarning = console.warn } = {}) {
  try {
    const rawCommonDir = gitOutput(repoRoot, ["rev-parse", "--git-common-dir"]);
    const gitCommonDir = isAbsolute(rawCommonDir) ? rawCommonDir : resolve(repoRoot, rawCommonDir);
    let mainWorktreeRoot = null;
    try {
      const fields = execFileSync("git", ["worktree", "list", "--porcelain", "-z"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).split("\0");
      const mainField = fields.find((field) => field.startsWith("worktree "));
      if (mainField) mainWorktreeRoot = mainField.slice("worktree ".length);
    } catch {
      // 아래의 표준 non-bare 저장소 폴백으로 계속한다.
    }
    // worktree 목록을 읽지 못했거나 비어 있어도 기본 checkout의 레거시 캐시는 합친다.
    if (!mainWorktreeRoot && basename(gitCommonDir) === ".git") {
      mainWorktreeRoot = dirname(gitCommonDir);
    }

    const config = createR2CacheConfig({ repoRoot, gitCommonDir, mainWorktreeRoot });
    mkdirSync(dirname(config.cachePath), { recursive: true });
    return config;
  } catch (error) {
    onWarning(`[r2] Git 공용 캐시를 사용할 수 없어 로컬 캐시로 폴백: ${error.message}`);
    return createR2CacheConfig({ repoRoot });
  }
}

/** 원격 PUT 전 구간을 한 프로세스만 수행하게 한다. 동시 배포는 기다리지 않고 즉시 거부한다. */
export function acquireR2SyncLease(config) {
  mkdirSync(dirname(config.cachePath), { recursive: true });
  const lockPath = `${config.cachePath}.sync.lock`;
  const owner = JSON.stringify({ pid: process.pid, host: hostname(), token: randomUUID() });
  try {
    if (existsSync(lockPath)) {
      const previous = readFileSync(lockPath, "utf8").trim();
      const parsed = JSON.parse(previous);
      const holder = typeof parsed === "number" ? { pid: parsed, host: hostname() } : parsed;
      // 시간만 지났다고 살아 있는 장기 업로드의 잠금을 빼앗지 않는다.
      if (holder?.host === hostname() && Number.isInteger(holder.pid) && holder.pid > 0) {
        try { process.kill(holder.pid, 0); }
        catch (error) {
          if (error.code === "ESRCH" && readFileSync(lockPath, "utf8").trim() === previous) {
            unlinkSync(lockPath);
          }
        }
      }
    }
    const fd = openSync(lockPath, "wx", 0o600);
    try { writeFileSync(fd, owner, "utf8"); }
    finally { closeSync(fd); }
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`다른 R2 동기화가 실행 중입니다: ${lockPath}`);
    throw error;
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      if (readFileSync(lockPath, "utf8").trim() === owner) unlinkSync(lockPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  };
}

export function readMergedR2Cache(config, { onWarning = console.warn } = {}) {
  const paths = uniquePaths([...config.legacyPaths, config.cachePath]);
  return mergeSnapshots(...paths.map((path) => readCacheFile(path, onWarning)));
}

export function planR2Sync({ localFiles, cache, changedFiles = [] }) {
  const changed = new Set(changedFiles);
  const legacy = new Set(cache.legacy ?? []);
  const files = {};
  const candidates = [];
  const replacements = [];
  const pendingLegacy = [];

  for (const [name, hash] of Object.entries(localFiles).sort(([a], [b]) => a.localeCompare(b))) {
    if (!validCacheEntry(name) || !validContentHash(hash)) {
      throw new Error(`유효하지 않은 R2 로컬 해시 항목: ${name}`);
    }
    if (cache.files?.[name] === hash) {
      files[name] = hash;
    } else if (cache.files?.[name]) {
      candidates.push(name);
      replacements.push(name);
    } else if (legacy.has(name) && !changed.has(name)) {
      // filename-only 캐시는 원격 바이트를 증명하지 못한다. 해시로 조용히 승격하지 않는다.
      pendingLegacy.push(name);
    } else {
      candidates.push(name);
      if (legacy.has(name)) replacements.push(name);
    }
  }
  return { candidates, replacements, files, legacy: pendingLegacy };
}

export function selectLegacyProbe(entries, limit = 12) {
  if (!Number.isInteger(limit) || limit < 0) throw new Error(`legacy probe limit 오류: ${limit}`);
  return [...new Set(entries)].sort().slice(0, limit);
}

function stockVersion(source) {
  return String(source ?? "").match(/\bSTOCK_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
}

export function assertStockVersionBump({ replacements, currentSource, previousSource }) {
  if (!replacements.length) return;
  const current = stockVersion(currentSource);
  const previous = stockVersion(previousSource);
  if (!current || !previous || current === previous) {
    throw new Error(
      `같은 파일명 이미지 교체 ${replacements.length}개에는 src/lib/stock.ts STOCK_VERSION 변경이 필요합니다: ${replacements.slice(0, 5).join(", ")}`,
    );
  }
}

export function assertNoUnversionedStockReplacements({ replacements, unversionedNames }) {
  const unversioned = new Set(unversionedNames);
  const unsafe = replacements.filter((name) => unversioned.has(name));
  if (unsafe.length) {
    throw new Error(
      `본문이 버전 쿼리 없이 참조하는 이미지 ${unsafe.length}개는 같은 파일명으로 교체할 수 없습니다. 새 파일명을 사용하세요: ${unsafe.slice(0, 5).join(", ")}`,
    );
  }
}

function wait(ms) {
  Atomics.wait(WAIT_BUFFER, 0, 0, ms);
}

function acquireLock(cachePath) {
  const lockPath = `${cachePath}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    try {
      const fd = openSync(lockPath, "wx", 0o600);
      try {
        writeFileSync(fd, `${process.pid}\n`, "utf8");
        return { fd, lockPath };
      } catch (error) {
        closeSync(fd);
        try {
          unlinkSync(lockPath);
        } catch (unlinkError) {
          if (unlinkError.code !== "ENOENT") throw unlinkError;
        }
        throw error;
      }
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > STALE_LOCK_MS) {
          unlinkSync(lockPath);
          continue;
        }
      } catch (statError) {
        if (statError.code === "ENOENT") continue;
        throw statError;
      }
      if (Date.now() >= deadline) {
        throw new Error(`R2 cache lock timeout: ${lockPath}`);
      }
      wait(25);
    }
  }
}

function atomicWrite(path, snapshot) {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  let fd;
  try {
    fd = openSync(tempPath, "wx", 0o600);
    const files = Object.fromEntries(Object.entries(snapshot.files).sort(([a], [b]) => a.localeCompare(b)));
    const legacy = normalizeCacheEntries(snapshot.legacy ?? []).filter((name) => !files[name]);
    writeFileSync(fd, `${JSON.stringify({ schemaVersion: 2, files, legacy })}\n`, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(tempPath, path);
  } finally {
    if (fd !== undefined) closeSync(fd);
    try {
      unlinkSync(tempPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function writeWithLock(config, entries, onWarning, expectedFiles) {
  mkdirSync(dirname(config.cachePath), { recursive: true });
  const lock = acquireLock(config.cachePath);
  try {
    // 다른 worktree가 먼저 쓴 값을 잃지 않도록 잠금 획득 후 모든 캐시를 다시 읽는다.
    const current = readMergedR2Cache(config, { onWarning });
    const incoming = entries?.files ? entries : { files: entries, legacy: [] };
    const merged = mergeSnapshots(current, { files: {}, legacy: incoming.legacy ?? [] });
    const conflicts = [];
    for (const [name, hash] of Object.entries(incoming.files ?? {})) {
      if (Object.hasOwn(expectedFiles, name)) {
        const expected = expectedFiles[name];
        const actual = current.files[name] ?? null;
        if (actual !== expected && actual !== hash) {
          conflicts.push(name);
          delete merged.files[name];
          if (!merged.legacy.includes(name)) merged.legacy.push(name);
          continue;
        }
      }
      merged.files[name] = hash;
      merged.legacy = merged.legacy.filter((entry) => entry !== name);
    }
    merged.legacy.sort();
    atomicWrite(config.cachePath, merged);
    return { cachePath: config.cachePath, count: Object.keys(merged.files).length, mode: config.mode, conflicts };
  } finally {
    try {
      closeSync(lock.fd);
    } finally {
      try {
        unlinkSync(lock.lockPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
}

/** 잠금 + 재병합 + 같은 디렉터리의 원자적 rename으로 worktree 간 갱신 유실을 막는다. */
export function writeMergedR2Cache(config, entries, { onWarning = console.warn, expectedFiles = {} } = {}) {
  try {
    return writeWithLock(config, entries, onWarning, expectedFiles);
  } catch (error) {
    if (config.mode !== "git-common" || !FALLBACK_ERROR_CODES.has(error.code)) throw error;
    onWarning(`[r2] Git 공용 캐시에 쓸 수 없어 로컬 캐시로 폴백: ${error.message}`);
    const fallback = createR2CacheConfig({ repoRoot: config.repoRoot });
    return writeWithLock(fallback, entries, onWarning, expectedFiles);
  }
}
