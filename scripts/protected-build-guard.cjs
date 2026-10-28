const fs=require('node:fs'),path=require('node:path'),{fileURLToPath}=require('node:url');
const configFile=process.env.MODOO_PROTECTED_GUARD;
if(!configFile)throw Error('Protected build guard config required');
const c=JSON.parse(fs.readFileSync(configFile,'utf8'));
const blocked=c.blockedMediaPaths;
if(!Array.isArray(blocked)||!blocked.length||blocked.some(p=>!path.isAbsolute(p)||path.resolve(p)!==p))throw Error('Invalid protected media guard roots');
const names=new Map();
function check(v){if(typeof v==='number')v=names.get(v);if(v instanceof URL)v=fileURLToPath(v);if(Buffer.isBuffer(v))v=v.toString();if(typeof v!=='string')return;const p=path.resolve(v);if(blocked.some(b=>p===b||p.startsWith(b+path.sep)))throw Error('PROTECTED_MEDIA_FS_DENIED');}
function checkTree(v){check(v);if(v instanceof URL)v=fileURLToPath(v);if(Buffer.isBuffer(v))v=v.toString();if(typeof v==='string'&&blocked.some(b=>b.startsWith(path.resolve(v)+path.sep)))throw Error('PROTECTED_MEDIA_FS_DENIED');}
for(const n of ['readFileSync','openSync','statSync','lstatSync','readdirSync','realpathSync','accessSync','existsSync','writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','copyFileSync','cpSync','createReadStream','createWriteStream','readFile','open','stat','lstat','readdir','realpath','access','writeFile','appendFile','unlink','rm','rename','copyFile','cp']){
 const fn=fs[n];if(!fn)continue;fs[n]=function(...a){(['cpSync','cp','rmSync','rm','renameSync','rename'].includes(n)?checkTree:check)(a[0]);if(['copyFileSync','cpSync','renameSync','copyFile','cp','rename'].includes(n))(['cpSync','cp','renameSync','rename'].includes(n)?checkTree:check)(a[1]);const r=fn.apply(this,a);if(n==='openSync')names.set(r,a[0]);return r;};
 if(typeof fn.native==='function')fs[n].native=function(...a){check(a[0]);return fn.native.apply(this,a);};
}
for(const n of ['readFile','open','stat','lstat','readdir','realpath','access','writeFile','appendFile','unlink','rm','rename','copyFile','cp']){const fn=fs.promises[n];fs.promises[n]=function(...a){(['cp','rm','rename'].includes(n)?checkTree:check)(a[0]);if(['copyFile','cp','rename'].includes(n))(['cp','rename'].includes(n)?checkTree:check)(a[1]);return fn.apply(this,a);};}
function checkURL(url){let u;try{u=new URL(typeof url==='string'?url:url?.url||String(url));}catch{return;}if(u.hostname==='img.modooilbo.com'||u.hostname.endsWith('.r2.cloudflarestorage.com')||(u.hostname==='api.cloudflare.com'&&u.pathname.includes('/r2/')))throw Error('PROTECTED_MEDIA_REMOTE_DENIED');}
if(global.fetch){const f=global.fetch;global.fetch=function(url,...a){checkURL(url);return f.call(this,url,...a);};}
for(const moduleName of ['node:http','node:https']){const m=require(moduleName);for(const n of ['request','get']){const f=m[n];m[n]=function(url,...a){if(typeof url==='object'&&!(url instanceof URL)){const host=url.hostname||url.host;if(host)checkURL((moduleName==='node:https'?'https://':'http://')+host+(url.path||'/'));}else checkURL(url);return f.call(this,url,...a);};}}
const Module=require('node:module'),originalLoad=Module._load;Module._load=function(id,...args){const value=originalLoad.call(this,id,...args);if(id==='undici'&&!value.__protectedMediaWrapped){for(const name of ['fetch','request','stream','pipeline','connect']){const f=value[name];if(typeof f==='function')value[name]=function(url,...a){checkURL(url);return f.call(this,url,...a);};}value.__protectedMediaWrapped=true;}return value;};
Module.syncBuiltinESMExports();
