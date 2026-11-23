import { getSupabaseClient } from '@/lib/supabase';
import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { readBoundedJson, RequestPayloadError } from '@/lib/request-json';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  try {
    if (!origin || new URL(origin).host !== host) return Response.json({ error: 'Cross-site request rejected.' }, { status: 403 });
    const value = await readBoundedJson(request, 8192);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return Response.json({ error: 'Invalid folder request.' }, { status: 400 });
    const { clientId, recordId, folderId, oauthToken } = value as Record<string, any>;
    const targetId = recordId ?? clientId;
    if ((recordId !== undefined && clientId !== undefined) || !Number.isSafeInteger(targetId) || targetId < 1 || typeof folderId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(folderId) || typeof oauthToken !== 'string' || !oauthToken || oauthToken.length > 4096) return Response.json({ error: 'Invalid folder selection.' }, { status: 400 });
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed,capabilities(canAddChildren)&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${oauthToken}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const folder = await response.json();
    if (!response.ok || folder.id !== folderId || folder.trashed || folder.mimeType !== 'application/vnd.google-apps.folder' || folder.capabilities?.canAddChildren !== true) return Response.json({ error: 'Select a writable folder accessible to your Google account.' }, { status: 400 });
    // Independently check the Apps Script execution identity, not only the picker user.
    const checked = await proxyAppsScript({ action: 'validateDriveFolder', folderId });
    const validation = await checked.json();
    if (!checked.ok || !validation.ok || validation.folderId !== folderId) return Response.json({ error: validation.error || 'Generation account cannot use this folder.' }, { status: 400 });
    const { data, error } = await getSupabaseClient().from(recordId !== undefined ? 'trademark_records' : 'clients').update({ drive_folder_id: folderId, updated_at: new Date().toISOString() }).eq('id', targetId).select('id,drive_folder_id').single();
    if (error || !data) return Response.json({ error: 'Validated folder could not be saved. Check destination migration and client identity.' }, { status: 409 });
    return Response.json({ ok: true, folderId, name: folder.name }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ error: error instanceof RequestPayloadError ? error.message : 'Folder validation failed. Reauthorize and retry.' }, { status: error instanceof RequestPayloadError ? error.status : 400, headers: { 'Cache-Control': 'no-store' } }); }
}
