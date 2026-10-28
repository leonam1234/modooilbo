import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadSelectedR2Manifest, syncSelectedR2Assets, conditionalS3Transport, signV4, runSelectedR2CLI} from './selected-r2-sync.mjs';
import {SPONSORED_SCOPE as S} from './lib/sponsored-scope-policy.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const revision='a'.repeat(40);
function fixture(t) {
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'modoo-selected-r2-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const siteRoot=path.join(root,'site');fs.mkdirSync(path.join(siteRoot,'public/stock'),{recursive:true});
  const payloads=new Map();
  const assets=S.items.map(i=>{const objectKey=S.date+'-'+i.slug+'.jpg',bytes=Buffer.from('SYNTHETIC-JPEG-'+i.id);payloads.set(objectKey,bytes);return {id:i.id,slug:i.slug,objectKey,sourcePath:path.join(siteRoot,'public/stock',objectKey),sha256:sha(bytes)};});
  for(const a of assets)fs.writeFileSync(a.sourcePath,payloads.get(a.objectKey));
  const native={workId:S.workId,status:'CMS_INTAKEN_NOT_BUILT_OR_DEPLOYED',sameNativeObject:true,JSONRehydration:false,selectedCount:5,target:{siteRoot,revision},applied:{mode:'applied',operations:assets.map(a=>({type:'image',destination:a.sourcePath,digest:a.sha256}))}};
  const nativeFile=path.join(root,'native.json'),file=path.join(root,'assets.json');
  const m={schema:'modoo-selected-r2-assets-v1',workId:S.workId,siteRoot,targetRevision:revision,bucket:'modooilbo-stock',publicBase:'https://img.modooilbo.com',selectedIds:assets.map(a=>a.id),assets};
  let ref;
  function pin(){fs.writeFileSync(nativeFile,JSON.stringify(native));m.nativeReceipt={file:nativeFile,sha256:sha(fs.readFileSync(nativeFile))};fs.writeFileSync(file,JSON.stringify(m));ref={file,sha256:sha(fs.readFileSync(file))};return ref;}
  const load=()=>loadSelectedR2Manifest(ref,{siteRoot,targetRevision:revision});
  pin();return {root,siteRoot,m,native,file,nativeFile,payloads,pin,load,get ref(){return ref;}};
}
function transport(f,events=[]) {return {putNew:async a=>{events.push(['PUT',a.objectKey]);return {created:true,objectKey:a.objectKey,sha256:a.digest};},fetchImpl:async url=>{const key=new URL(url).pathname.slice(1);events.push(['GET',key]);assert(f.payloads.has(key),'existing/unknown remote probe');return new Response(f.payloads.get(key));}};}
test('exact five: hashes all selected before PUT and fetches only objects newly created in this invocation',async t=>{
  const f=fixture(t),events=[],io=transport(f,events),reads=[];
  const result=await syncSelectedR2Assets(f.load(),{...io,readAsset:p=>{reads.push(p);assert.equal(events.length,0);return fs.readFileSync(p);}});
  assert.equal(result.uploaded,5);assert.equal(result.legacyProbes,0);assert.equal(reads.length,5);
  assert.deepEqual(events,f.m.assets.flatMap(a=>[['PUT',a.objectKey],['GET',a.objectKey]]));
});
const mutations={
  'missing fifth':f=>{f.m.assets.pop();f.m.selectedIds.pop();f.native.selectedCount=4;f.native.applied.operations.pop();},
  'duplicate id':f=>{f.m.assets[1].id=321;f.m.selectedIds[1]=321;},
  'extra selected id':f=>f.m.selectedIds.push(326),
  'wrong slug':f=>f.m.assets[0].slug='unapproved',
  'wrong native target':f=>f.native.target.revision='b'.repeat(40),
  'native JSON replay':f=>f.native.JSONRehydration=true,
  'native unapplied':f=>f.native.applied.mode='dry-run',
  'parent traversal':f=>f.m.assets[0].sourcePath=path.join(f.siteRoot,'public','stock','../old.jpg'),
  'wrong owner digest':f=>f.native.applied.operations[0].digest='0'.repeat(64),
  'duplicate destination':f=>f.native.applied.operations[1].destination=f.native.applied.operations[0].destination,
  'wrong bucket':f=>f.m.bucket='other',
  'unapproved public base':f=>f.m.publicBase='https://example.com',
  'drop all sponsored images':f=>{f.m.assets=[];f.m.selectedIds=[];Object.assign(f.native,{schema:'modoo-code-release-no-new-images-v1',newImageCount:0,publisherVerifiedNoNewImages:true});},
};
for(const [name,mutate]of Object.entries(mutations))test('pre-asset admission rejects '+name,t=>{const f=fixture(t);mutate(f);f.pin();assert.throws(f.load,/선택 R2 차단/);});
test('wrong metadata SHA and symlink metadata fail before asset access',t=>{const f=fixture(t);assert.throws(()=>loadSelectedR2Manifest({...f.ref,sha256:'0'.repeat(64)},{siteRoot:f.siteRoot,targetRevision:revision}));const real=f.file+'.saved';fs.renameSync(f.file,real);fs.symlinkSync(real,f.file);assert.throws(f.load);});
test('hardlinked source is rejected without any PUT',async t=>{const f=fixture(t);fs.linkSync(f.m.assets[0].sourcePath,path.join(f.root,'hardlink.jpg'));await assert.rejects(syncSelectedR2Assets(f.load(),{putNew:()=>assert.fail('PUT')}),/일반파일/);});
test('symlinked source is rejected without any PUT',async t=>{const f=fixture(t),a=f.m.assets[0];fs.renameSync(a.sourcePath,a.sourcePath+'.saved');fs.symlinkSync(a.sourcePath+'.saved',a.sourcePath);await assert.rejects(syncSelectedR2Assets(f.load(),{putNew:()=>assert.fail('PUT')}));});
test('all hashes checked before upload; a last-file change produces zero PUT',async t=>{const f=fixture(t);fs.writeFileSync(f.m.assets.at(-1).sourcePath,'changed');await assert.rejects(syncSelectedR2Assets(f.load(),{putNew:()=>assert.fail('PUT')}),/SHA/);});
for(const mode of ['rehydrated','mutated','stale manifest','stale native'])test('custody blocks '+mode,async t=>{const f=fixture(t);let m=f.load();if(mode==='rehydrated')m=JSON.parse(JSON.stringify(m));if(mode==='mutated')m.assets[0].sha256='0'.repeat(64);if(mode==='stale manifest')fs.appendFileSync(f.file,' ');if(mode==='stale native')fs.appendFileSync(f.nativeFile,' ');await assert.rejects(syncSelectedR2Assets(m,{readAsset:()=>assert.fail('asset read')}));});
test('412 collision does not overwrite, probe, or retry',async t=>{let count=0;const put=conditionalS3Transport({env:{R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'fixture',R2_SECRET_ACCESS_KEY:'fixture-secret'},fetchImpl:async(url,options)=>{count++;assert.equal(options.headers['if-none-match'],'*');assert.match(options.headers.authorization,/SignedHeaders=.*if-none-match/);assert.equal(options.redirect,'error');return new Response('',{status:412});}});await assert.rejects(put({bucket:'modooilbo-stock',objectKey:'new.jpg',bytes:Buffer.from('x'),digest:sha('x')}),/이미 존재/);assert.equal(count,1);});
test('unknown network outcome is not retried and missing credentials fail closed',async()=>{assert.throws(()=>conditionalS3Transport({env:{}}),/기존 승인/);let n=0;const put=conditionalS3Transport({env:{R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'fixture',R2_SECRET_ACCESS_KEY:'fixture'},fetchImpl:async()=>{n++;throw Error('secret must not leak');}});await assert.rejects(put({bucket:'b',objectKey:'new.jpg',bytes:Buffer.from('x'),digest:sha('x')}),e=>/결과 불명/.test(e.message)&&!e.message.includes('secret must'));assert.equal(n,1);});
for(const mode of ['bad SHA','oversized stream','bad length','HTTP error'])test('new CDN verification fails safely: '+mode,async t=>{const f=fixture(t),io=transport(f);io.fetchImpl=async()=>mode==='HTTP error'?new Response('',{status:503}):mode==='bad length'?new Response('x',{headers:{'content-length':'1'}}):new Response(mode==='bad SHA'?Buffer.alloc(f.payloads.values().next().value.length):Buffer.alloc(1024));await assert.rejects(syncSelectedR2Assets(f.load(),io),e=>{assert.equal(e.selectedProgress.length,0);assert.equal(e.createdObjects.length,1);assert.equal(e.createdObjects[0].servingVerified,false);return true;});});
test('dry-run has zero network calls',async t=>{const f=fixture(t),r=await syncSelectedR2Assets(f.load(),{dryRun:true,putNew:()=>assert.fail('PUT'),fetchImpl:()=>assert.fail('GET')});assert.equal(r.uploaded,0);});
test('explicit no-new-image code receipt works; empty advertisement receipt cannot substitute',async t=>{const f=fixture(t);f.m.workId='MOD-CODE-RELEASE';f.m.assets=[];f.m.selectedIds=[];Object.assign(f.native,{schema:'modoo-code-release-no-new-images-v1',workId:f.m.workId,newImageCount:0,publisherVerifiedNoNewImages:true});f.pin();const r=await syncSelectedR2Assets(f.load());assert.equal(r.uploaded,0);});
test('ordinary empty native intake receipt cannot silently bypass R2 selection',t=>{const f=fixture(t);f.m.workId='MOD-CODE-RELEASE';f.m.assets=[];f.m.selectedIds=[];f.native.workId=f.m.workId;f.native.selectedCount=0;f.native.applied.operations=[];f.pin();assert.throws(f.load,/빈 명세/);});
function revisionBridge(f){f.native.target.revision='b'.repeat(40);f.pin();const b={schema:'modoo-selected-native-revision-bridge-v1',workId:f.m.workId,issuer:'모두일보 배포 담당자',siteRoot:f.siteRoot,nativeReceiptSHA256:f.m.nativeReceipt.sha256,fromRevision:'b'.repeat(40),toRevision:revision,verifiedGitHead:true,assetBindings:f.m.assets.map(({objectKey,sha256})=>({objectKey,sha256}))};return b;}
function pinBridge(f,b){const file=path.join(f.root,'revision-bridge.json');fs.writeFileSync(file,JSON.stringify(b));f.m.nativeRevisionBridge={file,sha256:sha(fs.readFileSync(file))};f.pin();}
test('native base to release commit requires an exact pinned publisher/image bridge',async t=>{const f=fixture(t),b=revisionBridge(f);pinBridge(f,b);assert.equal((await syncSelectedR2Assets(f.load(),{dryRun:true})).uploaded,0);});
for(const [name,change]of [['receipt',b=>b.nativeReceiptSHA256='0'.repeat(64)],['release head',b=>b.toRevision='c'.repeat(40)],['selected asset',b=>b.assetBindings.pop()],['unverified head',b=>b.verifiedGitHead=false]])test('revision bridge rejects '+name,t=>{const f=fixture(t),b=revisionBridge(f);change(b);pinBridge(f,b);assert.throws(f.load);});
test('SigV4 fixed payload signs atomic conditional header and never includes the secret',()=>{const args={method:'PUT',url:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com/modooilbo-stock/new.jpg',headers:{'if-none-match':'*','content-type':'image/jpeg'},body:Buffer.from('fixture'),accessKeyId:'fixture-id',secretAccessKey:'fixture-secret',now:new Date('2026-10-28T00:00:00Z')};const h=signV4(args);assert.equal(h['x-amz-date'],'20261028T000000Z');assert.equal(h['x-amz-content-sha256'],sha('fixture'));assert.equal(h['if-none-match'],'*');assert.match(h.authorization,/20261028\/auto\/s3\/aws4_request/);assert(!h.authorization.includes('fixture-secret'));assert.notEqual(h.authorization,signV4({...args,headers:{...args.headers,'if-none-match':'other'}}).authorization);});
test('CLI refuses duplicate and legacy flags before filesystem effects',async()=>{await assert.rejects(runSelectedR2CLI(['--dry-run','--dry-run']),/중복/);await assert.rejects(runSelectedR2CLI(['--legacy-full-scan']),/허용되지/);});
test('SigV4 matches independently computed Python fixed vector',()=>{
 const h=signV4({method:'PUT',url:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com/modooilbo-stock/new.jpg',headers:{'if-none-match':'*','content-type':'image/jpeg'},body:Buffer.from('fixture'),accessKeyId:'fixture-id',secretAccessKey:'fixture-secret',now:new Date('2026-10-28T00:00:00Z')});
 assert(h.authorization.endsWith('Signature=2286faa1b25488d512e72844d88fa2e8c9e888ded1980ad43ba38936530b18f0'));
});
test('CLI pinned dry-run binds native/manifest/revision and writes its own new receipt',async t=>{const f=fixture(t);const code=await runSelectedR2CLI(['--selected-manifest',f.ref.file,'--selected-manifest-sha256',f.ref.sha256,'--target-revision',revision,'--dry-run'],{siteRoot:f.siteRoot});assert.equal(code,0);const parent=path.join(f.root,'r2-selected-runs'),runs=fs.readdirSync(parent);assert.equal(runs.length,1);const r=JSON.parse(fs.readFileSync(path.join(parent,runs[0],'receipt.json')));assert.equal(r.status,'DRY_RUN_NEW_ASSETS_ONLY');assert.equal(r.uploaded,0);assert.equal(r.manifest.sha256,f.ref.sha256);assert.equal(r.globalStockScans,0);});
test('normal R2 entry without a selected manifest exits before stock inventory or Git discovery',()=>{const script=new URL('./sync-stock-r2.mjs',import.meta.url);const r=spawnSync(process.execPath,[script.pathname],{encoding:'utf8',timeout:5000,env:{PATH:process.env.PATH}});assert.equal(r.status,1);assert.match(r.stderr,/선택|selected/i);});
