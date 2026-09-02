#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "out");
const START = "<!--email_off-->";
const END = "<!--/email_off-->";
const PROTECTED_BLOCK = /<!--email_off-->[\s\S]*?<!--\/email_off-->/gi;
const FIRST_PARTY_EMAIL = /[A-Z0-9._%+-]+@modooilbo\.com/gi;
const REQUIRE = createRequire(import.meta.url);

async function loadPlainEmailModule() {
  const filename = join(ROOT, "src/components/PlainEmail.tsx");
  const source = await readFile(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  const execute = new Function("require", "module", "exports", compiled);
  execute(REQUIRE, loaded, loaded.exports);
  return loaded.exports;
}

const plainEmailModule = await loadPlainEmailModule();
const PUBLIC_EMAIL_SET = new Set(Object.values(plainEmailModule.PUBLIC_EMAILS));

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** Cloudflare가 검사하지 않는 head/script 계열은 공개 본문 검사에서 제외한다. */
function transformableBody(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<(?:noscript|textarea|xmp)\b[^>]*>[\s\S]*?<\/(?:noscript|textarea|xmp)>/gi, "");
}

function validateHtml(html, name) {
  const errors = [];
  const body = transformableBody(html);
  const starts = count(body, START);
  const ends = count(body, END);
  const blocks = body.match(PROTECTED_BLOCK) ?? [];
  let protectedLinks = 0;
  let protectedTexts = 0;

  if (starts !== ends || blocks.length !== starts) {
    errors.push(`${name}: unbalanced or nested email_off comments (start=${starts}, end=${ends}, blocks=${blocks.length})`);
    return { errors, protectedLinks, protectedTexts, thirdPartyTexts: 0 };
  }

  for (const block of blocks) {
    if (/mailto:/i.test(block)) {
      const anchors = block.match(/<a\b/gi)?.length ?? 0;
      const closes = block.match(/<\/a>/gi)?.length ?? 0;
      const fullAnchor = /^<!--email_off--><a\b(?=[^>]*\bhref="mailto:)[^>]*>[\s\S]*<\/a><!--\/email_off-->$/i.test(block);
      if (!fullAnchor || anchors !== 1 || closes !== 1) {
        errors.push(`${name}: mailto anchor is not wholly enclosed by one email_off range`);
      }
      protectedLinks += 1;
    } else {
      protectedTexts += 1;
    }
  }

  const outside = body.replace(PROTECTED_BLOCK, "");
  if (/href\s*=\s*["']mailto:/i.test(outside)) {
    errors.push(`${name}: unprotected mailto href remains in transformable body HTML`);
  }
  if (/\/cdn-cgi\/l\/email-protection/i.test(outside)) {
    errors.push(`${name}: Cloudflare email-protection URL is baked into exported HTML`);
  }

  // 태그 속성의 placeholder 등은 Cloudflare 변환 대상이 아니다. 텍스트 노드만 검사한다.
  const textNodes = outside.replace(/<!--[^]*?-->/g, "").replace(/<[^>]*>/g, " ");
  const firstParty = textNodes.match(FIRST_PARTY_EMAIL) ?? [];
  if (firstParty.length > 0) {
    errors.push(`${name}: unprotected first-party email text: ${[...new Set(firstParty)].join(", ")}`);
  }
  // 태그·주석 경계를 없앤 실제 표시 문자열도 확인한다. 부분문자열 매치 결함은
  // `private<span><!--email_off-->help@...`처럼 보호 블록 양쪽으로 토큰을 쪼갠다.
  const visibleText = body.replace(/<!--[^]*?-->/g, "").replace(/<[^>]*>/g, "");
  const lookalikes = (visibleText.match(FIRST_PARTY_EMAIL) ?? [])
    .filter((address) => !PUBLIC_EMAIL_SET.has(address.toLowerCase()));
  if (lookalikes.length > 0) {
    errors.push(`${name}: non-allowlisted first-party token crossed an email_off boundary: ${[...new Set(lookalikes)].join(", ")}`);
  }
  // 기사에 인용된 제3자 접수 주소는 Cloudflare 보호 대상으로 남긴다.
  const thirdPartyTexts = (textNodes.match(/[A-Z0-9._%+-]+@(?!modooilbo\.com)[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).length;

  return { errors, protectedLinks, protectedTexts, thirdPartyTexts };
}

test("validator requires the literal comments to enclose the full anchor", () => {
  const valid = validateHtml(
    '<body><!--email_off--><a href="mailto:help@modooilbo.com">help@modooilbo.com</a><!--/email_off--><p><!--email_off-->help@modooilbo.com<!--/email_off--></p><p>official@example.go.kr</p></body>',
    "valid.html",
  );
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.protectedLinks, 1);
  assert.equal(valid.protectedTexts, 1);
  assert.equal(valid.thirdPartyTexts, 1);

  const textOnly = validateHtml(
    '<body><a href="mailto:help@modooilbo.com"><span><!--email_off-->help@modooilbo.com<!--/email_off--></span></a></body>',
    "text-only.html",
  );
  assert.match(textOnly.errors.join("\n"), /unprotected mailto href/);

  const unknownFirstParty = validateHtml(
    "<body><p>new-contact@modooilbo.com</p></body>",
    "unknown.html",
  );
  assert.match(unknownFirstParty.errors.join("\n"), /unprotected first-party email text/);

  const splitLookalikes = validateHtml(
    "<body><p>private<span><!--email_off-->help@modooilbo.com<!--/email_off--></span> / x<span><!--email_off-->newsroom@modooilbo.com<!--/email_off--></span></p></body>",
    "split-lookalikes.html",
  );
  assert.match(splitLookalikes.errors.join("\n"), /privatehelp@modooilbo\.com/);
  assert.match(splitLookalikes.errors.join("\n"), /xnewsroom@modooilbo\.com/);
});

test("PlainEmailText bypasses only complete allowlisted email tokens", () => {
  const text = "privatehelp@modooilbo.com / xnewsroom@modooilbo.com / help@modooilbo.com";
  const html = renderToStaticMarkup(
    createElement(plainEmailModule.PlainEmailText, { text }),
  );

  assert.match(html, /privatehelp@modooilbo\.com/);
  assert.match(html, /xnewsroom@modooilbo\.com/);
  assert.equal(count(html, START), 1);
  assert.equal(count(html, END), 1);
  assert.match(html, /<!--email_off-->help@modooilbo\.com<!--\/email_off-->/);
  assert.doesNotMatch(html, /<!--email_off-->help@modooilbo\.com<!--\/email_off--><\/span>[^<]*private/i);
  assert.equal(
    html.replace(/<!--[^]*?-->/g, "").replace(/<[^>]*>/g, ""),
    text,
  );
});

test("all public email bypasses are complete and crawl-safe in exported HTML", async () => {
  const files = await htmlFiles(OUT_DIR);
  assert.ok(files.length > 0, "out/ has no exported HTML; run npm run build first");

  const errors = [];
  let protectedLinks = 0;
  let protectedTexts = 0;
  let thirdPartyTexts = 0;

  for (const file of files) {
    const name = relative(ROOT, file);
    const result = validateHtml(await readFile(file, "utf8"), name);
    errors.push(...result.errors);
    protectedLinks += result.protectedLinks;
    protectedTexts += result.protectedTexts;
    thirdPartyTexts += result.thirdPartyTexts;
  }

  assert.deepEqual(errors, [], errors.join("\n"));
  assert.ok(protectedLinks > 0, "no protected mailto anchors found");
  assert.ok(protectedTexts > 0, "no protected public email text found");
  console.log(`checked ${files.length} HTML files: ${protectedLinks} links, ${protectedTexts} texts protected; ${thirdPartyTexts} third-party text occurrences remain obfuscated`);
});
