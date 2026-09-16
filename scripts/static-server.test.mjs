import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function serve(t) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'modoo-static-server-'));
  fs.mkdirSync(path.join(scratch, 'out'));
  fs.writeFileSync(path.join(scratch, 'out/index.html'), 'fixture home');
  fs.writeFileSync(path.join(scratch, 'out/404.html'), 'fixture missing');
  fs.writeFileSync(path.join(scratch, 'private.txt'), 'must not be served');
  fs.symlinkSync(path.join(scratch, 'private.txt'), path.join(scratch, 'out/link.txt'));
  const proc = spawn(process.execPath, [path.join(root, 'scripts/static-server.mjs')], {
    cwd: scratch, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (proc.exitCode === null) { const exited = once(proc, 'exit'); proc.kill(); await exited; }
    fs.rmSync(scratch, { recursive: true, force: true });
  });
  // The server must report its actual ephemeral port, not the requested zero.
  const ready = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('static server startup timeout')), 5_000);
    proc.once('error', (error) => { clearTimeout(timeout); reject(error); });
    proc.stdout.on('data', (chunk) => {
      const match = String(chunk).match(/http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
  });
  assert.ok(ready > 0, 'report the actual listening port');
  return `http://127.0.0.1:${ready}`;
}

test('static preview rejects malformed URL encoding without crashing', async (t) => {
  const base = await serve(t);
  const bad = await fetch(`${base}/%E0%A4%A`);
  assert.equal(bad.status, 400);
  assert.equal(await (await fetch(base)).text(), 'fixture home');
});

test('static preview never follows exported symlinks outside the output root', async (t) => {
  const base = await serve(t);
  const response = await fetch(`${base}/link.txt`);
  assert.equal(response.status, 404);
  assert.equal(await response.text(), 'fixture missing');
});
