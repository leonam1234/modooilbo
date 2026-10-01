#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { assertProductionRemoteMatch, parseRemoteBranchHead, r2SyncArgs } from "./deploy-safety.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);

test("remote branch parser selects the exact production ref", () => {
  assert.equal(
    parseRemoteBranchHead(`${B}\trefs/heads/feature\n${A}\trefs/heads/master\n`),
    A,
  );
  assert.throws(() => parseRemoteBranchHead(`${A}\trefs/heads/master-old\n`), /확인할 수 없습니다/);
});

test("production requires local, fetched tracking, and fresh remote heads to match", () => {
  assert.equal(assertProductionRemoteMatch({ localHead: A, trackingHead: A, remoteHead: A }), A);
  assert.throws(
    () => assertProductionRemoteMatch({ localHead: A, trackingHead: B, remoteHead: A }),
    /SHA 불일치/,
  );
  assert.throws(
    () => assertProductionRemoteMatch({ localHead: A, trackingHead: A, remoteHead: "not-a-sha" }),
    /유효하지 않은 remoteHead/,
  );
});

test("Preview explicitly enables the no-overwrite R2 mode", () => {
  assert.deepEqual(r2SyncArgs("sync-stock-r2.mjs", { isProd: false }), [
    "sync-stock-r2.mjs",
    "--preview",
  ]);
  assert.deepEqual(r2SyncArgs("sync-stock-r2.mjs", { isProd: true }), ["sync-stock-r2.mjs"]);
});

test("skip-indexnow never bypasses the immediate pre-deploy remote SHA gate", () => {
  const source = readFileSync(new URL("./deploy.mjs", import.meta.url), "utf8");
  const gate = source.split("// 3) 배포")[1].split("const deployArgs")[0];
  assert.match(gate, /if \(isProd\) \{[\s\S]*verifyProductionRemoteHead\(commit\)/);
  assert.doesNotMatch(gate, /skipIndexNow/);
});

test("post-deploy IndexNow is skipped on explicit opt-out without changing the default", () => {
  const source = readFileSync(new URL("./deploy.mjs", import.meta.url), "utf8");
  const notification = source.slice(source.indexOf("// 프로덕션 배포 후 IndexNow"));
  for (const [isProd, skipIndexNow, expected] of [[true, true, 0], [true, false, 1], [false, false, 0], [false, true, 0]]) {
    let requests = 0;
    runInNewContext(notification, {
      isProd, skipIndexNow, REPO: "/repo", join: (...parts) => parts.join("/"),
      execFileSync: () => { requests++; }, console: { log() {}, warn() {} },
    });
    assert.equal(requests, expected);
  }
});
