import path from 'node:path';
import {digest,isSHA,sameSet,pinnedJSON,regularBytes} from './protected-io.mjs';
import {loadSelectedR2Manifest} from '../selected-r2-sync.mjs';
import {assertScopeAssets,verifiedStagedArticleUpdates} from './release-media-scope.mjs';
const fail=m=>{throw Error('selected content merge: '+m);};
export function dailyBuildInputs(p,scope,upload,root){
 if(!p.releaseScope||upload.releaseScope?.sha256!==p.releaseScope.sha256||upload.releaseScope?.file!==p.releaseScope.file)fail('upload/scope binding');
 const plan=pinnedJSON(upload.plan,root),base=loadSelectedR2Manifest(plan.baseManifest,{siteRoot:p.siteRoot,targetRevision:upload.targetRevision,metadataRoot:root});assertScopeAssets(scope,base);
 if(plan.workId!==p.workId||plan.siteRoot!==p.siteRoot||plan.targetRevision!==upload.targetRevision||plan.releaseScope?.sha256!==p.releaseScope.sha256||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(plan.uuid||'')||plan.prefix!=='release-media/'+p.workId+'/'+plan.uuid+'/')fail('upload plan scope/namespace');
 if(!sameSet(upload.entries?.map(a=>a.id+':'+a.slug+':'+a.logicalPath+':'+a.publicURL+':'+a.sha256),base.assets.map(a=>a.id+':'+a.slug+':/stock/'+a.objectKey+':https://img.modooilbo.com/'+plan.prefix+a.sha256+'/'+a.id+'.jpg:'+a.sha256)))fail('uploaded exact native asset bindings');
 const native=pinnedJSON(base.nativeReceipt,root),articles=native.applied.operations.filter(v=>v.type==='article');
 const expected=scope.items.map(i=>path.join(p.siteRoot,'content/articles',scope.date+'-'+i.slug+'.md'));
 if(!sameSet(articles.map(a=>a.destination),expected)||articles.some(a=>!isSHA(a.digest)))fail('exact newly intaken article destinations');
 const c=p.cachedDerivedContent;
 if(c?.file!==path.join(p.siteRoot,'src/lib/content.generated.ts')||!isSHA(c.sha256)||!Number.isSafeInteger(c.articleCount)||c.articleCount<0||c.issuer!=='모두일보 배포 담당자'||c.validMetadataReuse!==true||c.selectedSlugsAbsent!==true||!isSHA(c.priorRegistrySHA256)||upload.registryBefore?.sha256!==c.priorRegistrySHA256||plan.registryBefore?.sha256!==c.priorRegistrySHA256)fail('pinned previous derived corpus / registry metadata');
 const amendments=verifiedStagedArticleUpdates(scope);
 const selected=amendments?articles.map(a=>{const change=amendments.find(r=>r.destination===a.destination);if(!change)return a;if(change.beforeSHA256!==a.digest)fail('verified CAS before/native digest binding');return {...a,digest:change.afterSHA256};}):articles;
 return {articles:selected,cached:c};
}
export function parseDerivedArticles(bytes){
 const match=bytes.toString('utf8').match(/export const CONTENT_ARTICLES: Article\[\] = (\[[\s\S]*\]);\s*$/);
 if(!match)fail('cached generated TS must contain static JSON, no execution');
 const rows=JSON.parse(match[1]);
 if(!Array.isArray(rows)||rows.some(v=>!v||typeof v.slug!=='string')||new Set(rows.map(v=>v.slug)).size!==rows.length)fail('cached generated shape/slug uniqueness');
 return rows;
}
export function mergeSelectedContent(context,root,fresh){
 const c=context.selectedContent;if(!c)return fresh;
 const file=path.join(root,'.cached-content.generated.ts'),bytes=regularBytes(file,64*1024*1024);
 if(digest(bytes)!==c.cachedSHA256)fail('cached generated SHA changed');
 const previous=parseDerivedArticles(bytes);
 if(previous.length!==c.cachedArticleCount||!sameSet(fresh.map(a=>a.slug),c.selectedSlugs)||previous.some(a=>c.selectedSlugs.includes(a.slug)))fail('missing selected / previous slug collision');
 // Previous rows are reused verbatim as values; only fresh rows took the normal
 // content quality path. No historical CMS or image is opened or revalidated.
 return [...previous,...fresh];
}
