// New selected assets only. No directory inventory, legacy cache, original CMS,
// remote legacy GET, replacement, deletion or credential discovery fallback.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,createHmac} from 'node:crypto';
import {SPONSORED_SCOPE} from './lib/sponsored-scope-policy.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const validSHA=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fail=m=>{throw Error('선택 R2 차단: '+m);};
const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i]);
const admitted=new WeakMap();
function safeDirectory(directory) {
  if(!path.isAbsolute(directory)||path.resolve(directory)!==directory)fail('정규 절대 디렉터리 필요');
  let p=path.parse(directory).root;
  for(const part of directory.slice(p.length).split(path.sep).filter(Boolean)) {
    p=path.join(p,part);const s=fs.lstatSync(p);
    if(s.isSymbolicLink()||!s.isDirectory())fail('디렉터리 symlink/파일 금지');
  }
}
function readRegular(file,maxBytes) {
  safeDirectory(path.dirname(file));
  const before=fs.lstatSync(file,{bigint:true});
  if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>BigInt(maxBytes))fail('독립 일반파일/크기 계약');
  const fingerprint=s=>['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].map(k=>String(s[k])).join(':');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let bytes;
  try{if(fingerprint(before)!==fingerprint(fs.fstatSync(fd,{bigint:true})))fail('입력 열기 경쟁');const buffer=Buffer.alloc(Number(before.size)+1);let count=0;while(count<buffer.length){const n=fs.readSync(fd,buffer,count,buffer.length-count,null);if(!n)break;count+=n;}if(count!==Number(before.size))fail('읽기 중 입력 크기 변경');bytes=buffer.subarray(0,count);}finally{fs.closeSync(fd);}
  if(fingerprint(before)!==fingerprint(fs.lstatSync(file,{bigint:true})))fail('읽기 중 입력 변경');
  return bytes;
}
function json(ref,metadataRoot) {
  if(!ref||typeof ref.file!=='string'||!ref.file.endsWith('.json')||path.resolve(ref.file)!==ref.file||!ref.file.startsWith(metadataRoot+path.sep)||!validSHA(ref.sha256))fail('고정된 작업 JSON 필요');
  const bytes=readRegular(ref.file,10*1024*1024);if(sha(bytes)!==ref.sha256)fail('JSON SHA 변경');return JSON.parse(bytes);
}
export function loadSelectedR2Manifest(ref,{siteRoot,targetRevision,metadataRoot=path.dirname(ref.file)}) {
  safeDirectory(metadataRoot);
  if(!/^[a-f0-9]{40}$/.test(targetRevision||''))fail('현재 target revision 필요');
  const m=json(ref,metadataRoot);
  if(m.schema!=='modoo-selected-r2-assets-v1'||m.siteRoot!==siteRoot||m.targetRevision!==targetRevision||typeof m.workId!=='string'||!/^MOD-[A-Z0-9-]+$/.test(m.workId)||!Array.isArray(m.assets)||m.assets.length>100||!sameSet(m.assets.map(a=>String(a.id)),m.selectedIds?.map(String)))fail('명세/대상/정확 선택집합');
  if(m.bucket!=='modooilbo-stock'||m.publicBase!=='https://img.modooilbo.com')fail('승인된 기존 R2 대상만 허용');
  if(m.workId===SPONSORED_SCOPE.workId && (m.assets.length!==5 || SPONSORED_SCOPE.items.some(i=>m.assets.filter(a=>String(a.id)===String(i.id)&&a.slug===i.slug&&a.objectKey===SPONSORED_SCOPE.date+'-'+i.slug+'.jpg').length!==1)))fail('광고321~325 정확 신규5 이미지 필요');
  const n=json(m.nativeReceipt,metadataRoot),t=n.target;
  const nativeRevision=t?.revision||t?.base;
  if(nativeRevision!==targetRevision){
    const b=json(m.nativeRevisionBridge,metadataRoot);
    if(b.schema!=='modoo-selected-native-revision-bridge-v1'||b.workId!==m.workId||b.issuer!=='모두일보 배포 담당자'||b.siteRoot!==siteRoot||b.nativeReceiptSHA256!==m.nativeReceipt.sha256||b.fromRevision!==nativeRevision||!/^[a-f0-9]{40}$/.test(b.fromRevision||'')||b.toRevision!==targetRevision||b.verifiedGitHead!==true||!sameSet(b.assetBindings?.map(a=>a.objectKey+':'+a.sha256),m.assets.map(a=>a.objectKey+':'+a.sha256)))fail('native 인수 base→출시 commit 선택이미지 bridge 미결속');
  }
  if(m.assets.length===0&&n.schema==='modoo-code-release-no-new-images-v1'&&n.workId===m.workId&&n.newImageCount===0&&n.publisherVerifiedNoNewImages===true&&t?.siteRoot===siteRoot&&t?.revision===targetRevision){
    admitted.set(m,{digest:sha(JSON.stringify(m)),ref,metadataRoot});return m;
  }
  if(m.assets.length===0)fail('빈 명세에는 명시적 신규이미지 없음 수령증 필요');
  if(n.workId!==m.workId||n.status!=='CMS_INTAKEN_NOT_BUILT_OR_DEPLOYED'||n.sameNativeObject!==true||n.JSONRehydration!==false||n.selectedCount!==m.assets.length||(t?.siteRoot||t?.repo)!==siteRoot||n.applied?.mode!=='applied')fail('선택 신규이미지 소유/실제 native 인수 수령증');
  const images=n.applied.operations.filter(a=>a.type==='image');
  if(images.length!==m.assets.length||new Set(images.map(i=>i.destination)).size!==images.length||new Set(m.assets.map(a=>a.objectKey)).size!==m.assets.length)fail('신규 이미지 완전 커버리지');
  const approved=images.map(i=>i.destination);
  // Validate every path before the first filesystem call on any asset.
  for(const a of m.assets) {
    if(typeof a.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)||!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/.test(a.objectKey||'')||!a.objectKey.endsWith('-'+a.slug+'.jpg')||a.sourcePath!==path.join(siteRoot,'public','stock',a.objectKey)||!approved.includes(a.sourcePath)||!validSHA(a.sha256)||images.filter(i=>i.destination===a.sourcePath&&i.digest===a.sha256).length!==1)fail('이미지 allowlist/경로/소유 SHA 불일치');
  }
  admitted.set(m,{digest:sha(JSON.stringify(m)),ref,metadataRoot});return m;
}
const hmac=(key,data)=>createHmac('sha256',key).update(data).digest();
export function signV4({method,url,headers,body,accessKeyId,secretAccessKey,region='auto',service='s3',now=new Date()}) {
  const u=new URL(url),stamp=now.toISOString().replace(/[:-]|\.\d{3}/g,''),day=stamp.slice(0,8);
  const all=Object.fromEntries(Object.entries({...headers,host:u.host,'x-amz-date':stamp,'x-amz-content-sha256':sha(body)}).map(([k,v])=>[k.toLowerCase(),String(v).trim().replace(/\s+/g,' ')]));
  const names=Object.keys(all).sort(),canonicalHeaders=names.map(k=>k+':'+all[k]+'\n').join('');
  if(u.search)fail('서명 URL query는 사용하지 않습니다');
  const canonical=[method,u.pathname,'',canonicalHeaders,names.join(';'),sha(body)].join('\n');
  const scope=day+'/'+region+'/'+service+'/aws4_request';
  const text=['AWS4-HMAC-SHA256',stamp,scope,sha(canonical)].join('\n');
  const key=hmac(hmac(hmac(hmac('AWS4'+secretAccessKey,day),region),service),'aws4_request');
  const signature=createHmac('sha256',key).update(text).digest('hex');
  return {...all,authorization:'AWS4-HMAC-SHA256 Credential='+accessKeyId+'/'+scope+', SignedHeaders='+names.join(';')+', Signature='+signature};
}
export function conditionalS3Transport({env=process.env,fetchImpl=fetch,now=()=>new Date()}={}) {
  const accountId=env.R2_ACCOUNT_ID||env.CLOUDFLARE_ACCOUNT_ID,accessKeyId=env.R2_ACCESS_KEY_ID,secretAccessKey=env.R2_SECRET_ACCESS_KEY;
  if(!/^[a-f0-9]{32}$/.test(accountId||'')||!accessKeyId||!secretAccessKey)fail('기존 승인된 R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY 필요; 인증 설정 변경·전체동기화 fallback 금지');
  return async ({bucket,objectKey,bytes,digest})=>{
    const url='https://'+accountId+'.r2.cloudflarestorage.com/'+bucket+'/'+encodeURIComponent(objectKey);
    const headers=signV4({method:'PUT',url,body:bytes,accessKeyId,secretAccessKey,now:now(),headers:{'content-type':'image/jpeg','cache-control':'public, max-age=31536000, immutable','if-none-match':'*','x-amz-meta-sha256':digest}});
    let response;try{response=await fetchImpl(url,{method:'PUT',headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(30000)});}catch{fail('선택 신규 PUT 결과 불명; 자동 재전송/기존원격 비교 금지');}
    if(response.status===412)fail('원격 키가 이미 존재; 기존 이미지 덮어쓰기 금지');
    if(!response.ok)fail('선택 신규 PUT HTTP '+response.status);
    return {created:true,objectKey,sha256:digest};
  };
}
export async function syncSelectedR2Assets(m,{putNew,fetchImpl=fetch,readAsset=readRegular,dryRun=false}={}) {
  const auth=admitted.get(m);
  const fresh=()=>{if(!auth||auth.digest!==sha(JSON.stringify(m)))fail('실제 명세 admission 봉인/JSON 재수화/변조');json(auth.ref,auth.metadataRoot);json(m.nativeReceipt,auth.metadataRoot);if(m.nativeRevisionBridge)json(m.nativeRevisionBridge,auth.metadataRoot);};
  fresh();
  const buffers=[];
  for(const a of m.assets) {
    const bytes=readAsset(a.sourcePath,1024*1024);
    if(sha(bytes)!==a.sha256)fail('선택 신규 파일 SHA 변경');
    buffers.push({a,bytes});
  }
  if(dryRun)return {status:'DRY_RUN_NEW_ASSETS_ONLY',assets:m.assets.map(a=>({id:a.id,objectKey:a.objectKey,sha256:a.sha256})),uploaded:0};
  if(m.assets.length&&!putNew)fail('원자적 신규 생성 transport 필요');
  const completed=[],created=[];
  try {
    for(const {a,bytes} of buffers) {
      fresh();
      const ack=await putNew({bucket:m.bucket,objectKey:a.objectKey,bytes,digest:a.sha256});
      if(ack?.created!==true||ack.objectKey!==a.objectKey||ack.sha256!==a.sha256)fail('선택 신규 PUT 확인 불충분');
      created.push({id:a.id,objectKey:a.objectKey,sha256:a.sha256,servingVerified:false});
      // Only this invocation's newly created objects are fetched. Never a legacy key.
      const url=m.publicBase+'/'+a.objectKey+'?selected-sha='+a.sha256;
      let response;try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(30000)});}catch{fail('신규 업로드 객체 서빙 확인 실패');}
      if(!response.ok)fail('신규 이미지 서빙 HTTP '+response.status);
      if(response.headers?.get('content-length')!==null&&response.headers?.get('content-length')!==undefined&&Number(response.headers.get('content-length'))!==bytes.length)fail('신규 이미지 서빙 크기 불일치');
      if(!response.body?.getReader)fail('크기 제한 가능한 응답 스트림 필요');
      const reader=response.body.getReader(),chunks=[];let total=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>bytes.length){await reader.cancel();fail('신규 이미지 응답 크기 초과');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
      const remote=Buffer.concat(chunks,total);
      if(remote.length!==bytes.length||sha(remote)!==a.sha256)fail('신규 이미지 서빙 SHA 불일치');
      completed.push({id:a.id,objectKey:a.objectKey,sha256:a.sha256});
      created.at(-1).servingVerified=true;
    }
  }catch(e){e.selectedProgress=completed;e.createdObjects=created;throw e;}
  if(completed.length!==m.assets.length)fail('선택 신규 이미지 누락');
  return {status:'SELECTED_NEW_IMAGES_CREATED_AND_SERVED',uploaded:completed.length,completed,legacyProbes:0,existingLocalImageReads:0,existingObjectReplacements:0};
}
export async function runSelectedR2CLI(args,{siteRoot}={}) {
  const value=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  const allowed=new Set(['--selected-manifest','--selected-manifest-sha256','--target-revision','--preview','--dry-run']);
  const seen=new Set();
  for(let i=0;i<args.length;i++){if(!allowed.has(args[i])||seen.has(args[i]))fail('선택 모드에 허용되지 않은 옵션/중복');seen.add(args[i]);if(!['--preview','--dry-run'].includes(args[i])){if(!args[i+1]||args[i+1].startsWith('--'))fail('선택 옵션 값 누락');i++;}}
  const ref={file:value('--selected-manifest'),sha256:value('--selected-manifest-sha256')};
  if(typeof ref.file!=='string'||!path.isAbsolute(ref.file))fail('선택 명세 절대 경로 필요');
  const header=json(ref,path.dirname(ref.file));
  if(header.schema==='modoo-owned-r2-namespace-plan-v1')return (await import('./namespace-r2.mjs')).runOwnedNamespaceCLI(args,{siteRoot});
  const m=loadSelectedR2Manifest(ref,{siteRoot,targetRevision:value('--target-revision')});
  const receiptParent=path.join(path.dirname(ref.file),'r2-selected-runs');
  try{safeDirectory(receiptParent);}catch(e){if(e.code!=='ENOENT')throw e;fs.mkdirSync(receiptParent);safeDirectory(receiptParent);}
  const runDir=fs.mkdtempSync(path.join(receiptParent,'run-'));let result,exception;
  try{const dryRun=args.includes('--dry-run');const putNew=dryRun||m.assets.length===0?undefined:conditionalS3Transport();result=await syncSelectedR2Assets(m,{dryRun,putNew});}
  catch(e){exception=e.message;result={status:'FAILED_NOT_RELEASE_APPROVED',completed:e.selectedProgress||[],createdObjects:e.createdObjects||[]};}
  const receipt={schema:'modoo-selected-r2-receipt-v1',workId:m.workId,manifest:ref,targetRevision:m.targetRevision,...result,exception:exception||null,legacyProbes:0,globalStockScans:0};
  fs.writeFileSync(path.join(runDir,'receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
  console.log(JSON.stringify({status:receipt.status,selected:m.assets.length,runDir}));
  return exception?1:0;
}
