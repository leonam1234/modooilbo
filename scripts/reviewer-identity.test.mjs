import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function buildWithReviewer(reviewer) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'modoo-reviewer-test-'));
  try {
    for (const dir of ['scripts/lib','src/lib','content/articles']) fs.mkdirSync(path.join(scratch,dir),{recursive:true});
    fs.copyFileSync(path.join(root,'scripts/build-content.mjs'),path.join(scratch,'scripts/build-content.mjs'));
    fs.cpSync(path.join(root,'scripts/lib'),path.join(scratch,'scripts/lib'),{recursive:true});
    fs.writeFileSync(path.join(scratch,'src/lib/reporters.ts'),'export const reporters = [{ name: "김영환" }];');
    fs.writeFileSync(path.join(scratch,'content/articles/2026-08-01-reviewer-fixture.md'),`---\ntitle: 검수 주체 보존 회귀\ncategory: society\nauthor: 테스트 기자 / 기자\npublishedAt: 2026-08-01 09:00\nimage: /stock/test.jpg\nsummary: 검수자 명칭이 실제 생성 데이터까지 보존되는지 확인한다.\nreviewedBy: ${reviewer}\nreviewedAt: 2026-08-01 08:40\n---\n\n검수 기록은 실제 검수 주체를 보존해야 한다.\n`);
    const result = spawnSync(process.execPath,['scripts/build-content.mjs'],{cwd:scratch,encoding:'utf8',timeout:15_000});
    const generated = path.join(scratch,'src/lib/content.generated.ts');
    return {status:result.status,output:result.stdout+result.stderr,generated:fs.existsSync(generated)?fs.readFileSync(generated,'utf8'):''};
  } finally { fs.rmSync(scratch,{recursive:true,force:true}); }
}

test('독립 AI 검수 역할명을 사람 이름으로 바꾸지 않고 콘텐츠에 보존한다',()=>{
  const result=buildWithReviewer('모두일보 독립 리뷰 담당');
  assert.equal(result.status,0,result.output);
  assert.match(result.generated,/"reviewedBy": "모두일보 독립 리뷰 담당"/);
});
test('기존 기자 검수 실명은 계속 허용한다',()=>{
  const result=buildWithReviewer('김영환');
  assert.equal(result.status,0,result.output);
  assert.match(result.generated,/"reviewedBy": "김영환"/);
});
test('미등록 검수자와 비슷하게 만든 임의 역할명은 차단한다',()=>{
  for(const reviewer of ['임의 검수자','모두일보 독립 리뷰 담당2']) {
    const result=buildWithReviewer(reviewer);
    assert.equal(result.status,1,result.output);
    assert.match(result.output,/reviewedBy/);
    assert.equal(result.generated,'');
  }
});

test('독립 AI 검수 해설에는 기자 직함을 붙이지 않고 기존 사람 해설은 유지한다',()=>{
  const source=fs.readFileSync(path.join(root,'src/components/ReporterInsight.tsx'),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module={exports:{}};
  const realRequire=createRequire(import.meta.url);
  vm.runInNewContext(compiled,{module,exports:module.exports,require:(name)=>name==='@/lib/utils'?{formatKoreanDateTime:value=>value}:realRequire(name)});
  const render=reviewedBy=>renderToStaticMarkup(React.createElement(module.exports.ReporterInsight,{article:{reviewedBy,reviewedAt:'2026-09-16T09:32:00Z',reporterInsight:'검수에서 확인한 핵심 사항'}}));
  const ai=render('모두일보 독립 리뷰 담당');
  assert.match(ai,/독립 검수 핵심/);
  assert.match(ai,/모두일보 독립 리뷰 담당/);
  assert.doesNotMatch(ai,/모두일보 독립 리뷰 담당 기자|기자가 본 핵심/);
  const human=render('김영환');
  assert.match(human,/김영환 기자/);
  assert.match(human,/기자가 본 핵심/);
});
