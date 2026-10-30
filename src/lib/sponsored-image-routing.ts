import routing from './sponsored-image-routes.json';
import {SPONSORED_SOURCE_IMAGE_KEYS} from './sponsors';
type Route = {id:number|string;slug:string;logicalPath:string;publicURL:string;sha256:string;bytes:number;workId:string;uploadReceiptSHA256?:string;nativeReceiptSHA256?:string};
const entries=routing.entries as Route[];
const slugs=['rentalwiki-contract-comparison-guide','dubomflower-flower-store-preview','brandmap-search-ai-observation-beta','grochi-pet-information-source-guide','worktool-business-software-comparison'];
if(routing.schema!=='modoo-sponsored-image-routes-v1'||new Set(entries.map(r=>r.logicalPath)).size!==entries.length||new Set(entries.map(r=>r.publicURL)).size!==entries.length)throw Error('영속 이미지 registry 중복 오류');
for(const workId of new Set(entries.map(r=>r.workId))){
 const group=entries.filter(r=>r.workId===workId),daily=/^MOD-DAILY-(\d{4})(\d{2})(\d{2})-RELEASE$/.exec(workId),provided=/^MOD-PROVIDED-(\d{4})(\d{2})(\d{2})-([1-9]\d*)-([1-9]\d*)$/.exec(workId);
 if(workId==='MOD-SPONSORED-20261028-321-325'){
  if(group.length!==5||group.some(r=>typeof r.id!=='number'||r.id<321||r.id>325||r.slug!==slugs[r.id-321]||r.logicalPath!=='/stock/2026-10-28-'+r.slug+'.jpg'||!SPONSORED_SOURCE_IMAGE_KEYS.has(r.logicalPath.slice('/stock/'.length))))throw Error('광고5 ID/slug 매핑 오류');
 }else if(provided){
  const date=provided.slice(1,4).join('-'),first=Number(provided[4]),last=Number(provided[5]),at=Date.parse(date+'T00:00:00Z');
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||last-first!==9||!Number.isFinite(at)||new Date(at).toISOString().slice(0,10)!==date)throw Error('제공 원10 날짜/번호 범위 오류');
  if(group.length<8||group.length>10||group.some(r=>typeof r.id!=='number'||!Number.isInteger(r.id)||r.id<first||r.id>last||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)||r.logicalPath!=='/stock/'+date+'-'+r.slug+'.jpg'||!isSHA(r.uploadReceiptSHA256)||!isSHA(r.nativeReceiptSHA256)))throw Error('현재 제공10 실제 선택 이미지 매핑 오류');
 }else if(!daily||group.length!==5||group.some(r=>typeof r.id!=='string'||!/^[A-Z][1-9]\d*$/.test(r.id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)||r.logicalPath!=='/stock/'+daily.slice(1).join('-')+'-'+r.slug+'.jpg'||!isSHA(r.uploadReceiptSHA256)||!isSHA(r.nativeReceiptSHA256)))throw Error('일일 선택5 영속 이미지 매핑 오류');
 if(new Set(group.map(r=>r.id)).size!==group.length||group.some(r=>!Number.isSafeInteger(r.bytes)||r.bytes<=0||!isSHA(r.sha256)||!new RegExp('^https://img\\.modooilbo\\.com/release-media/'+workId+'/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/'+r.sha256+'/'+r.id+'\\.jpg$').test(r.publicURL)))throw Error('영속 이미지 URL/SHA/size 오류');
}
function isSHA(value:unknown):boolean{return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
export function sponsoredImageRoute(url:string):Route|undefined{
 const logical=url.split(/[?#]/)[0];return entries.find(r=>r.logicalPath===logical||r.publicURL===logical);
}
