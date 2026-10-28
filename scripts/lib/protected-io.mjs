import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const digest=b=>createHash('sha256').update(b).digest('hex');
export const isSHA=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i]);
export function safeDir(directory){
 if(typeof directory!=='string'||!path.isAbsolute(directory)||path.resolve(directory)!==directory)throw Error('정규 절대 디렉터리 필요');
 let p=path.parse(directory).root;for(const part of directory.slice(p.length).split(path.sep).filter(Boolean)){p=path.join(p,part);const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink())throw Error('실제 디렉터리 필요');}
}
export function regularBytes(file,max=10*1024*1024){
 safeDir(path.dirname(file));const s=fs.lstatSync(file,{bigint:true}),stamp=x=>['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].map(k=>String(x[k])).join(':');
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1n||s.size>BigInt(max))throw Error('독립 일반파일/크기 계약');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let b;
 try{if(stamp(fs.fstatSync(fd,{bigint:true}))!==stamp(s))throw Error('입력 열기 경쟁');const out=Buffer.alloc(Number(s.size)+1);let n=0;while(n<out.length){const z=fs.readSync(fd,out,n,out.length-n,null);if(!z)break;n+=z;}if(n!==Number(s.size))throw Error('입력 크기 변경');b=out.subarray(0,n);}finally{fs.closeSync(fd);}
 if(stamp(fs.lstatSync(file,{bigint:true}))!==stamp(s))throw Error('입력 변경');return b;
}
export function pinnedJSON(ref,root){
 const file=ref?.file||ref?.path;if(typeof file!=='string'||!path.isAbsolute(file)||path.resolve(file)!==file||!file.endsWith('.json')||!isSHA(ref.sha256)||!root||!file.startsWith(root+path.sep))throw Error('작업 루트의 SHA 고정 JSON 필요');
 const b=regularBytes(file);if(digest(b)!==ref.sha256)throw Error('JSON SHA 변경');return JSON.parse(b);
}
export function saveNewJSON(file,value){const b=Buffer.from(JSON.stringify(value,null,2)+'\n');const fd=fs.openSync(file,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,b);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return {file,sha256:digest(b)};}
export async function boundedResponse(response,max){
 if(!response.body?.getReader)throw Error('제한 가능한 응답 스트림 필요');const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){void reader.cancel().catch(()=>{});throw Error('응답 크기 초과');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}return Buffer.concat(chunks,size);
}
