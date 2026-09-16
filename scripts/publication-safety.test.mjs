import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Run the real builder in isolation: no production articles, network, or generated files.
function buildFixture(fields) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'modoo-publication-safety-'));
  try {
    for (const dir of ['scripts/lib', 'src/lib', 'content/articles']) {
      fs.mkdirSync(path.join(scratch, dir), { recursive: true });
    }
    fs.copyFileSync(path.join(root, 'scripts/build-content.mjs'), path.join(scratch, 'scripts/build-content.mjs'));
    fs.cpSync(path.join(root, 'scripts/lib'), path.join(scratch, 'scripts/lib'), { recursive: true });
    fs.writeFileSync(path.join(scratch, 'src/lib/reporters.ts'), 'export const reporters = [];');
    fs.writeFileSync(path.join(scratch, 'content/articles/2026-08-01-safety-fixture.md'),
      `---\ntitle: 출고 안전장치 검증\ncategory: society\nauthor: 테스트 / 기자\nimage: /stock/test.jpg\nsummary: 발행 보류가 최종 빌드에서도 차단되는지 검증한다.\n${fields}\n---\n\n독자에게 전달할 기사 본문이다.\n`);
    const result = spawnSync(process.execPath, ['scripts/build-content.mjs'], {
      cwd: scratch, encoding: 'utf8', timeout: 15_000,
    });
    return {
      status: result.status, output: result.stdout + result.stderr,
      generated: fs.existsSync(path.join(scratch, 'src/lib/content.generated.ts')),
    };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

test('builder rejects HOLD and WAIT_SOURCE even when publication metadata otherwise passes', () => {
  for (const status of ['HOLD', 'hold', 'HOLD_SOURCE', 'HOLD_AUTH', 'WAIT_SOURCE_AUTH', 'WAIT_SOURCE', 'WAIT_SOURCE_UNTIL: 2026-10-01', 'WAIT_AUTH', 'HOLD — 재확인 필요', '발행보류']) {
    const result = buildFixture(`publishedAt: 2026-08-01 09:00\nstatus: ${status}`);
    assert.equal(result.status, 1, `${status}: ${result.output}`);
    assert.equal(result.generated, false);
    assert.match(result.output, /status|보류/);
  }
});

test('an explicitly blank publishedAt must not fall back to the article date', () => {
  const result = buildFixture('publishedAt:\ndate: 2026-08-01');
  assert.equal(result.status, 1, result.output);
  assert.equal(result.generated, false);
  assert.match(result.output, /publishedAt/);
});

test('a missing publication timestamp must not become the current build time', () => {
  const result = buildFixture('');
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /publishedAt|발행시각/);
});

test('date alone cannot replace a missing publishedAt', () => {
  const result = buildFixture('date: 2026-08-01');
  assert.equal(result.status, 1, result.output);
  assert.equal(result.generated, false);
  assert.match(result.output, /publishedAt/);
});

test('explicit publication time and released status remain buildable', () => {
  const result = buildFixture('publishedAt: 2026-08-01 09:00\nstatus: 인증전보관');
  assert.equal(result.status, 0, result.output);
  assert.equal(result.generated, true);
});
