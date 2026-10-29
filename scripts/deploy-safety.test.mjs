#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { spawnSync } from "node:child_process";
import { assertProductionRemoteMatch, parseRemoteBranchHead, r2SyncArgs } from "./deploy-safety.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
test('deploy CLI without selected manifest fails before Git, build or remote calls',()=>{
  const r=spawnSync(process.execPath,[new URL('./deploy.mjs',import.meta.url).pathname,'preview'],{encoding:'utf8',timeout:5000,env:{PATH:'/nonexistent'}});
  assert.equal(r.status,1);assert.match(r.stderr,/r2-selected-manifest/);assert.doesNotMatch(r.stderr,/spawnSync git|npm run build|ENOENT/);
});
test('sealed artifact promotion branches before all build and R2 work',()=>{
  const s=readFileSync(new URL('./deploy.mjs',import.meta.url),'utf8');const branch=s.slice(s.indexOf('if (reuseArtifactId) {',s.indexOf('let stockRollback')),s.indexOf('// functions/는 next build'));
  assert.match(branch,/verifyReleaseArtifact/);assert.match(branch,/else \{/);assert.doesNotMatch(branch,/r2SyncArgs\(|execFileSync\(/);
});

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

test("Preview and Production require pinned selected-new-image manifests without legacy fallback", () => {
  const selectedManifest='/synthetic/assets.json',selectedManifestSHA256='c'.repeat(64);
  for(const isProd of [false,true]) {
    assert.throws(()=>r2SyncArgs('sync-stock-r2.mjs',{isProd}),/manifest/);
    assert.deepEqual(r2SyncArgs('sync-stock-r2.mjs',{isProd,selectedManifest,selectedManifestSHA256,targetRevision:A}),[
      'sync-stock-r2.mjs','--selected-manifest',selectedManifest,'--selected-manifest-sha256',selectedManifestSHA256,'--target-revision',A,...(isProd?[]:['--preview'])]);
    assert.throws(()=>r2SyncArgs('x',{isProd,selectedManifest,selectedManifestSHA256:'bad'}));
    assert.throws(()=>r2SyncArgs('x',{isProd,selectedManifest,selectedManifestSHA256,targetRevision:'bad'}));
  }
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
