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
    parseSmokeCli(["https://example.com", "/", "/login"], {}, 4),
    {
      base: "https://example.com",
      pages: ["/", "/login"],
      concurrency: 2,
    },
  );
});

test("serial flag and environment escape hatches force one environment", () => {
  assert.equal(
    parseSmokeCli(["https://example.com", "--serial", "/"], { SMOKE_CONCURRENCY: "4" }, 4).concurrency,
    1,
  );
  assert.equal(
    parseSmokeCli(["https://example.com"], { SMOKE_SERIAL: "true", SMOKE_CONCURRENCY: "3" }, 4).concurrency,
    1,
  );
  assert.equal(
    parseSmokeCli(["https://example.com", "--concurrency=1"], {}, 4).concurrency,
    1,
  );
});

test("CLI concurrency wins over the environment and never exceeds the matrix", () => {
  assert.equal(
    parseSmokeCli(["https://example.com", "--concurrency", "3"], { SMOKE_CONCURRENCY: "1" }, 4).concurrency,
    3,
  );
  assert.equal(
    parseSmokeCli(["https://example.com", "--concurrency=99"], {}, 4).concurrency,
    4,
  );
  assert.throws(
    () => parseSmokeCli(["https://example.com", "--concurrency=0"], {}, 4),
    /1 이상의 정수/,
  );
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
