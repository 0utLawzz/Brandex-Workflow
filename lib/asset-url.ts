import { driveFileId } from './backup-assets.ts';

export function safeAssetHref(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const fileId = driveFileId(value);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/view`;
  if (/^data:(image\/(?:png|jpeg|gif|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function caseLogoSource(recordId: number, value: unknown): string {
  if (typeof value !== 'string') return '';
  if (driveFileId(value) && Number.isSafeInteger(recordId) && recordId > 0) return `/api/case-image?recordId=${recordId}`;
  if (value.startsWith('data:') && !/^data:image\/(?:png|jpeg|gif|webp);base64,/.test(value)) return '';
  return safeAssetHref(value);
}
