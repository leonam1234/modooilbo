// Normal full build in a source view that never contains original stock media.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {digest,isSHA,sameSet,safeDir,regularBytes,pinnedJSON,saveNewJSON} from './lib/protected-io.mjs';
import {SPONSORED_SCOPE as S} from './lib/sponsored-scope-policy.mjs';
export const PROTECTED_BUILD_TOOLS=['package.json','package-lock.json','next.config.mjs','tsconfig.json','tsconfig.functions.json','scripts/protected-build.mjs','scripts/protected-build-guard.cjs','scripts/lib/protected-io.mjs','scripts/lib/protected-build-runtime.mjs','scripts/lib/core-artifact.mjs','scripts/lib/sponsored-scope-policy.mjs','scripts/namespace-r2.mjs','scripts/selected-r2-sync.mjs','scripts/build-content.mjs','scripts/build-trending-data.mjs','scripts/convert-webp.mjs','scripts/deploy.mjs','scripts/deploy-safety.mjs','scripts/release-artifact.mjs','src/lib/stock.ts','src/lib/sponsors.ts','src/lib/sponsored-image-routing.ts','src/lib/protected-media-size.ts','src/app/rss.xml/route.ts'];
const fail=m=>{throw Error('보호 빌드 차단: '+m);};
const under=(p,r)=>p===r||p.startsWith(r+path.sep);
const stable=v=>JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))));
export function protectedBuildToolHashes(siteRoot){return Object.fromEntries(PROTECTED_BUILD_TOOLS.map(n=>[n,digest(regularBytes(path.join(siteRoot,n)))]));}
export function validateProtectedBuild(ref,{siteRoot,targetRevision}){
 const p=pinnedJSON(ref,path.dirname(ref.file)),root=p.metadataRoot;
 if(p.schema!=='modoo-protected-build-v1'||p.workId!==S.workId||p.siteRoot!==siteRoot||p.targetRevision!==targetRevision||typeof root!=='string'||!ref.file.startsWith(root+path.sep)||!/^[a-f0-9]{40}$/.test(targetRevision||'')||!p.targetBranch||p.writersFrozen!==true||p.sourceCodeAndCMSAtPinnedCommit!==true)fail('범위/현재 source commit/동결 명세');safeDir(root);
 if(under(root,siteRoot)||under(siteRoot,root))fail('빌드 메타/출력은 실제 source와 분리');
 for(const name of PROTECTED_BUILD_TOOLS)if(!isSHA(p.sourceToolHashes?.[name])||digest(regularBytes(path.join(siteRoot,name)))!==p.sourceToolHashes[name])fail('현재 source tool SHA: '+name);
 const upload=pinnedJSON(p.uploadReceipt,root),bridge=pinnedJSON(p.releaseBridge,root),routesBytes=regularBytes(path.join(siteRoot,'src/lib/sponsored-image-routes.json')),routes=JSON.parse(routesBytes);
 if(upload.status!=='OWNED_NEW5_UPLOADED_AND_SERVED'||upload.workId!==S.workId||upload.siteRoot!==siteRoot||upload.accountVerified!==true||upload.atomicCreateOnly!==false||upload.entries?.length!==5||digest(routesBytes)!==p.mappingSHA256||routes.schema!=='modoo-sponsored-image-routes-v1'||routes.entries?.length!==5)fail('업로드/영속 매핑 성공 결속');
 const binding=a=>a.id+':'+a.logicalPath+':'+a.publicURL+':'+a.sha256+':'+a.bytes;
 if(!sameSet(routes.entries.map(binding),upload.entries.map(binding))||routes.entries.some(e=>e.uploadReceiptSHA256!==p.uploadReceipt.sha256))fail('정확5 매핑 SHA/URL/size');
 const ids=routes.entries.map(r=>r.id);if(!sameSet(ids,S.items.map(i=>i.id))||S.items.some(i=>!routes.entries.some(r=>r.id===i.id&&r.slug===i.slug&&r.logicalPath==='/stock/'+S.date+'-'+i.slug+'.jpg'&&isSHA(r.sha256)&&Number.isSafeInteger(r.bytes)&&r.bytes>0&&r.publicURL.startsWith('https://img.modooilbo.com/release-media/'+S.workId+'/'))))fail('정확 광고5 논리/공개 매핑');
 if(bridge.schema!=='modoo-protected-release-bind-v1'||bridge.issuer!=='모두일보 배포 담당자'||bridge.workId!==S.workId||bridge.siteRoot!==siteRoot||bridge.fromRevision!==upload.targetRevision||bridge.toRevision!==targetRevision||bridge.targetBranch!==p.targetBranch||bridge.uploadReceiptSHA256!==p.uploadReceipt.sha256||bridge.mappingSHA256!==p.mappingSHA256||bridge.sourceAtCommitVerified!==true||!sameSet(bridge.assetBindings?.map(a=>a.logicalPath+':'+a.sha256),routes.entries.map(a=>a.logicalPath+':'+a.sha256)))fail('native/upload→현재 출시 commit bridge');
 const cache=pinnedJSON(p.legacyMediaCache,root);
 if(cache.schema!=='modoo-protected-build-cache-v1'||cache.siteRoot!==siteRoot||cache.issuer!=='모두일보 배포 담당자'||cache.validMetadataReuse!==true||!Array.isArray(cache.webpFiles)||!cache.sizes||!cache.fallbackBySlug||!Array.isArray(cache.protectedLocalPaths)||!cache.protectedLocalPaths.includes(path.join(siteRoot,'public/stock'))||cache.protectedLocalPaths.some(q=>!path.isAbsolute(q)||path.resolve(q)!==q||!under(q,path.join(siteRoot,'public'))))fail('유효 기존 WebP/크기/보호경로 메타 필요');
 const webp=pinnedJSON(cache.webpManifest,root),size=pinnedJSON(cache.sizeMetadata,root),fallback=pinnedJSON(cache.fallbackMetadata,root);
 if(!sameSet(cache.webpFiles,webp)||cache.webpFiles.some(n=>typeof n!=='string'||!n.endsWith('.jpg')||n.includes('/'))||stable(cache.sizes)!==stable(size.sizes||{})||stable(cache.fallbackBySlug)!==stable(fallback.fallbackBySlug||{}))fail('기존 생성 메타 원증거 SHA/내용');
 if(Object.values(cache.sizes).some(v=>v!==null&&(!Number.isSafeInteger(v)||v<=0))||Object.values(cache.fallbackBySlug).some(v=>typeof v!=='string'||!v||(!v.startsWith('/stock/')&&!v.startsWith('https://img.modooilbo.com/'))))fail('크기/기존 fallback 메타 형식');
 return {p,cache,routes};
}
export function createProtectedBuildView(ref,{siteRoot,targetRevision}={}){
 const {p,cache}=validateProtectedBuild(ref,{siteRoot,targetRevision}),parent=path.join(p.metadataRoot,'protected-build-runs');try{fs.mkdirSync(parent);}catch(e){if(e.code!=='EEXIST')throw e;}safeDir(parent);const runDir=fs.mkdtempSync(path.join(parent,'build-')),stage=path.join(runDir,'source');fs.mkdirSync(stage);
 const blocked=cache.protectedLocalPaths,copied=[];
 function copy(source,dest){
  if(blocked.some(b=>under(source,b)))return;
  const stat=fs.lstatSync(source);if(stat.isSymbolicLink())fail('source view symlink 금지');
  if(stat.isDirectory()){fs.mkdirSync(dest,{recursive:true});for(const n of fs.readdirSync(source))copy(path.join(source,n),path.join(dest,n));}
  else if(stat.isFile()){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);copied.push(path.relative(siteRoot,source));}else fail('source 파일 형식');
 }
 // Explicit build inputs, no .git/.env/out/.next or original stock. Existing CMS
 // data copies/reads are necessary static generation I/O, not fact re-review.
 for(const name of ['src','content','public','functions','scripts','db','docs','wiki']){const from=path.join(siteRoot,name);if(fs.existsSync(from))copy(from,path.join(stage,name));}
 const rootFiles=fs.readdirSync(siteRoot).filter(n=>/^(?:package(?:-lock)?\.json|next\.config\.(?:mjs|js|ts)|next-env\.d\.ts|tsconfig(?:\.[\w-]+)?\.json|postcss\.config\.[\w]+|tailwind\.config\.[\w]+|wrangler\.(?:jsonc|json|toml)|worker-configuration\.d\.ts)$/.test(n));
 for(const name of rootFiles)copy(path.join(siteRoot,name),path.join(stage,name));
 const dependencies=fs.realpathSync(path.join(siteRoot,'node_modules'));fs.symlinkSync(dependencies,path.join(stage,'node_modules'),'dir');
 fs.mkdirSync(path.join(stage,'public'),{recursive:true});
 const runtime={schema:'modoo-protected-media-cache-v1',protectedBuild:true,sizes:cache.sizes,fallbackBySlug:cache.fallbackBySlug};
 const runtimeBytes=Buffer.from(JSON.stringify(runtime,null,2)+'\n');fs.writeFileSync(path.join(stage,'src/lib/protected-media-metadata.json'),runtimeBytes);
 const context={schema:'modoo-protected-build-context-v1',stageRoot:stage,sourceRoot:siteRoot,targetRevision,mappingSHA256:p.mappingSHA256,runtimeMetadataSHA256:digest(runtimeBytes),webpFiles:cache.webpFiles,protectedManifest:ref};
 const contextRef=saveNewJSON(path.join(stage,'.protected-build-context.json'),context),guardRef=saveNewJSON(path.join(runDir,'guard.json'),{blockedMediaPaths:blocked,stageRoot:stage});
 const receipt=saveNewJSON(path.join(runDir,'view-receipt.json'),{schema:'modoo-protected-build-view-v1',status:'SOURCE_VIEW_PREPARED_NOT_BUILT',workId:S.workId,sourceRoot:siteRoot,stageRoot:stage,targetRevision,manifest:ref,mappingSHA256:p.mappingSHA256,copiedInputPaths:copied,originalMediaCopied:0,existingCMSDataGenerationIO:true,context:contextRef,guard:guardRef});
 return {stageRoot:stage,runDir,receipt,env:{MODOO_PROTECTED_STAGE_ROOT:stage,MODOO_PROTECTED_CONTEXT_SHA256:contextRef.sha256,MODOO_PROTECTED_GUARD:guardRef.file,NODE_OPTIONS:(process.env.NODE_OPTIONS||'')+' --require='+path.join(stage,'scripts/protected-build-guard.cjs'),NEXT_TELEMETRY_DISABLED:'1'},manifest:ref};
}
export function runProtectedBuild(ref,{siteRoot,targetRevision,execute=(command,args,options)=>execFileSync(command,args,options)}={}){
 const view=createProtectedBuildView(ref,{siteRoot,targetRevision});
 const opts={cwd:view.stageRoot,stdio:'inherit',env:{...process.env,...view.env}};
 execute(path.join(view.stageRoot,'node_modules/.bin/tsc'),['-p','tsconfig.functions.json'],opts);
 execute('npm',['run','build'],opts); // retains all normal prebuild/postbuild/tests.
 validateProtectedBuild(ref,{siteRoot,targetRevision});
 const stock=path.join(view.stageRoot,'out/stock');if(fs.existsSync(stock)&&fs.readdirSync(stock).length)fail('보호 out에 stock media가 들어왔습니다');
 const receipt=saveNewJSON(path.join(view.runDir,'build-receipt.json'),{schema:'modoo-protected-build-result-v1',status:'NORMAL_BUILD_AND_POSTBUILD_SUCCEEDED',workId:S.workId,targetRevision,sourceRoot:siteRoot,stageRoot:view.stageRoot,artifactDir:path.join(view.stageRoot,'out'),mappingSHA256:JSON.parse(regularBytes(ref.file)).mappingSHA256,manifest:ref,viewReceipt:view.receipt,normalBuildCommand:'npm run build',qualityTestsSkipped:false,originalMediaIOAllowed:false});
 return {...view,artifactDir:path.join(view.stageRoot,'out'),buildReceipt:receipt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const[file,sha256,revision]=process.argv.slice(2),siteRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),v=runProtectedBuild({file,sha256},{siteRoot,targetRevision:revision});console.log(JSON.stringify({artifactDir:v.artifactDir,receipt:v.buildReceipt}));}catch(e){console.error(String(e.message).slice(0,700));process.exitCode=1;}
}
