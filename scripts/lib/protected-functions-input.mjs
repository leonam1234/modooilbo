// Pin the complete, current Pages Functions input boundary, not old CMS/media.
import fs from 'node:fs';
import path from 'node:path';
import {digest,regularBytes,pinnedJSON,safeDir} from './protected-io.mjs';
import {sealReleaseArtifact,verifyReleaseArtifact} from '../release-artifact.mjs';
const fail=m=>{throw Error('protected Functions input: '+m);};
const stable=v=>JSON.stringify(v);
const AUX=['src/lib/trending-data.generated.json','src/lib/reporters.ts','tsconfig.json','tsconfig.functions.json','package.json','package-lock.json'];
function snapshot(root){
 safeDir(root);const paths=[];
 function walk(dir){safeDir(path.join(root,dir));for(const name of fs.readdirSync(path.join(root,dir)).sort()){
  const rel=dir+'/'+name,st=fs.lstatSync(path.join(root,rel));if(st.isSymbolicLink())fail('Functions symlink');
  if(st.isDirectory())walk(rel);else if(st.isFile())paths.push(rel);else fail('Functions entry type');
 }}
 walk('functions');paths.push(...AUX);
 const configs=['wrangler.jsonc','wrangler.json','wrangler.toml'].filter(n=>fs.existsSync(path.join(root,n)));
 if(configs.length!==1)fail('one explicit Pages config required');paths.push(...configs);
 return paths.sort().map(file=>{const b=regularBytes(path.join(root,file));return {file,bytes:b.length,sha256:digest(b)};});
}
export function captureProtectedFunctionsInput(buildReceipt){
 const r=pinnedJSON(buildReceipt,path.dirname(buildReceipt.file)),p=pinnedJSON(r.manifest,path.dirname(r.manifest.file));
 if(r.schema!=='modoo-protected-build-result-v1'||r.status!=='NORMAL_BUILD_AND_POSTBUILD_SUCCEEDED'||r.targetRevision!==p.targetRevision||r.sourceRoot!==p.siteRoot||r.artifactDir!==path.join(r.stageRoot,'out')||!p.releaseScope)fail('actual protected build receipt/source binding');
 const scope=pinnedJSON(p.releaseScope,p.metadataRoot);
 if(scope.workId!==r.workId||scope.siteRoot!==r.sourceRoot||!Array.isArray(scope.items)||!scope.items.length)fail('selected release scope');
 const files=snapshot(r.stageRoot),data=JSON.parse(regularBytes(path.join(r.stageRoot,AUX[0]))),ids=data.articles?.map(a=>a.id),selectedIds=scope.items.map(i=>scope.date+'-'+i.slug);
 if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||selectedIds.some(id=>!ids.includes(id)))fail('built whitelist must cover exact static selected IDs');
 return {schema:'modoo-protected-functions-input-v1',model:'SHA_PINNED_SOURCE_VIEW_WRANGLER_BUNDLES_AT_DEPLOY',cwd:r.stageRoot,sourceCommit:r.targetRevision,buildReceipt,sourceManifestSHA256:r.manifest.sha256,files,inputSHA256:digest(Buffer.from(stable(files))),whitelistCount:ids.length,selectedIds};
}
function parentRelease(releaseRoot,parent,project,wranglerVersion){
 const old=verifyReleaseArtifact({releaseRoot,releaseId:parent.releaseId,expectedProject:project,expectedCommit:parent.commit,expectedWranglerVersion:wranglerVersion});
 if(parent.sealHash!==old.manifest.sealHash||parent.artifactHash!==old.actual.artifactHash||parent.expiresAt!==old.manifest.seal.expiresAt)fail('static parent provenance');
 return old;
}
export function protectedFunctionsDeploymentCwd(release,{releaseRoot}={}){
 const seal=release.manifest.seal,p=seal.protectedBuild,f=p?.functionsInput;
 if(!p||!f||f.schema!=='modoo-protected-functions-input-v1'||stable(f.buildReceipt)!==stable(p.buildReceipt))fail('sealed protected Functions input missing');
 if(fs.existsSync(path.join(release.artifactDir,'_worker.js')))fail('unexpected precompiled worker overrides pinned Functions cwd');
 const current=captureProtectedFunctionsInput(f.buildReceipt);
 if(stable(current)!==stable(f))fail('sealed Functions inputs changed');
 if(p.staticParent){
  const old=parentRelease(releaseRoot,p.staticParent,seal.project,seal.wranglerVersion);
  if(old.actual.artifactHash!==seal.artifactHash||stable(old.manifest.seal.protectedBuild?.buildReceipt)!==stable(f.buildReceipt))fail('same static artifact / original build receipt');
 }else if(f.sourceCommit!==seal.commit||f.sourceManifestSHA256!==p.manifestSHA256)fail('Functions source/commit/manifest');
 return f.cwd;
}
// Normal reseal API for this repair: retain old build/static/Preview evidence,
// give packaging a real new commit/time, and require a new Preview + QA receipt.
export function resealProtectedStatic({releaseRoot,parentReleaseId,parentCommit,project,commit,branch,commitMessage,wranglerVersion,protectedBuildRef}){
 const parent=verifyReleaseArtifact({releaseRoot,releaseId:parentReleaseId,expectedProject:project,expectedCommit:parentCommit,expectedWranglerVersion:wranglerVersion});
 const old=parent.manifest.seal.protectedBuild;if(!old||commit===parentCommit)fail('protected parent and new packaging commit required');
 const p=pinnedJSON(protectedBuildRef,path.dirname(protectedBuildRef.file)),built=pinnedJSON(old.buildReceipt,path.dirname(old.buildReceipt.file)),original=pinnedJSON(built.manifest,path.dirname(built.manifest.file));
 if(p.targetRevision!==commit||p.workId!==original.workId||p.siteRoot!==original.siteRoot||p.mappingSHA256!==old.mappingSHA256||stable(p.releaseScope)!==stable(original.releaseScope)||stable(p.uploadReceipt)!==stable(original.uploadReceipt))fail('current manifest / preserved scope/upload/mapping');
 const retained=x=>Object.fromEntries(Object.entries(x).filter(([name])=>!['targetRevision','targetBranch','sourceToolHashes','releaseBridge'].includes(name)));
 if(stable(retained(p))!==stable(retained(original)))fail('original protected static inputs changed');
 const deploymentOnly=new Set(['scripts/deploy.mjs','scripts/protected-build.mjs','scripts/lib/protected-functions-input.mjs']);
 if(Object.entries(original.sourceToolHashes).some(([name,sha])=>!deploymentOnly.has(name)&&p.sourceToolHashes?.[name]!==sha))fail('static build tool changed; reuse not supported');
 const input=captureProtectedFunctionsInput(old.buildReceipt),now=snapshot(p.siteRoot).filter(r=>r.file!==AUX[0]),then=input.files.filter(r=>r.file!==AUX[0]);
 if(stable(now)!==stable(then))fail('Functions/config/dependency code changed; original input cannot be reused');
 const staticParent={releaseId:parentReleaseId,commit:parentCommit,sealHash:parent.manifest.sealHash,artifactHash:parent.actual.artifactHash,expiresAt:parent.manifest.seal.expiresAt};
 const release=sealReleaseArtifact({sourceDir:parent.artifactDir,releaseRoot,project,commit,branch,commitMessage,wranglerVersion,stockRollback:parent.manifest.seal.stockRollback,protectedBuild:{manifestSHA256:protectedBuildRef.sha256,buildReceipt:old.buildReceipt,mappingSHA256:old.mappingSHA256,model:'COOPERATIVE_PINNED_SOURCE_VIEW',functionsInput:input,staticParent}});
 if(release.manifest.seal.artifactHash!==parent.actual.artifactHash)fail('static artifact changed');
 return release;
}
