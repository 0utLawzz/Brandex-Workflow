import { getSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { supabaseDB } from '@/lib/supabase-db';
import { hasSameOrigin } from '@/lib/request-origin';
import { readBoundedJson, RequestPayloadError } from '@/lib/request-json';
import { assertRecoveryTarget } from '@/lib/recovery-policy';
import { RECOVERY_CHUNK_BYTES, MAX_RECOVERY_BYTES, assembleRecovery, decodeRecoveryChunk, encodeRecoveryChunk, recoveryDigest, validateTransferManifest } from '@/lib/recovery-transfer';
import type { TransferManifest } from '@/lib/recovery-transfer';
import { previewWriteError } from '@/lib/preview-isolation';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'no-store' };
const reply = (result: unknown) => Response.json({ ok: true, result }, { headers });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ ok: false, error: 'Cross-site request rejected.' }, { status: 403, headers });
  if (!getSupabaseCredentials().isConfigured) return Response.json({ ok: false, error: 'Database access is not configured.' }, { status: 503, headers });
  const isolationError = previewWriteError(process.env, getSupabaseCredentials().url);
  if (isolationError) return Response.json({ ok: false, error: isolationError }, { status: 503, headers });
  try {
    const value = await readBoundedJson(request, 750 * 1024);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestPayloadError('Invalid transfer request.', 400);
    const body = value as Record<string, any>;
    const client = getSupabaseClient();
    const begin = async (manifest: TransferManifest, direction: string) => {
      validateTransferManifest(manifest);
      const { error } = await client.rpc('begin_recovery_transfer', { p_id: manifest.id, p_direction: direction, p_bytes: manifest.byteLength, p_chunks: manifest.chunkCount, p_sha256: manifest.sha256 });
      if (error) throw new Error(`Recovery staging unavailable: ${error.message}`);
    };
    const checkRestore = () => assertRecoveryTarget(getSupabaseCredentials().url, process.env.RECOVERY_RESTORE_ENABLED, process.env.RECOVERY_RESTORE_PROJECT_REF, body.options?.confirmed === true);

    if (body.operation === 'download') {
      const json = await supabaseDB.getBackupSnapshot(body.includeAssets === true);
      const bytes = new TextEncoder().encode(json);
      if (!bytes.length || bytes.length > MAX_RECOVERY_BYTES) throw new RequestPayloadError('Backup exceeds the 64 MiB transfer limit. Use the reviewed administrator export procedure.', 413);
      const manifest = { id: crypto.randomUUID(), byteLength: bytes.length, chunkCount: Math.ceil(bytes.length / RECOVERY_CHUNK_BYTES), sha256: await recoveryDigest(bytes) };
      await begin(manifest, 'download');
      try {
        for (let index = 0; index < manifest.chunkCount; index++) {
          const { error } = await client.rpc('put_recovery_chunk', { p_id: manifest.id, p_index: index, p_content: encodeRecoveryChunk(bytes.subarray(index * RECOVERY_CHUNK_BYTES, (index + 1) * RECOVERY_CHUNK_BYTES)) });
          if (error) throw new Error(`Backup staging failed: ${error.message}`);
        }
      } catch (error) { await client.from('recovery_transfers').delete().eq('id', manifest.id); throw error; }
      return reply(manifest);
    }
    if (body.operation === 'upload') {
      checkRestore();
      const manifest = validateTransferManifest({ id: crypto.randomUUID(), byteLength: body.byteLength, chunkCount: body.chunkCount, sha256: body.sha256 });
      await begin(manifest, 'upload');
      return reply(manifest);
    }
    if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) throw new RequestPayloadError('Invalid transfer ID.', 400);
    if (body.operation === 'release') {
      const { error } = await client.from('recovery_transfers').delete().eq('id', body.id).eq('purpose', 'recovery');
      if (error) throw new Error('Transfer cleanup failed; expiry will prevent further access.');
      return reply(true);
    }
    const { data: meta, error: readError } = await client.from('recovery_transfers').select('*').eq('id', body.id).eq('purpose', 'recovery').gt('expires_at', new Date().toISOString()).single();
    if (readError || !meta) throw new RequestPayloadError('Transfer unavailable or expired. Start again with the original file.', 410);
    const manifest = validateTransferManifest({ id: meta.id, byteLength: meta.byte_length, chunkCount: meta.chunk_count, sha256: meta.sha256 });
    if (body.operation === 'put' && meta.direction === 'upload') {
      checkRestore();
      if (!Number.isInteger(body.index) || body.index < 0 || body.index >= manifest.chunkCount) throw new RequestPayloadError('Invalid chunk index.', 400);
      decodeRecoveryChunk(body.content);
      const { error } = await client.rpc('put_recovery_chunk', { p_id: body.id, p_index: body.index, p_content: body.content });
      if (error) throw new Error(`Upload chunk rejected: ${error.message}`);
      return reply(true);
    }
    if (body.operation === 'get' && meta.direction === 'download') {
      if (!Number.isInteger(body.index) || body.index < 0 || body.index >= manifest.chunkCount) throw new RequestPayloadError('Invalid chunk index.', 400);
      const { data, error } = await client.from('recovery_transfer_chunks').select('content').eq('transfer_id', body.id).eq('chunk_index', body.index).single();
      if (error || !data) throw new Error('Backup chunk unavailable. Restart the export.');
      return reply(data.content);
    }
    if (body.operation === 'restore' && meta.direction === 'upload') {
      checkRestore();
      const { data, error } = await client.from('recovery_transfer_chunks').select('chunk_index,content').eq('transfer_id', body.id).order('chunk_index').limit(128);
      if (error || !data || data.length !== manifest.chunkCount || data.some((chunk, index) => chunk.chunk_index !== index)) throw new RequestPayloadError('Upload is incomplete. No recovery has started.', 409);
      const json = await assembleRecovery(manifest, async index => data[index].content);
      return reply(await supabaseDB.restoreBackupJSON(json, { confirmed: true, allowMissingAssets: body.options?.allowMissingAssets === true }));
    }
    throw new RequestPayloadError('Unknown transfer operation or direction.', 400);
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Recovery transfer failed.' }, { status: error instanceof RequestPayloadError ? error.status : 502, headers });
  }
}
