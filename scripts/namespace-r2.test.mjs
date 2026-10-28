import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {issueOwnedNamespace,runOwnedNamespace,persistOwnedRoutes,existingWranglerCommand} from './namespace-r2.mjs';
import {digest,saveNewJSON} from './lib/protected-io.mjs';
import {SPONSORED_SCOPE as S} from './lib/sponsored-scope-policy.mjs';
const revision='a'.repeat(40),accountId='b'.repeat(32),targetBranch='codex/synthetic-only';
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'modoo-namespace-test-'))),siteRoot=path.join(root,'site'),metadataRoot=path.join(root,'meta');
 fs.mkdirSync(path.join(siteRoot,'public/stock'),{recursive:true});fs.mkdirSync(path.join(siteRoot,'src/lib'),{recursive:true});fs.mkdirSync(metadataRoot);
 const payloads=new Map(),assets=S.items.map(i=>{const objectKey=S.date+'-'+i.slug+'.jpg',bytes=Buffer.from('SYNTHETIC-NEW-JPG-'+i.id),sourcePath=path.join(siteRoot,'public/stock',objectKey);fs.writeFileSync(sourcePath,bytes);payloads.set(i.id,bytes);return {id:i.id,slug:i.slug,objectKey,sourcePath,sha256:digest(bytes)};});
 // A pre-existing image is never part of the allowlist. Tripwire is installed
 // before issuing or running, including metadata preflight and later failures.
 const old=path.join(siteRoot,'public/stock/PROTECTED-OLD.jpg');fs.writeFileSync(old,'MUST NOT READ');
 const restore=[];for(const n of ['readFileSync','openSync','statSync','lstatSync','readdirSync','realpathSync','accessSync','existsSync','writeFileSync','appendFileSync','copyFileSync','cpSync','renameSync','unlinkSync','rmSync','createReadStream','createWriteStream']){const fn=fs[n],check=p=>assert.notEqual(String(p),old,'old image I/O '+n);fs[n]=function(...a){check(a[0]);if(['copyFileSync','cpSync','renameSync'].includes(n))check(a[1]);return fn.apply(this,a);};if(fn.native)fs[n].native=(...a)=>{check(a[0]);return fn.native(...a);};restore.push(()=>{fs[n]=fn;});}t.after(()=>{for(const r of restore)r();fs.rmSync(root,{recursive:true,force:true});});
 const pin=(name,value)=>saveNewJSON(path.join(metadataRoot,name+'.json'),value);
 const native=pin('native',{workId:S.workId,status:'CMS_INTAKEN_NOT_BUILT_OR_DEPLOYED',sameNativeObject:true,JSONRehydration:false,selectedCount:5,target:{siteRoot,revision},applied:{mode:'applied',operations:assets.map(a=>({type:'image',destination:a.sourcePath,digest:a.sha256}))}});
 const baseManifest=pin('base',{schema:'modoo-selected-r2-assets-v1',workId:S.workId,siteRoot,targetRevision:revision,bucket:'modooilbo-stock',publicBase:'https://img.modooilbo.com',selectedIds:assets.map(a=>a.id),assets,nativeReceipt:native});
 const registry=path.join(siteRoot,'src/lib/sponsored-image-routes.json');fs.writeFileSync(registry,JSON.stringify({schema:'modoo-sponsored-image-routes-v1',entries:[]}));
 const basis=pin('old-key-metadata',{keys:['protected-old.jpg','legacy.png']});
 const catalog={schema:'modoo-protected-r2-key-catalog-v1',issuer:'모두일보 배포 담당자',project:'modooilbo',bucket:'modooilbo-stock',accountId,siteRoot,completeProtectedCoverage:true,keys:['protected-old.jpg','legacy.png'],basis:[basis]};
 const control={workId:S.workId,siteRoot,accountId,issuer:'모두일보 배포 담당자',cooperativeWritersFrozen:true,namespaceSingleOwner:true,noIndependentWriterUsesTicket:true,acceptsNonAtomicCooperativeOwnership:true,claimsAtomicCreateOnly:false,expiresAt:new Date(Date.now()+3600000).toISOString()};
 const config={schema:'modoo-owned-r2-namespace-config-v1',workId:S.workId,siteRoot,targetRevision:revision,targetBranch,metadataRoot,accountId,baseManifest,registryBeforeSHA256:digest(fs.readFileSync(registry))};
 const readTarget=()=>({revision,branch:targetBranch});
 const issue=()=>{config.controls=pin('control',control);config.protectedCatalog=pin('catalog',catalog);return issueOwnedNamespace(pin('config',config),{siteRoot,targetRevision:revision,readTarget,uuid:()=> '11111111-2222-4333-8444-555555555555'});};
 return {root,metadataRoot,siteRoot,old,assets,payloads,config,control,catalog,pin,issue,readTarget,registry};
}
function transport(f,mode='success'){
 const events=[],keys=new Map(),command=args=>JSON.stringify(args[0]==='whoami'?{accounts:[{id:mode==='wrong-account'?'c'.repeat(32):accountId}]}:{type:mode==='unsupported-auth'?'api_key':'oauth',token:'SYNTHETIC_SECRET_NEVER_PERSIST'});
 const fetchImpl=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET';events.push({method,url});
  if(u.pathname.includes('/pages/projects/'))return Response.json({success:true,result:{name:'modooilbo',domains:[mode==='wrong-domain'?'other.example':'modooilbo.com']}});
  if(u.hostname==='api.cloudflare.com'&&method==='GET'){
   assert(u.searchParams.get('prefix').startsWith('release-media/'+S.workId+'/'));assert.equal(u.searchParams.get('per_page'),'1');
   return Response.json({success:true,result:mode==='occupied'?[{key:'already-there'}]:[],result_info:mode==='truncated'?{is_truncated:true}:{}});
  }
  if(method==='PUT'){
   const id=Number(u.pathname.match(/\/(\d+)\.jpg$/)?.[1]);assert(f.payloads.has(id));assert.equal(keys.has(id),false,'PUT retry');keys.set(id,u.pathname);assert.deepEqual(Buffer.from(options.body),f.payloads.get(id));
   if(mode==='partial-unknown'&&id===323)throw Error('SYNTHETIC_SECRET_NEVER_PERSIST');
   return new Response(null,{status:mode==='http-fail'?403:200});
  }
  assert.equal(u.hostname,'img.modooilbo.com');const id=Number(u.pathname.match(/\/(\d+)\.jpg$/)?.[1]);assert(keys.has(id),'CDN read before acknowledged PUT');
  return new Response(mode==='cdn-bad'?Buffer.from('wrong'):f.payloads.get(id));
 };
 return {command,fetchImpl,events,keys};
}
const run=(f,ref,io)=>runOwnedNamespace(ref,{siteRoot:f.siteRoot,targetRevision:revision,readTarget:f.readTarget,...io});
test('same auth exact5: prefix-only metadata, one PUT/key, only new CDN GET, persistent mapping reusable',async t=>{
 const f=fixture(t),ref=f.issue(),io=transport(f),r=await run(f,ref,io);assert.equal(r.exitCode,0);assert.equal(io.keys.size,5);assert.equal(r.events.filter(e=>e.phase==='SERVED_VERIFIED').length,5);assert.equal(r.events[1].atomicReservation,false);
 const registry=JSON.parse(fs.readFileSync(f.registry));assert.equal(registry.entries.length,5);assert(registry.entries.every(e=>e.publicURL.includes(e.sha256+'/'+e.id+'.jpg')));
 const before=fs.readFileSync(f.registry);assert.equal(persistOwnedRoutes(r.uploadReceipt,{siteRoot:f.siteRoot,metadataRoot:f.metadataRoot}).unchanged,true);assert.deepEqual(fs.readFileSync(f.registry),before);
 await assert.rejects(run(f,ref,io),/EEXIST/);assert.equal(io.keys.size,5);
});
for(const mode of ['wrong-account','unsupported-auth','wrong-domain','occupied','truncated'])test('no PUT for '+mode,async t=>{const f=fixture(t),ref=f.issue(),io=transport(f,mode),r=await run(f,ref,io);assert.equal(r.exitCode,1);assert.equal(io.keys.size,0);assert.equal(JSON.parse(fs.readFileSync(f.registry)).entries.length,0);});
test('unknown third PUT stops; no unknown-object GET, retry, delete or fourth PUT; credentials absent from saved evidence',async t=>{
 const f=fixture(t),ref=f.issue(),io=transport(f,'partial-unknown'),r=await run(f,ref,io);assert.equal(r.exitCode,1);assert.equal(io.keys.size,3);assert.equal(r.events.filter(e=>e.phase==='CREATED_ACK').length,2);assert.equal(io.events.filter(e=>new URL(e.url).hostname==='img.modooilbo.com').length,2);assert(!io.events.some(e=>e.method==='DELETE'));
 const dir=path.dirname(ref.file);for(const n of fs.readdirSync(dir))assert(!fs.readFileSync(path.join(dir,n),'utf8').includes('SYNTHETIC_SECRET_NEVER_PERSIST'));await assert.rejects(run(f,ref,io),/EEXIST/);
});
for(const mode of ['http-fail','cdn-bad'])test('first failure stops next PUT: '+mode,async t=>{const f=fixture(t),io=transport(f,mode),r=await run(f,f.issue(),io);assert.equal(r.exitCode,1);assert.equal(io.keys.size,1);assert.equal(JSON.parse(fs.readFileSync(f.registry)).entries.length,0);});
test('concurrent consumers: one O_EXCL attempt wins',async t=>{const f=fixture(t),ref=f.issue(),io=transport(f),runs=await Promise.allSettled([run(f,ref,io),run(f,ref,io)]);assert.equal(runs.filter(r=>r.status==='fulfilled'&&r.value.exitCode===0).length,1);assert.equal(runs.filter(r=>r.status==='rejected').length,1);assert.equal(io.keys.size,5);});
for(const [name,mutate]of [
 ['writer not frozen',f=>f.control.cooperativeWritersFrozen=false],['atomic claim',f=>f.control.claimsAtomicCreateOnly=true],['expired',f=>f.control.expiresAt='2000-01-01'],['unknown key coverage',f=>f.catalog.completeProtectedCoverage=false],['empty protection evidence',f=>{f.catalog.keys=[];f.catalog.basis=[f.pin('empty-basis',{keys:[]})];}],['missing source keys',f=>f.catalog.keys.push('unproven.jpg')],['existing canonical key',f=>{f.catalog.keys.push(f.assets[0].objectKey);f.catalog.basis.push(f.pin('collision-basis',{keys:[f.assets[0].objectKey]}));}],['namespace protected intersection',f=>{const key='release-media/'+S.workId+'/11111111-2222-4333-8444-555555555555/protected.jpg';f.catalog.keys.push(key);f.catalog.basis.push(f.pin('prefix-basis',{keys:[key]}));}],
])test('issue fails closed: '+name,t=>{const f=fixture(t);mutate(f);assert.throws(f.issue);});
test('new5 local SHA failure has zero auth/network; target drift rejected',async t=>{const f=fixture(t),ref=f.issue(),io=transport(f);fs.writeFileSync(f.assets[4].sourcePath,'changed');await assert.rejects(run(f,ref,io),/SHA/);assert.equal(io.events.length,0);await assert.rejects(run(f,ref,{...io,readTarget:()=>({revision:'c'.repeat(40),branch:targetBranch})}),/HEAD/);});
test('one work ticket cannot be issued twice even with another fresh UUID',t=>{const f=fixture(t);f.issue();assert.throws(()=>issueOwnedNamespace({file:path.join(f.metadataRoot,'config.json'),sha256:digest(fs.readFileSync(path.join(f.metadataRoot,'config.json')))},{siteRoot:f.siteRoot,targetRevision:revision,readTarget:f.readTarget}),/EEXIST/);});
test('existing auth capture preserves JSON in pipe and disables Wrangler disk/output files; subprocess errors cannot leak tokens',t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.siteRoot,'node_modules/wrangler'),{recursive:true});fs.writeFileSync(path.join(f.siteRoot,'node_modules/wrangler/package.json'),JSON.stringify({version:'4.148.0'}));
 const environment={WRANGLER_LOG:'error',WRANGLER_WRITE_LOGS:'true',WRANGLER_OUTPUT_FILE_PATH:'do-not-create',WRANGLER_OUTPUT_FILE_DIRECTORY:'do-not-create'};
 const result=existingWranglerCommand(f.siteRoot,['auth','token','--json'],{environment,execute:(command,args,options)=>{assert.deepEqual(args,['--cwd',f.siteRoot,'auth','token','--json']);assert.equal(options.env.WRANGLER_LOG,'log');assert.equal(options.env.WRANGLER_WRITE_LOGS,'false');assert.equal(options.env.WRANGLER_OUTPUT_FILE_PATH,undefined);assert.equal(options.env.WRANGLER_OUTPUT_FILE_DIRECTORY,undefined);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);return '{"type":"oauth","token":"synthetic"}';}});assert.equal(JSON.parse(result).type,'oauth');assert.equal(environment.WRANGLER_WRITE_LOGS,'true');
 assert.throws(()=>existingWranglerCommand(f.siteRoot,['auth','token','--json'],{execute:()=>{throw Error('DO_NOT_LEAK');}}),e=>!e.message.includes('DO_NOT_LEAK'));
 assert.throws(()=>existingWranglerCommand(f.siteRoot,['login'],{execute:()=>assert.fail('new login forbidden')}),/읽기 명령 외 금지/);fs.writeFileSync(path.join(f.siteRoot,'node_modules/wrangler/package.json'),JSON.stringify({version:'4.149.0'}));assert.throws(()=>existingWranglerCommand(f.siteRoot,['auth','token','--json'],{execute:()=>assert.fail('unverified version execution')}),/로그 차단 재검증 필요/);
});
