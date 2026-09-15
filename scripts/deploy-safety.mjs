const GIT_OBJECT_ID = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

export function parseRemoteBranchHead(output, branch = "master") {
  const rows = String(output ?? "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/));
  const ref = `refs/heads/${branch}`;
  const match = rows.find(([, candidateRef]) => candidateRef === ref);
  if (!match || !GIT_OBJECT_ID.test(match[0])) {
    throw new Error(`origin/${branch} 원격 SHA를 확인할 수 없습니다.`);
  }
  return match[0];
}

export function assertProductionRemoteMatch({ localHead, trackingHead, remoteHead, branch = "master" }) {
  for (const [label, value] of Object.entries({ localHead, trackingHead, remoteHead })) {
    if (!GIT_OBJECT_ID.test(String(value ?? ""))) {
      throw new Error(`유효하지 않은 ${label} SHA: ${value ?? "없음"}`);
    }
  }
  if (localHead !== trackingHead || localHead !== remoteHead) {
    throw new Error(
      `prod 배포 SHA 불일치: HEAD=${localHead.slice(0, 12)}, origin/${branch}=${trackingHead.slice(0, 12)}, remote=${remoteHead.slice(0, 12)}`,
    );
  }
  return localHead;
}

export function r2SyncArgs(scriptPath, { isProd }) {
  return [scriptPath, ...(isProd ? [] : ["--preview"])];
}
