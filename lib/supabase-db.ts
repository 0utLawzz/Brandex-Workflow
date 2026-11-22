import { getSupabaseClient, getSupabaseCredentials } from './supabase';
import { standaloneDB, RecordItem, ClientProfile, HistoryLog, DocumentAttachment } from './standalone-db';
import { decodeCaseNotesAndNoImage, encodeCaseNotesAndNoImage, mapCaseFieldsFromRow, mapCaseFieldsToRow } from './case-fields';
import { normalizeCaseSeries } from './case-reference';
import { normalizeSeriesCode, validateSeriesUpdate } from './case-series';
import { validateWorkflowTransition } from './case-workflow';

const SUPABASE_REQUEST_TIMEOUT_MS = 10000;

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
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
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
  if (record.dispatchedImage !== undefined) row.dispatched_image = record.dispatchedImage;
  if (record.dispatchedDocName !== undefined) row.dispatched_doc_name = record.dispatchedDocName;
  if (record.dispatchedDocType !== undefined) row.dispatched_doc_type = record.dispatchedDocType;
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
      const { data, error } = await withSupabaseTimeout(client
        .from('trademark_records')
        .select('*')
        .order('id', { ascending: false }));

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

        let { data, error } = await client
          .from('trademark_records')
          .insert([row])
          .select()
          .single();

        // Existing projects may not yet have applied the additive client relationship migration.
        if (error?.message.includes('client_id') && row.client_id !== undefined) {
          delete row.client_id;
          const retry = await client.from('trademark_records').insert([row]).select().single();
          data = retry.data;
          error = retry.error;
        }

        if (!error && data) {
          const inserted = mapRowToRecord(data);
          try {
            const { error: historyError } = await client.from('trademark_history').insert([{
              record_id: inserted.id,
              status: 'RECORD_CREATED',
              notes: `Case #${inserted.caseNo || '001'} created with initial status: ${inserted.status || 'PENDING'}`,
              created_at: new Date().toISOString(),
            }]);
            if (historyError) console.warn('[SupabaseDB] Initial case history was not saved remotely:', historyError.message);
          } catch (historyError) {
            console.warn('[SupabaseDB] Initial case history request failed:', historyError);
          }
          return inserted;
        } else if (error) {
          console.warn('[SupabaseDB] Record insert failed on remote DB:', error.message);
          throw new Error(`Supabase record save failed: ${error.message}`);
        }
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

    const client = getSupabaseClient();
    let importedCount = 0;
    for (let offset = 0; offset < records.length; offset += 100) {
      const batch = records.slice(offset, offset + 100);
      const rows = batch.map(record => {
        const row = mapRecordToRow(record);
        row.selection_menu = record.selectionMenu ?? '';
        row.client_code = record.clientCode ?? '';
        row.case_no = record.caseNo ?? '';
        delete row.id;
        row.created_at = record.createdAt || new Date().toISOString();
        return row;
      });

      let result = await withSupabaseTimeout(client.from('trademark_records').insert(rows).select());
      if (result.error?.message.includes('client_id') && rows.some(row => row.client_id !== undefined)) {
        const compatibleRows = rows.map(row => {
          const compatibleRow = { ...row };
          delete compatibleRow.client_id;
          return compatibleRow;
        });
        result = await withSupabaseTimeout(client.from('trademark_records').insert(compatibleRows).select());
      }
      if (result.error) {
        throw new Error(`CSV import saved ${importedCount} of ${records.length} cases before failing: ${result.error.message}`);
      }
      const inserted = Array.isArray(result.data) ? result.data.map(mapRowToRecord) : [];
      if (inserted.length !== batch.length) {
        throw new Error(`CSV import saved ${importedCount + inserted.length} of ${records.length} cases; Supabase returned an incomplete batch.`);
      }
      importedCount += inserted.length;
    }
    return importedCount;
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

      let result = await withSupabaseTimeout(client.from('trademark_records').update(row).eq('id', id).select().maybeSingle());
      if (result.error && result.error.message.includes('dispatched_image')) {
        delete row.dispatched_image;
        delete row.dispatched_doc_name;
        delete row.dispatched_doc_type;
        result = await withSupabaseTimeout(client.from('trademark_records').update(row).eq('id', id).select().maybeSingle());
      }
      if (result.error) throw new Error(`Supabase record update failed: ${result.error.message}`);
      if (!result.data) throw new Error('Supabase record update returned no case. It may have been deleted or access denied.');

      const updated = mapRowToRecord(result.data);
      if (updates.dispatchedImage) {
        const { error: documentError } = await withSupabaseTimeout(client.from('trademark_documents').insert([{
          record_id: id,
          file_name: updates.dispatchedDocName || `Dispatch_Receipt_${updates.trackingId || id}`,
          file_type: updates.dispatchedDocType || (updates.dispatchedImage.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'),
          file_url: updates.dispatchedImage,
          created_at: new Date().toISOString()
        }]));
        if (documentError) throw new Error(`Case was updated, but dispatch proof reference save failed: ${documentError.message}`);
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
      const { data: currentRows, error: currentRowsError } = await withSupabaseTimeout(
        client.from('trademark_records').select('id, status').in('id', ids)
      );
      if (currentRowsError) throw new Error(`Could not verify selected case statuses: ${currentRowsError.message}`);
      if (!Array.isArray(currentRows) || currentRows.length !== ids.length) throw new Error('One or more selected cases could not be found; no workflow status was changed.');
      for (const current of currentRows) {
        const transition = validateWorkflowTransition(current.status, newStatus, meta || {});
        if (!transition.valid) throw new Error(`Case #${current.id}: ${transition.error || 'Workflow transition not allowed.'} No selected cases were changed.`);
      }
      const updatePayload: Record<string, any> = {
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(meta?.dispatchedDate ? { dispatched_date: meta.dispatchedDate } : {}),
          ...(meta?.dispatchedNote ? { dispatched_note: meta.dispatchedNote } : {}),
          ...(meta?.trackingId ? { tracking_id: meta.trackingId } : {}),
          ...(meta?.dispatchedImage ? { dispatched_image: meta.dispatchedImage } : {}),
          ...(meta?.deliveredDate ? { delivered_date: meta.deliveredDate } : {}),
          ...(meta?.receiverName ? { receiver_name: meta.receiverName } : {}),
          ...(meta?.receiptImage ? { receipt_image: meta.receiptImage } : {})
        };

      const { error } = await withSupabaseTimeout(client
          .from('trademark_records')
          .update(updatePayload)
          .in('id', ids));
      if (error) throw new Error(`Supabase bulk status update failed: ${error.message}`);

      if (meta?.dispatchedImage) {
        const docRows = ids.map(id => ({
            record_id: id,
            file_name: meta.dispatchedDocName || `Dispatch_Receipt_${id}`,
            file_type: meta.dispatchedDocType || (meta.dispatchedImage!.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'),
            file_url: meta.dispatchedImage,
            created_at: new Date().toISOString()
        }));
        const { error: documentError } = await withSupabaseTimeout(client.from('trademark_documents').insert(docRows));
        if (documentError) throw new Error(`Dispatch proof save failed: ${documentError.message}`);
      }

      const historyRows = ids.map(id => ({
          record_id: id,
          status: newStatus,
          notes: auditNote || `Bulk stage updated to ${newStatus}`,
          created_at: new Date().toISOString()
      }));

      const { error: historyError } = await withSupabaseTimeout(client.from('trademark_history').insert(historyRows));
      if (historyError) throw new Error(`Status updated, but history logging failed: ${historyError.message}`);
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
      const { data, error } = await withSupabaseTimeout(client
        .from('clients')
        .select('*')
        .order('id', { ascending: false }));

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

  public async getBackupSnapshot(): Promise<string> {
    if (typeof window !== 'undefined') return requestDatabase('getBackupSnapshot');
    const [recordsResult, clientsResult] = await Promise.all([this.getRecords(), this.getClients()]);
    if (recordsResult.error || clientsResult.error) {
      throw new Error(`Backup stopped because cloud data could not be read: ${recordsResult.error || clientsResult.error}`);
    }
    if (recordsResult.source !== clientsResult.source) {
      throw new Error('Backup stopped because case and client data came from different sources. Reload and retry after the connection is restored.');
    }
    const { isConfigured } = getSupabaseCredentials();
    let history: HistoryLog[] | undefined;
    let documents: DocumentAttachment[] | undefined;
    if (isConfigured) {
      const client = getSupabaseClient();
      const [historyResult, documentsResult] = await Promise.all([
        withSupabaseTimeout(client.from('trademark_history').select('*')),
        withSupabaseTimeout(client.from('trademark_documents').select('*'))
      ]);
      if (historyResult.error || documentsResult.error) {
        throw new Error(`Backup stopped because history or document data could not be read: ${historyResult.error?.message || documentsResult.error?.message}`);
      }
      history = (historyResult.data || []).map((row: any) => ({
        id: Number(row.id), record_id: Number(row.record_id), action: row.status || row.action || 'STAGE_UPDATE', notes: row.notes || '', created_at: row.created_at || ''
      }));
      documents = (documentsResult.data || []).map((row: any) => ({
        id: Number(row.id), record_id: Number(row.record_id), file_name: row.file_name || '', file_size: Number(row.file_size) || undefined, file_type: row.file_type || '', file_url: row.file_url || '', created_at: row.created_at || ''
      }));
    }
    return standaloneDB.exportBackupJSON({
      records: recordsResult.records,
      clients: clientsResult.clients,
      ...(history ? { history } : {}),
      ...(documents ? { documents } : {})
    });
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

  public async restoreBackupJSON(json: string): Promise<{ count: number; clients: number }> {
    if (typeof window !== 'undefined') return requestDatabase('restoreBackupJSON', { json });
    const parsed = standaloneDB.parseBackupJSON(json);
    if (!parsed.success) throw new Error(parsed.message);
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) throw new Error('Supabase server credentials are not configured. Backup was not restored.');

    const records = (parsed.records || []).map(({ id: _id, ...record }) => record);
    const clients = parsed.clients || [];
    if (records.length) await this.importRecords(records);
    if (clients.length) await this.importClients(clients);
    return { count: records.length, clients: clients.length };
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
