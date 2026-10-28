import fs from 'node:fs';
import path from 'node:path';
import {digest,regularBytes} from './protected-io.mjs';
export function protectedBuildContext(root){
 // Normal fixture child builders run in their own scratch roots. The inherited
 // FS guard still blocks the operational source media regardless of this root.
 if(process.env.MODOO_PROTECTED_STAGE_ROOT!==path.resolve(root))return null;
 const file=path.join(root,'.protected-build-context.json'),b=regularBytes(file);
 if(digest(b)!==process.env.MODOO_PROTECTED_CONTEXT_SHA256)throw Error('보호 빌드 context 변경');
 const c=JSON.parse(b);if(c.schema!=='modoo-protected-build-context-v1'||c.stageRoot!==path.resolve(root))throw Error('보호 빌드 입력 루트 오류');
 const cache=regularBytes(path.join(root,'src/lib/protected-media-metadata.json'));
 if(digest(cache)!==c.runtimeMetadataSHA256||digest(regularBytes(path.join(root,'src/lib/sponsored-image-routes.json')))!==c.mappingSHA256)throw Error('보호 빌드 메타/영속매핑 변경');
 return {...c,media:JSON.parse(cache)};
}
