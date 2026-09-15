import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(path.join(tmpdir(), "modoo-api-body-"));
process.on("exit", () => rmSync(outDir, { recursive: true, force: true }));

execFileSync(
  path.join(repo, "node_modules", ".bin", "tsc"),
  [
    "-p",
    path.join(repo, "tsconfig.functions.json"),
    "--noEmit",
    "false",
    "--outDir",
    outDir,
    "--module",
    "commonjs",
    "--moduleResolution",
    "node",
    "--resolveJsonModule",
    "true",
  ],
  { cwd: repo, stdio: "pipe" },
);

const require = createRequire(import.meta.url);
const { readJsonObject } = require(path.join(outDir, "functions", "_lib", "request-body.js"));
const { onRequestPost: inquiryPost } = require(path.join(outDir, "functions", "api", "inquiry.js"));
const { onRequestPost: loginPost } = require(path.join(outDir, "functions", "api", "auth", "login.js"));
const { onRequestPost: updateNamePost } = require(path.join(outDir, "functions", "api", "auth", "update-name.js"));
const { hashPassword } = require(path.join(outDir, "functions", "_lib", "auth.js"));

test("readJsonObject accepts JSON from application/json and text/plain", async () => {
  for (const contentType of ["application/json", "text/plain;charset=UTF-8"]) {
    const result = await readJsonObject(
      new Request("https://example.test/api", {
        method: "POST",
        headers: { "content-type": contentType },
        body: JSON.stringify({ value: "ok" }),
      }),
    );
    assert.deepEqual(result, { ok: true, value: { value: "ok" } });
  }
});

test("readJsonObject rejects malformed JSON, null, arrays and primitives", async () => {
  for (const body of ["{", "null", "[]", "true", "1", '"text"']) {
    const result = await readJsonObject(
      new Request("https://example.test/api", { method: "POST", body }),
    );
    assert.deepEqual(result, { ok: false, status: 400 });
  }
});

test("readJsonObject rejects an oversized streamed body", async () => {
  const body = JSON.stringify({ value: "x".repeat(70 * 1024) });
  const result = await readJsonObject(
    new Request("https://example.test/api", { method: "POST", body }),
  );
  assert.deepEqual(result, { ok: false, status: 413 });
});

test("oversized response does not wait for a stalled stream cancel", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(70 * 1024));
    },
    cancel() {
      cancelled = true;
      return new Promise(() => {});
    },
  });
  const result = await Promise.race([
    readJsonObject(new Request("https://example.test/api", { method: "POST", body: stream, duplex: "half" })),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 100)),
  ]);
  assert.deepEqual(result, { ok: false, status: 413 });
  assert.equal(cancelled, true);
});

function inquiryContext(body) {
  let dbCalls = 0;
  const env = {
    DB: {
      prepare() {
        dbCalls++;
        throw new Error("D1 must not be reached for rejected bodies");
      },
    },
  };
  return {
    context: {
      env,
      request: new Request("https://modooilbo.com/api/inquiry", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body,
      }),
      waitUntil() {},
    },
    dbCalls: () => dbCalls,
  };
}

test("inquiry rejects invalid shapes before any D1 call", async () => {
  for (const body of ["{", "null", "[]", JSON.stringify({ kind: "constructor", body: "x", agree: true })]) {
    const fixture = inquiryContext(body);
    const response = await inquiryPost(fixture.context);
    assert.equal(response.status, 400);
    assert.equal(fixture.dbCalls(), 0);
  }
});

test("inquiry rejects an oversized body with 413 before any D1 call", async () => {
  const fixture = inquiryContext(JSON.stringify({ kind: "tip", body: "x".repeat(70 * 1024), agree: true }));
  const response = await inquiryPost(fixture.context);
  assert.equal(response.status, 413);
  assert.equal(fixture.dbCalls(), 0);
});

test("inquiry keeps accepting a valid text/plain JSON body", async () => {
  let dbCalls = 0;
  const statement = {
    bind() {
      return this;
    },
    async first() {
      return { n: 2 };
    },
    async run() {
      return { meta: { changes: 1 } };
    },
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await inquiryPost({
      env: {
        DB: {
          prepare() {
            dbCalls++;
            return statement;
          },
        },
      },
      request: new Request("https://modooilbo.com/api/inquiry", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ kind: "tip", body: "제보 내용", agree: true }),
      }),
      waitUntil() {},
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.equal(dbCalls, 2);
  } finally {
    console.error = originalError;
  }
});

async function savedInquiry(payload) {
  let inserted = null;
  const env = {
    DB: {
      prepare(sql) {
        return {
          args: [],
          bind(...args) {
            this.args = args;
            return this;
          },
          async first() {
            return { n: 2 };
          },
          async run() {
            if (sql.includes("INSERT INTO inquiries")) inserted = this.args;
            return { meta: { changes: 1 } };
          },
        };
      },
    },
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await inquiryPost({
      env,
      request: new Request("https://modooilbo.com/api/inquiry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "192.0.2.50",
          "user-agent": "Reader Browser/1.0",
        },
        body: JSON.stringify(payload),
      }),
      waitUntil() {},
    });
    assert.equal(response.status, 200);
    assert.ok(inserted);
    return inserted;
  } finally {
    console.error = originalError;
  }
}

test("anonymous tips do not persist server-added identifying metadata", async () => {
  const values = await savedInquiry({
    kind: "tip",
    category: "공익제보",
    title: "제목",
    body: "본문",
    anonymous: true,
    name: "숨길 이름",
    email: "hide@example.com",
    phone: "010-0000-0000",
    attachmentName: "identity.pdf",
    agree: true,
  });
  assert.deepEqual(values.slice(5), [null, null, null, null, null, null]);
});

test("non-anonymous inquiries keep their submitted and server metadata", async () => {
  const values = await savedInquiry({
    kind: "tip",
    category: "공익제보",
    title: "제목",
    body: "본문",
    anonymous: false,
    name: "제보자",
    email: "reader@example.com",
    phone: "010-0000-0000",
    attachmentName: "evidence.pdf",
    agree: true,
  });
  assert.deepEqual(values.slice(5), [
    "제보자",
    "reader@example.com",
    "010-0000-0000",
    "evidence.pdf",
    "192.0.2.50",
    "Reader Browser/1.0",
  ]);
});

function authDb(user) {
  let writes = 0;
  const makeStatement = (sql) => ({
    sql,
    args: [],
    bind(...args) {
      this.args = args;
      return this;
    },
    async first() {
      if (sql.includes("INSERT INTO rate_limits")) return { n: 2 };
      if (sql.includes("FROM sessions s JOIN users u")) return user;
      if (sql.includes("password_hash, password_salt FROM users")) return user;
      if (sql.includes("SELECT 1 FROM users WHERE lower(name)")) return null;
      return null;
    },
    async run() {
      if (/^(INSERT|UPDATE|DELETE)/.test(sql.trim())) writes++;
      return { meta: { changes: 1 }, results: [] };
    },
  });
  return {
    DB: {
      prepare: makeStatement,
      async batch(statements) {
        return Promise.all(statements.map((statement) => statement.run()));
      },
    },
    writes: () => writes,
  };
}

test("bounded parser preserves a successful email login", async () => {
  const salt = "11111111111111111111111111111111";
  const { hash } = await hashPassword("correct-password", salt);
  const user = {
    id: "user-1",
    email: "reader@example.com",
    name: "독자",
    password_hash: hash,
    password_salt: salt,
  };
  const fixture = authDb(user);
  const response = await loginPost({
    env: { DB: fixture.DB },
    request: new Request("https://modooilbo.com/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "correct-password" }),
    }),
    waitUntil() {},
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /^modoo_session=[a-f0-9]{64};/);
});

test("bounded parser preserves an authenticated nickname update", async () => {
  const user = { id: "user-1", email: "reader@example.com", name: "이전이름" };
  const fixture = authDb(user);
  const response = await updateNamePost({
    env: { DB: fixture.DB },
    request: new Request("https://modooilbo.com/api/auth/update-name", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `modoo_session=${"a".repeat(64)}`,
      },
      body: JSON.stringify({ name: "새이름" }),
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: { name: "새이름", email: user.email } });
  assert.equal(fixture.writes(), 1);
});
