import { getSupabaseClient, getSupabaseCredentials } from './supabase';
import { standaloneDB, RecordItem, ClientProfile, HistoryLog, DocumentAttachment } from './standalone-db';
import { decodeCaseNotesAndNoImage, encodeCaseNotesAndNoImage, mapCaseFieldsFromRow, mapCaseFieldsToRow } from './case-fields';
import { normalizeCaseSeries } from './case-reference';
import { normalizeSeriesCode, validateSeriesUpdate } from './case-series';
import { validateWorkflowTransition } from './case-workflow';
import { readAllRows } from './read-all-rows';
import { preflightRestore } from './restore-preflight';
import { assertRecoveryTarget } from './recovery-policy';
import type { RecoveryOptions, RecoveryReport } from './recovery-policy';
import { createBackupPackage } from './backup-package';
import { copyBackupAssets } from './backup-assets';
import { proxyAppsScript } from './apps-script-proxy';
import { validateClientContact } from './client-contact';
import { planAssetRestore, remapAssetUrls } from './restore-assets';

const SUPABASE_REQUEST_TIMEOUT_MS = 10000;

async function readTable(client: ReturnType<typeof getSupabaseClient>, table: string): Promise<{ data: any[]; error: { message: string } | null }> {
  const data = await readAllRows<any>(before => {
    let query = client.from(table).select('*', { count: 'exact' }).order('id', { ascending: false }).limit(500);
    if (before !== null) query = query.lt('id', before);
    return withSupabaseTimeout(query);
  });
  return { data, error: null };
}

async function requestDatabase<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ operation, ...payload }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.error || `Supabase request failed (${response.status}).`);
  }
  return result.result as T;
}

async function withSupabaseTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Supabase request timed out')), SUPABASE_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function assertUniqueCaseReference(
  client: any,
  identity: { clientCode?: string; selectionMenu?: string; caseNo?: string },
  ignoreId?: number
): Promise<void> {
  const code = String(identity.clientCode || '').replace(/\D/g, '').padStart(3, '0');
  const caseNo = String(identity.caseNo || '').replace(/\D/g, '').padStart(3, '0');
  if (!code || code === '000' || !caseNo || caseNo === '000' || !identity.selectionMenu) return;
  const series = normalizeCaseSeries(identity.selectionMenu);
  const codeVariants = Array.from(new Set([code, String(Number(code))]));
  const caseVariants = Array.from(new Set([caseNo, String(Number(caseNo))]));
  const { data, error } = await withSupabaseTimeout<any>(
    client.from('trademark_records')
      .select('id, client_code, selection_menu, case_no')
      .in('client_code', codeVariants)
      .ilike('selection_menu', series)
      .in('case_no', caseVariants)
  );
  if (error) throw new Error(`Could not verify case reference uniqueness: ${error.message}`);
  const duplicate = (data || []).find((row: any) =>
    Number(row.id) !== Number(ignoreId || 0) &&
    String(row.client_code || '').replace(/\D/g, '').padStart(3, '0') === code &&
    String(row.selection_menu || '').toUpperCase() === series &&
    String(row.case_no || '').replace(/\D/g, '').padStart(3, '0') === caseNo
  );
  if (duplicate) {
    throw new Error(`Case reference ${series}-${code}-${caseNo} already exists for this client and series. Choose the next available number.`);
  }
}

// Helper to map DB row to RecordItem
export function mapRowToRecord(row: any): RecordItem {
  const savedNotes = decodeCaseNotesAndNoImage(row.notes, row.no_img || row.noImg);
  return {
    id: Number(row.id),
    ...mapCaseFieldsFromRow(row),
    date: row.issue_date || row.date || '',
    issueDate: row.issue_date || row.issueDate || '',
    folder: row.mark_name || row.folder || '',
    tm: row.trademark_no || row.tm || '',
    classNo: row.class_no || row.classNo || '',
    appName: row.applicant_name || row.appName || '',
    appTrade: row.trading_as || row.appTrade || '',
    year: row.usage_year || row.year || '',
    conName: row.consultant_name || row.conName || 'BRANDEX LAW ASSOCIATES',
    lawFirm: row.consultant_name || row.lawFirm || 'BRANDEX LAW ASSOCIATES',
    img: row.logo_url || row.img || '',
    noImg: savedNotes.noImg,
    status: row.status || 'PENDING',
    filingProcess: row.filing_process || row.filingProcess || 'PENDING',
    trackingId: row.tracking_id || row.trackingId || '',
    selectionMenu: row.selection_menu || row.selectionMenu || '',
    clientCode: row.client_code || row.clientCode || '',
    caseNo: row.case_no || row.caseNo || '',
    address: row.address || '',
    cnic: row.cnic || '',
    fatherName: row.father_name || row.fatherName || '',
    notes: savedNotes.notes,
    dispatchedDate: row.dispatched_date || row.dispatchedDate || '',
    dispatchedNote: row.dispatched_note || row.dispatchedNote || '',
    dispatchedImage: row.dispatched_image || row.dispatch_receipt || row.dispatchedImage || '',
    dispatchedDocName: row.dispatched_doc_name || row.dispatchedDocName || '',
    dispatchedDocType: row.dispatched_doc_type || row.dispatchedDocType || '',
    deliveredDate: row.delivered_date || row.deliveredDate || '',
    receiverName: row.receiver_name || row.receiverName || '',
    receiptImage: row.receipt_image || row.receiptImage || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || ''
  };
}

// Helper to map RecordItem to DB row payload
export function mapRecordToRow(record: Partial<RecordItem>): Record<string, any> {
  const row: Record<string, any> = {};
  Object.assign(row, mapCaseFieldsToRow(record));

  if (record.folder !== undefined) row.mark_name = record.folder;
  if (record.tm !== undefined) row.trademark_no = record.tm;
  if (record.classNo !== undefined) row.class_no = record.classNo;
  if (record.appName !== undefined) row.applicant_name = record.appName;
  if (record.appTrade !== undefined) row.trading_as = record.appTrade;
  if (record.fatherName !== undefined) row.father_name = record.fatherName;
  if (record.cnic !== undefined) row.cnic = record.cnic;
  if (record.address !== undefined) row.address = record.address;
  if (record.date !== undefined) row.issue_date = record.date;
  if (record.year !== undefined) row.usage_year = record.year;
  if (record.conName !== undefined) row.consultant_name = record.conName;
  if (record.lawFirm !== undefined && !row.consultant_name) row.consultant_name = record.lawFirm;
  if (record.status !== undefined) row.status = record.status;
  if (record.filingProcess !== undefined) row.filing_process = record.filingProcess;
  if (record.trackingId !== undefined) row.tracking_id = record.trackingId;
  if (record.selectionMenu !== undefined) row.selection_menu = record.selectionMenu;
  if (record.clientCode !== undefined) row.client_code = record.clientCode;
  if (record.caseNo !== undefined) row.case_no = record.caseNo;
  if (record.img !== undefined) row.logo_url = record.img;
  if (record.dispatchedDate !== undefined) row.dispatched_date = record.dispatchedDate;
  if (record.dispatchedNote !== undefined) row.dispatched_note = record.dispatchedNote;
  // Dispatch proof is stored as a row in trademark_documents. These columns are
  // absent from the live production schema and must never be sent to trademark_records.
  if (record.deliveredDate !== undefined) row.delivered_date = record.deliveredDate;
  if (record.receiverName !== undefined) row.receiver_name = record.receiverName;
  if (record.receiptImage !== undefined) row.receipt_image = record.receiptImage;
  if (record.notes !== undefined || record.noImg !== undefined) {
    row.notes = record.noImg !== undefined
      ? encodeCaseNotesAndNoImage(record.notes, record.noImg || '')
      : record.notes;
  }
  row.updated_at = new Date().toISOString();

  return row;
}

// Helper to map DB row to ClientProfile
export function mapRowToClient(row: any): ClientProfile {
  return {
    drive_folder_id: row.drive_folder_id || '',
    phone: row.phone || '',
    email: row.email || '',
    id: Number(row.id),
    client_code: row.client_code || '',
    client_prefix: row.client_prefix || '',
    city: row.city || '',
    folder_reference: row.folder_reference || '',
    client_name: row.name || row.client_name || '',
    father_name: row.father_name || '',
    trading_as: row.company_name || row.trading_as || '',
    cnic: row.cnic || '',
    address: row.address || '',
    consultant_name: row.consultant_name || 'BRANDEX LAW ASSOCIATES',
    total_cases: Number(row.total_cases) || 0,
    created_at: row.created_at || new Date().toISOString()
  };
}

export function mapClientToRow(client: Partial<ClientProfile>): Record<string, any> {
  const row: Record<string, any> = {};
  Object.assign(row, validateClientContact(client));
  if (client.client_code !== undefined) row.client_code = client.client_code;
  if (client.client_prefix !== undefined) row.client_prefix = client.client_prefix;
  if (client.city !== undefined) row.city = client.city;
  if (client.folder_reference !== undefined) row.folder_reference = client.folder_reference;
  if (client.client_name !== undefined) row.name = client.client_name;
  if (client.father_name !== undefined) row.father_name = client.father_name;
  if (client.trading_as !== undefined) row.company_name = client.trading_as;
  if (client.cnic !== undefined) row.cnic = client.cnic;
  if (client.address !== undefined) row.address = client.address;
  if (client.consultant_name !== undefined) row.consultant_name = client.consultant_name;
  if (client.total_cases !== undefined) row.total_cases = client.total_cases;
  return row;
}

export interface CaseSeries {
  id: number;
  series_code: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseStatus {
  connected: boolean;
  tableReady: boolean;
  error?: string;
  url: string;
}

class SupabaseDBService {
  public async bulkGenerateDocuments(ids: number[]): Promise<Array<{ id: number; ok: boolean; error?: string }>> {
    if (typeof window !== 'undefined') return requestDatabase('bulkGenerateDocuments', { ids });
    throw new Error('Bulk document generation must be started from the authenticated Records page.');
  }

  // Check if Supabase connection & schema are operational
  public async checkConnection(): Promise<SupabaseStatus> {
    if (typeof window !== 'undefined') return requestDatabase<SupabaseStatus>('checkConnection');
    const { url, key, isConfigured } = getSupabaseCredentials();
    if (!isConfigured) {
      return {
        connected: false,
        tableReady: false,
        error: 'Supabase credentials not configured',
        url
      };
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client
        .from('trademark_records')
        .select('id')
        .limit(1));

      if (error) {
        return {
          connected: true,
          tableReady: false,
          error: error.message || 'Table schema not found',
          url
        };
      }

      return {
        connected: true,
        tableReady: true,
        url
      };
    } catch (err: any) {
      return {
        connected: false,
        tableReady: false,
        error: err.message || 'Connection failed',
        url
      };
    }
  }

  // -------------------------------------------------------------
  // RECORDS
  // -------------------------------------------------------------
  public async getRecords(): Promise<{ records: RecordItem[]; source: 'supabase' | 'local'; error?: string }> {
    if (typeof window !== 'undefined') return requestDatabase('getRecords');
    const { isConfigured } = getSupabaseCredentials();

    if (!isConfigured) {
      return { records: [], source: 'supabase', error: 'Supabase server credentials are not configured.' };
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await readTable(client, 'trademark_records');

      if (error) {
        console.error('[SupabaseDB] Supabase records query failed:', error.message);
        return { records: [], source: 'supabase', error: error.message };
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapRowToRecord);

        return { records: mapped, source: 'supabase' };
      }

      return { records: [], source: 'supabase', error: 'Supabase returned an invalid records response.' };
    } catch (err: any) {
      console.warn('[SupabaseDB] Network or connection error:', err);
      return { records: [], source: 'supabase', error: err.message };
    }
  }

  public async addRecord(record: Omit<RecordItem, 'id'> & { id?: number }): Promise<RecordItem> {
    if (typeof window !== 'undefined') return requestDatabase('addRecord', { record });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        const row = mapRecordToRow(record);
        row.selection_menu = normalizeCaseSeries(record.selectionMenu || 'A');
        row.client_code = String(record.clientCode || '').replace(/\D/g, '').padStart(3, '0');
        row.case_no = String(record.caseNo || '').replace(/\D/g, '').padStart(3, '0');
        await assertUniqueCaseReference(client, { clientCode: row.client_code, selectionMenu: row.selection_menu, caseNo: row.case_no });
        if (record.id) row.id = record.id;
        row.created_at = new Date().toISOString();

        const { data, error } = await withSupabaseTimeout(client.rpc('create_case_record', { p_row: row }));
        if (error || !data) throw new Error(`Atomic case creation failed: ${error?.message || 'No saved case returned'}`);
        return mapRowToRecord(data);
      } catch (err) {
        console.warn('[SupabaseDB] Error sending record to Supabase:', err);
        throw err;
      }
    }
    throw new Error('Supabase server credentials are not configured. Case was not saved.');
  }

  public async importRecords(records: Array<Omit<RecordItem, 'id'>>): Promise<number> {
    if (typeof window !== 'undefined') return requestDatabase('importRecords', { records });
    if (records.length === 0) return 0;
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Import was not saved.');

    if (records.length > 5000) throw new Error('Import no more than 5000 cases at once.');
    const rows = records.map(record => {
        const row = mapRecordToRow(record);
        row.selection_menu = record.selectionMenu ?? '';
        row.client_code = record.clientCode ?? '';
        row.case_no = record.caseNo ?? '';
        delete row.id;
        if (record.createdAt) row.created_at = record.createdAt;
        if (record.updatedAt) row.updated_at = record.updatedAt;
        return { row, proof: { url: record.dispatchedImage || '', name: record.dispatchedDocName || '', type: record.dispatchedDocType || '' } };
    });
    const result = await withSupabaseTimeout(getSupabaseClient().rpc('import_case_csv', { p_rows: rows }));
    if (result.error) throw new Error(`Atomic CSV import failed: ${result.error.message}`);
    if (result.data !== records.length) throw new Error('Import confirmation is incomplete. Reload cases before retrying.');
    return result.data;
  }

  public async updateRecord(id: number, updates: Partial<RecordItem>): Promise<RecordItem | null> {
    if (typeof window !== 'undefined') return requestDatabase('updateRecord', { id, updates });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const row = mapRecordToRow(updates);
      if (updates.status !== undefined) {
        const { data: currentStatusRow, error: statusReadError } = await withSupabaseTimeout(
          client.from('trademark_records').select('status').eq('id', id).maybeSingle()
        );
        if (statusReadError) throw new Error(`Could not verify the current workflow status: ${statusReadError.message}`);
        if (!currentStatusRow) throw new Error('Case was not found while validating its workflow transition.');
        const transition = validateWorkflowTransition(currentStatusRow.status, updates.status, updates);
        if (!transition.valid) throw new Error(transition.error || 'This workflow transition is not allowed.');

        const { error: transitionError } = await withSupabaseTimeout(client.rpc('apply_case_workflow_transition', {
          p_ids: [id],
          p_new_status: updates.status,
          p_audit_note: updates.notes || `Case marked as ${updates.status}`,
          p_meta: {
            dispatchedDate: updates.dispatchedDate,
            dispatchedNote: updates.dispatchedNote,
            trackingId: updates.trackingId,
            dispatchedImage: updates.dispatchedImage,
            dispatchedDocName: updates.dispatchedDocName,
            dispatchedDocType: updates.dispatchedDocType,
            deliveredDate: updates.deliveredDate,
            receiverName: updates.receiverName,
            receiptImage: updates.receiptImage,
          },
        }));
        if (transitionError) throw new Error(`Atomic workflow transition failed: ${transitionError.message}`);
        const { data: transitioned, error: transitionedError } = await withSupabaseTimeout(
          client.from('trademark_records').select().eq('id', id).maybeSingle()
        );
        if (transitionedError) throw new Error(`Workflow transition succeeded but case reload failed: ${transitionedError.message}`);
        return transitioned ? mapRowToRecord(transitioned) : null;
      }
      if (updates.selectionMenu !== undefined || updates.clientCode !== undefined || updates.caseNo !== undefined) {
        const { data: current, error: currentError } = await withSupabaseTimeout(
          client.from('trademark_records').select('id, client_code, selection_menu, case_no').eq('id', id).maybeSingle()
        );
        if (currentError) throw new Error(`Could not read current case identity: ${currentError.message}`);
        if (!current) throw new Error('Case was not found while validating its reference.');
        const identity = {
          clientCode: String(updates.clientCode ?? current.client_code ?? ''),
          selectionMenu: String(updates.selectionMenu ?? current.selection_menu ?? 'A'),
          caseNo: String(updates.caseNo ?? current.case_no ?? '')
        };
        await assertUniqueCaseReference(client, identity, id);
        if (updates.clientCode !== undefined) row.client_code = identity.clientCode.replace(/\D/g, '').padStart(3, '0');
        if (updates.selectionMenu !== undefined) row.selection_menu = normalizeCaseSeries(identity.selectionMenu);
        if (updates.caseNo !== undefined) row.case_no = identity.caseNo.replace(/\D/g, '').padStart(3, '0');
      }

      const result = await withSupabaseTimeout(client.from('trademark_records').update(row).eq('id', id).select().maybeSingle());
      if (result.error) throw new Error(`Supabase record update failed: ${result.error.message}`);
      if (!result.data) throw new Error('Supabase record update returned no case. It may have been deleted or access denied.');

      const updated = mapRowToRecord(result.data);
      if (updates.dispatchedImage) {
        await this.saveDocumentReferences([{
          record_id: id,
          file_name: updates.dispatchedDocName || `Dispatch_Receipt_${updates.trackingId || id}`,
          file_type: updates.dispatchedDocType || (updates.dispatchedImage.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'),
          file_url: updates.dispatchedImage,
        }]);
      }
      return updated;
    }

    throw new Error('Supabase server credentials are not configured. Case was not updated.');
  }

  public async deleteRecord(id: number): Promise<boolean> {
    if (typeof window !== 'undefined') return requestDatabase('deleteRecord', { id });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client.from('trademark_records').delete().eq('id', id).select('id').maybeSingle());
      if (error) throw new Error(`Supabase record delete failed: ${error.message}`);
      if (!data) throw new Error('Supabase record delete returned no case. It may have been deleted or access denied.');
      return true;
    }

    throw new Error('Supabase server credentials are not configured. Case was not deleted.');
  }

  public async updateRecordWithHistory(id: number, updates: Partial<RecordItem>, auditNote: string): Promise<RecordItem | null> {
    if (typeof window !== 'undefined') return requestDatabase('updateRecordWithHistory', { id, updates, auditNote });
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Case was not updated.');
    if (updates.status !== undefined) throw new Error('Workflow status changes must use the guarded transition operation.');

    const client = getSupabaseClient();
    const payload: Record<string, unknown> = mapRecordToRow(updates);
    delete payload.updated_at;
    if (updates.selectionMenu !== undefined || updates.clientCode !== undefined || updates.caseNo !== undefined) {
      const { data: current, error: currentError } = await withSupabaseTimeout(
        client.from('trademark_records').select('id, client_code, selection_menu, case_no').eq('id', id).maybeSingle()
      );
      if (currentError) throw new Error(`Could not read current case identity: ${currentError.message}`);
      if (!current) throw new Error('Case was not found while validating its reference.');
      const identity = {
        clientCode: String(updates.clientCode ?? current.client_code ?? ''),
        selectionMenu: String(updates.selectionMenu ?? current.selection_menu ?? 'A'),
        caseNo: String(updates.caseNo ?? current.case_no ?? ''),
      };
      await assertUniqueCaseReference(client, identity, id);
      if (updates.clientCode !== undefined) payload.client_code = identity.clientCode.replace(/\D/g, '').padStart(3, '0');
      if (updates.selectionMenu !== undefined) payload.selection_menu = normalizeCaseSeries(identity.selectionMenu);
      if (updates.caseNo !== undefined) payload.case_no = identity.caseNo.replace(/\D/g, '').padStart(3, '0');
    }
    if (updates.dispatchedImage !== undefined) payload.dispatchedImage = updates.dispatchedImage;
    if (updates.dispatchedDocName !== undefined) payload.dispatchedDocName = updates.dispatchedDocName;
    if (updates.dispatchedDocType !== undefined) payload.dispatchedDocType = updates.dispatchedDocType;

    const { error } = await withSupabaseTimeout(client.rpc('apply_case_metadata_update', {
      p_id: id,
      p_updates: payload,
      p_audit_note: auditNote,
    }));
    if (error) throw new Error(`Atomic case edit failed: ${error.message}`);
    const { data, error: readError } = await withSupabaseTimeout(
      client.from('trademark_records').select().eq('id', id).maybeSingle()
    );
    if (readError) throw new Error(`Case was updated but reload failed: ${readError.message}`);
    return data ? mapRowToRecord(data) : null;
  }

  public async bulkUpdateStatus(
    ids: number[],
    newStatus: string,
    auditNote?: string,
    meta?: {
      dispatchedDate?: string;
      dispatchedNote?: string;
      trackingId?: string;
      dispatchedImage?: string;
      dispatchedDocName?: string;
      dispatchedDocType?: string;
      deliveredDate?: string;
      receiverName?: string;
      receiptImage?: string;
    }
  ): Promise<void> {
    if (typeof window !== 'undefined') {
      await requestDatabase('bulkUpdateStatus', { ids, newStatus, auditNote, meta });
      return;
    }
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { error } = await withSupabaseTimeout(client.rpc('apply_case_workflow_transition', {
        p_ids: ids,
        p_new_status: newStatus,
        p_audit_note: auditNote || `Bulk stage updated to ${newStatus}`,
        p_meta: meta || {},
      }));
      if (error) throw new Error(`Atomic bulk workflow transition failed: ${error.message}`);
    }

    if (!getSupabaseCredentials().isConfigured) throw new Error('Supabase server credentials are not configured. Bulk status update was not saved.');
  }

  public async bulkAssignClient(ids: number[], clientProfile: ClientProfile): Promise<void> {
    if (typeof window !== 'undefined') {
      await requestDatabase('bulkAssignClient', { ids, clientProfile });
      return;
    }
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Bulk client assignment was not saved.');
    if (isConfigured) {
      const client = getSupabaseClient();
      const { error } = await withSupabaseTimeout(client
          .from('trademark_records')
          .update({
            client_code: clientProfile.client_code,
            applicant_name: clientProfile.client_name,
            trading_as: clientProfile.trading_as,
            father_name: clientProfile.father_name,
            cnic: clientProfile.cnic,
            address: clientProfile.address,
            consultant_name: clientProfile.consultant_name,
            updated_at: new Date().toISOString()
          })
          .in('id', ids));
      if (error) throw new Error(`Supabase client reassignment failed: ${error.message}`);
    }

  }

  // -------------------------------------------------------------
  // SHARED CASE SERIES
  // -------------------------------------------------------------
  public async getSeries(): Promise<CaseSeries[]> {
    if (typeof window !== 'undefined') return requestDatabase<CaseSeries[]>('getSeries');
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Shared series could not be loaded.');

    const client = getSupabaseClient();
    const { data, error } = await withSupabaseTimeout(
      client.from('case_series').select('*').order('sort_order', { ascending: true }).order('series_code', { ascending: true })
    );
    if (error) throw new Error(`Shared case series could not be loaded: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Supabase returned an invalid case-series response.');
    return data.map((row: any) => ({
      id: Number(row.id),
      series_code: String(row.series_code || ''),
      is_active: row.is_active === true,
      sort_order: Number(row.sort_order) || 0,
      created_at: String(row.created_at || ''),
      updated_at: String(row.updated_at || '')
    }));
  }

  public async addSeries(value: string): Promise<CaseSeries> {
    if (typeof window !== 'undefined') return requestDatabase<CaseSeries>('addSeries', { seriesCode: value });
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Series was not saved.');

    const seriesCode = normalizeSeriesCode(value);
    const client = getSupabaseClient();
    const { data: latest, error: orderError } = await withSupabaseTimeout(
      client.from('case_series').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    );
    if (orderError) throw new Error(`Series order could not be read: ${orderError.message}`);
    const nextOrder = (Number(latest?.sort_order) || 0) + 1;
    const { data, error } = await withSupabaseTimeout(
      client.from('case_series').insert([{ series_code: seriesCode, is_active: true, sort_order: nextOrder }]).select('*').single()
    );
    if (error) {
      if (error.code === '23505') throw new Error(`Series ${seriesCode} already exists.`);
      throw new Error(`Series could not be created: ${error.message}`);
    }
    if (!data) throw new Error('Supabase did not return the created series.');
    return {
      id: Number(data.id), series_code: String(data.series_code), is_active: data.is_active === true,
      sort_order: Number(data.sort_order) || 0, created_at: String(data.created_at || ''), updated_at: String(data.updated_at || '')
    };
  }

  public async updateSeries(id: number, value: unknown): Promise<CaseSeries> {
    if (typeof window !== 'undefined') return requestDatabase<CaseSeries>('updateSeries', { id, updates: value as Record<string, unknown> });
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('A valid series ID is required.');
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Series was not updated.');

    const updates = validateSeriesUpdate(value);
    const client = getSupabaseClient();
    const { data: current, error: currentError } = await withSupabaseTimeout(
      client.from('case_series').select('id, series_code').eq('id', id).maybeSingle()
    );
    if (currentError) throw new Error(`Series could not be loaded: ${currentError.message}`);
    if (!current) throw new Error('Series was not found. Reload Settings and try again.');

    if (updates.series_code && updates.series_code !== String(current.series_code).toUpperCase()) {
      const { count, error: usageError } = await withSupabaseTimeout(
        client.from('trademark_records').select('id', { count: 'exact', head: true }).ilike('selection_menu', String(current.series_code))
      );
      if (usageError) throw new Error(`Existing case usage could not be checked: ${usageError.message}`);
      if ((count || 0) > 0) {
        throw new Error('This series is already used by existing cases. Create a new series and deactivate this one instead; historical references will not be renamed.');
      }
    }

    const patch = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await withSupabaseTimeout(
      client.from('case_series').update(patch).eq('id', id).select('*').single()
    );
    if (error) {
      if (error.code === '23505') throw new Error('A series with this code already exists.');
      throw new Error(`Series could not be updated: ${error.message}`);
    }
    return {
      id: Number(data.id), series_code: String(data.series_code), is_active: data.is_active === true,
      sort_order: Number(data.sort_order) || 0, created_at: String(data.created_at || ''), updated_at: String(data.updated_at || '')
    };
  }

  // -------------------------------------------------------------
  // CLIENTS
  // -------------------------------------------------------------
  public async getClients(): Promise<{ clients: ClientProfile[]; source: 'supabase' | 'local'; error?: string }> {
    if (typeof window !== 'undefined') return requestDatabase('getClients');
    const { isConfigured } = getSupabaseCredentials();

    if (!isConfigured) {
      return { clients: [], source: 'supabase', error: 'Supabase server credentials are not configured.' };
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await readTable(client, 'clients');

      if (error) {
        return { clients: [], source: 'supabase', error: error.message };
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapRowToClient);
        return { clients: mapped, source: 'supabase' };
      }

      return { clients: [], source: 'supabase', error: 'Supabase returned an invalid clients response.' };
    } catch (err: any) {
      return { clients: [], source: 'supabase', error: err.message };
    }
  }

  public async getBackupSnapshot(includeAssets = false): Promise<string> {
    if (typeof window !== 'undefined') return requestDatabase('getBackupSnapshot', { includeAssets });
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured.');
    const { data, error } = await withSupabaseTimeout(getSupabaseClient().rpc('get_recovery_snapshot'));
    if (error) throw new Error(`Consistent backup snapshot unavailable: ${error.message}. Verify the reviewed recovery migration before retrying.`);
    if (!data || ['records', 'clients', 'history', 'documents', 'series'].some(key => !Array.isArray(data[key]))) throw new Error('Backup snapshot returned incomplete collections.');
    const exported = JSON.parse(standaloneDB.exportBackupJSON({
      records: data.records.map(mapRowToRecord),
      clients: data.clients.map(mapRowToClient),
      history: data.history.map((row: any) => ({ ...row, action: row.status })),
      documents: data.documents,
    }));
    // Preserve original database values alongside the portable application map.
    exported.databaseSnapshot = data;
    exported.capturedAt = data.capturedAt;
    if (includeAssets) {
      exported.assetCopies = await copyBackupAssets(exported.assets, async fileId => {
        const response = await proxyAppsScript({ action: 'exportBackupAsset', fileId });
        const file = await response.json();
        if (!response.ok || !file.ok) throw new Error(file.error || 'Drive export failed.');
        return file;
      });
      const missing = exported.assetCopies.filter((copy: any) => !copy.dataUrl).length;
      exported.backupStatus = missing ? 'partial' : 'complete';
      exported.counts.assetsMissingBytes = missing;
      exported.counts.assetsWithBytes = exported.assetCopies.length - missing;
      exported.backupNotice = missing ? `${missing} assets could not be copied. See assetCopies for individual failures.` : 'Referenced asset copies have verified SHA-256 checksums. Native Google files are exported to Office formats; Google sharing, revisions and comments are not preserved.';
    }
    return JSON.stringify(exported, null, 2);
  }

  public async addClient(client: Omit<ClientProfile, 'id'> & { id?: number }): Promise<ClientProfile> {
    if (typeof window !== 'undefined') return requestDatabase('addClient', { client });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const clientSupabase = getSupabaseClient();
      const row = mapClientToRow(client);
      row.created_at = new Date().toISOString();

      const { data, error } = await withSupabaseTimeout(clientSupabase
        .from('clients')
        .insert([row])
        .select()
        .single());
      if (error || !data) throw new Error(`Supabase client save failed: ${error?.message || 'No row returned'}`);
      const inserted = mapRowToClient(data);
      return inserted;
    }

    throw new Error('Supabase server credentials are not configured. Client was not saved.');
  }

  public async importClients(clients: Array<Omit<ClientProfile, 'id'>>): Promise<number> {
    if (typeof window !== 'undefined') return requestDatabase('importClients', { clients });
    if (clients.length === 0) return 0;
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Import was not saved.');

    const client = getSupabaseClient();
    let importedCount = 0;
    for (let offset = 0; offset < clients.length; offset += 100) {
      const batch = clients.slice(offset, offset + 100);
      const rows = batch.map(profile => ({
        ...mapClientToRow(profile),
        created_at: profile.created_at || new Date().toISOString()
      }));
      const { data, error } = await withSupabaseTimeout(client.from('clients').insert(rows).select());
      if (error) {
        throw new Error(`CSV import saved ${importedCount} of ${clients.length} clients before failing: ${error.message}`);
      }
      const inserted = Array.isArray(data) ? data.map(mapRowToClient) : [];
      if (inserted.length !== batch.length) {
        throw new Error(`CSV import saved ${importedCount + inserted.length} of ${clients.length} clients; Supabase returned an incomplete batch.`);
      }
      importedCount += inserted.length;
    }
    return importedCount;
  }

  public async restoreBackupJSON(json: string, options: RecoveryOptions = { confirmed: false, allowMissingAssets: false }): Promise<RecoveryReport> {
    if (typeof window !== 'undefined') return requestDatabase('restoreBackupJSON', { json, options });
    const { isConfigured, url } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Backup was not restored.');
    const projectRef = assertRecoveryTarget(url, process.env.RECOVERY_RESTORE_ENABLED, process.env.RECOVERY_RESTORE_PROJECT_REF, options.confirmed === true);
    const packageData = JSON.parse(json);
    const raw = packageData.databaseSnapshot;
    if (packageData.schemaVersion !== 3 || !raw || ['records', 'clients', 'history', 'documents'].some(key => !Array.isArray(raw[key]))) throw new Error('A version 3 backup with the original database snapshot is required. Legacy backups need reviewed conversion.');
    // Inspect the actual rows that the RPC will receive, not a potentially different portable view.
    const actualPackage = createBackupPackage({ records: raw.records.map(mapRowToRecord), clients: raw.clients.map(mapRowToClient), history: raw.history, documents: raw.documents });
    const destination = await this.getBackupSnapshot();
    const preflight = preflightRestore(JSON.stringify(actualPackage), destination);
    if (!preflight.valid) throw new Error(`Restore preflight failed: ${preflight.errors.join(' ')}`);
    const assets = await planAssetRestore(actualPackage.assets, packageData.assetCopies || []);
    if (assets.missing && options.allowMissingAssets !== true) throw new Error('File bytes are missing. Review the partial recovery warning before proceeding.');
    const replacements = new Map<string, { url: string; mimeType: string }>();
    const recoveryFolder = process.env.RECOVERY_DRIVE_FOLDER_ID;
    if (assets.uploads.length && (!recoveryFolder || !/^[A-Za-z0-9_-]{10,200}$/.test(recoveryFolder))) throw new Error('An administrator-approved recovery Drive folder is required before copying files.');
    for (const asset of assets.uploads) {
      const response = await proxyAppsScript({ action: 'restoreBackupAsset', folderId: recoveryFolder, dataUrl: asset.dataUrl, sha256: asset.sha256, name: asset.name });
      const restored = await response.json();
      if (!response.ok || restored.ok !== true || restored.sha256 !== asset.sha256 || typeof restored.url !== 'string' || !restored.url.startsWith('https://drive.google.com/')) throw new Error(`Recovery file copy failed. ${replacements.size} previously copied files remain in the approved recovery folder; retrying reuses verified copies.`);
      replacements.set(asset.sourceUrl, { url: restored.url, mimeType: asset.mimeType });
    }
    const snapshot = remapAssetUrls({ clients: raw.clients, records: raw.records, history: raw.history, documents: raw.documents }, replacements);
    const { data, error } = await withSupabaseTimeout(getSupabaseClient().rpc('restore_recovery_snapshot', { p_snapshot: snapshot }));
    if (error) throw new Error(`Atomic restore failed: ${error.message}. No partial database restore was committed; retry the same file to check an uncertain response.`);
    if (!data || !data.caseIdMap || !data.clientIdMap || ['records', 'clients', 'history', 'documents'].some(key => !Number.isSafeInteger(data[key]))) throw new Error('Restore response is incomplete. Retry the same file to retrieve the stored report.');
    return { count: data.records, clients: data.clients, history: data.history, documents: data.documents, caseIdMap: data.caseIdMap, clientIdMap: data.clientIdMap, packageHash: data.packageHash, alreadyRestored: data.alreadyRestored === true, missingAssets: assets.missing, restoredAssets: replacements.size, projectRef };
  }

  public async updateClient(id: number, updates: Partial<ClientProfile>): Promise<ClientProfile | null> {
    if (typeof window !== 'undefined') return requestDatabase('updateClient', { id, updates });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const row = mapClientToRow(updates);
      row.updated_at = new Date().toISOString();
      const { data, error } = await withSupabaseTimeout(client.from('clients').update(row).eq('id', id).select().maybeSingle());
      if (error) throw new Error(`Supabase client update failed: ${error.message}`);
      if (!data) throw new Error('Supabase client update returned no client. It may have been deleted or access denied.');
      const updated = mapRowToClient(data);
      return updated;
    }

    throw new Error('Supabase server credentials are not configured. Client was not updated.');
  }

  public async deleteClient(id: number): Promise<boolean> {
    if (typeof window !== 'undefined') return requestDatabase('deleteClient', { id });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client.from('clients').delete().eq('id', id).select('id').maybeSingle());
      if (error) throw new Error(`Supabase client delete failed: ${error.message}`);
      if (!data) throw new Error('Supabase client delete returned no client. It may have been deleted or access denied.');
      return true;
    }

    throw new Error('Supabase server credentials are not configured. Client was not deleted.');
  }

  // -------------------------------------------------------------
  // HISTORY AUDIT LOGS
  // -------------------------------------------------------------
  public async getHistory(recordId: number): Promise<HistoryLog[]> {
    if (typeof window !== 'undefined') return requestDatabase('getHistory', { recordId });
    const { isConfigured } = getSupabaseCredentials();

    if (!isConfigured) throw new Error('Supabase server credentials are not configured.');

    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('trademark_history')
        .select('*')
        .eq('record_id', recordId)
        .order('id', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: Number(d.id),
          record_id: Number(d.record_id),
          action: d.status || d.action || 'STAGE_UPDATE',
          notes: d.notes || '',
          created_at: d.created_at || new Date().toISOString()
        }));
      }
      throw new Error(`Supabase history query failed: ${error?.message || 'Invalid response'}`);
    } catch (error) {
      throw error instanceof Error ? error : new Error('Supabase history query failed.');
    }
  }

  public async addHistory(recordId: number, status: string, notes: string): Promise<HistoryLog> {
    if (typeof window !== 'undefined') return requestDatabase('addHistory', { recordId, status, notes });
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client.from('trademark_history').insert([{
        record_id: recordId,
        status,
        notes,
        created_at: new Date().toISOString()
      }]).select().single());
      if (error) throw new Error(`Supabase history save failed: ${error.message}`);
      if (!data) throw new Error('Supabase history save returned no row.');
      return {
        id: Number(data.id),
        record_id: Number(data.record_id),
        action: data.status || status,
        notes: data.notes || notes,
        created_at: data.created_at || new Date().toISOString(),
      };
    }

    if (!isConfigured) throw new Error('Supabase server credentials are not configured. History was not saved.');
    throw new Error('Supabase history could not be saved.');
  }

  public async getDocumentReferences(recordId: number): Promise<DocumentAttachment[]> {
    if (typeof window !== 'undefined') return requestDatabase('getDocumentReferences', { recordId });
    if (!Number.isSafeInteger(recordId) || recordId < 1) throw new Error('A valid case ID is required.');
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured.');
    const client = getSupabaseClient();
    const { data, error } = await withSupabaseTimeout(
      client.from('trademark_documents').select('*').eq('record_id', recordId).order('id', { ascending: false })
    );
    if (error) throw new Error(`Case attachments could not be loaded: ${error.message}`);
    return (data || []).map((row: any) => ({
      id: Number(row.id),
      record_id: Number(row.record_id),
      file_name: String(row.file_name || 'Attachment'),
      file_type: String(row.file_type || ''),
      file_url: String(row.file_url || ''),
      file_size: row.file_size == null ? undefined : Number(row.file_size),
      created_at: String(row.created_at || ''),
    }));
  }

  public async saveDocumentReferences(documents: Array<Omit<DocumentAttachment, 'id' | 'created_at'> & { file_size?: number }>): Promise<number> {
    if (typeof window !== 'undefined') return requestDatabase('saveDocumentReferences', { documents });
    if (documents.length === 0) return 0;
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Document references were not saved.');

    const client = getSupabaseClient();
    const byRecord = new Map<number, typeof documents>();
    for (const document of documents) {
      if (!Number.isSafeInteger(document.record_id) || document.record_id < 1 || !document.file_url) {
        throw new Error('Every document reference must include a valid case ID and Google Drive URL.');
      }
      byRecord.set(document.record_id, [...(byRecord.get(document.record_id) || []), document]);
    }

    let savedCount = 0;
    for (const [recordId, recordDocuments] of byRecord) {
      const { data: existing, error: readError } = await withSupabaseTimeout(
        client.from('trademark_documents').select('file_url').eq('record_id', recordId)
      );
      if (readError) throw new Error(`Existing document references could not be checked: ${readError.message}`);

      const knownUrls = new Set((existing || []).map(row => String(row.file_url || '')).filter(Boolean));
      const uniqueNew = new Map<string, typeof recordDocuments[number]>();
      for (const document of recordDocuments) {
        if (!knownUrls.has(document.file_url)) uniqueNew.set(document.file_url, document);
      }
      if (uniqueNew.size === 0) continue;

      const rows = Array.from(uniqueNew.values()).map(document => ({
        record_id: document.record_id,
        file_name: document.file_name,
        file_size: document.file_size,
        file_type: document.file_type,
        file_url: document.file_url,
      }));
      const { data, error } = await withSupabaseTimeout(
        client.from('trademark_documents').insert(rows).select()
      );
      if (error) throw new Error(`Document reference save failed: ${error.message}`);
      if (!Array.isArray(data) || data.length !== rows.length) {
        throw new Error('Supabase returned an incomplete document-reference save.');
      }
      savedCount += data.length;
    }
    return savedCount;
  }

}

export const supabaseDB = new SupabaseDBService();
