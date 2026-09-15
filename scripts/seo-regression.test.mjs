import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".html"]);
const PUBLIC_SOURCE_DIRS = ["src", "content", "public"];

async function loadReporterSeoText() {
  const source = await readFile(path.join(ROOT, "src/lib/reporter-seo.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (module, exports) { ${compiled}\n})(module, module.exports);`, { module });
  return module.exports.reporterSeoText;
}

async function loadSeoModule() {
  const source = await readFile(path.join(ROOT, "src/lib/seo.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (module, exports) { ${compiled}\n})(module, module.exports);`, { module });
  return module.exports;
}

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [absolute] : [];
  }));
  return nested.flat();
}

test("public source does not link to redirecting /policy URL", async () => {
  const files = (await Promise.all(PUBLIC_SOURCE_DIRS.map((dir) => sourceFiles(path.join(ROOT, dir))))).flat();
  const violations = [];
  // JSX/object literal 및 Markdown 내부 링크만 검사한다. /policy가 포함된 외부 출처 URL은 제외한다.
  const redirectingPolicyLinks = [
    /(?:href\s*=\s*|href\s*:\s*)[({\s]*["'`]\/policy(?=["'`#?])/g,
    /\]\(\/policy(?=[#?)])/g,
  ];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const pattern of redirectingPolicyLinks) {
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        violations.push(`${path.relative(ROOT, file)}:${line}:${match[0]}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("reporter SEO text is unique for each pagination page", async () => {
  const reporterSeoText = await loadReporterSeoText();
  const reporter = {
    name: "김테스트",
    role: "경제부 기자",
    beat: "경제를 취재합니다.",
    expertise: "공공 통계 분석",
  };
  const first = reporterSeoText(reporter, 1);
  const second = reporterSeoText(reporter, 2);

  assert.equal(first.title, "김테스트 경제부 기자");
  assert.ok(!first.description.includes("1페이지"));
  assert.equal(second.title, "김테스트 경제부 기자 (2페이지)");
  assert.match(second.description, /경제부 기자 기사 목록 2페이지 —/);
  assert.notEqual(first.description, second.description);
});

test("reporter metadata maps canonical and Open Graph URL to the same page path", async () => {
  const source = await readFile(path.join(ROOT, "src/components/ReporterPage.tsx"), "utf8");
  assert.match(source, /alternates:\s*\{\s*canonical:\s*path\s*\}/);
  assert.match(source, /openGraph:\s*\{[\s\S]*?url:\s*path\s*,/);
  assert.match(source, /openGraph:\s*\{[\s\S]*?title\s*,[\s\S]*?description\s*,/);
});

test("article SEO excludes editorial disclosures from snippet candidates", async () => {
  const { articleContentBlocks, bodyWithoutEditorialDisclosures, metaDescription } = await loadSeoModule();
  const body = [
    "독자가 먼저 알아야 할 핵심 사실을 설명한다.",
    "## 취재·이해관계 안내",
    "운영사는 모두일보 발행인이 관여하는 회사다. 이 문장은 검색 설명문 후보가 아니다.",
    "## 실제 이용 경험",
    "이용자가 현장에서 확인한 장점과 한계를 함께 설명한다.",
  ];

  const blocks = articleContentBlocks(body);
  assert.deepEqual(JSON.parse(JSON.stringify(blocks)), [
    { kind: "content", text: body[0] },
    { kind: "disclosure", title: "취재·이해관계 안내", paragraphs: [body[2]] },
    { kind: "content", text: body[3] },
    { kind: "content", text: body[4] },
  ]);
  assert.deepEqual(Array.from(bodyWithoutEditorialDisclosures(body)), [body[0], body[3], body[4]]);

  const description = metaDescription({ summary: "핵심 서비스의 실제 이용 경험을 확인했다.", body });
  assert.ok(description.includes("핵심 사실"));
  assert.ok(description.includes("실제 이용 경험"));
  assert.ok(!description.includes("발행인이 관여"));
});

test("ordinary stakeholder headings stay in article content", async () => {
  const { articleContentBlocks } = await loadSeoModule();
  const body = ["## 이해관계자", "정책 참여 기관의 역할을 설명한다."];
  assert.deepEqual(JSON.parse(JSON.stringify(articleContentBlocks(body))), [
    { kind: "content", text: body[0] },
    { kind: "content", text: body[1] },
  ]);
});

test("article disclosure is rendered as a secondary aside instead of a section heading", async () => {
  const source = await readFile(path.join(ROOT, "src/components/ArticleBody.tsx"), "utf8");
  assert.match(source, /<aside[\s\S]*?data-nosnippet=/);
  assert.match(source, /<p className="text-sm font-bold[^>]*>\{title\}<\/p>/);
  assert.doesNotMatch(source, /<h2[^>]*>\{title\}<\/h2>/);
});
