// Cooperative single-writer namespace transport. LIST→PUT is NOT atomic.
// No new credentials, global inventory, legacy GET, delete or upload retry.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SPONSORED_SCOPE as S} from './lib/sponsored-scope-policy.mjs';
import {digest,isSHA,sameSet,safeDir,regularBytes,pinnedJSON,saveNewJSON,boundedResponse} from './lib/protected-io.mjs';
import {loadSelectedR2Manifest,syncSelectedR2Assets} from './selected-r2-sync.mjs';
const PROJECT='modooilbo',BUCKET='modooilbo-stock',PUBLIC='https://img.modooilbo.com';
const die=m=>{const e=Error('신규 namespace 차단: '+m);e.code='OWNED_NAMESPACE_BLOCK';throw e;};
function target(root){const run=a=>execFileSync('git',['--no-optional-locks','-C',root,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();return {revision:run(['rev-parse','HEAD']),branch:run(['symbolic-ref','--short','HEAD'])};}
function stateDir(root){safeDir(root);const p=path.join(root,'owned-namespace-runs');try{fs.mkdirSync(p);}catch(e){if(e.code!=='EEXIST')throw e;}safeDir(p);return p;}
function controls(p,root){const c=pinnedJSON(p.controls,root);if(c.workId!==S.workId||c.siteRoot!==p.siteRoot||c.accountId!==p.accountId||c.issuer!=='모두일보 배포 담당자'||c.cooperativeWritersFrozen!==true||c.namespaceSingleOwner!==true||c.noIndependentWriterUsesTicket!==true||c.acceptsNonAtomicCooperativeOwnership!==true||c.claimsAtomicCreateOnly!==false||!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=Date.now())die('단독소유/협력 writer 동결/한계/기한 미확정');return c;}
function protection(p,root,base){
 const c=pinnedJSON(p.protectedCatalog,root);
 if(c.schema!=='modoo-protected-r2-key-catalog-v1'||c.issuer!=='모두일보 배포 담당자'||c.project!==PROJECT||c.bucket!==BUCKET||c.accountId!==p.accountId||c.siteRoot!==p.siteRoot||c.completeProtectedCoverage!==true||!Array.isArray(c.keys)||!c.keys.length||new Set(c.keys).size!==c.keys.length||c.keys.some(k=>typeof k!=='string'||!k||k.startsWith('/')||k.split('/').some(v=>v==='.'||v==='..'))||!Array.isArray(c.basis)||!c.basis.length)die('보호 이미지 키 전체 메타/경로 불변식 근거 필요');
 const known=[];for(const ref of c.basis){const b=pinnedJSON(ref,root);const keys=b.protectedKeys||b.keys||(b.files&&typeof b.files==='object'?Object.keys(b.files):null);if(!Array.isArray(keys))die('보호 키 원메타 형식 미확정');known.push(...keys);}
 if(!sameSet([...new Set(known)],c.keys))die('보호 키 원메타 coverage 불일치');
 if(c.keys.some(k=>k.startsWith(p.prefix))||base.assets.some(a=>c.keys.includes(a.objectKey)))die('보호 키/기존 논리 이미지와 교집합');
 return c;
}
function loadPlan(ref,{siteRoot,targetRevision}={}){
 const raw=pinnedJSON(ref,path.dirname(ref.file)),root=raw.metadataRoot;
 if(typeof root!=='string'||!ref.file.startsWith(root+path.sep)||root===siteRoot||root.startsWith(siteRoot+path.sep)||siteRoot.startsWith(root+path.sep))die('사이트 밖의 작업 메타 루트 필요');safeDir(root);
 if(raw.schema!=='modoo-owned-r2-namespace-plan-v1'||raw.workId!==S.workId||raw.siteRoot!==siteRoot||raw.targetRevision!==targetRevision||!/^[a-f0-9]{40}$/.test(targetRevision||'')||!/^[a-f0-9]{32}$/.test(raw.accountId||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(raw.uuid||'')||raw.prefix!==`release-media/${S.workId}/${raw.uuid}/`)die('고정 계획/신규 UUID/대상');
 if(path.dirname(ref.file)!==raw.runDir||!raw.runDir.startsWith(path.join(root,'owned-namespace-runs')+path.sep))die('계획 소유 run 디렉터리');safeDir(raw.runDir);
 const issue=pinnedJSON(raw.issueReceipt,root);if(issue.workId!==S.workId||issue.uuid!==raw.uuid||issue.prefix!==raw.prefix||issue.accountId!==raw.accountId||issue.siteRoot!==siteRoot)die('발급 소유 증거');
 const activeFile=path.join(root,'owned-namespace-runs',S.workId+'.active.json'),activeBytes=regularBytes(activeFile),active=JSON.parse(activeBytes);if(digest(activeBytes)!==issue.activeReceiptSHA256||active.uuid!==raw.uuid||active.prefix!==raw.prefix)die('활성 단독소유 ticket 변경');
 const base=loadSelectedR2Manifest(raw.baseManifest,{siteRoot,targetRevision,metadataRoot:root});if(base.workId!==S.workId||base.assets.length!==5)die('실제 신규5 native 명세');
 if(!sameSet(raw.assets?.map(a=>a.id+':'+a.slug+':'+a.logicalPath+':'+a.sourcePath+':'+a.sha256+':'+a.objectKey),base.assets.map(a=>a.id+':'+a.slug+':/stock/'+a.objectKey+':'+a.sourcePath+':'+a.sha256+':'+raw.prefix+a.sha256+'/'+a.id+'.jpg')))die('정확5 namespace allowlist');
 controls(raw,root);protection(raw,root,base);return {p:raw,base,root};
}
export function issueOwnedNamespace(configRef,{siteRoot,targetRevision,readTarget=target,uuid=randomUUID}={}){
 const c=pinnedJSON(configRef,path.dirname(configRef.file)),root=c.metadataRoot;
 if(c.schema!=='modoo-owned-r2-namespace-config-v1'||c.workId!==S.workId||c.siteRoot!==siteRoot||c.targetRevision!==targetRevision||typeof root!=='string'||!configRef.file.startsWith(root+path.sep)||root===siteRoot||root.startsWith(siteRoot+path.sep)||siteRoot.startsWith(root+path.sep)||!/^[a-f0-9]{32}$/.test(c.accountId||''))die('발급 config/계정/사이트 밖의 메타 대상');
 const t=readTarget(siteRoot);if(t.revision!==targetRevision||t.branch!==c.targetBranch)die('발급 target HEAD/branch');
 const base=loadSelectedR2Manifest(c.baseManifest,{siteRoot,targetRevision,metadataRoot:root});if(base.workId!==S.workId||base.assets.length!==5)die('신규5 범위');
 const id=uuid();if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))die('fresh UUID v4 필요');const prefix=`release-media/${S.workId}/${id}/`,draft={...c,uuid:id,prefix};controls(draft,root);protection(draft,root,base);
 const registry=path.join(siteRoot,'src/lib/sponsored-image-routes.json'),registryBytes=regularBytes(registry);if(digest(registryBytes)!==c.registryBeforeSHA256||JSON.parse(registryBytes).entries?.length!==0)die('이미 등록된 광고5/registry CAS 불일치');
 const parent=stateDir(root);const active=path.join(parent,S.workId+'.active.json');
 saveNewJSON(active,{workId:S.workId,uuid:id,prefix,accountId:c.accountId,siteRoot,configSHA256:configRef.sha256,createdAt:new Date().toISOString()});
 const runDir=fs.mkdtempSync(path.join(parent,'run-')),issueReceipt=saveNewJSON(path.join(runDir,'issued.json'),{workId:S.workId,uuid:id,prefix,accountId:c.accountId,siteRoot,activeReceiptSHA256:digest(regularBytes(active))});
 const p={...c,schema:'modoo-owned-r2-namespace-plan-v1',uuid:id,prefix,runDir,issueReceipt,config:configRef,assets:base.assets.map(a=>({...a,logicalPath:'/stock/'+a.objectKey,objectKey:prefix+a.sha256+'/'+a.id+'.jpg'}))};
 const ref=saveNewJSON(path.join(runDir,'plan.json'),p);loadPlan(ref,{siteRoot,targetRevision});return ref;
}
export function existingWranglerCommand(siteRoot,args,{execute=execFileSync,environment=process.env}={}){
 if(!['whoami --json','auth token --json'].includes(args.join(' ')))die('기존 인증 읽기 명령 외 금지');
 // auth token --json uses logger.log in this pinned release. WRANGLER_LOG=error
 // would suppress JSON; default disk logging would persist it. Both settings
 // are process-local and verified against the installed implementation.
 const env={...environment,CI:'true',WRANGLER_SEND_METRICS:'false',WRANGLER_LOG:'log',WRANGLER_WRITE_LOGS:'false',NO_COLOR:'1'};
 delete env.WRANGLER_OUTPUT_FILE_PATH;delete env.WRANGLER_OUTPUT_FILE_DIRECTORY;
 try{const packageFile=fs.realpathSync(path.join(siteRoot,'node_modules/wrangler/package.json'));if(JSON.parse(regularBytes(packageFile)).version!=='4.148.0')die('Wrangler 인증 출력/로그 차단 재검증 필요');return execute(path.join(siteRoot,'node_modules/.bin/wrangler'),['--cwd',siteRoot,...args],{encoding:'utf8',maxBuffer:128*1024,stdio:['ignore','pipe','pipe'],env});}catch(e){if(e?.code==='OWNED_NAMESPACE_BLOCK')throw e;die('기존 Wrangler 인증 확인 실패; 로그인/발급/프로필 변경 없음');}
}
async function existingAuth(p,command,fetchImpl){
 let who,auth;try{who=JSON.parse(command(['whoami','--json']));auth=JSON.parse(command(['auth','token','--json']));}catch{die('기존 인증 JSON 확인 실패');}
 if(!Array.isArray(who.accounts)||!who.accounts.some(a=>a.id===p.accountId)||!['oauth','api_token'].includes(auth.type)||typeof auth.token!=='string'||!auth.token)die('승인 계정/기존 인증 종류 불일치');
 const request=async(url,init={})=>{try{return await fetchImpl(url,{...init,headers:{...init.headers,authorization:'Bearer '+auth.token},redirect:'error',signal:AbortSignal.timeout(30000)});}catch{die('API 응답 불명; 자동 재전송 없음');}};
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+p.accountId;
 const project=await request(endpoint+'/pages/projects/'+PROJECT);if(!project.ok)die('승인 Pages 계정 확인 HTTP '+project.status);let body;try{body=JSON.parse((await boundedResponse(project,128*1024)).toString());}catch{die('승인 프로젝트 메타 응답 불완전');}
 if(body.success!==true||body.result?.name!==PROJECT||!body.result.domains?.some(d=>['modooilbo.com','www.modooilbo.com'].includes(d)))die('승인 사이트/계정 domain 결속 불일치');
 return {endpoint,request}; // token remains only in this request closure.
}
export function persistOwnedRoutes(uploadRef,{siteRoot,metadataRoot}={}){
 const u=pinnedJSON(uploadRef,metadataRoot);if(u.status!=='OWNED_NEW5_UPLOADED_AND_SERVED'||u.workId!==S.workId||u.siteRoot!==siteRoot||u.entries?.length!==5||u.accountVerified!==true||u.atomicCreateOnly!==false)die('완료 업로드 수령증 필요');
 const {p,base}=loadPlan(u.plan,{siteRoot,targetRevision:u.targetRevision});
 if(u.entries.some(r=>!Number.isSafeInteger(r.bytes)||r.bytes<=0)||!sameSet(u.entries.map(r=>r.id+':'+r.slug+':'+r.logicalPath+':'+r.publicURL+':'+r.sha256),p.assets.map(a=>a.id+':'+a.slug+':'+a.logicalPath+':'+PUBLIC+'/'+a.objectKey+':'+a.sha256)))die('업로드/영속 매핑 allowlist');
 const file=path.join(siteRoot,'src/lib/sponsored-image-routes.json'),before=regularBytes(file),existing=JSON.parse(before);
 if(existing.schema!=='modoo-sponsored-image-routes-v1')die('registry schema');
 const entries=u.entries.map(e=>({...e,workId:S.workId,uploadReceiptSHA256:uploadRef.sha256,nativeReceiptSHA256:base.nativeReceipt.sha256}));
 if(JSON.stringify(existing.entries)===JSON.stringify(entries))return {file,sha256:digest(before),unchanged:true};
 if(existing.entries?.length!==0||digest(before)!==p.registryBeforeSHA256)die('기존 매핑 변경/덮기 금지');
 const lock=path.join(p.runDir,'registry-write.lock');saveNewJSON(lock,{uploadSHA256:uploadRef.sha256});
 const bytes=Buffer.from(JSON.stringify({schema:'modoo-sponsored-image-routes-v1',entries},null,2)+'\n'),temp=file+'.'+p.uuid+'.tmp';
 fs.writeFileSync(temp,bytes,{flag:'wx'});if(digest(regularBytes(file))!==p.registryBeforeSHA256)die('registry 변경 경쟁');fs.renameSync(temp,file);
 return {file,sha256:digest(bytes)};
}
export async function runOwnedNamespace(planRef,{siteRoot,targetRevision,readTarget=target,command,fetchImpl=fetch,persist=true}={}){
 const {p,base,root}=loadPlan(planRef,{siteRoot,targetRevision}),t=readTarget(siteRoot);if(t.revision!==targetRevision||t.branch!==p.targetBranch)die('현재 HEAD/branch 변경');
 const buffers=new Map();await syncSelectedR2Assets(base,{dryRun:true,readAsset:(file,max)=>{const b=regularBytes(file,max);buffers.set(file,b);return b;}});
 const lock=path.join(p.runDir,'attempt.json');saveNewJSON(lock,{planSHA256:planRef.sha256,startedAt:new Date().toISOString()});
 const journal=path.join(p.runDir,'wal.jsonl'),fd=fs.openSync(journal,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600),events=[];
 const log=e=>{const event={...e,at:new Date().toISOString()};events.push(event);fs.writeSync(fd,JSON.stringify(event)+'\n');fs.fsyncSync(fd);};
 const entries=[];let failure,uploadRef,mapping;
 try{
  log({phase:'CLAIMED',planSHA256:planRef.sha256});const auth=await existingAuth(p,command||((args)=>existingWranglerCommand(siteRoot,args)),fetchImpl);
  const url=auth.endpoint+'/r2/buckets/'+BUCKET+'/objects?prefix='+encodeURIComponent(p.prefix)+'&per_page=1',listed=await auth.request(url);
  if(!listed.ok)die('새 prefix 메타 HTTP '+listed.status);let list;try{list=JSON.parse((await boundedResponse(listed,128*1024)).toString());}catch{die('새 prefix 메타 형식');}
  if(list.success!==true||!Array.isArray(list.result)||list.result.length||list.result_info?.is_truncated===true||list.result_info?.cursor||list.result_info?.delimited?.length)die('새 namespace가 비어있지 않거나 완전성 미확정');
  log({phase:'PREFIX_OBSERVED_EMPTY',atomicReservation:false});
  for(const a of p.assets){
   loadPlan(planRef,{siteRoot,targetRevision});const nowTarget=readTarget(siteRoot);if(nowTarget.revision!==targetRevision||nowTarget.branch!==p.targetBranch)die('업로드 중 target 변경');
   if(events.some(e=>e.phase==='PUT_INTENT'&&e.key===a.objectKey))die('키별1시도');
   const bytes=buffers.get(a.sourcePath);if(!bytes||digest(bytes)!==a.sha256)die('신규 JPG 봉인 변경');
   log({phase:'PUT_INTENT',key:a.objectKey,sha256:a.sha256});
   const put=await auth.request(auth.endpoint+'/r2/buckets/'+BUCKET+'/objects/'+a.objectKey,{method:'PUT',headers:{'content-type':'image/jpeg','content-length':String(bytes.length),'cache-control':'public, max-age=31536000, immutable'},body:bytes});
   if(!put.ok)die('신규 PUT 결과/HTTP '+put.status+'; 자동 재전송 없음');void put.body?.cancel().catch(()=>{});log({phase:'CREATED_ACK',key:a.objectKey});
   let served;try{served=await fetchImpl(PUBLIC+'/'+a.objectKey,{redirect:'error',signal:AbortSignal.timeout(30000)});}catch{die('새 객체 서빙 결과 불명');}
   if(!served.ok)die('새 객체 서빙 HTTP '+served.status);const remote=await boundedResponse(served,bytes.length);
   if(remote.length!==bytes.length||digest(remote)!==a.sha256)die('새 객체 서빙 SHA/크기 불일치');
   entries.push({id:a.id,slug:a.slug,logicalPath:a.logicalPath,publicURL:PUBLIC+'/'+a.objectKey,sha256:a.sha256,bytes:bytes.length});log({phase:'SERVED_VERIFIED',key:a.objectKey,sha256:a.sha256});
  }
  uploadRef=saveNewJSON(path.join(p.runDir,'upload-receipt.json'),{schema:'modoo-owned-r2-upload-v1',status:'OWNED_NEW5_UPLOADED_AND_SERVED',workId:S.workId,siteRoot,targetRevision,plan:planRef,entries,accountVerified:true,accountId:p.accountId,atomicCreateOnly:false,ownershipModel:'COOPERATIVE_SINGLE_WRITER_FRESH_NAMESPACE',legacyProbes:0,existingObjectReplacementsAttempted:0});
  if(persist)mapping=persistOwnedRoutes(uploadRef,{siteRoot,metadataRoot:root});log({phase:'COMPLETE',uploadReceiptSHA256:uploadRef.sha256,mappingSHA256:mapping?.sha256||null});
 }catch(e){failure=e?.code==='OWNED_NAMESPACE_BLOCK'?e.message:'신규 namespace 단계 실패; WAL 확인, 자동 덮기/삭제/재전송 없음';log({phase:'FAILED_NO_AUTORETRY',reason:failure,createdAcknowledgements:events.filter(e=>e.phase==='CREATED_ACK').length,verified:entries.length});}finally{fs.closeSync(fd);}
 const receipt=saveNewJSON(path.join(p.runDir,'run-result.json'),{workId:S.workId,status:failure?'FAILED_NOT_RELEASE_APPROVED':'OWNED_NEW5_READY',plan:planRef,uploadReceipt:uploadRef||null,mapping:mapping||null,createdAcknowledgements:events.filter(e=>e.phase==='CREATED_ACK').length,verified:entries.length,exception:failure||null,atomicCreateOnly:false,legacyProbes:0,remoteDeletes:0});
 return {exitCode:failure?1:0,receipt,uploadReceipt:uploadRef,mapping,events};
}
export async function runOwnedNamespaceCLI(args,{siteRoot}={}){
 const value=n=>args[args.indexOf(n)+1],allowed=new Set(['--selected-manifest','--selected-manifest-sha256','--target-revision','--preview']);const seen=new Set();
 for(let i=0;i<args.length;i++){if(!allowed.has(args[i])||seen.has(args[i]))die('지원하지 않는 namespace 옵션');seen.add(args[i]);if(args[i]!=='--preview'){if(!args[i+1]||args[i+1].startsWith('--'))die('옵션 값 누락');i++;}}
 const r=await runOwnedNamespace({file:value('--selected-manifest'),sha256:value('--selected-manifest-sha256')},{siteRoot,targetRevision:value('--target-revision')});console.log(JSON.stringify({exitCode:r.exitCode,receipt:r.receipt}));return r.exitCode;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [action,file,sha256,revision]=process.argv.slice(2),siteRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');if(action!=='issue')die('Usage: namespace-r2.mjs issue CONFIG_JSON SHA256 TARGET_REVISION');const ref=issueOwnedNamespace({file,sha256},{siteRoot,targetRevision:revision});console.log(JSON.stringify(ref));}catch(e){console.error(e?.code==='OWNED_NAMESPACE_BLOCK'?e.message:'namespace 준비 실패; 명세 입력을 확인하세요. 인증 값 출력 없음.');process.exitCode=1;}
}
