import { getSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { driveFileId } from '@/lib/backup-assets';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Cross-site image request rejected.', { status: 403, headers });
  const id = Number(new URL(request.url).searchParams.get('recordId'));
  if (!Number.isSafeInteger(id) || id < 1) return new Response('Invalid case ID.', { status: 400, headers });
  if (!getSupabaseCredentials().isConfigured) return new Response('Database unavailable.', { status: 503, headers });
  try {
    const { data, error } = await getSupabaseClient().from('trademark_records').select('logo_url').eq('id', id).single();
    const fileId = data && driveFileId(data.logo_url || '');
    if (error || !fileId) return new Response('Logo unavailable.', { status: 404, headers });
    const response = await proxyAppsScript({ action: 'getImageThumbnail', fileId });
    const result = await response.json();
    const match = typeof result?.dataUrl === 'string' && /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(result.dataUrl);
    if (!response.ok || !result.ok || !match || match[2].length > 1400000) throw new Error('Thumbnail unavailable.');
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
    if (bytes.length > 1024 * 1024) throw new Error('Thumbnail exceeds its size limit.');
    return new Response(bytes, { headers: { ...headers, 'Content-Type': match[1], 'Content-Length': String(bytes.length) } });
  } catch { return new Response('Logo preview unavailable.', { status: 502, headers }); }
}
