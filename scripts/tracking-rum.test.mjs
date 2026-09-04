#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateRumRows,
  classifyRumReferer,
} from "./lib/tracking-rum.mjs";

test("referer classification keeps internal navigation separate", () => {
  assert.equal(classifyRumReferer(""), "direct");
  assert.equal(classifyRumReferer("m.search.naver.com"), "naver");
  assert.equal(classifyRumReferer("www.modooilbo.com"), "internal");
  assert.equal(classifyRumReferer("modooilbo.com"), "internal");
  assert.equal(classifyRumReferer("example.com"), "other");
});

test("external visit total excludes self-referrer rows but keeps all RUM pageloads", () => {
  const result = aggregateRumRows([
    { count: 10, sum: { visits: 7 }, dimensions: { refererHost: "modooilbo.com" } },
    { count: 5, sum: { visits: 4 }, dimensions: { refererHost: "www.modooilbo.com" } },
    { count: 3, sum: { visits: 3 }, dimensions: { refererHost: "m.search.naver.com" } },
    { count: 2, sum: { visits: 2 }, dimensions: { refererHost: "" } },
    { count: 1, sum: { visits: 1 }, dimensions: { refererHost: "example.com" } },
  ]);

  assert.equal(result.pageloads, 21);
  assert.equal(result.visits, 6);
  assert.deepEqual(result.bySource, {
    naver: 3,
    google: 0,
    daum: 0,
    bing: 0,
    direct: 2,
    other: 1,
  });
});
