import { getSupabaseClient, getSupabaseCredentials } from './supabase';
import { standaloneDB, RecordItem, ClientProfile, HistoryLog, DocumentAttachment } from './standalone-db';
import { mapCaseFieldsFromRow, mapCaseFieldsToRow } from './case-fields';

const SUPABASE_REQUEST_TIMEOUT_MS = 10000;

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

// Helper to map DB row to RecordItem
export function mapRowToRecord(row: any): RecordItem {
  return {
    id: Number(row.id),
    ...mapCaseFieldsFromRow(row),
    date: row.issue_date || row.date || '',
    folder: row.mark_name || row.folder || '',
    tm: row.trademark_no || row.tm || '',
    classNo: row.class_no || row.classNo || '',
    appName: row.applicant_name || row.appName || '',
    appTrade: row.trading_as || row.appTrade || '',
    year: row.usage_year || row.year || '',
    conName: row.consultant_name || row.conName || 'BRANDEX LAW ASSOCIATES',
    lawFirm: row.consultant_name || row.lawFirm || 'BRANDEX LAW ASSOCIATES',
    img: row.logo_url || row.img || '',
    noImg: row.no_img || row.noImg || '',
    status: row.status || 'PENDING',
    filingProcess: row.filing_process || row.filingProcess || 'PENDING',
    trackingId: row.tracking_id || row.trackingId || '',
    selectionMenu: row.selection_menu || row.selectionMenu || 'A',
    clientCode: row.client_code || row.clientCode || '646',
    caseNo: row.case_no || row.caseNo || '001',
    address: row.address || '',
    cnic: row.cnic || '',
    fatherName: row.father_name || row.fatherName || '',
    notes: row.notes || '',
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
  if (record.notes !== undefined) row.notes = record.notes;
  row.updated_at = new Date().toISOString();

  return row;
}

// Helper to map DB row to ClientProfile
export function mapRowToClient(row: any): ClientProfile {
  return {
    id: Number(row.id),
    client_code: row.client_code || '',
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
  if (client.client_name !== undefined) row.name = client.client_name;
  if (client.father_name !== undefined) row.father_name = client.father_name;
  if (client.trading_as !== undefined) row.company_name = client.trading_as;
  if (client.cnic !== undefined) row.cnic = client.cnic;
  if (client.address !== undefined) row.address = client.address;
  if (client.consultant_name !== undefined) row.consultant_name = client.consultant_name;
  if (client.total_cases !== undefined) row.total_cases = client.total_cases;
  return row;
}

function cacheRecord(record: RecordItem): void {
  const records = standaloneDB.getRecords();
  const index = records.findIndex(item => item.id === record.id);
  if (index === -1) records.unshift(record);
  else records[index] = { ...records[index], ...record };
  standaloneDB.saveRecords(records);
}

function cacheClient(client: ClientProfile): void {
  const clients = standaloneDB.getClients();
  const index = clients.findIndex(item => item.id === client.id);
  if (index === -1) clients.unshift(client);
  else clients[index] = { ...clients[index], ...client };
  standaloneDB.saveClients(clients);
}

export interface SupabaseStatus {
  connected: boolean;
  tableReady: boolean;
  error?: string;
  url: string;
}

class SupabaseDBService {
  // Check if Supabase connection & schema are operational
  public async checkConnection(): Promise<SupabaseStatus> {
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
    const local = standaloneDB.getRecords();
    const { isConfigured } = getSupabaseCredentials();

    if (!isConfigured) {
      return { records: local, source: 'local' };
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client
        .from('trademark_records')
        .select('*')
        .order('id', { ascending: false }));

      if (error) {
        console.warn('[SupabaseDB] Query returned error, using local fallback:', error.message);
        return { records: local, source: 'local', error: error.message };
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapRowToRecord);

        // Keep local cache in sync
        if (mapped.length > 0) {
          standaloneDB.saveRecords(mapped);
        } else if (local.length > 0) {
          // If Supabase is empty but local has records, return local and give user option to sync
          return { records: local, source: 'local' };
        }

        return { records: mapped, source: 'supabase' };
      }

      return { records: local, source: 'local' };
    } catch (err: any) {
      console.warn('[SupabaseDB] Network or connection error:', err);
      return { records: local, source: 'local', error: err.message };
    }
  }

  public async addRecord(record: Omit<RecordItem, 'id'> & { id?: number }): Promise<RecordItem> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        const row = mapRecordToRow(record);
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
          standaloneDB.addRecord(inserted, false);
          const history = standaloneDB.addHistory(inserted.id, 'RECORD_CREATED', `Case #${inserted.caseNo || '001'} created with initial status: ${inserted.status || 'PENDING'}`);
          try {
            const { error: historyError } = await client.from('trademark_history').insert([{
              record_id: inserted.id,
              status: history.action,
              notes: history.notes,
              created_at: history.created_at,
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

    return standaloneDB.addRecord(record);
  }

  public async importRecords(records: Array<Omit<RecordItem, 'id'>>): Promise<number> {
    if (records.length === 0) return 0;
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) {
      records.forEach(record => standaloneDB.addRecord(record, false));
      return records.length;
    }

    const client = getSupabaseClient();
    let importedCount = 0;
    for (let offset = 0; offset < records.length; offset += 100) {
      const batch = records.slice(offset, offset + 100);
      const rows = batch.map(record => {
        const row = mapRecordToRow(record);
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
      inserted.forEach(cacheRecord);
      importedCount += inserted.length;
    }
    return importedCount;
  }

  public async updateRecord(id: number, updates: Partial<RecordItem>): Promise<RecordItem | null> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const row = mapRecordToRow(updates);

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
      cacheRecord(updated);

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

    return standaloneDB.updateRecord(id, updates);
  }

  public async deleteRecord(id: number): Promise<boolean> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client.from('trademark_records').delete().eq('id', id).select('id').maybeSingle());
      if (error) throw new Error(`Supabase record delete failed: ${error.message}`);
      if (!data) throw new Error('Supabase record delete returned no case. It may have been deleted or access denied.');
      const records = standaloneDB.getRecords().filter(record => record.id !== id);
      standaloneDB.saveRecords(records);
      return true;
    }

    return standaloneDB.deleteRecord(id);
  }

  public async bulkUpdateStatus(
    ids: number[],
    newStatus: string,
    auditNote?: string,
    meta?: {
      dispatchedDate?: string;
      dispatchedNote?: string;
      dispatchedImage?: string;
      dispatchedDocName?: string;
      dispatchedDocType?: string;
      deliveredDate?: string;
      receiverName?: string;
      receiptImage?: string;
    }
  ): Promise<void> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const updatePayload: Record<string, any> = {
          status: newStatus,
          filing_process: newStatus,
          updated_at: new Date().toISOString(),
          ...(meta?.dispatchedDate ? { dispatched_date: meta.dispatchedDate } : {}),
          ...(meta?.dispatchedNote ? { dispatched_note: meta.dispatchedNote } : {}),
          ...(meta?.dispatchedImage ? { dispatched_image: meta.dispatchedImage } : {}),
          ...(meta?.dispatchedDocName ? { dispatched_doc_name: meta.dispatchedDocName } : {}),
          ...(meta?.dispatchedDocType ? { dispatched_doc_type: meta.dispatchedDocType } : {}),
          ...(meta?.deliveredDate ? { delivered_date: meta.deliveredDate } : {}),
          ...(meta?.receiverName ? { receiver_name: meta.receiverName } : {}),
          ...(meta?.receiptImage ? { receipt_image: meta.receiptImage } : {})
        };

      let { error } = await withSupabaseTimeout(client
          .from('trademark_records')
          .update(updatePayload)
          .in('id', ids));

      if (error && error.message.includes('dispatched_image')) {
        delete updatePayload.dispatched_image;
        delete updatePayload.dispatched_doc_name;
        delete updatePayload.dispatched_doc_type;
        ({ error } = await withSupabaseTimeout(client.from('trademark_records').update(updatePayload).in('id', ids)));
      }
      if (error) throw new Error(`Supabase bulk status update failed: ${error.message}`);

      standaloneDB.bulkUpdateStatus(ids, newStatus, auditNote, meta);

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

    if (!getSupabaseCredentials().isConfigured) standaloneDB.bulkUpdateStatus(ids, newStatus, auditNote, meta);
  }

  public async bulkAssignClient(ids: number[], clientProfile: ClientProfile): Promise<void> {
    const { isConfigured } = getSupabaseCredentials();
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
      standaloneDB.bulkAssignClient(ids, clientProfile);
    }

    if (!getSupabaseCredentials().isConfigured) standaloneDB.bulkAssignClient(ids, clientProfile);
  }

  // -------------------------------------------------------------
  // CLIENTS
  // -------------------------------------------------------------
  public async getClients(): Promise<{ clients: ClientProfile[]; source: 'supabase' | 'local'; error?: string }> {
    const local = standaloneDB.getClients();
    const { isConfigured } = getSupabaseCredentials();

    if (!isConfigured) {
      return { clients: local, source: 'local' };
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client
        .from('clients')
        .select('*')
        .order('id', { ascending: false }));

      if (error) {
        return { clients: local, source: 'local', error: error.message };
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapRowToClient);
        if (mapped.length > 0) {
          standaloneDB.saveClients(mapped);
        } else if (local.length > 0) {
          return { clients: local, source: 'local' };
        }
        return { clients: mapped, source: 'supabase' };
      }

      return { clients: local, source: 'local' };
    } catch (err: any) {
      return { clients: local, source: 'local', error: err.message };
    }
  }

  public async getBackupSnapshot(): Promise<string> {
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
        id: Number(row.id), record_id: Number(row.record_id), file_name: row.file_name || '', file_type: row.file_type || '', file_url: row.file_url || '', created_at: row.created_at || ''
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
      cacheClient(inserted);
      return inserted;
    }

    return standaloneDB.addClient(client);
  }

  public async importClients(clients: Array<Omit<ClientProfile, 'id'>>): Promise<number> {
    if (clients.length === 0) return 0;
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) {
      clients.forEach(client => standaloneDB.addClient(client));
      return clients.length;
    }

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
      inserted.forEach(cacheClient);
      importedCount += inserted.length;
    }
    return importedCount;
  }

  public async restoreBackupJSON(json: string): Promise<{ count: number; clients: number }> {
    const parsed = standaloneDB.parseBackupJSON(json);
    if (!parsed.success) throw new Error(parsed.message);
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) {
      const restored = standaloneDB.importBackupJSON(json);
      if (!restored.success) throw new Error(restored.message);
      return { count: restored.count, clients: parsed.clients?.length || 0 };
    }

    const records = (parsed.records || []).map(({ id: _id, ...record }) => record);
    const clients = parsed.clients || [];
    if (records.length) await this.importRecords(records);
    if (clients.length) await this.importClients(clients);
    return { count: records.length, clients: clients.length };
  }

  public async updateClient(id: number, updates: Partial<ClientProfile>): Promise<ClientProfile | null> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const row = mapClientToRow(updates);
      row.updated_at = new Date().toISOString();
      const { data, error } = await withSupabaseTimeout(client.from('clients').update(row).eq('id', id).select().maybeSingle());
      if (error) throw new Error(`Supabase client update failed: ${error.message}`);
      if (!data) throw new Error('Supabase client update returned no client. It may have been deleted or access denied.');
      const updated = mapRowToClient(data);
      cacheClient(updated);
      return updated;
    }

    return standaloneDB.updateClient(id, updates);
  }

  public async deleteClient(id: number): Promise<boolean> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client.from('clients').delete().eq('id', id).select('id').maybeSingle());
      if (error) throw new Error(`Supabase client delete failed: ${error.message}`);
      if (!data) throw new Error('Supabase client delete returned no client. It may have been deleted or access denied.');
      const clients = standaloneDB.getClients().filter(clientProfile => clientProfile.id !== id);
      standaloneDB.saveClients(clients);
      return true;
    }

    return standaloneDB.deleteClient(id);
  }

  // -------------------------------------------------------------
  // HISTORY AUDIT LOGS
  // -------------------------------------------------------------
  public async getHistory(recordId: number): Promise<HistoryLog[]> {
    const local = standaloneDB.getHistory(recordId);
    const { isConfigured } = getSupabaseCredentials();

    if (!isConfigured) return local;

    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('trademark_history')
        .select('*')
        .eq('record_id', recordId)
        .order('id', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: Number(d.id),
          record_id: Number(d.record_id),
          action: d.status || d.action || 'STAGE_UPDATE',
          notes: d.notes || '',
          created_at: d.created_at || new Date().toISOString()
        }));
      }
    } catch {}

    return local;
  }

  public async addHistory(recordId: number, status: string, notes: string): Promise<HistoryLog> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { error } = await withSupabaseTimeout(client.from('trademark_history').insert([{
        record_id: recordId,
        status,
        notes,
        created_at: new Date().toISOString()
      }]));
      if (error) throw new Error(`Supabase history save failed: ${error.message}`);
    }

    return standaloneDB.addHistory(recordId, status, notes);
  }

  public async addDocument(document: Omit<DocumentAttachment, 'id' | 'created_at'> & { file_size?: number }): Promise<DocumentAttachment> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await withSupabaseTimeout(client.from('trademark_documents').insert([{
        record_id: document.record_id,
        file_name: document.file_name,
        file_size: document.file_size,
        file_type: document.file_type,
        file_url: document.file_url,
      }]).select().single());
      if (error || !data) throw new Error(`Document reference save failed: ${error?.message || 'No row returned'}`);
      return standaloneDB.addDocument({
        record_id: Number(data.record_id),
        file_name: data.file_name,
        file_type: data.file_type,
        file_url: data.file_url,
      });
    }
    return standaloneDB.addDocument(document);
  }

  // Sync all local records to Supabase in one batch
  public async pushLocalToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    const { isConfigured } = getSupabaseCredentials();
    if (!isConfigured) {
      return { success: false, count: 0, error: 'Supabase credentials not configured' };
    }

    try {
      const client = getSupabaseClient();
      const localRecords = standaloneDB.getRecords();
      const localClients = standaloneDB.getClients();

      if (localRecords.length === 0 && localClients.length === 0) {
        return { success: true, count: 0 };
      }

      let count = 0;
      if (localRecords.length > 0) {
        const rows = localRecords.map(r => {
          const row = mapRecordToRow(r);
          row.id = r.id;
          row.created_at = r.createdAt || new Date().toISOString();
          return row;
        });

        const { error } = await client
          .from('trademark_records')
          .upsert(rows, { onConflict: 'id' });

        if (error) {
          return { success: false, count: 0, error: error.message };
        }
        count += localRecords.length;
      }

      if (localClients.length > 0) {
        const clientRows = localClients.map(c => {
          const row = mapClientToRow(c);
          row.id = c.id;
          row.created_at = c.created_at || new Date().toISOString();
          return row;
        });

        const { error: clientsError } = await client.from('clients').upsert(clientRows, { onConflict: 'id' });
        if (clientsError) return { success: false, count, error: `Clients sync failed: ${clientsError.message}` };
      }

      return { success: true, count };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Sync failed' };
    }
  }
}

export const supabaseDB = new SupabaseDBService();
