import { POST as generateApplication } from '@/app/api/applications/route';
import { POST as databaseRequest } from '@/app/api/database/route';
import { getSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { hasSameOrigin } from '@/lib/request-origin';
import { readBoundedJson, RequestPayloadError } from '@/lib/request-json';
import { RECOVERY_CHUNK_BYTES, MAX_RECOVERY_BYTES, assembleRecovery, decodeRecoveryChunk, encodeRecoveryChunk, recoveryDigest, validateTransferManifest } from '@/lib/recovery-transfer';
import { INLINE_REQUEST_BYTES, INLINE_RESPONSE_BYTES, applicationTarget, applicationByteLimit } from '@/lib/api-request-transfer';
import type { ApplicationTarget, ApiTransferOutcome } from '@/lib/api-request-transfer';
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
  let executionStarted = false;
  try {
    const value = await readBoundedJson(request, 750 * 1024);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestPayloadError('Invalid transfer request.', 400);
    const body = value as Record<string, any>;
    const client = getSupabaseClient();
    const call = async (name: string, args: Record<string, unknown>) => {
      const { error } = await client.rpc(name, args);
      if (error) throw new Error(error.message);
    };
    const manifestFor = async (id: string, bytes: Uint8Array): Promise<TransferManifest> => validateTransferManifest({ id, byteLength: bytes.length, chunkCount: Math.ceil(bytes.length / RECOVERY_CHUNK_BYTES), sha256: await recoveryDigest(bytes) });
    const metaManifest = (meta: Record<string, any>) => validateTransferManifest({ id: meta.id, byteLength: meta.byte_length, chunkCount: meta.chunk_count, sha256: meta.sha256 });
    const loadChunks = async (manifest: TransferManifest) => {
      const { data, error } = await client.from('recovery_transfer_chunks').select('chunk_index,content').eq('transfer_id', manifest.id).order('chunk_index').limit(128);
      if (error || !data || data.length !== manifest.chunkCount || data.some((chunk, index) => chunk.chunk_index !== index)) throw new RequestPayloadError('Transfer is incomplete. Reload data before retrying.', 409);
      return assembleRecovery(manifest, async index => data[index].content);
    };
    const readOutcome = async (meta: Record<string, any>): Promise<ApiTransferOutcome> => {
      const manifest = metaManifest(meta);
      if (manifest.byteLength <= INLINE_RESPONSE_BYTES) return { status: meta.response_status, text: await loadChunks(manifest) };
      return { status: meta.response_status, manifest };
    };
    const execute = async (id: string, target: ApplicationTarget, json: string) => {
      const payload = JSON.parse(json);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new RequestPayloadError('Invalid application payload.', 400);
      const innerHeaders = new Headers(request.headers);
      innerHeaders.delete('content-length');
      innerHeaders.set('content-type', 'application/json');
      const inner = new Request(new URL(target === 'applications' ? '/api/applications' : '/api/database', request.url), { method: 'POST', headers: innerHeaders, body: json });
      executionStarted = true;
      const response = await (target === 'applications' ? generateApplication(inner) : databaseRequest(inner));
      const text = await response.text();
      const bytes = new TextEncoder().encode(text || 'null');
      if (bytes.length > MAX_RECOVERY_BYTES) throw new Error('Application response exceeds the 64 MiB transfer limit.');
      const manifest = await manifestFor(id, bytes);
      await call('complete_application_transfer', { p_id: id, p_bytes: bytes.length, p_chunks: manifest.chunkCount, p_sha256: manifest.sha256, p_status: response.status, p_content: manifest.chunkCount === 1 ? encodeRecoveryChunk(bytes) : null });
      if (manifest.chunkCount > 1) {
        for (let index = 0; index < manifest.chunkCount; index++) await call('put_recovery_chunk', { p_id: id, p_index: index, p_content: encodeRecoveryChunk(bytes.subarray(index * RECOVERY_CHUNK_BYTES, (index + 1) * RECOVERY_CHUNK_BYTES)) });
      }
      return reply(manifest.byteLength <= INLINE_RESPONSE_BYTES ? { status: response.status, text } : { status: response.status, manifest });
    };

    if (body.operation === 'invoke') {
      const target = applicationTarget(body.target);
      if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) throw new RequestPayloadError('Invalid application payload.', 400);
      const json = JSON.stringify(body.payload);
      if (typeof json !== 'string') throw new RequestPayloadError('Invalid application payload.', 400);
      const bytes = new TextEncoder().encode(json);
      if (bytes.length > INLINE_REQUEST_BYTES) throw new RequestPayloadError('Use chunks for this request.', 413);
      const manifest = await manifestFor(crypto.randomUUID(), bytes);
      await call('start_application_request', { p_id: manifest.id, p_purpose: target, p_content: encodeRecoveryChunk(bytes), p_sha256: manifest.sha256 });
      try { return await execute(manifest.id, target, json); }
      finally { try { await client.from('recovery_transfers').delete().eq('id', manifest.id).is('claimed_at', null).eq('purpose', 'api-result').lte('byte_length', INLINE_RESPONSE_BYTES); } catch { /* Expiry is the cleanup fallback. */ } }
    }
    if (body.operation === 'start') {
      const target = applicationTarget(body.target);
      const manifest = validateTransferManifest({ id: crypto.randomUUID(), byteLength: body.byteLength, chunkCount: body.chunkCount, sha256: body.sha256 });
      if (manifest.byteLength > applicationByteLimit(target)) throw new RequestPayloadError('Application payload exceeds its byte limit.', 413);
      await call('begin_application_transfer', { p_id: manifest.id, p_purpose: target, p_bytes: manifest.byteLength, p_chunks: manifest.chunkCount, p_sha256: manifest.sha256 });
      return reply(manifest);
    }
    if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) throw new RequestPayloadError('Invalid transfer ID.', 400);
    if (body.operation === 'release') {
      const { error } = await client.from('recovery_transfers').delete().eq('id', body.id).in('purpose', ['applications','database','api-result']).is('claimed_at', null);
      if (error) throw new Error('Temporary transfer cleanup failed. Expiry will prevent further access.');
      return reply(true);
    }
    const { data: meta, error } = await client.from('recovery_transfers').select('*').eq('id', body.id).in('purpose', ['applications','database','api-result']).gt('expires_at', new Date().toISOString()).single();
    if (error || !meta) throw new RequestPayloadError('Transfer unavailable or expired. Reload data before retrying.', 410);
    const manifest = metaManifest(meta);
    if (body.operation === 'status') return reply(meta.direction === 'download' && meta.purpose === 'api-result' ? await readOutcome(meta) : { state: meta.claimed_at ? 'executing' : 'uploading' });
    if (body.operation === 'get' && meta.direction === 'download' && meta.purpose === 'api-result') {
      if (!Number.isInteger(body.index) || body.index < 0 || body.index >= manifest.chunkCount) throw new RequestPayloadError('Invalid chunk index.', 400);
      const { data, error } = await client.from('recovery_transfer_chunks').select('content').eq('transfer_id', body.id).eq('chunk_index', body.index).single();
      if (error || !data) throw new Error('Response capture is incomplete. Reload data before retrying.');
      return reply(data.content);
    }
    if (body.operation === 'execute' && meta.direction === 'download' && meta.purpose === 'api-result') return reply(await readOutcome(meta));
    if (meta.direction !== 'upload' || !['applications','database'].includes(meta.purpose)) throw new RequestPayloadError('Invalid transfer operation.', 400);
    if (body.operation === 'put') {
      if (!Number.isInteger(body.index) || body.index < 0 || body.index >= manifest.chunkCount) throw new RequestPayloadError('Invalid chunk index.', 400);
      decodeRecoveryChunk(body.content);
      await call('put_recovery_chunk', { p_id: body.id, p_index: body.index, p_content: body.content });
      return reply(true);
    }
    if (body.operation === 'execute') {
      const json = await loadChunks(manifest);
      const payload = JSON.parse(json);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new RequestPayloadError('Invalid application payload.', 400);
      await call('claim_application_transfer', { p_id: body.id });
      return await execute(body.id, applicationTarget(meta.purpose), json);
    }
    throw new RequestPayloadError('Unknown transfer operation.', 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request transfer failed.';
    return Response.json({ ok: false, ...(executionStarted ? { code: 'REQUEST_OUTCOME_UNCONFIRMED' } : {}), error: executionStarted ? `The request may already have completed. Reload data before retrying. ${message}` : message }, { status: error instanceof RequestPayloadError ? error.status : 502, headers });
  }
}
