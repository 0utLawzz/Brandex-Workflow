import type { BackupAsset } from './backup-package.ts';
import type { AssetCopy } from './backup-assets.ts';

export async function planAssetRestore(assets: BackupAsset[], copies: AssetCopy[] = []) {
  const uploads: Array<{ sourceUrl: string; dataUrl: string; sha256: string; name: string; mimeType: string }> = [];
  const seen = new Set<string>();
  let missing = 0;
  let bytesTotal = 0;
  for (const asset of assets) {
    if (asset.sourceUrl.startsWith('data:')) continue; // Bytes remain embedded in the restored row.
    const candidates = copies.filter(copy => copy.sourceUrl === asset.sourceUrl && copy.dataUrl);
    const copy = candidates[0];
    if (!copy) { missing++; continue; }
    if (candidates.some(candidate => candidate.dataUrl !== copy.dataUrl || candidate.sha256 !== copy.sha256)) throw new Error('Conflicting copies of the same asset.');
    if (seen.has(asset.sourceUrl)) continue;
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(copy.dataUrl!);
    if (!match || match[2].length > 12 * 1024 * 1024) throw new Error('Invalid recovery asset encoding.');
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
    bytesTotal += bytes.length;
    if (bytes.length > 8 * 1024 * 1024 || bytesTotal > 32 * 1024 * 1024) throw new Error('Recovery asset byte budget exceeded.');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== copy.sha256) throw new Error('Recovery asset checksum mismatch.');
    uploads.push({ sourceUrl: asset.sourceUrl, dataUrl: copy.dataUrl!, sha256: hash, name: asset.fileName, mimeType: match[1] });
    seen.add(asset.sourceUrl);
  }
  return { uploads, missing };
}

export function remapAssetUrls<T>(snapshot: T, replacements: Map<string, { url: string; mimeType: string }>): T {
  const result = structuredClone(snapshot) as Record<string, any>;
  for (const row of result.records || []) for (const key of ['logo_url', 'receipt_image', 'dispatched_image']) {
    if (typeof row[key] === 'string' && replacements.has(row[key])) row[key] = replacements.get(row[key])!.url;
  }
  for (const row of result.documents || []) {
    const replacement = replacements.get(row.file_url);
    if (replacement) { row.file_url = replacement.url; row.file_type = replacement.mimeType; }
  }
  return result as T;
}
