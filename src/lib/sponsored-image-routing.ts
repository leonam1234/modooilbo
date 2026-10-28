import routing from './sponsored-image-routes.json';
import {SPONSORED_SOURCE_IMAGE_KEYS} from './sponsors';
type Route = {id:number;slug:string;logicalPath:string;publicURL:string;sha256:string;bytes:number;workId:string};
const entries=routing.entries as Route[];
const slugs=['rentalwiki-contract-comparison-guide','dubomflower-flower-store-preview','brandmap-search-ai-observation-beta','grochi-pet-information-source-guide','worktool-business-software-comparison'];
if(entries.some(r=>r.id<321||r.id>325||r.slug!==slugs[r.id-321]||r.logicalPath!=='/stock/2026-10-28-'+r.slug+'.jpg')||new Set(entries.map(r=>r.id)).size!==entries.length)throw Error('광고5 ID/slug 매핑 오류');
if(routing.schema!=='modoo-sponsored-image-routes-v1'||![0,5].includes(entries.length)||new Set(entries.map(r=>r.logicalPath)).size!==entries.length||entries.some(r=>r.workId!=='MOD-SPONSORED-20261028-321-325'||!SPONSORED_SOURCE_IMAGE_KEYS.has(r.logicalPath.slice('/stock/'.length))||!r.logicalPath.startsWith('/stock/')||!Number.isSafeInteger(r.bytes)||r.bytes<=0||!/^[a-f0-9]{64}$/.test(r.sha256)||!new RegExp('^https://img\\.modooilbo\\.com/release-media/MOD-SPONSORED-20261028-321-325/[a-f0-9-]{36}/'+r.sha256+'/'+r.id+'\\.jpg$').test(r.publicURL)))throw Error('광고5 영속 이미지 매핑 오류');
export function sponsoredImageRoute(url:string):Route|undefined{
 const logical=url.split(/[?#]/)[0];return entries.find(r=>r.logicalPath===logical||r.publicURL===logical);
}
