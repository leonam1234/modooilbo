// Metadata admission only. This is not a replacement for native/editorial gates.
import path from 'node:path';
import {SPONSORED_SCOPE} from './sponsored-scope-policy.mjs';
import {digest,isSHA,sameSet,pinnedJSON,regularBytes} from './protected-io.mjs';
const fail=m=>{throw Error('release media scope: '+m);};
export const PROVIDED_RELEASE_WORK='MOD-PROVIDED-20261029-326-335';
export const ownedUploadStatus=work=>work===PROVIDED_RELEASE_WORK?'OWNED_SELECTED_UPLOADED_AND_SERVED':'OWNED_NEW5_UPLOADED_AND_SERVED';
export function releaseMediaScope(owner,root){
 if(owner.workId===SPONSORED_SCOPE.workId&&!owner.releaseScope)return SPONSORED_SCOPE;
 const s=pinnedJSON(owner.releaseScope,root);
 if(s.workId===PROVIDED_RELEASE_WORK)return providedScope(s,owner,root);
 const match=/^MOD-DAILY-(\d{4})(\d{2})(\d{2})-RELEASE$/.exec(s.workId||'');
 if(s.schema!=='modoo-daily-release-media-scope-v1'||!match||s.workId!==owner.workId||s.siteRoot!==owner.siteRoot||s.date!==match.slice(1).join('-'))fail('daily work/date/site binding');
 const g=pinnedJSON(s.firstGate,root),r=pinnedJSON(s.formalReview,root);
 if(g.releaseWorkId!==s.workId||g.status!=='FIRST_GATE_PASS_WAIT_FORMAL_REVIEW'||g.site?.siteRoot!==s.siteRoot||g.selectedCount!==5||!sameSet(g.selectedIds,s.items?.map(i=>i.id))||!sameSet(g.selectedSlugs,s.items?.map(i=>i.slug))||g.protectedIds?.length!==7||g.protectedIds.some(id=>g.selectedIds.includes(id))||g.approval?.publicationApproved!==true||!sameSet(g.approval.scope,g.selectedIds))fail('approved selected5/protected7 first gate');
 const approval=s.approval?.file||s.approval?.path;
 if(approval!==(g.approval.file||g.approval.path)||s.approval.sha256!==g.approval.sha256||!path.isAbsolute(approval)||!approval.startsWith(root+path.sep)||digest(regularBytes(approval))!==s.approval.sha256)fail('approval SHA');
 if(r.workId!==s.workId||r.selectedCount!==5||!sameSet(r.scope,g.selectedIds)||r.counts?.HOLD!==0||r.counts?.staticUnresolved!==0||r.articles?.length!==5)fail('actual selected formal review');
 for(const i of s.items){
  const row=g.rows?.find(v=>v.id===i.id),review=r.articles.find(v=>v.id===i.id);
  if(!/^[A-Z][1-9]\d*$/.test(i.id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(i.slug)||!isSHA(i.sha256)||row?.slug!==i.slug||row.JPG?.sha256!==i.sha256||row.targetCMSAbsent!==true||row.targetImageAbsent!==true||review?.slug!==i.slug||review.jpgSHA256!==i.sha256||!['PASS','CONDITIONAL_PASS'].includes(review.verdict)||review.formalReview!==true)fail('selected image/review/absent destination binding');
 }
 return s;
}
function providedScope(s,owner,root){
 const ids=Array.from({length:10},(_,i)=>326+i);
 if(s.schema!=='modoo-provided-release-media-scope-v1'||s.workId!==owner.workId||s.siteRoot!==owner.siteRoot||s.date!=='2026-10-29'||s.author!=='류주형 / 취재기자'||s.items?.length<8||s.items.length>10||!sameSet([...s.items.map(i=>i.id),...(s.excludedIds||[])],ids))fail('provided10 selected/excluded partition');
 const m=pinnedJSON(s.fileManifest,root),review=pinnedJSON(s.formalReview,root),approval=pinnedJSON(s.approval,root),first=pinnedJSON(s.firstGate,root);
 if(m.workId!==s.workId||m.outputRoot!==s.packagePath||m.date!==s.date||!Number.isInteger(m.revision)||!sameSet(m.items?.map(i=>i.id),ids)||review.workId!==s.workId||review.permanentIndependentReview!==true||review.humanReviewClaimed!==false||review.reviewerThreadId!=='01a05a60-a035-7921-8154-7aa4a7024f31'||!sameSet(review.articles?.map(r=>r.slug),m.items.map(i=>i.slug))||!review.inputBindings?.some(r=>(r.file||r.path)===s.fileManifest.file&&r.sha256===s.fileManifest.sha256)||!sameSet(review.articles.filter(r=>['PASS','CONDITIONAL_PASS'].includes(r.judgment)).map(r=>r.slug),s.items.map(i=>i.slug)))fail('current provided manifest / actual selected formal review');
 if(approval.workId!==s.workId||approval.author!==s.author||approval.reporting!=='desk'||approval.publicationApproved!==true||approval.preserveOriginalThesis!==true||!sameSet(approval.ids,ids)||!sameSet(approval.preservedColumnIds,[334,335])||!approval.sourceText?.file||digest(regularBytes(approval.sourceText.file))!==approval.sourceText.sha256||first.workId!==s.workId||first.manifest?.sha256!==s.fileManifest.sha256||first.bindingErrors?.length!==0||first.format?.errorCount!==0)fail('current author/column approval / first gate');
 for(const i of s.items){
  const a=m.items.find(x=>x.id===i.id),r=review.articles.find(x=>x.slug===i.slug),g=first.rows?.find(x=>x.id===i.id);
  if(!Number.isInteger(i.id)||!/^[-a-z0-9]+$/.test(i.slug)||!isSHA(i.sha256)||a?.slug!==i.slug||a.author!==s.author||a.reporting!=='desk'||a.images?.JPG?.sha256!==i.sha256||!r||r.staticFactsVerdict!=='PASS'||r.fullArticleChangeImpactReviewed!==true||r.mdSHA256!==a.mdSHA256||!r.images?.some(x=>x.path===a.jpg&&x.sha256===i.sha256)||g?.target?.articleAbsent!==true||g.target.imageAbsent!==true||g.target.article!==path.join(s.siteRoot,'content/articles',s.date+'-'+i.slug+'.md')||g.target.image!==path.join(s.siteRoot,'public/stock',s.date+'-'+i.slug+'.jpg'))fail('provided selected item / actual absent destination / review SHA');
 }
 return s;
}
export function assertScopeAssets(scope,base){
 if(base.workId!==scope.workId||base.assets.length!==scope.items.length||scope.items.some(i=>!base.assets.some(a=>a.id===i.id&&a.slug===i.slug&&a.objectKey===scope.date+'-'+i.slug+'.jpg'&&(!i.sha256||a.sha256===i.sha256))))fail('exact native image scope');
}
export function registryEntries(value){
 if(value.schema!=='modoo-sponsored-image-routes-v1'||!Array.isArray(value.entries)||new Set(value.entries.map(e=>e.logicalPath)).size!==value.entries.length||new Set(value.entries.map(e=>e.publicURL)).size!==value.entries.length)fail('registry shape/duplicate logical path or URL');
 return value.entries;
}
