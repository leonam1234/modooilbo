// Metadata admission only. This is not a replacement for native/editorial gates.
import path from 'node:path';
import {SPONSORED_SCOPE} from './sponsored-scope-policy.mjs';
import {digest,isSHA,sameSet,pinnedJSON,regularBytes} from './protected-io.mjs';
const fail=m=>{throw Error('release media scope: '+m);};
export function releaseMediaScope(owner,root){
 if(owner.workId===SPONSORED_SCOPE.workId&&!owner.releaseScope)return SPONSORED_SCOPE;
 const s=pinnedJSON(owner.releaseScope,root),match=/^MOD-DAILY-(\d{4})(\d{2})(\d{2})-RELEASE$/.exec(s.workId||'');
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
export function assertScopeAssets(scope,base){
 if(base.workId!==scope.workId||base.assets.length!==scope.items.length||scope.items.some(i=>!base.assets.some(a=>a.id===i.id&&a.slug===i.slug&&a.objectKey===scope.date+'-'+i.slug+'.jpg'&&(!i.sha256||a.sha256===i.sha256))))fail('exact native image scope');
}
export function registryEntries(value){
 if(value.schema!=='modoo-sponsored-image-routes-v1'||!Array.isArray(value.entries)||new Set(value.entries.map(e=>e.logicalPath)).size!==value.entries.length||new Set(value.entries.map(e=>e.publicURL)).size!==value.entries.length)fail('registry shape/duplicate logical path or URL');
 return value.entries;
}
