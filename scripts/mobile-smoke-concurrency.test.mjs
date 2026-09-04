#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SMOKE_CONCURRENCY,
  mapWithConcurrency,
  parseSmokeCli,
} from "./mobile-smoke-concurrency.mjs";

test("CLI remains compatible and defaults to bounded parallel environments", () => {
  assert.equal(DEFAULT_SMOKE_CONCURRENCY, 2);
  assert.deepEqual(
    parseSmokeCli(["https://preview.modooilbo.pages.dev", "/", "/login"], {}, 4),
    {
      base: "https://preview.modooilbo.pages.dev",
      pages: ["/", "/login"],
      concurrency: 2,
    },
  );
});

test("serial flag and environment escape hatches force one environment", () => {
  assert.equal(
    parseSmokeCli(["https://preview.modooilbo.pages.dev", "--serial", "/"], { SMOKE_CONCURRENCY: "4" }, 4).concurrency,
    1,
  );
  assert.equal(
    parseSmokeCli(["https://preview.modooilbo.pages.dev"], { SMOKE_SERIAL: "true", SMOKE_CONCURRENCY: "3" }, 4).concurrency,
    1,
  );
  assert.equal(
    parseSmokeCli(["https://preview.modooilbo.pages.dev", "--concurrency=1"], {}, 4).concurrency,
    1,
  );
});

test("CLI concurrency wins over the environment and never exceeds the matrix", () => {
  assert.equal(
    parseSmokeCli(["https://preview.modooilbo.pages.dev", "--concurrency", "3"], { SMOKE_CONCURRENCY: "1" }, 4).concurrency,
    3,
  );
  assert.equal(
    parseSmokeCli(["https://preview.modooilbo.pages.dev", "--concurrency=99"], {}, 4).concurrency,
    4,
  );
  assert.throws(
    () => parseSmokeCli(["https://preview.modooilbo.pages.dev", "--concurrency=0"], {}, 4),
    /1 이상의 정수/,
  );
});

test("CLI rejects the Modooilbo production host and unrelated external hosts", () => {
  assert.throws(
    () => parseSmokeCli(["https://modooilbo.com", "/"], {}, 4),
    /운영 도메인을 사용할 수 없습니다/,
  );
  assert.throws(
    () => parseSmokeCli(["https://example.com", "/"], {}, 4),
    /modooilbo\.pages\.dev 또는 loopback/,
  );
  assert.throws(
    () => parseSmokeCli(["https://other-project.pages.dev", "/"], {}, 4),
    /modooilbo\.pages\.dev 또는 loopback/,
  );
});

test("CLI accepts only same-origin slash paths", () => {
  const base = "http://localhost:3000";
  assert.deepEqual(parseSmokeCli([base, "/article/a?q=1#top"], {}, 4).pages, [
    "/article/a?q=1#top",
  ]);
  for (const path of [
    "article/a",
    "//169.254.169.254/latest/meta-data/",
    "@169.254.169.254/latest/meta-data/",
    "https://modooilbo.com/",
  ]) {
    assert.throws(() => parseSmokeCli([base, path], {}, 4), /검사 경로/);
  }
});

test("bounded mapper caps active work and keeps result order", async () => {
  let active = 0;
  let maxActive = 0;
  const inputs = [30, 5, 20, 10, 15];
  const results = await mapWithConcurrency(inputs, 2, async (delay, index) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return `${index}:${delay}`;
  });

  assert.equal(maxActive, 2);
  assert.deepEqual(results, ["0:30", "1:5", "2:20", "3:10", "4:15"]);
});

test("bounded mapper reports the lowest-index failure after workers settle", async () => {
  const visited = [];
  await assert.rejects(
    mapWithConcurrency([0, 1, 2, 3], 2, async (value) => {
      visited.push(value);
      if (value === 2) throw new Error("index-two");
      if (value === 3) throw new Error("index-three");
      return value;
    }),
    /index-two/,
  );
  assert.deepEqual([...visited].sort(), [0, 1, 2, 3]);
});
