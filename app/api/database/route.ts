import { getSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { mapRowToRecord, supabaseDB } from '@/lib/supabase-db';
import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { standaloneDB } from '@/lib/standalone-db';

export const dynamic = 'force-dynamic';

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto = forwardedProto || new URL(request.url).protocol.replace(':', '');
    const originUrl = new URL(origin);
    return Boolean(
      host &&
      originUrl.host === host &&
      (originUrl.protocol === `${proto}:` || originUrl.protocol === 'https:')
    );
  } catch {
    return false;
  }
}

function invalidPayload(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return invalidPayload('Cross-site requests are not allowed.', 403);

  const { isConfigured } = getSupabaseCredentials();
  if (!isConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return invalidPayload('Supabase server access is not configured. Add the server-only Supabase service key in Vercel.', 503);
  }

  let body: Record<string, any>;
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 12 * 1024 * 1024) return invalidPayload('Database request is too large.', 413);
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidPayload('Invalid database request.');
    body = value as Record<string, any>;
  } catch {
    return invalidPayload('Invalid database request.');
  }

  try {
    let result: unknown;
    switch (body.operation) {
      case 'checkConnection':
        result = await supabaseDB.checkConnection();
        break;
      case 'getRecords':
        result = await supabaseDB.getRecords();
        break;
      case 'bulkGenerateDocuments': {
        if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 50 || !body.ids.every((id: unknown) => Number.isSafeInteger(Number(id)) && Number(id) > 0)) return invalidPayload('Select 1 to 50 valid Supabase cases.');
        const client = getSupabaseClient();
        const { data, error } = await client.from('trademark_records').select('*').in('id', body.ids.map(Number));
        if (error) throw new Error(`Selected Supabase cases could not be loaded: ${error.message}`);
        const rows = new Map((data || []).map(row => [Number(row.id), row]));
        const results = [];
        for (const rawId of body.ids) {
          const id = Number(rawId);
          const row = rows.get(id);
          if (!row) { results.push({ id, ok: false, error: 'Case was not found in Supabase.' }); continue; }
          const record = mapRowToRecord(row);
          const missing = [!record.folder && 'mark/folder', !record.classNo && 'class', !record.appType && 'application type', !record.appName && 'applicant', !record.appTrade && 'trading name', !record.year && 'year', !record.address && 'applicant address', !record.fatherName && 'father name', !record.cnic && 'CNIC', !record.date && 'issue date', !/^\d{1,3}$/.test(record.clientCode || '') && 'client code', !/^[A-Z][A-Z0-9]{0,7}$/.test((record.selectionMenu || '').toUpperCase()) && 'case series', !/^\d{1,3}$/.test(record.caseNo || '') && 'case number'].filter(Boolean);
          if (missing.length) { results.push({ id, ok: false, error: `Missing required Supabase fields: ${missing.join(', ')}.` }); continue; }
          const response = await proxyAppsScript({ action: 'generateFromForm', category: record.category, selectionMenu: record.selectionMenu, clientCode: record.clientCode, caseNo: record.caseNo, serialNo: record.serialNo || '',
              folder: record.folder, tm: record.tm, classNo: record.classNo, classDesc: record.classDesc, appType: record.appType, appName: record.appName,
              appSo: record.fatherName, appCnic: record.cnic, issueDate: record.issueDate || record.date, expiryDate: record.expiryDate,
              appTrade: record.appTrade, appAdd: record.address, year: record.year, conName: record.conName, conAdd: record.conAddr, noImg: record.noImg || '[NO IMAGE PROVIDED]',
              ...(record.img?.startsWith('data:image/')
                ? { imageBase64: record.img, imageMime: record.img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg' }
                : { img: record.img || '' }) });
          const generated = await response.json().catch(() => null);
          if (!response.ok || generated?.ok !== true) { results.push({ id, ok: false, error: generated?.error || `Document generation failed (${response.status}).` }); continue; }
          const updates: Record<string, unknown> = { serialNo: generated.serialNo };
          try {
            await supabaseDB.updateRecord(id, updates as any);
            const documentReferences = [
              ...(generated.tm1Url ? [{ name: `${record.folder} - TM-1`, type: 'application/vnd.google-apps.document', url: generated.tm1Url }] : []),
              ...(generated.tm48Url ? [{ name: `${record.folder} - TM-48`, type: 'application/vnd.google-apps.document', url: generated.tm48Url }] : []),
            ].map(document => ({ record_id: id, file_name: document.name, file_type: document.type, file_url: document.url }));
            documentReferences.push(...(generated.attachments || []).map((attachment: any) => ({ record_id: id, file_name: attachment.name, file_size: attachment.size, file_type: attachment.mimeType, file_url: attachment.url })));
            await supabaseDB.saveDocumentReferences(documentReferences);
            results.push({ id, ok: true, folderUrl: generated.folderUrl, tm1Url: generated.tm1Url, tm48Url: generated.tm48Url });
          } catch (saveError) {
            results.push({ id, ok: false, error: `Google documents were generated, but Supabase update failed: ${saveError instanceof Error ? saveError.message : 'unknown error'}` });
          }
        }
        result = { results };
        break;
      }
      case 'getSeries':
        result = await supabaseDB.getSeries();
        break;
      case 'addSeries':
        if (typeof body.seriesCode !== 'string') return invalidPayload('A valid series code is required.');
        result = await supabaseDB.addSeries(body.seriesCode);
        break;
      case 'updateSeries':
        if (!Number.isSafeInteger(Number(body.id)) || !body.updates || typeof body.updates !== 'object' || Array.isArray(body.updates)) return invalidPayload('A valid series ID and updates are required.');
        result = await supabaseDB.updateSeries(Number(body.id), body.updates);
        break;
      case 'getClients':
        result = await supabaseDB.getClients();
        break;
      case 'addRecord':
        if (!body.record || typeof body.record !== 'object') return invalidPayload('A case record is required.');
        result = await supabaseDB.addRecord(body.record);
        break;
      case 'importRecords':
        if (!Array.isArray(body.records)) return invalidPayload('A case list is required.');
        result = await supabaseDB.importRecords(body.records);
        break;
      case 'updateRecord':
        if (!Number.isSafeInteger(Number(body.id)) || !body.updates || typeof body.updates !== 'object') return invalidPayload('A valid case ID and updates are required.');
        result = await supabaseDB.updateRecord(Number(body.id), body.updates);
        break;
      case 'updateRecordWithHistory':
        if (!Number.isSafeInteger(Number(body.id)) || !body.updates || typeof body.updates !== 'object' || typeof body.auditNote !== 'string') return invalidPayload('A valid case ID, updates, and audit note are required.');
        result = await supabaseDB.updateRecordWithHistory(Number(body.id), body.updates, body.auditNote);
        break;
      case 'deleteRecord':
        if (!Number.isSafeInteger(Number(body.id))) return invalidPayload('A valid case ID is required.');
        result = await supabaseDB.deleteRecord(Number(body.id));
        break;
      case 'bulkUpdateStatus':
        if (!Array.isArray(body.ids) || !body.ids.every((id: unknown) => Number.isSafeInteger(Number(id))) || typeof body.newStatus !== 'string') return invalidPayload('A valid case selection and workflow status are required.');
        result = await supabaseDB.bulkUpdateStatus(body.ids.map(Number), body.newStatus, body.auditNote, body.meta);
        break;
      case 'bulkAssignClient':
        if (!Array.isArray(body.ids) || !body.ids.every((id: unknown) => Number.isSafeInteger(Number(id))) || !body.clientProfile || typeof body.clientProfile !== 'object') return invalidPayload('A valid case selection and client are required.');
        result = await supabaseDB.bulkAssignClient(body.ids.map(Number), body.clientProfile);
        break;
      case 'addClient':
        if (!body.client || typeof body.client !== 'object') return invalidPayload('A client profile is required.');
        result = await supabaseDB.addClient(body.client);
        break;
      case 'importClients':
        if (!Array.isArray(body.clients)) return invalidPayload('A client list is required.');
        result = await supabaseDB.importClients(body.clients);
        break;
      case 'updateClient':
        if (!Number.isSafeInteger(Number(body.id)) || !body.updates || typeof body.updates !== 'object') return invalidPayload('A valid client ID and updates are required.');
        result = await supabaseDB.updateClient(Number(body.id), body.updates);
        break;
      case 'deleteClient':
        if (!Number.isSafeInteger(Number(body.id))) return invalidPayload('A valid client ID is required.');
        result = await supabaseDB.deleteClient(Number(body.id));
        break;
      case 'getDocumentReferences':
        if (!Number.isSafeInteger(Number(body.recordId))) return invalidPayload('A valid case ID is required.');
        result = await supabaseDB.getDocumentReferences(Number(body.recordId));
        break;
      case 'getHistory':
        if (!Number.isSafeInteger(Number(body.recordId))) return invalidPayload('A valid case ID is required.');
        result = await supabaseDB.getHistory(Number(body.recordId));
        break;
      case 'addHistory':
        if (!Number.isSafeInteger(Number(body.recordId)) || typeof body.status !== 'string' || typeof body.notes !== 'string') return invalidPayload('A valid history entry is required.');
        result = await supabaseDB.addHistory(Number(body.recordId), body.status, body.notes);
        break;
      case 'saveDocumentReferences':
        if (!Array.isArray(body.documents) || !body.documents.every((document: any) => document && typeof document === 'object' && Number.isSafeInteger(Number(document.record_id)))) return invalidPayload('Valid document references are required.');
        result = await supabaseDB.saveDocumentReferences(body.documents);
        break;
      case 'getBackupSnapshot':
        result = await supabaseDB.getBackupSnapshot(body.includeAssets === true);
        break;
      case 'restoreBackupJSON':
        if (typeof body.json !== 'string' || body.json.length > 10 * 1024 * 1024) return invalidPayload('A valid backup file is required.', 413);
        result = await supabaseDB.restoreBackupJSON(body.json, { confirmed: body.options?.confirmed === true, allowMissingAssets: body.options?.allowMissingAssets === true });
        break;
      default:
        return invalidPayload('Unknown database operation.');
    }
    return Response.json({ ok: true, result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase request failed.';
    console.error('[Database API] Operation failed:', body.operation, message);
    return invalidPayload(message, 502);
  }
}
