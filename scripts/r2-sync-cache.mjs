import { execFileSync } from "node:child_process";
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

function readCacheFile(path, onWarning) {
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(parsed)) {
      onWarning(`[r2] 캐시 형식 무시(배열 아님): ${path}`);
      return [];
    }
    const normalized = normalizeCacheEntries(parsed);
    if (normalized.length !== parsed.length) {
      onWarning(`[r2] 캐시의 잘못되었거나 중복된 항목 ${parsed.length - normalized.length}개 무시: ${path}`);
    }
    return normalized;
  } catch (error) {
    onWarning(`[r2] 읽을 수 없는 캐시 무시: ${path} (${error.message})`);
    return [];
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

export function readMergedR2Cache(config, { onWarning = console.warn } = {}) {
  const paths = uniquePaths([config.cachePath, ...config.legacyPaths]);
  return normalizeCacheEntries(paths.flatMap((path) => readCacheFile(path, onWarning)));
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

function atomicWrite(path, entries) {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  let fd;
  try {
    fd = openSync(tempPath, "wx", 0o600);
    writeFileSync(fd, `${JSON.stringify(entries)}\n`, "utf8");
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

function writeWithLock(config, entries, onWarning) {
  mkdirSync(dirname(config.cachePath), { recursive: true });
  const lock = acquireLock(config.cachePath);
  try {
    // 다른 worktree가 먼저 쓴 값을 잃지 않도록 잠금 획득 후 모든 캐시를 다시 읽는다.
    const merged = normalizeCacheEntries([
      ...readMergedR2Cache(config, { onWarning }),
      ...entries,
    ]);
    atomicWrite(config.cachePath, merged);
    return { cachePath: config.cachePath, count: merged.length, mode: config.mode };
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
export function writeMergedR2Cache(config, entries, { onWarning = console.warn } = {}) {
  try {
    return writeWithLock(config, entries, onWarning);
  } catch (error) {
    if (config.mode !== "git-common" || !FALLBACK_ERROR_CODES.has(error.code)) throw error;
    onWarning(`[r2] Git 공용 캐시에 쓸 수 없어 로컬 캐시로 폴백: ${error.message}`);
    const fallback = createR2CacheConfig({ repoRoot: config.repoRoot });
    return writeWithLock(fallback, entries, onWarning);
  }
}
