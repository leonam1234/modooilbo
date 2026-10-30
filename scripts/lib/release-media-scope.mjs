// Metadata admission only. This is not a replacement for native/editorial gates.
import path from 'node:path';
import {SPONSORED_SCOPE} from './sponsored-scope-policy.mjs';
import {digest,isSHA,sameSet,pinnedJSON,regularBytes} from './protected-io.mjs';
const fail=m=>{throw Error('release media scope: '+m);};
export const PROVIDED_RELEASE_WORK='MOD-PROVIDED-20261029-326-335';
const stagedArticleUpdates=new WeakMap();
export const verifiedStagedArticleUpdates=scope=>stagedArticleUpdates.get(scope);
export function providedReleaseIdentity(work){
 const m=/^MOD-PROVIDED-(\d{4})(\d{2})(\d{2})-([1-9]\d*)-([1-9]\d*)$/.exec(work||'');if(!m)return null;
 const date=m.slice(1,4).join('-'),first=Number(m[4]),last=Number(m[5]);
 if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||last-first!==9||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return null;
 return {date,ids:Array.from({length:10},(_,i)=>first+i)};
}
const PROVIDED_DESK_AUTHORS=new Set(['김영환 / 경제부 기자','유승현 / 사회부 기자','서영호 / 공공입찰 전담기자','남동균 / 문화·스포츠부 기자','최은영 / 국제부 기자','류주형 / 취재기자']);
export const ownedUploadStatus=work=>providedReleaseIdentity(work)?'OWNED_SELECTED_UPLOADED_AND_SERVED':'OWNED_NEW5_UPLOADED_AND_SERVED';
export function releaseMediaScope(owner,root){
 if(owner.workId===SPONSORED_SCOPE.workId&&!owner.releaseScope)return SPONSORED_SCOPE;
 const s=pinnedJSON(owner.releaseScope,root);
 if(providedReleaseIdentity(s.workId))return providedScope(s,owner,root);
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
function providedManifest(s,owner,root){
 if(!owner.historicalProvidedManifest)return pinnedJSON(s.fileManifest,root);
 const ref=owner.historicalProvidedManifest;
 if(s.workId!==PROVIDED_RELEASE_WORK||s.items.length!==10||s.excludedIds?.length!==0||ref.sha256!==s.fileManifest.sha256||(ref.file||ref.path)===(s.fileManifest.file||s.fileManifest.path)||owner.writersFrozen!==true||owner.sourceCodeAndCMSAtPinnedCommit!==true)fail('historical provided manifest exact original SHA / protected build');
 const old=pinnedJSON(ref,root),cas=pinnedJSON(owner.stagedDraftRemedy,root);
 if(old.revision!==3||cas.schema!=='modoo-staged-draft-remedy-v1'||cas.policy!=='MOD-STAGED-DRAFT-REMEDY-20261026-v1'||cas.workId!==s.workId||cas.status!=='UNPUBLISHED_CMS_SUMMARY2_CAS_APPLIED_NOT_REBUILT_OR_PUBLISHED'||!sameSet(cas.rows?.map(r=>r.id),[331,332])||cas.unchangedOtherArticleCount!==8||cas.imagesChanged!==0||cas.originalPackageWrites!==0||cas.old1123FieldReads!==0||cas.nativeIntakeRepeated!==0||cas.uploadRepeated!==0||cas.Production!==0||cas.sourceAndCMSComparedBeforeWrite!==true||cas.atomicRenameUsed!==true||cas.atomicCASClaimed!==false)fail('historical manifest requires actual exact summary2 staged CAS');
 const current=pinnedJSON(cas.manifest,root),review=pinnedJSON(cas.review,root),remedy=pinnedJSON(cas.remedy,root),native=pinnedJSON(cas.nativeIntakeReceipt,root),upload=pinnedJSON(owner.uploadReceipt,root),plan=pinnedJSON(upload.plan,root),base=pinnedJSON(plan.baseManifest,root);
 const exactRef=(a,b)=>(a?.file||a?.path)===(b?.file||b?.path)&&a?.sha256===b?.sha256;
 if(!exactRef(base.nativeReceipt,cas.nativeIntakeReceipt)||!exactRef(upload.releaseScope,owner.releaseScope)||!exactRef(plan.releaseScope,owner.releaseScope)||current.workId!==s.workId||current.revision!==4||current.date!==old.date||current.outputRoot!==old.outputRoot||!sameSet(current.items?.map(r=>r.id),old.items?.map(r=>r.id))||native.workId!==s.workId||native.status!=='CMS_INTAKEN_NOT_BUILT_OR_DEPLOYED'||native.sameNativeObject!==true||native.JSONRehydration!==false||native.selectedCount!==10||native.target?.siteRoot!==s.siteRoot||native.target.revision!==upload.targetRevision||native.applied?.mode!=='applied')fail('historical upload/native unchanged and current r4 manifest binding');
 if(review.workId!==s.workId||review.permanentReviewClaimed!==true||review.humanReviewClaimed!==false||review.reviewer!=='모두일보 독립 리뷰 담당'||review.manifest?.sha256!==cas.manifest.sha256||review.manifest.revision!==4||!sameSet(review.articles?.map(r=>r.id),old.items.map(r=>r.id))||remedy.workId!==s.workId||remedy.revision!==4||!sameSet(remedy.rows?.map(r=>r.id),[331,332]))fail('current r4 same-artifact formal review / summary2 remedy');
 const articles=native.applied.operations.filter(r=>r.type==='article');
 if(articles.length!==10||!sameSet(articles.map(r=>r.destination),old.items.map(r=>path.join(s.siteRoot,'content/articles',s.date+'-'+r.slug+'.md'))))fail('historical exact native10 destinations');
 const without=(row,keys)=>JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k])=>!keys.includes(k)).sort(([a],[b])=>a.localeCompare(b))));
 for(const before of old.items){
  const after=current.items.find(r=>r.id===before.id),rr=review.articles.find(r=>r.id===before.id),op=articles.find(r=>r.source===before.article),change=cas.rows.find(r=>r.id===before.id),summary=remedy.rows.find(r=>r.id===before.id);
  const omitted=change?['mdSHA256','summary','summaryRemedy']:['mdSHA256','reviewedManuscriptSHA256','admittedMetadataWriterReceipt'];
  if(!op||!isSHA(op.digest)||without(before,omitted)!==without(after,omitted)||rr.slug!==after.slug||rr.articlePath!==after.article||rr.articleSHA256!==after.mdSHA256||rr.manuscriptSHA256!==after.mdSHA256||rr.bodySHA256!==after.bodySHA256||rr.pngSHA256!==after.images?.PNG?.sha256||rr.jpgSHA256!==after.images?.JPG?.sha256||rr.formalReview!==true||rr.humanReviewClaimed!==false||rr.reviewedBy!==review.reviewer||!['PASS','CONDITIONAL_PASS'].includes(rr.verdict)||rr.staticFactVerdict!=='PASS'||!/^PASS/.test(rr.editorialVerdict||'')||rr.imageVerdict!=='PASS')fail('r3→r4 identity/body/image preservation and actual final review');
  if(change){
   if(change.type!=='article'||change.source!==before.article||change.destination!==op.destination||change.beforeSHA256!==op.digest||change.reviewedDraftSHA256!==after.mdSHA256||!isSHA(change.afterSHA256)||change.afterSHA256!==change.digest||change.afterSHA256===change.beforeSHA256||change.reviewedAt!==rr.reviewedAt||!Number.isFinite(Date.parse(change.reviewedAt))||!sameSet(change.allowedFields,['summary','reviewedBy','reviewedAt','reporterInsight','publishedAt'])||summary.article!==before.article||summary.before.mdSHA256!==op.digest||summary.before.reviewedManuscriptSHA256!==before.mdSHA256||summary.before.summary!==before.summary||summary.before.bodySHA256!==before.bodySHA256||summary.after.mdSHA256!==after.mdSHA256||summary.after.summary!==after.summary||summary.after.bodySHA256!==after.bodySHA256||after.summary===before.summary)fail('exact summary2 prior native→reviewed draft→CAS binding');
  }else if(after.mdSHA256!==op.digest||after.reviewedManuscriptSHA256!==before.mdSHA256||after.admittedMetadataWriterReceipt!==(cas.nativeIntakeReceipt.file||cas.nativeIntakeReceipt.path))fail('unchanged other8 native metadata lineage');
 }
 stagedArticleUpdates.set(s,Object.freeze(cas.rows.map(r=>Object.freeze({destination:r.destination,beforeSHA256:r.beforeSHA256,afterSHA256:r.afterSHA256}))));
 return old;
}

function providedScope(s,owner,root){
 const {date,ids}=providedReleaseIdentity(s.workId);
 if(s.schema!=='modoo-provided-release-media-scope-v1'||s.workId!==owner.workId||s.siteRoot!==owner.siteRoot||s.date!==date||!PROVIDED_DESK_AUTHORS.has(s.author)||s.items?.length<8||s.items.length>10||!sameSet([...s.items.map(i=>i.id),...(s.excludedIds||[])],ids))fail('provided10 selected/excluded partition');
 const m=providedManifest(s,owner,root),review=pinnedJSON(s.formalReview,root),approval=pinnedJSON(s.approval,root),first=pinnedJSON(s.firstGate,root);
 const columns=s.workId===PROVIDED_RELEASE_WORK?[334,335]:m.items?.filter(r=>r.category==='opinion').map(r=>r.id);
 if(m.workId!==s.workId||m.outputRoot!==s.packagePath||m.date!==s.date||!Number.isInteger(m.revision)||!sameSet(m.items?.map(i=>i.id),ids)||review.workId!==s.workId||review.permanentIndependentReview!==true||review.humanReviewClaimed!==false||review.reviewerThreadId!=='01a05a60-a035-7921-8154-7aa4a7024f31'||!sameSet(review.articles?.map(r=>r.slug),m.items.map(i=>i.slug))||!review.inputBindings?.some(r=>(r.file||r.path)===s.fileManifest.file&&r.sha256===s.fileManifest.sha256)||!sameSet(review.articles.filter(r=>['PASS','CONDITIONAL_PASS'].includes(r.judgment)).map(r=>r.slug),s.items.map(i=>i.slug)))fail('current provided manifest / actual selected formal review');
 if(approval.workId!==s.workId||approval.author!==s.author||approval.reporting!=='desk'||approval.publicationApproved!==true||approval.preserveOriginalThesis!==true||!sameSet(approval.ids,ids)||!sameSet(approval.preservedColumnIds,columns)||!approval.sourceText?.file||digest(regularBytes(approval.sourceText.file))!==approval.sourceText.sha256||first.workId!==s.workId||first.manifest?.sha256!==s.fileManifest.sha256||first.bindingErrors?.length!==0||first.format?.errorCount!==0)fail('current author/column approval / first gate');
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
