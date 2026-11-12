import { getSupabaseClient, getSupabaseCredentials } from './supabase';
import { standaloneDB, RecordItem, ClientProfile, HistoryLog, DocumentAttachment } from './standalone-db';
import { mapCaseFieldsFromRow, mapCaseFieldsToRow } from './case-fields';

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
      const { data, error } = await client
        .from('trademark_records')
        .select('id')
        .limit(1);

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
      const { data, error } = await client
        .from('trademark_records')
        .select('*')
        .order('id', { ascending: false });

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

  public async updateRecord(id: number, updates: Partial<RecordItem>): Promise<RecordItem | null> {
    // 1. Update locally
    const updatedLocal = standaloneDB.updateRecord(id, updates);

    // 2. Update on Supabase
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        const row = mapRecordToRow(updates);

        // If a dispatch document/image is provided, save in trademark_documents table
        if (updates.dispatchedImage) {
          try {
            await client.from('trademark_documents').insert([{
              record_id: id,
              file_name: updates.dispatchedDocName || `Dispatch_Receipt_${updates.trackingId || id}`,
              file_type: updates.dispatchedDocType || (updates.dispatchedImage.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'),
              file_url: updates.dispatchedImage,
              created_at: new Date().toISOString()
            }]);
          } catch (docErr) {
            console.warn('[SupabaseDB] Failed to insert dispatch doc:', docErr);
          }
        }

        const { error } = await client
          .from('trademark_records')
          .update(row)
          .eq('id', id);

        if (error && error.message.includes('dispatched_image')) {
          // Fallback if column not yet added to trademark_records: save without that column
          delete row.dispatched_image;
          delete row.dispatched_doc_name;
          delete row.dispatched_doc_type;
          await client.from('trademark_records').update(row).eq('id', id);
        }
      } catch (err) {
        console.warn('[SupabaseDB] Error updating record on Supabase:', err);
      }
    }

    return updatedLocal;
  }

  public async deleteRecord(id: number): Promise<boolean> {
    standaloneDB.deleteRecord(id);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        await client
          .from('trademark_records')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('[SupabaseDB] Error deleting record on Supabase:', err);
      }
    }

    return true;
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
    standaloneDB.bulkUpdateStatus(ids, newStatus, auditNote, meta);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
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

        const { error } = await client
          .from('trademark_records')
          .update(updatePayload)
          .in('id', ids);

        if (error && error.message.includes('dispatched_image')) {
          delete updatePayload.dispatched_image;
          delete updatePayload.dispatched_doc_name;
          delete updatePayload.dispatched_doc_type;
          await client.from('trademark_records').update(updatePayload).in('id', ids);
        }

        // Also save to trademark_documents if dispatch receipt was attached
        if (meta?.dispatchedImage) {
          const docRows = ids.map(id => ({
            record_id: id,
            file_name: meta.dispatchedDocName || `Dispatch_Receipt_${id}`,
            file_type: meta.dispatchedDocType || (meta.dispatchedImage!.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'),
            file_url: meta.dispatchedImage,
            created_at: new Date().toISOString()
          }));
          await client.from('trademark_documents').insert(docRows);
        }

        // Record history entries
        const historyRows = ids.map(id => ({
          record_id: id,
          status: newStatus,
          notes: auditNote || `Bulk stage updated to ${newStatus}`,
          created_at: new Date().toISOString()
        }));

        await client.from('trademark_history').insert(historyRows);
      } catch (err) {
        console.warn('[SupabaseDB] Bulk status update failed on remote:', err);
      }
    }
  }

  public async bulkAssignClient(ids: number[], clientProfile: ClientProfile): Promise<void> {
    standaloneDB.bulkAssignClient(ids, clientProfile);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        await client
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
          .in('id', ids);
      } catch (err) {
        console.warn('[SupabaseDB] Bulk client assignment failed on remote:', err);
      }
    }
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
      const { data, error } = await client
        .from('clients')
        .select('*')
        .order('id', { ascending: false });

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

  public async addClient(client: Omit<ClientProfile, 'id'> & { id?: number }): Promise<ClientProfile> {
    const savedLocal = standaloneDB.addClient(client);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const clientSupabase = getSupabaseClient();
        const row = mapClientToRow(client);
        row.created_at = new Date().toISOString();

        const { data, error } = await clientSupabase
          .from('clients')
          .insert([row])
          .select()
          .single();

        if (!error && data) {
          const inserted = mapRowToClient(data);
          standaloneDB.updateClient(savedLocal.id, inserted);
          return inserted;
        }
      } catch (err) {
        console.warn('[SupabaseDB] Error adding client to Supabase:', err);
      }
    }

    return savedLocal;
  }

  public async updateClient(id: number, updates: Partial<ClientProfile>): Promise<ClientProfile | null> {
    const updated = standaloneDB.updateClient(id, updates);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        const row = mapClientToRow(updates);
        row.updated_at = new Date().toISOString();
        await client.from('clients').update(row).eq('id', id);
      } catch (err) {
        console.warn('[SupabaseDB] Error updating client on Supabase:', err);
      }
    }

    return updated;
  }

  public async deleteClient(id: number): Promise<boolean> {
    standaloneDB.deleteClient(id);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('clients').delete().eq('id', id);
      } catch (err) {
        console.warn('[SupabaseDB] Error deleting client on Supabase:', err);
      }
    }

    return true;
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
    const localLog = standaloneDB.addHistory(recordId, status, notes);

    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('trademark_history').insert([{
          record_id: recordId,
          status,
          notes,
          created_at: new Date().toISOString()
        }]);
      } catch (err) {
        console.warn('[SupabaseDB] Error logging history to Supabase:', err);
      }
    }

    return localLog;
  }

  public async addDocument(document: Omit<DocumentAttachment, 'id' | 'created_at'> & { file_size?: number }): Promise<DocumentAttachment> {
    const { isConfigured } = getSupabaseCredentials();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await client.from('trademark_documents').insert([{
        record_id: document.record_id,
        file_name: document.file_name,
        file_size: document.file_size,
        file_type: document.file_type,
        file_url: document.file_url,
      }]).select().single();
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
