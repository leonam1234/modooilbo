import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {issueOwnedNamespace,runOwnedNamespace,persistOwnedRoutes} from './namespace-r2.mjs';
import {protectedBuildToolHashes,PROTECTED_BUILD_TOOLS,createProtectedBuildView,validateProtectedBuild,runProtectedBuild} from './protected-build.mjs';
import {releaseMediaScope} from './lib/release-media-scope.mjs';
import {parseDerivedArticles,mergeSelectedContent} from './lib/selected-content-merge.mjs';
import {digest,saveNewJSON} from './lib/protected-io.mjs';
const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ts=createRequire(import.meta.url)('typescript');
const workId='MOD-PROVIDED-20261029-326-335',date='2026-10-29',revision='a'.repeat(40),accountId='b'.repeat(32),targetBranch='codex/synthetic-only';
function syntheticArticle(slug,index){
 const paragraph='합성 데이터의 항목별 조건과 적용 범위를 비교하기 위한 테스트 문장입니다. 실제 기사나 사실 확인 자료가 아니며 운영 시스템과 관련된 내용을 담지 않습니다. ';
 return `---\ntitle: 합성 선택 원고 ${index}\nslug: ${slug}\ncategory: economy\nauthor: 합성 기자 / 기자\nreporting: desk\npublishedAt: 2026-10-29 00:0${index}\nreviewedBy: 모두일보 독립 리뷰 담당\nreviewedAt: 2026-10-28 23:40\nsummary: ${paragraph}\nverificationNote: 합성 입력의 항목과 원문 형식을 비교하고 누락 항목이 있는지 확인한 테스트입니다.\naddedValue: 합성 자료에서 조건과 한계 및 독자가 구분할 수 있는 기준을 정리한 테스트입니다.\nreporterInsight: 합성 자료의 조건과 한계를 비교하면 적용 범위를 구분할 수 있습니다. 이 문장은 테스트용 해설이며 실제 기사 판단을 대신하지 않습니다.\nsourceBasis: primary\nvisualType: ai-illustration\naiRole: image\nimage: /stock/${date}-${slug}.jpg\nimageCaption: 테스트용 AI 생성 이미지\ntags: 합성, 테스트, 조건, 범위, 자료\n---\n\n## 합성 조건\n\n${paragraph.repeat(6)}\n\n## 합성 한계\n\n${paragraph.repeat(6)}\n\n## 출처\n\nhttps://example.test/source-one\n\nhttps://example.test/source-two\n`;
}
function fixture(t,count=10){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'modoo-daily-support-'))),siteRoot=path.join(root,'site'),metadataRoot=path.join(root,'meta');
 fs.mkdirSync(path.join(siteRoot,'public/stock'),{recursive:true});fs.mkdirSync(path.join(siteRoot,'content/articles'),{recursive:true});fs.mkdirSync(metadataRoot);
 for(const n of new Set([...PROTECTED_BUILD_TOOLS,'scripts/lib/editorial-quality.mjs','scripts/lib/content-date.mjs','scripts/lib/content-fingerprint.mjs'])){const dest=path.join(siteRoot,n);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(sourceRoot,n),dest);}
 fs.symlinkSync(fs.realpathSync(path.join(sourceRoot,'node_modules')),path.join(siteRoot,'node_modules'),'dir');
 const pin=(n,x)=>saveNewJSON(path.join(metadataRoot,n+'.json'),x),payloads=new Map();
 const allIds=Array.from({length:10},(_,i)=>326+i),ids=allIds.filter(id=>!(count===8?[329,330]:count===9?[329]:[]).includes(id)),allItems=allIds.map(id=>({id,slug:'synthetic-selected-'+id})),items=allItems.filter(i=>ids.includes(i.id));
 const allAssets=allItems.map(i=>{const b=Buffer.from('SYNTHETIC-JPG-'+i.id),objectKey=date+'-'+i.slug+'.jpg',sourcePath=path.join(siteRoot,'public/stock',objectKey);fs.writeFileSync(sourcePath,b);payloads.set(i.id,b);i.sha256=digest(b);return {...i,objectKey,sourcePath};});const assets=allAssets.filter(a=>ids.includes(a.id));
 const articles=items.map((i,index)=>{const destination=path.join(siteRoot,'content/articles',date+'-'+i.slug+'.md'),b=Buffer.from(syntheticArticle(i.slug,index));fs.writeFileSync(destination,b);return {type:'article',destination,digest:digest(b)};});
 const nativeReceipt=pin('native',{workId,status:'CMS_INTAKEN_NOT_BUILT_OR_DEPLOYED',sameNativeObject:true,JSONRehydration:false,selectedCount:items.length,target:{siteRoot,revision},applied:{mode:'applied',operations:[...articles,...assets.map(a=>({type:'image',destination:a.sourcePath,digest:a.sha256}))]}});
 const baseManifest=pin('assets',{schema:'modoo-selected-r2-assets-v1',workId,siteRoot,targetRevision:revision,bucket:'modooilbo-stock',publicBase:'https://img.modooilbo.com',selectedIds:ids,assets,nativeReceipt});
 const approvalFile=path.join(metadataRoot,'approval.md');fs.writeFileSync(approvalFile,'SYNTHETIC APPROVAL ONLY');const approval={file:approvalFile,sha256:digest(fs.readFileSync(approvalFile))};
 const manifest={workId,date,revision:1,outputRoot:path.join(metadataRoot,'synthetic-package'),items:allItems.map(i=>({...i,author:'류주형 / 취재기자',reporting:'desk',mdSHA256:'d'.repeat(64),jpg:path.join(metadataRoot,i.id+'.jpg'),images:{JPG:{sha256:i.sha256}}}))},fileManifest=pin('manifest',manifest);
 const gate={workId,manifest:fileManifest,bindingErrors:[],format:{errorCount:0},rows:allItems.map(i=>({id:i.id,target:{articleAbsent:true,imageAbsent:true,article:path.join(siteRoot,'content/articles',date+'-'+i.slug+'.md'),image:path.join(siteRoot,'public/stock',date+'-'+i.slug+'.jpg')}}))};
 const review={workId,permanentIndependentReview:true,humanReviewClaimed:false,reviewerThreadId:'01a05a60-a035-7921-8154-7aa4a7024f31',inputBindings:[fileManifest],articles:allItems.map(i=>({...i,judgment:ids.includes(i.id)?'PASS':'HOLD',staticFactsVerdict:'PASS',fullArticleChangeImpactReviewed:true,mdSHA256:'d'.repeat(64),images:[{path:path.join(metadataRoot,i.id+'.jpg'),sha256:i.sha256}]}))},formalReview=pin('review',review);
 const approvalValue={workId,author:'류주형 / 취재기자',reporting:'desk',publicationApproved:true,preserveOriginalThesis:true,ids:allIds,preservedColumnIds:[334,335],sourceText:approval},approvalRef=pin('approval',approvalValue);
 const scope={schema:'modoo-provided-release-media-scope-v1',workId,date,siteRoot,author:'류주형 / 취재기자',packagePath:manifest.outputRoot,items,excludedIds:allIds.filter(id=>!ids.includes(id)),approval:approvalRef,fileManifest,firstGate:pin('gate',gate),formalReview},releaseScope=pin('scope',scope);
 const prior={schema:'modoo-sponsored-image-routes-v1',entries:[{id:321,slug:'historical-synthetic',logicalPath:'/stock/historical.jpg',publicURL:'https://img.modooilbo.com/release-media/PRIOR/old.jpg',sha256:'c'.repeat(64),bytes:123,workId:'PRIOR-SYNTHETIC',extra:'must remain unchanged'}]};
 const registry=path.join(siteRoot,'src/lib/sponsored-image-routes.json');fs.writeFileSync(registry,JSON.stringify(prior));
 const cachedFile=path.join(siteRoot,'src/lib/content.generated.ts'),cachedRows=[{id:'historical-derived',slug:'historical-derived',publishedAt:'2026-01-01T01:00:00Z',body:['UNCHANGED SYNTHETIC DERIVED VALUE'],imageUrl:'/stock/historical.jpg',category:'economy',author:{name:'합성',role:'기자'}}];fs.writeFileSync(cachedFile,'export const CONTENT_ARTICLES: Article[] = '+JSON.stringify(cachedRows)+';\n');
 const protectedRoot=path.join(siteRoot,'public/stock'),oldCMS=path.join(siteRoot,'content/articles/PROTECTED.md');fs.writeFileSync(oldCMS,'MUST NOT READ');
 const basis=pin('basis',{keys:['historical.jpg']}),catalog=pin('catalog',{schema:'modoo-protected-r2-key-catalog-v1',issuer:'모두일보 배포 담당자',project:'modooilbo',bucket:'modooilbo-stock',accountId,siteRoot,completeProtectedCoverage:true,keys:['historical.jpg'],basis:[basis]});
 const controls=pin('controls',{workId,siteRoot,accountId,issuer:'모두일보 배포 담당자',cooperativeWritersFrozen:true,namespaceSingleOwner:true,noIndependentWriterUsesTicket:true,acceptsNonAtomicCooperativeOwnership:true,claimsAtomicCreateOnly:false,expiresAt:new Date(Date.now()+3600000).toISOString()});
 const config={schema:'modoo-owned-r2-namespace-config-v1',workId,siteRoot,targetRevision:revision,targetBranch,metadataRoot,accountId,baseManifest,releaseScope,controls,protectedCatalog:catalog,registryBeforeSHA256:digest(fs.readFileSync(registry))};
 const readTarget=()=>({revision,branch:targetBranch}),issue=()=>issueOwnedNamespace(pin('config',config),{siteRoot,targetRevision:revision,readTarget,uuid:()=> '11111111-2222-4333-8444-555555555555'});
 const restore=[];const trap=(predicate)=>{for(const n of ['readFileSync','openSync','statSync','lstatSync','readdirSync','realpathSync','accessSync','existsSync','writeFileSync','copyFileSync','cpSync','renameSync','unlinkSync','rmSync']){const fn=fs[n],check=p=>{if(typeof p==='string')assert(!predicate(path.resolve(p),n),'protected original I/O '+n);};fs[n]=function(...a){check(a[0]);if(['copyFileSync','cpSync','renameSync'].includes(n))check(a[1]);return fn.apply(this,a);};if(fn.native)fs[n].native=(...a)=>{check(a[0]);return fn.native(...a);};restore.push(()=>{fs[n]=fn;});}};
 trap((p,n)=>p===oldCMS||(n==='readdirSync'&&p.startsWith(path.join(siteRoot,'content'))));
 t.after(()=>{for(const f of restore.reverse())f();fs.rmSync(root,{recursive:true,force:true});});
 return {root,siteRoot,metadataRoot,pin,scope,gate,review,config,items,assets,articles,issue,readTarget,registry,prior,cachedFile,cachedRows,protectedRoot,trap};
}
function transport(f,mode='success'){
 const calls=[],written=new Map(),command=a=>JSON.stringify(a[0]==='whoami'?{accounts:[{id:accountId}]}:{type:'oauth',token:'SYNTHETIC_TOKEN'});
 const fetchImpl=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET';calls.push({method,url});
  if(u.pathname.includes('/pages/projects/'))return Response.json({success:true,result:{name:'modooilbo',domains:['modooilbo.com']}});
  if(u.hostname==='api.cloudflare.com'&&method==='GET'){assert.equal(u.searchParams.get('prefix'),'release-media/'+workId+'/11111111-2222-4333-8444-555555555555/');return Response.json({success:true,result:mode==='occupied'?[{key:'occupied'}]:[]});}
  const id=Number(u.pathname.match(/\/(\d+)\.jpg$/)?.[1]);assert(f.items.some(i=>i.id===id));
  if(method==='PUT'){assert(!written.has(id),'no retry');written.set(id,Buffer.from(options.body));if(mode==='partial'&&id===328)throw Error('SYNTHETIC_TOKEN');return new Response(null,{status:200});}
  assert.equal(u.hostname,'img.modooilbo.com');assert(written.has(id),'GET only after PUT acknowledgment');return new Response(written.get(id));
 };
 return {calls,command,fetchImpl,written};
}
async function upload(f,mode){const io=transport(f,mode),ref=f.issue(),result=await runOwnedNamespace(ref,{siteRoot:f.siteRoot,targetRevision:revision,readTarget:f.readTarget,command:io.command,fetchImpl:io.fetchImpl});return {...result,io,ref};}
function buildManifest(f,u){
 const routes=JSON.parse(fs.readFileSync(f.registry)),mappingSHA256=digest(fs.readFileSync(f.registry)),entries=routes.entries.filter(e=>e.workId===workId);
 const cache={schema:'modoo-protected-build-cache-v1',siteRoot:f.siteRoot,issuer:'모두일보 배포 담당자',validMetadataReuse:true,webpFiles:['historical.jpg'],sizes:{'/stock/historical.jpg':123},fallbackBySlug:{'historical-derived':'/stock/historical.jpg'},protectedLocalPaths:[f.protectedRoot]};
 cache.webpManifest=f.pin('webp',cache.webpFiles);cache.sizeMetadata=f.pin('sizes',{sizes:cache.sizes});cache.fallbackMetadata=f.pin('fallback',{fallbackBySlug:cache.fallbackBySlug});
 const releaseBridge=f.pin('bridge',{schema:'modoo-protected-release-bind-v1',issuer:'모두일보 배포 담당자',workId,siteRoot:f.siteRoot,fromRevision:revision,toRevision:revision,targetBranch,uploadReceiptSHA256:u.uploadReceipt.sha256,mappingSHA256,sourceAtCommitVerified:true,assetBindings:entries.map(({logicalPath,sha256})=>({logicalPath,sha256}))});
 const p={schema:'modoo-protected-build-v1',workId,siteRoot:f.siteRoot,targetRevision:revision,targetBranch,metadataRoot:f.metadataRoot,writersFrozen:true,sourceCodeAndCMSAtPinnedCommit:true,sourceToolHashes:protectedBuildToolHashes(f.siteRoot),releaseScope:f.config.releaseScope,uploadReceipt:u.uploadReceipt,mappingSHA256,releaseBridge,legacyMediaCache:f.pin('cache',cache),cachedDerivedContent:{file:f.cachedFile,sha256:digest(fs.readFileSync(f.cachedFile)),articleCount:f.cachedRows.length,issuer:'모두일보 배포 담당자',validMetadataReuse:true,selectedSlugsAbsent:true,priorRegistrySHA256:f.config.registryBeforeSHA256}};
 return {p,ref:f.pin('build',p)};
}
export {fixture as providedFixture,upload as syntheticUpload,buildManifest as syntheticProtectedManifest};
for(const count of [8,9,10])test('provided current media: exact selected '+count+' upload and previous registry preserved',async t=>{
 const f=fixture(t,count),u=await upload(f);assert.equal(u.exitCode,0);assert.equal(u.io.written.size,count);assert.equal(u.io.calls.filter(c=>c.method==='PUT').length,count);assert.equal(JSON.parse(fs.readFileSync(u.uploadReceipt.file)).status,'OWNED_SELECTED_UPLOADED_AND_SERVED');const map=JSON.parse(fs.readFileSync(f.registry));assert.deepEqual(map.entries.slice(0,1),f.prior.entries);assert.equal(map.entries.length,count+1);assert(persistOwnedRoutes(u.uploadReceipt,{siteRoot:f.siteRoot,metadataRoot:f.metadataRoot}).unchanged);
});
for(const kind of ['partition','author','review-hold','image-sha'])test('provided current media: metadata fail before image/network '+kind,t=>{
 const f=fixture(t,8);
 if(kind==='partition')f.scope.excludedIds=[];
 if(kind==='author')f.scope.author='다른 명의';
 if(kind==='review-hold'){const review=JSON.parse(fs.readFileSync(f.scope.formalReview.file));review.articles[0].judgment='HOLD';f.scope.formalReview=f.pin('bad-review',review);}
 if(kind==='image-sha')f.scope.items[0].sha256='0'.repeat(64);
 f.config.releaseScope=f.pin('bad-scope',f.scope);f.trap(p=>p.endsWith('.jpg'));assert.throws(()=>f.issue());
});
for(const mode of ['occupied','partial'])test('provided current media: fail stop no retry/delete '+mode,async t=>{
 const f=fixture(t,8),u=await upload(f,mode);assert.equal(u.exitCode,1);assert.equal(u.io.written.size,mode==='occupied'?0:3);assert.equal(u.mapping,undefined);assert.deepEqual(JSON.parse(fs.readFileSync(f.registry)),f.prior);assert(!u.io.calls.some(c=>c.method==='DELETE'));
});
test('provided current media: selected8 protected view/generator keeps previous derived without original CMS/media',async t=>{
 const f=fixture(t,8),u=await upload(f),b=buildManifest(f,u);f.trap(p=>p===f.protectedRoot||p.startsWith(f.protectedRoot+path.sep));const v=createProtectedBuildView(b.ref,{siteRoot:f.siteRoot,targetRevision:revision});assert.equal(fs.readdirSync(path.join(v.stageRoot,'content/articles')).length,8);
 const r=spawnSync(process.execPath,['scripts/build-content.mjs'],{cwd:v.stageRoot,env:{...process.env,...v.env},encoding:'utf8'});assert.equal(r.status,0,r.stderr);const rows=parseDerivedArticles(fs.readFileSync(path.join(v.stageRoot,'src/lib/content.generated.ts')));assert.equal(rows.length,9);assert.deepEqual(rows[0],f.cachedRows[0]);assert.equal(JSON.parse(fs.readFileSync(v.receipt.file)).existingCMSDataGenerationIO,false);
});
test('provided current media: normal protected build command chain retained, synthetic executor only',async t=>{
 const f=fixture(t,9),u=await upload(f),b=buildManifest(f,u),calls=[];runProtectedBuild(b.ref,{siteRoot:f.siteRoot,targetRevision:revision,execute:(command,args,options)=>{calls.push([path.basename(command),args]);fs.mkdirSync(path.join(options.cwd,'out'),{recursive:true});}});assert.deepEqual(calls,[['tsc',['-p','tsconfig.functions.json']],['npm',['run','build']]]);
});
test('provided current media: runtime JPG routes validate selected8-10 and reject out-of-scope numeric IDs',t=>{
 const source=fs.readFileSync(path.join(sourceRoot,'src/lib/sponsored-image-routing.ts'),'utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const evaluate=entries=>{const exports={};vm.runInNewContext(code,{exports,require:n=>n==='./sponsors'?{SPONSORED_SOURCE_IMAGE_KEYS:new Set()}:{schema:'modoo-sponsored-image-routes-v1',entries}});return exports;};
 const entries=Array.from({length:10},(_,i)=>({id:326+i,slug:'synthetic-'+i,logicalPath:'/stock/'+date+'-synthetic-'+i+'.jpg',publicURL:'https://img.modooilbo.com/release-media/'+workId+'/11111111-2222-4333-8444-555555555555/'+'f'.repeat(64)+'/'+(326+i)+'.jpg',sha256:'f'.repeat(64),bytes:1,workId,uploadReceiptSHA256:'a'.repeat(64),nativeReceiptSHA256:'b'.repeat(64)}));
 for(const n of [8,9,10])assert(evaluate(entries.slice(0,n)).sponsoredImageRoute(entries[0].logicalPath));entries[0].id=301;assert.throws(()=>evaluate(entries),/선택 이미지/);
});
