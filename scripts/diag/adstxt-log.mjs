import { readFileSync } from "node:fs"; import { join } from "node:path"; import { homedir } from "node:os";
const tomls=[join(homedir(),"Library/Preferences/.wrangler/config/default.toml"),join(homedir(),".config/.wrangler/config/default.toml")];
let token=null; for(const p of tomls){try{token=readFileSync(p,"utf8").match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];if(token)break;}catch{}}
if(!token){console.error("토큰 없음");process.exit(1);}
const zone="5e1d18f6a72bdd414af62df2d9059d2c";
const end=new Date(); const start=new Date(end.getTime()-7*864e5);
const q=`{ viewer { zones(filter:{zoneTag:"${zone}"}) {
  byUA: httpRequestsAdaptiveGroups(limit:200, filter:{ datetime_geq:"${start.toISOString()}", datetime_leq:"${end.toISOString()}", clientRequestPath_like:"%ads.txt%" }
    orderBy:[count_DESC]) { count dimensions { userAgent edgeResponseStatus clientRequestHTTPHost clientRequestPath } }
  byDay: httpRequestsAdaptiveGroups(limit:100, filter:{ datetime_geq:"${start.toISOString()}", datetime_leq:"${end.toISOString()}", clientRequestPath_like:"%ads.txt%" }
    orderBy:[date_ASC]) { count dimensions { date edgeResponseStatus } }
} } }`;
const r=await fetch("https://api.cloudflare.com/client/v4/graphql",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({query:q})});
const j=await r.json();
if(j.errors){console.error("GraphQL 오류:",JSON.stringify(j.errors,null,1).slice(0,800));process.exit(1);}
const z=j.data.viewer.zones[0];
console.log(`기간 ${start.toISOString().slice(0,10)}~${end.toISOString().slice(0,10)} · /ads.txt 요청 행 ${z.byUA.length}개 · 합계 ${z.byUA.reduce((a,b)=>a+b.count,0)}건\n`);
console.log("■ UA × 상태 × 호스트"); for(const g of z.byUA){const d=g.dimensions;console.log(`  ${String(g.count).padStart(4)}  ${d.edgeResponseStatus}  ${d.clientRequestHTTPHost}${d.clientRequestPath}  ${d.userAgent.slice(0,90)}`);}
console.log("\n■ 일별"); const m={}; for(const g of z.byDay){m[g.dimensions.date]=(m[g.dimensions.date]||"")+` ${g.dimensions.edgeResponseStatus}:${g.count}`;} for(const [d,v] of Object.entries(m))console.log(`  ${d} ${v}`);
