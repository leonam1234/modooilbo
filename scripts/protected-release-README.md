# 광고321~325 기존 인증 업로드 / 보호 빌드 인수

범위는 `MOD-SPONSORED-20261028-321-325` 신규5뿐입니다. 개발 인수는 소스와 합성 검증이며, 실제 native 인수·Git·R2·Preview·Production·공개 검증은 배포 담당자가 수행합니다. 최초 인수 부트스트랩과 전체 품질·독립 검수·최소10분·명의·편성·모바일·양환경 QA는 그대로 적용합니다. 이 문서의 예시는 실제 성공 수령증이 아닙니다.

## 보호 모델과 실제 확인할 전제

- 기존 Wrangler **4.148.0**의 현재 인증을 사용합니다. 신규 S3 키/토큰/Worker/버킷/프로필/포트 설정이 필요하지 않습니다. `whoami --json`과 `auth token --json`만 파이프로 읽고, 토큰은 요청 클로저의 메모리에만 둡니다. 자식 프로세스에 `WRANGLER_WRITE_LOGS=false`, 출력 수준 `log`, metrics 비활성화를 적용합니다. 전역 설정은 바꾸지 않습니다. 버전이 바뀌면 인증 출력·로그 구현을 다시 확인할 때까지 중단합니다. 인증 실패 시 로그인·권한 변경·다른 인증으로 자동 우회하지 않습니다.
- 계정 ID는 기존 승인 프로젝트 메타에서 가져옵니다. 사용자 계정 목록과 Pages `modooilbo`의 정식 도메인 결속을 확인합니다. 다른 계정·도메인에서는 PUT하지 않습니다.
- `release-media/<workId>/<새 UUIDv4>/<JPG SHA256>/<기사번호>.jpg`만 허용합니다. 발급은 운영 메타 루트에 영구 O_EXCL active ticket을 만들며, 실행은 별도 O_EXCL attempt/WAL을 만듭니다. 같은 작업의 중복 발급·재실행·동시 실행은 차단합니다.
- 보호 키 카탈로그는 기발행과 기존 미해결 HOLD 모두에 대해 이미 있는 유효 메타의 실제 키와 완전성 근거에 결속해야 합니다. R2에 아직 없는 HOLD 이미지의 보호 논리 키도 포함하므로 원격 객체 목록만으로 전체 coverage를 대신하지 않습니다. 기사 slug에서 기존 이미지 키를 추정하거나, 누락을 채우려고 기존 이미지·원고를 열거나 해시하지 않습니다. 근거가 없으면 `보호 이미지 키 전체 메타/경로 불변식 근거 필요` 등으로 중단합니다. 전체 coverage, writer 동결, 단독 소유는 배포 담당자가 실제 확인한 때만 기록합니다.
- prefix LIST는 해당 새 namespace와 `per_page=1`만 조회합니다. 비어 있음을 확인해도 **LIST→PUT은 원자적 create-only가 아닙니다**. 참여 writer의 동결과 namespace 단독 소유를 전제로 하며, 임의의 외부 writer/관리자나 악의적인 OS까지 배제한 보장이 아닙니다. 이 한계를 수령증에도 남깁니다.
- JPG5를 모두 SHA 검증한 메모리 버퍼로 동결한 뒤 키별 PUT 1회만 보냅니다. 성공 응답을 받은 새 키만 CDN에서 크기/SHA를 검증합니다. 불명·부분 실패 시 다음 PUT·재시도·DELETE·덮어쓰기·기존 원격 GET을 하지 않습니다. WAL의 PUT_INTENT와 CREATED_ACK/SERVED_VERIFIED를 구분해 보존합니다.

## 입력 JSON과 SHA

모든 JSON ref는 `{file: "정규 절대경로.json", sha256: "64자리 소문자 SHA256"}`입니다. 메타 루트는 실제 사이트 checkout 밖의 독립된 작업 outputs에 둡니다. 파일은 일반 파일이며 symlink/hardlink·SHA 변경은 거부합니다. 예시의 true 값을 관찰 없이 복사하지 마십시오.

1. 기존 `modoo-selected-r2-assets-v1` 명세를 먼저 준비합니다. `siteRoot`, 현재 `targetRevision`, 정확5 `selectedIds/assets`, 같은 native 객체 적용 수령증을 사용합니다. native 적용 뒤 출시 commit이 달라졌다면 기존 `nativeRevisionBridge`에 정확5 destination/SHA를 결속합니다. 실제 초기5 full/comparison/최근중복·native dry/apply 증거를 합성 JSON으로 대신하지 않습니다.
2. `controls` JSON: `workId`, `siteRoot`, 승인 `accountId`, `issuer: "모두일보 배포 담당자"`, 실제 확인된 `cooperativeWritersFrozen`, `namespaceSingleOwner`, `noIndependentWriterUsesTicket`, `acceptsNonAtomicCooperativeOwnership`가 true, `claimsAtomicCreateOnly:false`, 미래 `expiresAt`이 필요합니다. 과거 관찰부터의 동결을 소급하지 않습니다.
3. `protectedCatalog` JSON: `schema:"modoo-protected-r2-key-catalog-v1"`, 같은 issuer/account/site, `project:"modooilbo"`, `bucket:"modooilbo-stock"`, `completeProtectedCoverage:true`, 실제 보호 키 배열 `keys`, 원메타 ref 배열 `basis`입니다. 각 basis의 `protectedKeys`, `keys` 또는 `files`의 실제 키 합집합이 catalog와 같아야 합니다. namespace 및 신규 canonical JPG5와 교집합이면 중단합니다. 카탈로그의 완전성은 신뢰하는 배포 담당자의 검증 전제입니다.
4. 발급 config JSON: `schema:"modoo-owned-r2-namespace-config-v1"`, `workId`, `siteRoot`, `targetRevision`, `targetBranch`, `metadataRoot`, `accountId`, `baseManifest`, `controls`, `protectedCatalog`, 현재 비어 있는 `src/lib/sponsored-image-routes.json`의 `registryBeforeSHA256`입니다.

발급은 메타만 준비합니다. 아래는 **배포 담당자용 실행 구문**입니다. 개발에서는 실행하지 않습니다.

```sh
node scripts/namespace-r2.mjs issue /절대경로/config.json CONFIG_SHA CURRENT_HEAD
node scripts/sync-stock-r2.mjs --selected-manifest /절대경로/발급된/plan.json --selected-manifest-sha256 PLAN_SHA --target-revision CURRENT_HEAD --preview
```

두 번째 명령이 실제 원격 작업입니다. 일반 전체 stock sync나 legacy fallback을 사용하지 않습니다. 실행 중이면 중복 호출하지 않습니다. 기존 인증 권한이 부족하거나 만료돼 실패하면 정확한 실패 단계와 필요한 사람 조치만 보고합니다. 신규 인증을 만들지 않습니다.

## 성공 URL의 영속 저장

5개 업로드와 새 URL의 CDN 검증이 모두 성공하면 `upload-receipt.json`을 먼저 보존하고 `src/lib/sponsored-image-routes.json`의 빈 registry를 CAS로 한 번 교체합니다. 각각 `id`, `slug`, 기존 logical `/stock/2026-10-28-<slug>.jpg`, 새 `publicURL`, `sha256`, `bytes`, `workId`, upload/native receipt SHA를 저장합니다. 기존 기사 URL은 바꾸지 않습니다. 카드·본문·OG와 다음 빌드는 이 registry를 가져옵니다. 원래 JPG를 이동·교체하지 않으며 신규5에는 없는 WebP 파생물을 선택하지 않습니다.

업로드 후 매핑 저장만 실패했다면 기존 성공 수령증을 보존하고 `persistOwnedRoutes(uploadRef,{siteRoot,metadataRoot})`로 메타 저장만 검토할 수 있습니다. 같은 매핑은 변경 없이 반환합니다. 소유/기한/CAS가 유효해야 하며 이미 다른 매핑이나 불명 쓰기 결과가 있으면 자동 복구하지 않습니다. 같은 원격 실행을 다시 부르는 복구가 아닙니다. 기한 만료·부분 원격 실패는 수동 판단 대기이며 ticket/WAL을 삭제해 재시도하지 않습니다.

## 기존 미디어를 제외한 정상 빌드

매핑을 포함한 승인 출시 commit을 배포 담당자가 준비한 뒤 다음 메타를 결속합니다. 기존 이미지 재탐색·재해시·원격 GET으로 메타를 채우지 않습니다.

- 기존 WebP JSON ref: 실제 검증된 JPG basename 배열입니다. 원본/640 WebP 쌍의 기존 유효 메타를 재사용합니다.
- 크기 메타 ref: `{sizes:{"/stock/기존.jpg":12345,...}}`. RSS에 쓰는 실제 URL/논리 경로의 확인된 바이트입니다. 기존 증거에서 enclosure 부재가 확인된 URL만 명시적 null을 둘 수 있습니다. 누락을 임의 null로 채우지 않습니다.
- fallback 메타 ref: `{fallbackBySlug:{"기존-CMS-slug":"/stock/확인된-이미지.jpg",...}}`. 원래 image 필드가 비어 있던 CMS의 기존 생성 결과 URL을 재사용합니다. 메타 없는 fallback은 다운로드하지 않고 실패합니다.
- `legacyMediaCache` JSON: `schema:"modoo-protected-build-cache-v1"`, `siteRoot`, 배포 issuer, 실제 `validMetadataReuse:true`, 위 증거의 `webpManifest`, `sizeMetadata`, `fallbackMetadata` ref, 같은 내용의 `webpFiles`, `sizes`, `fallbackBySlug`, `protectedLocalPaths`입니다. 보호 경로에는 최소 실제 `public/stock`을 포함하고, 다른 public 보호 이미지 경로도 빠짐없이 명시합니다. 메타 유효성과 경로 coverage를 추정하지 않습니다.
- `releaseBridge` JSON: `schema:"modoo-protected-release-bind-v1"`, issuer, work/site, 업로드 당시 commit `fromRevision`, 실제 출시 commit `toRevision`, `targetBranch`, `uploadReceiptSHA256`, `mappingSHA256`, 실제 `sourceAtCommitVerified:true`, 정확5 `assetBindings:[{logicalPath,sha256},...]`입니다.
- 빌드 명세 JSON: `schema:"modoo-protected-build-v1"`, work/site, 현재 `targetRevision`, `targetBranch`, `metadataRoot`, 실제 `writersFrozen:true`, `sourceCodeAndCMSAtPinnedCommit:true`, `sourceToolHashes`, `uploadReceipt`, `mappingSHA256`, `releaseBridge`, `legacyMediaCache`입니다. `sourceToolHashes`는 `protectedBuildToolHashes(siteRoot)`로 현재 코드만 계산합니다.

광범위 `git status`는 보호 원본을 해시할 수 있어 이 경로에서는 호출하지 않습니다. 대신 실제 HEAD/branch, 출시 commit의 source/CMS와 writer 동결에 대한 배포 담당자의 확인 및 지정 코드 SHA를 사용합니다. 이를 측정된 clean tree나 무조건적인 암호학적 원본 불변 보장이라고 기록하지 않습니다. 봉인에는 `cleanTree:false`, `sourceAtPinnedCommitAttested:true`와 보호 명세 SHA가 남습니다. 확인할 수 없으면 이 경로를 실행하지 않습니다.

```sh
npm run release:preview -- --protected-build-manifest /절대경로/build.json --protected-build-manifest-sha256 BUILD_SHA --skip-indexnow
# Preview와 기존 필수 모바일/각 기사·메타·기능 QA 통과 후, 같은 HEAD의 승인 운영 브랜치에서:
npm run release:prod -- --reuse-artifact=RELEASE_ID --smoke-approved --protected-build-manifest /절대경로/build.json --protected-build-manifest-sha256 BUILD_SHA --skip-indexnow
```

Preview는 별도 source view를 만들고 원래 보호 경로는 복사·stat·변환하지 않습니다. 원본 폴더를 이름 변경·이동·숨김 처리하지 않습니다. 기존 CMS 복사/정적 생성 읽기는 필요한 빌드 I/O로 별도 기록하며 사실 재검수가 아닙니다. `.git`, `.env`, 원래 `out/.next`, 보호 미디어는 view에 넣지 않습니다. 이미 설치된 node_modules의 기존 링크만 재사용합니다.

view 안에서 functions tsc → **정상 npm run build(prebuild/Next/postbuild 전체 검사 포함)**를 실행합니다. WebP manifest, fallback, RSS 크기를 SHA 고정 메타에서 재사용하며 누락·변경은 실패합니다. Node FS/네트워크 guard는 자식 시작부터 작동합니다. 이는 알려진 Node 경로의 보조 가드이며 악의적인 네이티브 코드/OS까지 차단하는 sandbox는 아닙니다. 원본을 view에서 배제한 구성과 실제 writer 동결 전제를 함께 사용합니다.

성공한 stage out을 기존 전체 파일 SHA 봉인에 넣고 Preview에 배포합니다. Production은 같은 명세와 동일 봉인 artifact만 사용하고 build/R2/prune를 반복하지 않습니다. 원격 운영 SHA 게이트, 기존 smoke 승인과 각 환경 공개 QA는 유지합니다. 보호 artifact에서 명세 플래그가 빠지면 광범위 status 전에 중단합니다. 현재 광고5의 일반 checkout 빌드도 먼저 차단합니다.

실제 최종 수령증에는 native/기술 게이트·선택5 신규 R2/새 URL 확인·정상 build/postbuild·모바일/Preview/Production 각 QA·동일 artifact·공개5·선택15 보관을 구분합니다. 전체 공개/보관과 제공 원본10의 같은 SHA 보존 확인 전 다운로드를 정리하지 않습니다. 개발 합성 PASS를 이 운영 증거로 복사하지 않습니다.
