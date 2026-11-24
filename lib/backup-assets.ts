import type { BackupAsset } from './backup-package.ts';

export type AssetCopy = { assetId: string; sourceUrl: string; dataUrl?: string; sha256?: string; size?: number; mimeType?: string; error?: string };
export function driveFileId(value: string): string | null {
  // Generation historically persisted Drive's opaque file ID, rather than a URL.
  if (/^[A-Za-z0-9_-]{10,200}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) return null;
    const id = url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] || url.searchParams.get('id');
    return id && /^[A-Za-z0-9_-]{10,200}$/.test(id) ? id : null;
  } catch { return null; }
}

export async function copyBackupAssets(assets: BackupAsset[], fetchFile: (id: string) => Promise<{ dataUrl: string; sha256: string }>, budget = 32 * 1024 * 1024): Promise<AssetCopy[]> {
  const copies: AssetCopy[] = [];
  const cached = new Map<string, Omit<AssetCopy, 'assetId' | 'sourceUrl'>>();
  let used = 0;
  for (const asset of assets) {
    let result = cached.get(asset.sourceUrl);
    if (!result) {
      try {
        const id = driveFileId(asset.sourceUrl);
        if (!asset.sourceUrl.startsWith('data:') && !id) throw new Error('Unsupported asset provider or file URL.');
        const file = asset.sourceUrl.startsWith('data:') ? { dataUrl: asset.sourceUrl, sha256: '' } : await fetchFile(id!);
        const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(file.dataUrl);
        if (!match || match[2].length > 12 * 1024 * 1024) throw new Error('Invalid or oversized file encoding.');
        const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
        if (bytes.length > 8 * 1024 * 1024 || used + bytes.length > budget) throw new Error('File or backup byte limit exceeded.');
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
        if (!asset.sourceUrl.startsWith('data:') && file.sha256 !== hash) throw new Error('File checksum verification failed.');
        result = { dataUrl: file.dataUrl, sha256: hash, size: bytes.length, mimeType: match[1] };
        used += bytes.length;
      } catch (error) { result = { error: error instanceof Error ? error.message : 'Asset copy failed.' }; }
      cached.set(asset.sourceUrl, result);
    }
    copies.push({ assetId: asset.assetId, sourceUrl: asset.sourceUrl, ...result });
  }
  return copies;
}
