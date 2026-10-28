import cache from './protected-media-metadata.json';
import {sponsoredImageRoute} from './sponsored-image-routing';
export function protectedMediaBytes(url:string):number|null|undefined{
 const route=sponsoredImageRoute(url);if(route)return route.bytes;
 const noQuery=url.split(/[?#]/)[0],logical=noQuery.replace(/^https:\/\/img\.modooilbo\.com\//,'/stock/');
 const values=cache.sizes as Record<string,number|null>,key=Object.hasOwn(values,noQuery)?noQuery:logical,bytes=values[key];
 if(Object.hasOwn(values,key)&&bytes===null)return null;
 if(typeof bytes==='number'&&Number.isSafeInteger(bytes)&&bytes>0)return bytes;
 if(cache.protectedBuild)throw Error('보호 빌드 이미지 크기 메타 누락: '+logical);
 return undefined;
}
