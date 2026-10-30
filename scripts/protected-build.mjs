// Normal full build in a source view that never contains original stock media.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {digest,isSHA,sameSet,safeDir,regularBytes,pinnedJSON,saveNewJSON} from './lib/protected-io.mjs';
import {releaseMediaScope,registryEntries,ownedUploadStatus} from './lib/release-media-scope.mjs';
import {dailyBuildInputs,parseDerivedArticles} from './lib/selected-content-merge.mjs';
export const PROTECTED_BUILD_TOOLS=['package.json','package-lock.json','next.config.mjs','tsconfig.json','tsconfig.functions.json','scripts/protected-build.mjs','scripts/protected-build-guard.cjs','scripts/lib/protected-io.mjs','scripts/lib/protected-build-runtime.mjs','scripts/lib/core-artifact.mjs','scripts/lib/sponsored-scope-policy.mjs','scripts/namespace-r2.mjs','scripts/selected-r2-sync.mjs','scripts/build-content.mjs','scripts/build-trending-data.mjs','scripts/convert-webp.mjs','scripts/deploy.mjs','scripts/deploy-safety.mjs','scripts/release-artifact.mjs','src/lib/stock.ts','src/lib/sponsors.ts','src/lib/sponsored-image-routing.ts','src/lib/protected-media-size.ts','src/app/rss.xml/route.ts'];
const fail=m=>{throw Error('보호 빌드 차단: '+m);};
const under=(p,r)=>p===r||p.startsWith(r+path.sep);
const stable=v=>JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))));
PROTECTED_BUILD_TOOLS.push('scripts/lib/release-media-scope.mjs','scripts/lib/selected-content-merge.mjs');
export function protectedBuildToolHashes(siteRoot){return Object.fromEntries(PROTECTED_BUILD_TOOLS.map(n=>[n,digest(regularBytes(path.join(siteRoot,n)))]));}
export function validateProtectedBuild(ref,{siteRoot,targetRevision}){
 const p=pinnedJSON(ref,path.dirname(ref.file)),root=p.metadataRoot;
 const S=releaseMediaScope(p,root);
 if(p.schema!=='modoo-protected-build-v1'||p.workId!==S.workId||p.siteRoot!==siteRoot||p.targetRevision!==targetRevision||typeof root!=='string'||!ref.file.startsWith(root+path.sep)||!/^[a-f0-9]{40}$/.test(targetRevision||'')||!p.targetBranch||p.writersFrozen!==true||p.sourceCodeAndCMSAtPinnedCommit!==true)fail('범위/현재 source commit/동결 명세');safeDir(root);
 if(under(root,siteRoot)||under(siteRoot,root))fail('빌드 메타/출력은 실제 source와 분리');
 for(const name of PROTECTED_BUILD_TOOLS)if(!isSHA(p.sourceToolHashes?.[name])||digest(regularBytes(path.join(siteRoot,name)))!==p.sourceToolHashes[name])fail('현재 source tool SHA: '+name);
 const upload=pinnedJSON(p.uploadReceipt,root),bridge=pinnedJSON(p.releaseBridge,root),routesBytes=regularBytes(path.join(siteRoot,'src/lib/sponsored-image-routes.json')),routes=JSON.parse(routesBytes);
 registryEntries(routes);const selectedRoutes=routes.entries.filter(e=>e.workId===S.workId);
 if(upload.status!==ownedUploadStatus(S.workId)||upload.workId!==S.workId||upload.siteRoot!==siteRoot||upload.accountVerified!==true||upload.atomicCreateOnly!==false||upload.entries?.length!==S.items.length||digest(routesBytes)!==p.mappingSHA256||selectedRoutes.length!==S.items.length||(!p.releaseScope&&routes.entries.length!==5))fail('업로드/영속 매핑 성공 결속');
 let daily=null;
 if(p.releaseScope){
  daily=dailyBuildInputs(p,S,upload,root);const prior=pinnedJSON(upload.registryBefore,root);registryEntries(prior);
  if(JSON.stringify(routes.entries.filter(e=>e.workId!==S.workId))!==JSON.stringify(prior.entries))fail('기존 매핑 보존 불일치');
 }
 const binding=a=>a.id+':'+a.logicalPath+':'+a.publicURL+':'+a.sha256+':'+a.bytes;
 if(!sameSet(selectedRoutes.map(binding),upload.entries.map(binding))||selectedRoutes.some(e=>e.uploadReceiptSHA256!==p.uploadReceipt.sha256))fail('정확5 매핑 SHA/URL/size');
 const ids=selectedRoutes.map(r=>r.id);if(!sameSet(ids,S.items.map(i=>i.id))||S.items.some(i=>!selectedRoutes.some(r=>r.id===i.id&&r.slug===i.slug&&r.logicalPath==='/stock/'+S.date+'-'+i.slug+'.jpg'&&isSHA(r.sha256)&&(!i.sha256||r.sha256===i.sha256)&&Number.isSafeInteger(r.bytes)&&r.bytes>0&&r.publicURL.startsWith('https://img.modooilbo.com/release-media/'+S.workId+'/'))))fail('정확 선택5 논리/공개 매핑');
 if(bridge.schema!=='modoo-protected-release-bind-v1'||bridge.issuer!=='모두일보 배포 담당자'||bridge.workId!==S.workId||bridge.siteRoot!==siteRoot||bridge.fromRevision!==upload.targetRevision||bridge.toRevision!==targetRevision||bridge.targetBranch!==p.targetBranch||bridge.uploadReceiptSHA256!==p.uploadReceipt.sha256||bridge.mappingSHA256!==p.mappingSHA256||bridge.sourceAtCommitVerified!==true||!sameSet(bridge.assetBindings?.map(a=>a.logicalPath+':'+a.sha256),selectedRoutes.map(a=>a.logicalPath+':'+a.sha256)))fail('native/upload→현재 출시 commit bridge');
 const cache=pinnedJSON(p.legacyMediaCache,root);
 if(cache.schema!=='modoo-protected-build-cache-v1'||cache.siteRoot!==siteRoot||cache.issuer!=='모두일보 배포 담당자'||cache.validMetadataReuse!==true||!Array.isArray(cache.webpFiles)||!cache.sizes||!cache.fallbackBySlug||!Array.isArray(cache.protectedLocalPaths)||!cache.protectedLocalPaths.includes(path.join(siteRoot,'public/stock'))||cache.protectedLocalPaths.some(q=>!path.isAbsolute(q)||path.resolve(q)!==q||!under(q,path.join(siteRoot,'public'))))fail('유효 기존 WebP/크기/보호경로 메타 필요');
 const webp=pinnedJSON(cache.webpManifest,root),size=pinnedJSON(cache.sizeMetadata,root),fallback=pinnedJSON(cache.fallbackMetadata,root);
 if(!sameSet(cache.webpFiles,webp)||cache.webpFiles.some(n=>typeof n!=='string'||!n.endsWith('.jpg')||n.includes('/'))||stable(cache.sizes)!==stable(size.sizes||{})||stable(cache.fallbackBySlug)!==stable(fallback.fallbackBySlug||{}))fail('기존 생성 메타 원증거 SHA/내용');
 if(Object.values(cache.sizes).some(v=>v!==null&&(!Number.isSafeInteger(v)||v<=0))||Object.values(cache.fallbackBySlug).some(v=>typeof v!=='string'||!v||(!v.startsWith('/stock/')&&!v.startsWith('https://img.modooilbo.com/'))))fail('크기/기존 fallback 메타 형식');
 return {p,cache,routes,daily};
}
export function createProtectedBuildView(ref,{siteRoot,targetRevision}={}){
 const {p,cache,daily}=validateProtectedBuild(ref,{siteRoot,targetRevision}),parent=path.join(p.metadataRoot,'protected-build-runs');try{fs.mkdirSync(parent);}catch(e){if(e.code!=='EEXIST')throw e;}safeDir(parent);const runDir=fs.mkdtempSync(path.join(parent,'build-')),stage=path.join(runDir,'source');fs.mkdirSync(stage);
 const blocked=cache.protectedLocalPaths,copied=[];
 function copy(source,dest){
  if(blocked.some(b=>under(source,b)))return;
  if(daily&&(under(source,path.join(siteRoot,'content'))||source===daily.cached.file))return;
  const stat=fs.lstatSync(source);if(stat.isSymbolicLink())fail('source view symlink 금지');
  if(stat.isDirectory()){fs.mkdirSync(dest,{recursive:true});for(const n of fs.readdirSync(source))copy(path.join(source,n),path.join(dest,n));}
  else if(stat.isFile()){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);copied.push(path.relative(siteRoot,source));}else fail('source 파일 형식');
 }
 // Explicit build inputs, no .git/.env/out/.next or original stock. Existing CMS
 // data copies/reads are necessary static generation I/O, not fact re-review.
 for(const name of ['src','content','public','functions','scripts','db','docs','wiki']){if(daily&&name==='content')continue;const from=path.join(siteRoot,name);if(fs.existsSync(from))copy(from,path.join(stage,name));}
 let selectedContent=null;
 if(daily){
  const bytes=regularBytes(daily.cached.file,64*1024*1024);if(digest(bytes)!==daily.cached.sha256)fail('기존 derived SHA 변경');
  const rows=parseDerivedArticles(bytes),scope=releaseMediaScope(p,p.metadataRoot);
  if(rows.length!==daily.cached.articleCount||rows.some(a=>scope.items.some(i=>scope.date+'-'+i.slug===a.slug)))fail('기존 derived count/신규 slug 부재');
  fs.writeFileSync(path.join(stage,'.cached-content.generated.ts'),bytes,{flag:'wx'});
  fs.mkdirSync(path.join(stage,'content/articles'),{recursive:true});
  for(const a of daily.articles){const bytes=regularBytes(a.destination);if(digest(bytes)!==a.digest)fail('신규 CMS native SHA 변경');const dest=path.join(stage,'content/articles',path.basename(a.destination));fs.writeFileSync(dest,bytes,{flag:'wx'});copied.push(path.relative(siteRoot,a.destination));}
  selectedContent={selectedSlugs:scope.items.map(i=>scope.date+'-'+i.slug),cachedSHA256:daily.cached.sha256,cachedArticleCount:daily.cached.articleCount};
 }
 const rootFiles=fs.readdirSync(siteRoot).filter(n=>/^(?:package(?:-lock)?\.json|next\.config\.(?:mjs|js|ts)|next-env\.d\.ts|tsconfig(?:\.[\w-]+)?\.json|postcss\.config\.[\w]+|tailwind\.config\.[\w]+|wrangler\.(?:jsonc|json|toml)|worker-configuration\.d\.ts)$/.test(n));
 for(const name of rootFiles)copy(path.join(siteRoot,name),path.join(stage,name));
 const dependencies=fs.realpathSync(path.join(siteRoot,'node_modules'));fs.symlinkSync(dependencies,path.join(stage,'node_modules'),'dir');
 fs.mkdirSync(path.join(stage,'public'),{recursive:true});
 const runtime={schema:'modoo-protected-media-cache-v1',protectedBuild:true,sizes:cache.sizes,fallbackBySlug:cache.fallbackBySlug};
 const runtimeBytes=Buffer.from(JSON.stringify(runtime,null,2)+'\n');fs.writeFileSync(path.join(stage,'src/lib/protected-media-metadata.json'),runtimeBytes);
 const context={schema:'modoo-protected-build-context-v1',stageRoot:stage,sourceRoot:siteRoot,targetRevision,mappingSHA256:p.mappingSHA256,runtimeMetadataSHA256:digest(runtimeBytes),webpFiles:cache.webpFiles,selectedContent,protectedManifest:ref};
 const contextRef=saveNewJSON(path.join(stage,'.protected-build-context.json'),context),guardRef=saveNewJSON(path.join(runDir,'guard.json'),{blockedMediaPaths:daily?[...blocked,path.join(siteRoot,'content')]:blocked,stageRoot:stage});
 const receipt=saveNewJSON(path.join(runDir,'view-receipt.json'),{schema:'modoo-protected-build-view-v1',status:'SOURCE_VIEW_PREPARED_NOT_BUILT',workId:p.workId,sourceRoot:siteRoot,stageRoot:stage,targetRevision,manifest:ref,mappingSHA256:p.mappingSHA256,copiedInputPaths:copied,originalMediaCopied:0,existingCMSDataGenerationIO:!daily,cachedDerivedContentReuse:Boolean(daily),selectedCMSCopied:daily?daily.articles.length:null,context:contextRef,guard:guardRef});
 return {stageRoot:stage,runDir,receipt,env:{MODOO_PROTECTED_STAGE_ROOT:stage,MODOO_PROTECTED_CONTEXT_SHA256:contextRef.sha256,MODOO_PROTECTED_GUARD:guardRef.file,NODE_OPTIONS:(process.env.NODE_OPTIONS||'')+' --require='+path.join(stage,'scripts/protected-build-guard.cjs'),NEXT_TELEMETRY_DISABLED:'1'},manifest:ref};
}
export function runProtectedBuild(ref,{siteRoot,targetRevision,execute=(command,args,options)=>execFileSync(command,args,options)}={}){
 const view=createProtectedBuildView(ref,{siteRoot,targetRevision});
 const opts={cwd:view.stageRoot,stdio:'inherit',env:{...process.env,...view.env}};
 execute(path.join(view.stageRoot,'node_modules/.bin/tsc'),['-p','tsconfig.functions.json'],opts);
 execute('npm',['run','build'],opts); // retains all normal prebuild/postbuild/tests.
 validateProtectedBuild(ref,{siteRoot,targetRevision});
 const stock=path.join(view.stageRoot,'out/stock');if(fs.existsSync(stock)&&fs.readdirSync(stock).length)fail('보호 out에 stock media가 들어왔습니다');
 const receipt=saveNewJSON(path.join(view.runDir,'build-receipt.json'),{schema:'modoo-protected-build-result-v1',status:'NORMAL_BUILD_AND_POSTBUILD_SUCCEEDED',workId:JSON.parse(regularBytes(ref.file)).workId,targetRevision,sourceRoot:siteRoot,stageRoot:view.stageRoot,artifactDir:path.join(view.stageRoot,'out'),mappingSHA256:JSON.parse(regularBytes(ref.file)).mappingSHA256,manifest:ref,viewReceipt:view.receipt,normalBuildCommand:'npm run build',qualityTestsSkipped:false,originalMediaIOAllowed:false});
 return {...view,artifactDir:path.join(view.stageRoot,'out'),buildReceipt:receipt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const[file,sha256,revision]=process.argv.slice(2),siteRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),v=runProtectedBuild({file,sha256},{siteRoot,targetRevision:revision});console.log(JSON.stringify({artifactDir:v.artifactDir,receipt:v.buildReceipt}));}catch(e){console.error(String(e.message).slice(0,700));process.exitCode=1;}
}
