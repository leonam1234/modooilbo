import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SPONSORED_SCOPE as S,scopedSponsoredRole,validateScopedSponsoredFields,validateScopedSponsoredManifest,sponsorNamesFromSource} from './lib/sponsored-scope-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const body='브랜드 담당자의 의뢰로 비용을 받아 제작한 광고 콘텐츠입니다.';
const REVIEWED_GROCHI_CAPTION='그로치 홈페이지 제공화면. 화면 속 반려동물 이미지는 사이트가 AI 생성 이미지로 안내한다. 2026년 10월 28일 확인.';
const fm=i=>({slug:i.slug,sponsor:i.sponsor,author:S.author,reporting:'sponsored',title:'[광고] '+i.sponsor+' 이용 전 확인',visualType:'source-photo',imageCaption:i.id===324?REVIEWED_GROCHI_CAPTION:'제공된 사이트 화면, 2026-10-28 기준'});
for(const item of S.items)test('exact scoped author and brand accepted '+item.id,()=>{assert.equal(scopedSponsoredRole(fm(item),S.date),S.authorRole);assert.deepEqual(validateScopedSponsoredFields(fm(item),S.date,body),[]);});
for(const [name,patch,day,text] of [
 ['other day',{},'2026-10-29',body],['other slug',{slug:'other'},S.date,body],['unknown sponsor',{sponsor:'unknown'},S.date,body],
 ['ordinary desk',{reporting:'desk'},S.date,body],['fake reporter',{author:'유수화 / 기자'},S.date,body],['other author',{author:'류주형 / 취재기자'},S.date,body],
 ['missing advertising title',{title:'이용 안내'},S.date,body],['missing paid notice',{},S.date,'일반 안내입니다.'],['AI screenshot',{imageCaption:'AI 생성 이미지'},S.date,body],['wrong visualType',{visualType:'ai-illustration'},S.date,body]
])test('scoped policy rejects '+name,()=>assert(validateScopedSponsoredFields({...fm(S.items[0]),...patch},day,text).length>0));
test('whole5 manifest pins IDs and sponsors without historical byline change',()=>{const m={workId:S.workId,date:S.date,items:S.items};const rows=S.items.map(i=>({fm:fm(i)}));assert.deepEqual(validateScopedSponsoredManifest(m,rows,S.date),[]);assert(validateScopedSponsoredManifest({...m,items:S.items.slice(1)},rows,S.date).length);assert(validateScopedSponsoredManifest(m,[...rows.slice(0,4),rows[0]],S.date).length);assert.deepEqual(validateScopedSponsoredFields({author:'유수화',reporting:'desk'},'2026-08-01','과거 기사'),[]);});
test('relation-only key does not become an allowed sponsor',()=>{assert.deepEqual([...sponsorNamesFromSource('export const SPONSOR_NAMES = {\n allowed: "표시명",\n};\nexport const SPONSOR_RELATIONS = {\n forbidden: "관계",\n};')],['allowed']);});
for(const [name,patch,date=S.date]of [
 ['delete AI disclosure',{imageCaption:'그로치 홈페이지 제공화면. 2026년 10월 28일 확인.'}],
 ['generic AI article image as photo',{imageCaption:'AI 생성 이미지. 실제 사진이 아닙니다.'}],
 ['wrong slug',{slug:'other'}],['other scoped slug',{slug:S.items[0].slug,sponsor:S.items[0].sponsor}],
 ['desk reporting',{reporting:'desk'}],['direct reporting',{reporting:'direct'}],['AI illustration type',{visualType:'ai-illustration'}],['other day',{},'2026-10-29'],
])test('site324 screenshot disclosure remains scoped: '+name,()=>assert(validateScopedSponsoredFields({...fm(S.items[3]),...patch},date,body).length>0));
function compile(relative,mocks={}) {
  const source=fs.readFileSync(path.join(root,relative),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  const module={exports:{}};
  const localRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:(id==='react/jsx-runtime'?require(id):(()=>{throw Error('unapproved source import '+id);})());
  vm.runInNewContext('(function(require,module,exports){'+js+'\n})(require,module,module.exports)',{require:localRequire,module,process:{env:{}}},{timeout:3000});return module.exports;
}
const sponsors=compile('src/lib/sponsors.ts'),notice=compile('src/components/SponsorNotice.tsx',{'@/lib/sponsors':sponsors});
test('new selected JPG-only images never select absent WebP derivatives; legacy WebP behavior stays intact',()=>{
  const keys=S.items.map(i=>S.date+'-'+i.slug+'.jpg');assert.deepEqual([...sponsors.SPONSORED_SOURCE_IMAGE_KEYS],keys);
  const stock=compile('src/lib/stock.ts',{'./sponsors':sponsors,'./sponsored-image-routing':{sponsoredImageRoute:()=>undefined},'./webp-manifest.generated.json':{default:[...keys,'legacy-fixture.jpg'],__esModule:true}});
  for(const key of keys){const a={id:'synthetic',imageUrl:'/stock/'+key};assert(stock.displayImageUrl(a).includes(key+'?'));assert(stock.thumbImageUrl(a).includes(key+'?'));assert(!stock.thumbImageUrl(a).includes('.webp'));}
  assert.equal(stock.webpSrc('/stock/legacy-fixture.jpg'),'/stock/legacy-fixture.webp');
  assert(stock.thumbImageUrl({id:'legacy-fixture',imageUrl:'/stock/legacy-fixture.jpg'}).includes('legacy-fixture-640.webp'));
});
test('actual sponsor component preserves old relation and renders known/paid disclosure for five brands',()=>{
  assert.equal(sponsors.sponsorName('bridzzi'),'(주)브리찌');assert.equal(sponsors.sponsorRelation('bridzzi'),'(주)브리찌는 모두일보 발행인이 관여하는 회사입니다.');
  const labels=['렌탈위키','두봄플라워','브랜드맵','그로치','WorkTool'];
  for(let i=0;i<5;i++){
    const key=S.items[i].sponsor,badge=renderToStaticMarkup(React.createElement(notice.SponsorBadge,{sponsor:key})),footer=renderToStaticMarkup(React.createElement(notice.SponsorFooter,{sponsor:key}));
    assert(badge.includes('광고')&&badge.includes(labels[i]));assert(footer.includes(labels[i])&&footer.includes('광고비'));
    if(key==='dubomflower'){assert(footer.includes('사이트 운영사는 주식회사 브리찌'));assert(footer.includes('발행인이 관여'));}
    else{assert(footer.includes('담당자의 의뢰로 비용을 받아'));assert(!footer.includes('관계없'));assert(!footer.includes('서명'));}
  }
});
test('actual ArticleCard variants retain advertising badge for source-photo screenshots',()=>{
  const link=({children,href,...props})=>React.createElement('a',{href,...props},children),image=({priority,fill,unoptimized,...props})=>React.createElement('img',props);
  const utils={cn:(...a)=>a.filter(Boolean).join(' '),formatKoreanDateTime:()=>S.date,toKstIso:()=>S.date+'T09:00:00+09:00'};
  const typeBadge=compile('src/components/TypeBadge.tsx',{'@/lib/breaking':{isBreakingFresh:()=>false},'@/lib/utils':utils});
  const {ArticleCard}=compile('src/components/ArticleCard.tsx',{'next/image':{default:image,__esModule:true},'next/link':{default:link,__esModule:true},'@/components/SponsorNotice':notice,'@/lib/categories':{CATEGORY_MAP:{industry:{name:'산업',slug:'industry'}}},'@/lib/utils':utils,'./icons':{PlayIcon:()=>null},'@/lib/stock':{displayImageUrl:v=>v,thumbImageUrl:v=>v},'./TypeBadge':typeBadge});
  for(const variant of ['feature','horizontal','compact','list','text','overlay']){
    const article={...fm(S.items[0]),id:'synthetic',category:'industry',type:'article',image:'/stock/fixture.jpg',summary:'합성 광고',publishedAt:S.date+' 09:00',author:{name:S.author,role:S.authorRole}};
    const html=renderToStaticMarkup(React.createElement(ArticleCard,{article,variant}));assert(html.includes('광고'),variant);assert(!html.includes('AI 생성'),variant);
  }
});
test('actual metadata function retains advertising in title, OG, Twitter and portal metadata',async()=>{
  const p=path.join(root,'src/app/article/[slug]/page.tsx'),source=fs.readFileSync(p,'utf8');
  const ast=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='generateMetadata');assert(fn);
  const code=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  for(const i of S.items){
    const a={...fm(i),category:'industry',tags:['광고'],publishedAt:S.date+' 09:00',author:{name:S.author,role:S.authorRole}},module={exports:{}};
    vm.runInNewContext('(function(module,exports){'+code+'\n})(module,module.exports)',{module,getArticleBySlug:()=>a,absoluteUrl:v=>'https://example.com'+v,ogImageUrl:()=>'/fixture.jpg',CATEGORY_MAP:{industry:{name:'산업'}},metaDescription:()=>body,toKstIso:v=>v,ARTICLE_IMAGE_WIDTH:1200,ARTICLE_IMAGE_HEIGHT:675});
    const m=await module.exports.generateMetadata({params:Promise.resolve({slug:i.slug})});
    for(const title of [m.title,m.openGraph.title,m.twitter.title,m.other.title])assert(title.startsWith('[광고] '));assert.equal(m.authors[0].name,S.author);
  }
});
function builderFixture(t,mutate=()=>{}){
  const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'modoo-ad-builder-')));t.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
  for(const d of ['scripts/lib','src/lib','content/articles'])fs.mkdirSync(path.join(scratch,d),{recursive:true});
  fs.copyFileSync(path.join(root,'scripts/build-content.mjs'),path.join(scratch,'scripts/build-content.mjs'));fs.cpSync(path.join(root,'scripts/lib'),path.join(scratch,'scripts/lib'),{recursive:true});
  fs.copyFileSync(path.join(root,'scripts/selected-r2-sync.mjs'),path.join(scratch,'scripts/selected-r2-sync.mjs'));
  fs.copyFileSync(path.join(root,'src/lib/sponsors.ts'),path.join(scratch,'src/lib/sponsors.ts'));fs.writeFileSync(path.join(scratch,'src/lib/reporters.ts'),'export const reporters = [];');
  for(const i of S.items){const fields={...fm(i),category:'industry',publishedAt:S.date+' 09:0'+(i.id-321),image:'/stock/'+S.date+'-'+i.slug+'.jpg',summary:'[광고] '+i.sponsor+' 확인 안내',verificationNote:'공식 사이트의 현재 안내 화면과 제공 자료의 조건을 대조했습니다.',addedValue:'독자가 이용 조건과 예외를 구분할 수 있도록 핵심 확인 사항을 정리했습니다.',sourceBasis:'primary',aiRole:'none',reviewedBy:'김영환',reviewedAt:S.date+' 08:30',reporterInsight:'합성 검수에서는 제공된 화면의 기준시각과 서비스 조건을 확인하고 독자가 구분해야 할 조건을 다시 정리했습니다.',tags:'광고, 서비스, 조건, 안내, 화면, 비교, 검증, 기준'};mutate(fields,i);fs.writeFileSync(path.join(scratch,'content/articles',S.date+'-'+i.slug+'.md'),'---\n'+Object.entries(fields).map(([k,v])=>k+': '+v).join('\n')+'\n---\n\n'+body+'\n\n'+('독자가 확인할 수 있는 서비스 조건과 예외를 설명하는 합성 본문입니다. '.repeat(50))+'\n\n## 이용 조건\n\n서비스별 이용 조건과 기준시각을 확인하세요.\n\n## 독자가 볼 차이\n\n브랜드별 제공 범위를 비교하세요.\n\n## 출처 메모\n\n- 공식 자료: https://example.com/a\n- 조건 안내: https://example.com/b\n');}
  const run=spawnSync(process.execPath,['scripts/build-content.mjs'],{cwd:scratch,encoding:'utf8',timeout:15000});return {scratch,run};
}
test('real builder on synthetic corpus serializes responsible author, source-photo, sponsor and advertising titles',t=>{const f=builderFixture(t);assert.equal(f.run.status,0,f.run.stdout+f.run.stderr);const generated=fs.readFileSync(path.join(f.scratch,'src/lib/content.generated.ts'),'utf8');for(const i of S.items)assert(generated.includes(i.sponsor));assert(generated.includes(S.authorRole));assert(generated.includes('source-photo'));assert(generated.includes('[광고]'));assert(generated.includes(REVIEWED_GROCHI_CAPTION));assert(!generated.includes('AI 생성 이미지. 실제 사진이 아닙니다.'));});
test('real builder rejects unknown sponsor before any image fallback',t=>{const f=builderFixture(t,(fm,i)=>{if(i.id===321){fm.sponsor='unknown';delete fm.image;}});assert.equal(f.run.status,1);assert.match(f.run.stderr+f.run.stdout,/scope|범위|광고321/);});
test('real builder rejects324 disclosure deletion before image fallback',t=>{const f=builderFixture(t,(fields,i)=>{if(i.id===324){fields.imageCaption='그로치 홈페이지 제공화면. 2026년 10월 28일 확인.';delete fields.image;}});assert.equal(f.run.status,1);assert.match(f.run.stderr+f.run.stdout,/AI 이미지 고지를 유지/);});
