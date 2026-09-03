#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  createR2CacheConfig,
  discoverR2Cache,
  readMergedR2Cache,
  writeMergedR2Cache,
} from "./r2-sync-cache.mjs";

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
    assert.deepEqual(snapshot, ["duplicate.webp", "local.webp", "main.webp", "shared.webp"]);
    assert.equal(warnings.length, 1);

    // 다른 worktree가 snapshot 이후 먼저 기록한 상황을 재현한다.
    writeJson(config.cachePath, ["shared.webp", "other-worktree.webp"]);
    const result = writeMergedR2Cache(config, [...snapshot, "this-worktree.webp"], options);
    const persisted = JSON.parse(readFileSync(config.cachePath, "utf8"));

    assert.deepEqual(persisted, [
      "duplicate.webp",
      "local.webp",
      "main.webp",
      "other-worktree.webp",
      "shared.webp",
      "this-worktree.webp",
    ]);
    assert.equal(result.mode, "git-common");
    assert.equal(result.count, persisted.length);
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
    writeMergedR2Cache(config, ["new.png"], { onWarning: () => {} });
    assert.deepEqual(JSON.parse(readFileSync(config.cachePath, "utf8")), ["new.png", "old.png"]);
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
    const result = writeMergedR2Cache(config, ["new.webp"], {
      onWarning: (message) => warnings.push(message),
    });

    assert.equal(result.mode, "local");
    assert.equal(result.cachePath, config.localCachePath);
    assert.deepEqual(JSON.parse(readFileSync(config.localCachePath, "utf8")), ["new.webp", "old.webp"]);
    assert.equal(warnings.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
