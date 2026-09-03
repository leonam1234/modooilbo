import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  RELEASE_MAX_AGE_MS,
  recordReleaseDeployment,
  sealReleaseArtifact,
  verifyReleaseArtifact,
} from "./release-artifact.mjs";

const COMMIT = "a".repeat(40);
const NOW = new Date("2026-09-03T03:00:00.000Z");

function put(root, path, body) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
}

function fixture(root) {
  put(root, "index.html", "<!doctype html><title>home</title>");
  put(root, "404.html", "<!doctype html><title>404</title>");
  put(root, "_headers", "/*\n  X-Content-Type-Options: nosniff\n");
  put(root, "_redirects", "/old /new 301\n");
  put(root, "_next/static/chunks/app.js", "console.log('sealed');\n");
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), "modoo-release-test-"));
  const sourceDir = join(root, "out");
  const releaseRoot = join(root, "releases");
  fixture(sourceDir);
  const release = sealReleaseArtifact({
    sourceDir,
    releaseRoot,
    project: "modooilbo",
    commit: COMMIT,
    branch: "codex/release",
    commitMessage: "test",
    wranglerVersion: "4.105.0",
    stockRollback: false,
    now: NOW,
  });
  return { root, sourceDir, releaseRoot, release };
}

test("a sealed Preview artifact verifies and keeps the exact file hash", () => {
  const context = setup();
  try {
    assert.throws(() => verifyReleaseArtifact({
      releaseRoot: context.releaseRoot,
      releaseId: context.release.releaseId,
      expectedProject: "modooilbo",
      expectedCommit: COMMIT,
      expectedWranglerVersion: "4.105.0",
      now: NOW,
    }), /Preview deployment receipt/);
    recordReleaseDeployment({
      releaseRoot: context.releaseRoot,
      releaseId: context.release.releaseId,
      env: "preview",
      url: "https://example.modooilbo.pages.dev",
      branch: "codex-release",
      commit: COMMIT,
      artifactHash: context.release.manifest.seal.artifactHash,
      now: NOW,
    });
    const verified = verifyReleaseArtifact({
      releaseRoot: context.releaseRoot,
      releaseId: context.release.releaseId,
      expectedProject: "modooilbo",
      expectedCommit: COMMIT,
      expectedWranglerVersion: "4.105.0",
      now: new Date(NOW.getTime() + 60_000),
    });
    assert.equal(verified.actual.artifactHash, context.release.manifest.seal.artifactHash);
  } finally {
    rmSync(context.root, { recursive: true, force: true });
  }
});

test("tampered, stale, wrong-HEAD, and wrong-Wrangler artifacts stop", () => {
  const context = setup();
  try {
    const base = {
      releaseRoot: context.releaseRoot,
      releaseId: context.release.releaseId,
      expectedProject: "modooilbo",
      expectedCommit: COMMIT,
      expectedWranglerVersion: "4.105.0",
      requirePreview: false,
      now: NOW,
    };
    assert.throws(() => verifyReleaseArtifact({ ...base, expectedCommit: "b".repeat(40) }), /HEAD mismatch/);
    assert.throws(() => verifyReleaseArtifact({ ...base, expectedWranglerVersion: "4.106.0" }), /Wrangler version mismatch/);
    assert.throws(() => verifyReleaseArtifact({ ...base, now: new Date(NOW.getTime() + RELEASE_MAX_AGE_MS + 1) }), /stale/);
    put(context.release.artifactDir, "index.html", "changed");
    assert.throws(() => verifyReleaseArtifact(base), /mismatch/);
  } finally {
    rmSync(context.root, { recursive: true, force: true });
  }
});

test("manifest seal corruption and incomplete artifacts stop", () => {
  const context = setup();
  try {
    const manifest = JSON.parse(readFileSync(context.release.manifestPath, "utf8"));
    manifest.seal.commit = "b".repeat(40);
    writeFileSync(context.release.manifestPath, JSON.stringify(manifest));
    assert.throws(() => verifyReleaseArtifact({
      releaseRoot: context.releaseRoot,
      releaseId: context.release.releaseId,
      expectedProject: "modooilbo",
      expectedCommit: COMMIT,
      expectedWranglerVersion: "4.105.0",
      requirePreview: false,
      now: NOW,
    }), /seal hash mismatch/);

    const incomplete = join(context.root, "incomplete");
    mkdirSync(incomplete);
    assert.throws(() => sealReleaseArtifact({
      sourceDir: incomplete,
      releaseRoot: context.releaseRoot,
      project: "modooilbo",
      commit: COMMIT,
      branch: "codex/release",
      commitMessage: "test",
      wranglerVersion: "4.105.0",
      stockRollback: false,
      now: NOW,
    }), /incomplete artifact/);
  } finally {
    rmSync(context.root, { recursive: true, force: true });
  }
});
