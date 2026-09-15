#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  acquireR2SyncLease,
  assertNoUnversionedStockReplacements,
  assertStockVersionBump,
  createR2CacheConfig,
  discoverR2Cache,
  planR2Sync,
  readMergedR2Cache,
  selectLegacyProbe,
  writeMergedR2Cache,
} from "./r2-sync-cache.mjs";

const H1 = "1".repeat(64);
const H2 = "2".repeat(64);
const H3 = "3".repeat(64);

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf8");
}

test("git worktrees resolve to one shared cache while retaining migration inputs", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-config-"));
  try {
    const main = join(root, "main");
    const linked = join(root, "linked");
    const common = join(main, ".git");
    const mainConfig = createR2CacheConfig({ repoRoot: main, gitCommonDir: common, mainWorktreeRoot: main });
    const linkedConfig = createR2CacheConfig({ repoRoot: linked, gitCommonDir: common, mainWorktreeRoot: main });

    assert.equal(mainConfig.cachePath, linkedConfig.cachePath);
    assert.equal(mainConfig.mode, "git-common");
    assert.equal(linkedConfig.mode, "git-common");
    assert.deepEqual(mainConfig.legacyPaths, [join(main, "scripts", ".r2-synced.json")]);
    assert.deepEqual(linkedConfig.legacyPaths, [
      join(linked, "scripts", ".r2-synced.json"),
      join(main, "scripts", ".r2-synced.json"),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy caches merge safely and a late shared update is not lost", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-merge-"));
  try {
    const main = join(root, "main");
    const linked = join(root, "linked");
    const common = join(main, ".git");
    const config = createR2CacheConfig({ repoRoot: linked, gitCommonDir: common, mainWorktreeRoot: main });
    const warnings = [];
    const options = { onWarning: (message) => warnings.push(message) };

    writeJson(join(linked, "scripts", ".r2-synced.json"), ["local.webp", "duplicate.webp", 42, "../unsafe.webp"]);
    writeJson(join(main, "scripts", ".r2-synced.json"), ["main.webp", "duplicate.webp"]);
    writeJson(config.cachePath, ["shared.webp"]);

    const snapshot = readMergedR2Cache(config, options);
    assert.deepEqual(snapshot, {
      files: {},
      legacy: ["duplicate.webp", "local.webp", "main.webp", "shared.webp"],
    });
    assert.equal(warnings.length, 1);

    // 다른 worktree가 snapshot 이후 먼저 기록한 상황을 재현한다.
    writeJson(config.cachePath, {
      schemaVersion: 2,
      files: { "shared.webp": H1, "other-worktree.webp": H2 },
    });
    const result = writeMergedR2Cache(config, {
      files: {
        "duplicate.webp": H1,
        "local.webp": H1,
        "main.webp": H1,
        "shared.webp": H1,
        "this-worktree.webp": H3,
      },
    }, options);
    const persisted = JSON.parse(readFileSync(config.cachePath, "utf8"));

    assert.deepEqual(persisted, {
      schemaVersion: 2,
      files: {
        "duplicate.webp": H1,
        "local.webp": H1,
        "main.webp": H1,
        "other-worktree.webp": H2,
        "shared.webp": H1,
        "this-worktree.webp": H3,
      },
      legacy: [],
    });
    assert.equal(result.mode, "git-common");
    assert.equal(result.count, Object.keys(persisted.files).length);
    assert.equal(readdirSync(join(common, "modooilbo-cache")).some((name) => name.endsWith(".lock") || name.endsWith(".tmp")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("non-git discovery falls back to the ignored local cache", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-local-"));
  try {
    const warnings = [];
    const config = discoverR2Cache(root, { onWarning: (message) => warnings.push(message) });
    assert.equal(config.mode, "local");
    assert.equal(config.cachePath, join(root, "scripts", ".r2-synced.json"));
    assert.equal(warnings.length, 1);

    writeJson(config.cachePath, ["old.png"]);
    writeMergedR2Cache(config, { files: { "new.png": H1, "old.png": H2 } }, { onWarning: () => {} });
    assert.deepEqual(JSON.parse(readFileSync(config.cachePath, "utf8")), {
      schemaVersion: 2,
      files: { "new.png": H1, "old.png": H2 },
      legacy: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unwritable common cache falls back without dropping local entries", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-unwritable-"));
  try {
    const blockedCommonDir = join(root, "not-a-directory");
    writeFileSync(blockedCommonDir, "blocked\n", "utf8");
    const config = createR2CacheConfig({ repoRoot: root, gitCommonDir: blockedCommonDir });
    const warnings = [];

    writeJson(config.localCachePath, ["old.webp"]);
    const result = writeMergedR2Cache(config, { files: { "new.webp": H1, "old.webp": H2 } }, {
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(result.mode, "local");
    assert.equal(result.cachePath, config.localCachePath);
    assert.deepEqual(JSON.parse(readFileSync(config.localCachePath, "utf8")), {
      schemaVersion: 2,
      files: { "new.webp": H1, "old.webp": H2 },
      legacy: [],
    });
    assert.equal(warnings.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy names remain explicitly unverified while current replacements are selected", () => {
  const plan = planR2Sync({
    localFiles: {
      "unchanged.webp": H1,
      "replaced.webp": H2,
      "hashed.webp": H3,
      "new.webp": H1,
    },
    cache: {
      files: { "hashed.webp": H3 },
      legacy: ["unchanged.webp", "replaced.webp"],
    },
    changedFiles: ["replaced.webp"],
  });

  assert.deepEqual(plan.candidates, ["new.webp", "replaced.webp"]);
  assert.deepEqual(plan.replacements, ["replaced.webp"]);
  assert.deepEqual(plan.files, {
    "hashed.webp": H3,
  });
  assert.deepEqual(plan.legacy, ["unchanged.webp"]);
});

test("a changed v2 content hash cannot be skipped", () => {
  const plan = planR2Sync({
    localFiles: { "same-name.webp": H2 },
    cache: { files: { "same-name.webp": H1 }, legacy: [] },
  });
  assert.deepEqual(plan.candidates, ["same-name.webp"]);
  assert.deepEqual(plan.replacements, ["same-name.webp"]);
});

test("legacy probing is bounded and same-name replacement requires a URL version bump", () => {
  assert.deepEqual(selectLegacyProbe(["c", "a", "b", "a"], 2), ["a", "b"]);
  assert.doesNotThrow(() => assertStockVersionBump({
    replacements: ["same.webp"],
    previousSource: 'export const STOCK_VERSION = "old"',
    currentSource: 'export const STOCK_VERSION = "new"',
  }));
  assert.throws(() => assertStockVersionBump({
    replacements: ["same.webp"],
    previousSource: 'export const STOCK_VERSION = "same"',
    currentSource: 'export const STOCK_VERSION = "same"',
  }), /STOCK_VERSION 변경/);
  assert.throws(() => assertNoUnversionedStockReplacements({
    replacements: ["body-sub-1.jpg", "hero.jpg"],
    unversionedNames: ["body-sub-1.jpg"],
  }), /새 파일명을 사용/);
});

test("v2 cache persists unverified legacy names instead of claiming a content hash", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-v2-legacy-"));
  try {
    const config = createR2CacheConfig({ repoRoot: root });
    writeMergedR2Cache(config, {
      files: { "verified.webp": H1 },
      legacy: ["pending.webp"],
    });
    assert.deepEqual(readMergedR2Cache(config), {
      files: { "verified.webp": H1 },
      legacy: ["pending.webp"],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a stale cache-hit writer sends only its delta and cannot overwrite a newer same-name hash", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-delta-"));
  try {
    const config = createR2CacheConfig({ repoRoot: root });
    writeJson(config.cachePath, { schemaVersion: 2, files: { "shared.webp": H2 }, legacy: [] });
    const result = writeMergedR2Cache(
      config,
      { files: { "unrelated.webp": H3 }, legacy: [] },
      { expectedFiles: { "unrelated.webp": null } },
    );
    assert.deepEqual(result.conflicts, []);
    assert.deepEqual(readMergedR2Cache(config), {
      files: { "shared.webp": H2, "unrelated.webp": H3 },
      legacy: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("same-name cache CAS conflict drops the disputed hash back to unverified", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-cas-"));
  try {
    const config = createR2CacheConfig({ repoRoot: root });
    writeJson(config.cachePath, { schemaVersion: 2, files: { "shared.webp": H2 }, legacy: [] });
    const result = writeMergedR2Cache(
      config,
      { files: { "shared.webp": H3 }, legacy: [] },
      { expectedFiles: { "shared.webp": H1 } },
    );
    assert.deepEqual(result.conflicts, ["shared.webp"]);
    assert.deepEqual(readMergedR2Cache(config), {
      files: {},
      legacy: ["shared.webp"],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("R2 sync lease rejects concurrent processes and releases cleanly", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-lease-"));
  try {
    const config = createR2CacheConfig({ repoRoot: root });
    const release = acquireR2SyncLease(config);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    utimesSync(`${config.cachePath}.sync.lock`, yesterday, yesterday);
    assert.throws(() => acquireR2SyncLease(config), /다른 R2 동기화/);
    release();
    assert.doesNotThrow(() => acquireR2SyncLease(config)());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("R2 sync lease recovers a dead owner and never releases a replacement owner", () => {
  const root = mkdtempSync(join(tmpdir(), "modoo-r2-lease-recovery-"));
  try {
    const config = createR2CacheConfig({ repoRoot: root });
    mkdirSync(dirname(config.cachePath), { recursive: true });
    const lock = `${config.cachePath}.sync.lock`;
    const pid = Number(execFileSync(process.execPath, ["-e", "console.log(process.pid)"], { encoding: "utf8" }).trim());
    writeFileSync(lock, JSON.stringify({ pid, host: hostname(), token: "dead-owner" }));
    const release = acquireR2SyncLease(config);
    const replacement = JSON.stringify({ pid: process.pid, host: hostname(), token: "replacement-owner" });
    writeFileSync(lock, replacement);
    release();
    assert.equal(readFileSync(lock, "utf8"), replacement);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
