import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const RELEASE_SCHEMA_VERSION = 1;
export const RELEASE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RELEASE_ID_RE = /^[0-9a-f]{12}-\d{8}T\d{9}Z-[0-9a-f]{12}$/;
const FULL_COMMIT_RE = /^[0-9a-f]{40,64}$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function walkFiles(root, dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = join(dir, entry.name);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`artifact contains a symbolic link: ${relative(root, absolute)}`);
    if (stat.isDirectory()) files.push(...walkFiles(root, absolute));
    else if (stat.isFile()) {
      files.push({
        path: relative(root, absolute).split(sep).join("/"),
        size: stat.size,
        sha256: sha256(readFileSync(absolute)),
      });
    } else {
      throw new Error(`artifact contains an unsupported entry: ${relative(root, absolute)}`);
    }
  }
  return files;
}

function requireNonEmpty(root, file) {
  const absolute = join(root, file);
  if (!existsSync(absolute) || !lstatSync(absolute).isFile() || lstatSync(absolute).size === 0) {
    throw new Error(`incomplete artifact: missing or empty ${file}`);
  }
}

export function inspectReleaseArtifact(artifactDir) {
  const root = resolve(artifactDir);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) {
    throw new Error(`release artifact directory is missing: ${root}`);
  }
  for (const file of ["index.html", "404.html", "_headers", "_redirects"]) {
    requireNonEmpty(root, file);
  }
  const files = walkFiles(root);
  if (!files.some((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".js") && file.size > 0)) {
    throw new Error("incomplete artifact: no non-empty Next.js static JavaScript");
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const artifactHash = sha256(files.map((file) => `${file.path}\0${file.size}\0${file.sha256}\n`).join(""));
  return { artifactHash, fileCount: files.length, totalBytes, files };
}

function writeJsonAtomic(path, value) {
  const temp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  renameSync(temp, path);
}

export function releaseStorePath(repoRoot, gitCommonDir) {
  const common = resolve(repoRoot, gitCommonDir);
  return join(common, "modooilbo-release-artifacts");
}

export function sealReleaseArtifact({
  sourceDir,
  releaseRoot,
  project,
  commit,
  branch,
  commitMessage,
  wranglerVersion,
  stockRollback,
  now = new Date(),
}) {
  if (!FULL_COMMIT_RE.test(commit)) throw new Error("release commit must be a full hexadecimal SHA");
  if (!/^4\./.test(wranglerVersion)) throw new Error(`Wrangler v4 is required (found ${wranglerVersion})`);
  const source = inspectReleaseArtifact(sourceDir);
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + RELEASE_MAX_AGE_MS).toISOString();
  const stamp = createdAt.replace(/[-:.]/g, "");
  const releaseId = `${commit.slice(0, 12)}-${stamp}-${source.artifactHash.slice(0, 12)}`;
  mkdirSync(releaseRoot, { recursive: true });
  const finalDir = join(releaseRoot, releaseId);
  if (existsSync(finalDir)) throw new Error(`release artifact already exists: ${releaseId}`);
  const tempDir = mkdtempSync(join(releaseRoot, ".tmp-"));
  try {
    const artifactDir = join(tempDir, "artifact");
    cpSync(sourceDir, artifactDir, { recursive: true, errorOnExist: true, force: false });
    const copied = inspectReleaseArtifact(artifactDir);
    if (stableJson(copied) !== stableJson(source)) throw new Error("artifact changed while it was being sealed");
    const seal = {
      releaseId,
      project,
      commit,
      branch,
      commitMessage,
      createdAt,
      expiresAt,
      wranglerVersion,
      stockRollback: Boolean(stockRollback),
      gates: { cleanTree: true, sameHead: true, functionsTypecheck: true, build: true, r2Prepared: true },
      ...source,
    };
    const manifest = { schemaVersion: RELEASE_SCHEMA_VERSION, seal, sealHash: sha256(stableJson(seal)), preview: null, production: null };
    writeJsonAtomic(join(tempDir, "manifest.json"), manifest);
    renameSync(tempDir, finalDir);
    return { releaseId, releaseDir: finalDir, artifactDir: join(finalDir, "artifact"), manifestPath: join(finalDir, "manifest.json"), manifest };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function loadManifest(releaseRoot, releaseId) {
  if (!RELEASE_ID_RE.test(releaseId)) throw new Error(`invalid release artifact id: ${releaseId}`);
  const releaseDir = join(resolve(releaseRoot), releaseId);
  const manifestPath = join(releaseDir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`release manifest not found: ${releaseId}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return { releaseDir, artifactDir: join(releaseDir, "artifact"), manifestPath, manifest };
}

export function verifyReleaseArtifact({
  releaseRoot,
  releaseId,
  expectedProject,
  expectedCommit,
  expectedWranglerVersion,
  requirePreview = true,
  now = new Date(),
}) {
  const loaded = loadManifest(releaseRoot, releaseId);
  const { manifest } = loaded;
  if (manifest.schemaVersion !== RELEASE_SCHEMA_VERSION || !manifest.seal) throw new Error("unsupported or incomplete release manifest");
  if (manifest.seal.releaseId !== releaseId) throw new Error("release id does not match its manifest");
  if (manifest.sealHash !== sha256(stableJson(manifest.seal))) throw new Error("release manifest seal hash mismatch");
  if (manifest.seal.project !== expectedProject) throw new Error("release project mismatch");
  if (manifest.seal.commit !== expectedCommit) throw new Error("release HEAD mismatch");
  if (manifest.seal.wranglerVersion !== expectedWranglerVersion) throw new Error("release Wrangler version mismatch");
  const created = Date.parse(manifest.seal.createdAt);
  const expires = Date.parse(manifest.seal.expiresAt);
  if (!Number.isFinite(created) || !Number.isFinite(expires) || created > now.getTime() + 5 * 60 * 1000 || now.getTime() > expires || expires - created !== RELEASE_MAX_AGE_MS) {
    throw new Error("release artifact is stale or has an invalid lifetime");
  }
  const actual = inspectReleaseArtifact(loaded.artifactDir);
  for (const key of ["artifactHash", "fileCount", "totalBytes", "files"]) {
    if (stableJson(actual[key]) !== stableJson(manifest.seal[key])) throw new Error(`release artifact ${key} mismatch`);
  }
  if (requirePreview) {
    const preview = manifest.preview;
    let url;
    try { url = new URL(preview?.url); } catch { throw new Error("release artifact has no valid Preview deployment receipt"); }
    const previewAt = Date.parse(preview?.deployedAt);
    if (preview?.commit !== expectedCommit || preview?.artifactHash !== actual.artifactHash || !Number.isFinite(previewAt) || previewAt < created || previewAt > now.getTime() || url.protocol !== "https:" || !url.hostname.endsWith(".pages.dev")) {
      throw new Error("release Preview deployment receipt mismatch");
    }
  }
  return { ...loaded, actual };
}

export function recordReleaseDeployment({ releaseRoot, releaseId, env, url, branch, commit, artifactHash, now = new Date() }) {
  if (env !== "preview" && env !== "production") throw new Error(`invalid release deployment environment: ${env}`);
  const loaded = loadManifest(releaseRoot, releaseId);
  if (loaded.manifest[env]) throw new Error(`${env} deployment receipt already exists for ${releaseId}`);
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error(`invalid ${env} deployment URL`); }
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".pages.dev")) {
    throw new Error(`invalid ${env} deployment URL`);
  }
  if (commit !== loaded.manifest.seal.commit || artifactHash !== loaded.manifest.seal.artifactHash) {
    throw new Error(`${env} deployment receipt does not match the sealed artifact`);
  }
  loaded.manifest[env] = { deployedAt: now.toISOString(), url, branch, commit, artifactHash };
  writeJsonAtomic(loaded.manifestPath, loaded.manifest);
  return loaded.manifest;
}
