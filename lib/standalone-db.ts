'use client';

import Papa from 'papaparse';
import { createBackupPackage, validateBackupPackage } from './backup-package.ts';
import { validateClientContact } from './client-contact.ts';
import { CSV_ENCODING_HEADER, CSV_TEXT_ENCODING, encodeCsvText, decodeCsvText, csvRowIsEncoded } from './csv-text.ts';

// =========================================================================
// BRANDEX LAW ASSOCIATES — CSV AND BACKUP UTILITIES
// Supabase is the source of truth; these helpers handle CSV and backup formats.
// =========================================================================

export interface RecordItem {
  id: number;
  clientId?: number | null;
  dispatchDocumentId?: number | null;
  serialNo?: string | null;
  category?: string | null;
  date: string;
  issueDate?: string;
  folder: string;
  tm: string;
  classNo: string;
  classDesc?: string | null;
  appType?: string | null;
  appName: string;
  appTrade: string;
  year: string;
  expiryDate?: string | null;
  filingDate?: string | null;
  conName: string;
  conAddr?: string | null;
  lawFirm?: string;
  img?: string;
  noImg?: string;
  status: string;
  filingProcess: string;
  trackingId?: string;
  selectionMenu?: string;
  clientCode?: string;
  caseNo?: string;
  address?: string;
  cnic?: string;
  fatherName?: string;
  notes?: string;
  dispatchedDate?: string;
  dispatchedNote?: string;
  dispatchedImage?: string;
  dispatchedDocName?: string;
  dispatchedDocType?: string;
  deliveredDate?: string;
  receiverName?: string;
  receiptImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientProfile {
  drive_folder_id?: string;
  phone?: string;
  email?: string;
  id: number;
  client_name: string;
  father_name: string;
  trading_as: string;
  cnic: string;
  address: string;
  consultant_name: string;
  client_code: string;
  client_prefix?: string;
  city?: string;
  folder_reference?: string;
  total_cases: number;
  created_at: string;
}

export interface HistoryLog {
  id: number;
  record_id: number;
  action: string;
  notes: string;
  created_at: string;
}

export interface DocumentAttachment {
  id: number;
  record_id: number;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size?: number;
  created_at: string;
}

const STORAGE_KEY_RECORDS = 'brandex_standalone_records_v2';
const STORAGE_KEY_CLIENTS = 'brandex_standalone_clients_v2';
const STORAGE_KEY_HISTORY = 'brandex_standalone_history_v2';
const STORAGE_KEY_DOCS = 'brandex_standalone_docs_v2';
const CASE_CSV_EXTRA_FIELDS = [
  ['Series', 'selectionMenu'], ['Case Number', 'caseNo'], ['Client ID', 'clientId'],
  ['Legal Case Stage', 'filingProcess'], ['Serial Number', 'serialNo'], ['Category', 'category'],
  ['Class Description', 'classDesc'], ['Application Type', 'appType'], ['Father Name', 'fatherName'],
  ['Issue Date', 'issueDate'], ['Expiry Date', 'expiryDate'], ['Using Since', 'year'],
  ['Application Filing Date', 'filingDate'],
  ['Consultant Address', 'conAddr'], ['Logo URL', 'img'], ['No Image Text', 'noImg'],
  ['Dispatch Proof URL', 'dispatchedImage'], ['Dispatch Proof Name', 'dispatchedDocName'],
  ['Dispatch Proof Type', 'dispatchedDocType'], ['Receipt URL', 'receiptImage'],
  ['Created At', 'createdAt'], ['Updated At', 'updatedAt']
] as const;

class StandaloneDB {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // -------------------------------------------------------------
  // RECORDS
  // -------------------------------------------------------------
  public getRecords(): RecordItem[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Error reading standalone records:', e);
      return [];
    }
  }

  public saveRecords(records: RecordItem[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving standalone records:', e);
    }
  }

  public getRecordById(id: number): RecordItem | undefined {
    return this.getRecords().find(r => r.id === id);
  }

  public addRecord(record: Omit<RecordItem, 'id'> & { id?: number }, logInitialHistory = true): RecordItem {
    const records = this.getRecords();
    const newId = record.id || (records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1);
    const newRecord: RecordItem = {
      ...record,
      id: newId,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.unshift(newRecord);
    this.saveRecords(records);
    if (logInitialHistory) {
      this.addHistory(newId, 'RECORD_CREATED', `Case #${newRecord.caseNo || '001'} created with initial status: ${newRecord.status || 'PENDING'}`);
    }
    return newRecord;
  }

  public updateRecord(id: number, updates: Partial<RecordItem>): RecordItem | null {
    const records = this.getRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const prev = records[idx];
    const updated: RecordItem = {
      ...prev,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    records[idx] = updated;
    this.saveRecords(records);

    return updated;
  }

  public deleteRecord(id: number): boolean {
    const records = this.getRecords();
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length !== records.length) {
      this.saveRecords(filtered);
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // CLIENTS
  // -------------------------------------------------------------
  public getClients(): ClientProfile[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Error reading standalone clients:', e);
      return [];
    }
  }

  public saveClients(clients: ClientProfile[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients));
    } catch (e) {
      console.error('Error saving standalone clients:', e);
    }
  }

  public addClient(client: Omit<ClientProfile, 'id'> & { id?: number }): ClientProfile {
    const clients = this.getClients();
    const newId = client.id || (clients.length > 0 ? Math.max(...clients.map(c => c.id || 0)) + 1 : 1);
    const newClient: ClientProfile = {
      ...client,
      id: newId,
      total_cases: client.total_cases || 0,
      created_at: client.created_at || new Date().toISOString()
    };
    clients.unshift(newClient);
    this.saveClients(clients);
    return newClient;
  }

  public updateClient(id: number, updates: Partial<ClientProfile>): ClientProfile | null {
    const clients = this.getClients();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...updates };
    this.saveClients(clients);
    return clients[idx];
  }

  public deleteClient(id: number): boolean {
    const clients = this.getClients();
    const filtered = clients.filter(c => c.id !== id);
    if (filtered.length !== clients.length) {
      this.saveClients(filtered);
      return true;
    }
    return false;
  }

  public bulkUpdateStatus(
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
  ): void {
    const records = this.getRecords();
    const idSet = new Set(ids);
    const updated = records.map(r => {
      if (idSet.has(r.id)) {
        const item: RecordItem = {
          ...r,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          ...(meta?.dispatchedDate ? { dispatchedDate: meta.dispatchedDate } : {}),
          ...(meta?.dispatchedNote ? { dispatchedNote: meta.dispatchedNote } : {}),
          ...(meta?.dispatchedImage ? { dispatchedImage: meta.dispatchedImage } : {}),
          ...(meta?.dispatchedDocName ? { dispatchedDocName: meta.dispatchedDocName } : {}),
          ...(meta?.dispatchedDocType ? { dispatchedDocType: meta.dispatchedDocType } : {}),
          ...(meta?.deliveredDate ? { deliveredDate: meta.deliveredDate } : {}),
          ...(meta?.receiverName ? { receiverName: meta.receiverName } : {}),
          ...(meta?.receiptImage ? { receiptImage: meta.receiptImage } : {})
        };
        this.addHistory(r.id, newStatus, auditNote || `Bulk stage updated to ${newStatus}`);
        return item;
      }
      return r;
    });
    this.saveRecords(updated);
  }

  public bulkAssignClient(ids: number[], client: ClientProfile): void {
    const records = this.getRecords();
    const idSet = new Set(ids);
    const updated = records.map(r => {
      if (idSet.has(r.id)) {
        const item: RecordItem = {
          ...r,
          clientCode: client.client_code,
          appName: client.client_name,
          appTrade: client.trading_as,
          fatherName: client.father_name,
          cnic: client.cnic,
          address: client.address,
          conName: client.consultant_name || r.conName,
          lawFirm: client.consultant_name || r.lawFirm,
          updatedAt: new Date().toISOString()
        };
        this.addHistory(r.id, 'CLIENT REASSIGNED', `Case reassigned to client ${client.client_name} (#${client.client_code})`);
        return item;
      }
      return r;
    });
    this.saveRecords(updated);
  }

  public exportRecordsCSV(records: RecordItem[] = this.getRecords()): string {
    const headers = [
      "ID",
      "Date",
      "Case Ref",
      "Case Name",
      "TM No",
      "Class",
      "Applicant",
      "Trading As",
      "Law Firm",
      "Workflow Stage",
      "Tracking ID",
      "Dispatched Date",
      "Dispatched Note",
      "Delivered Date",
      "Receiver Name",
      "Client Code",
      "CNIC",
      "Address",
      "Notes", ...CASE_CSV_EXTRA_FIELDS.map(([label]) => label)
    ];

    const data = records.map(r => [
      r.id,
      r.date || '',
      r.clientCode && r.selectionMenu && r.caseNo
        ? `${r.selectionMenu}-${String(r.clientCode).padStart(3, '0')}-${String(r.caseNo).padStart(3, '0')}`
        : '',
      r.folder || '',
      r.tm || '',
      r.classNo ? String(r.classNo).replace(/\D/g, '') : '',
      r.appName || '',
      r.appTrade || '',
      r.lawFirm || r.conName || 'BRANDEX LAW ASSOCIATES',
      r.status || 'PENDING',
      r.trackingId || '',
      r.dispatchedDate || '',
      r.dispatchedNote || '',
      r.deliveredDate || '',
      r.receiverName || '',
      r.clientCode || '',
      r.cnic || '',
      r.address || '',
      r.notes || '', ...CASE_CSV_EXTRA_FIELDS.map(([, field]) => r[field] ?? '')
    ]);

    return Papa.unparse({
      fields: [...headers, CSV_ENCODING_HEADER],
      data: data.map(row => [...row.map(encodeCsvText), CSV_TEXT_ENCODING])
    });
  }

  public generateSampleRecordsCSV(): string {
    return this.exportRecordsCSV([]);
  }

  public importRecordsCSV(csvText: string, persist = true): { success: boolean; message: string; count: number; records?: RecordItem[] } {
    if (!this.isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
    try {
      if (!csvText || !csvText.trim()) {
        return { success: false, message: "Uploaded file is empty", count: 0 };
      }

      const parseResult = Papa.parse<any[]>(csvText.trim(), {
        skipEmptyLines: 'greedy',
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        return { success: false, message: parseResult.errors[0]?.message || "CSV parse error", count: 0 };
      }

      const rows = parseResult.data;
      if (!rows || rows.length < 2) {
        return { success: false, message: "CSV file contains no data rows", count: 0 };
      }

      // Prefer exact exported headers before legacy aliases; absent columns stay absent.
      const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      if (new Set(headerRow).size !== headerRow.length) throw new Error('Duplicate CSV headers are ambiguous. No cases were imported.');
      
      const findCol = (possibleNames: string[], defaultIndex: number): number => {
        for (const name of possibleNames) {
          const exact = headerRow.indexOf(name.toLowerCase());
          if (exact !== -1) return exact;
        }
        for (const name of possibleNames) {
          const idx = headerRow.findIndex((h: string) => h === name.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const colDate = findCol(["date", "issue date"], -1);
      const colCaseRef = findCol(["case ref", "case reference"], 2);
      const colFolder = findCol(["case name", "folder", "mark name", "trademark name", "mark"], 3);
      const colTm = findCol(["tm no", "tm number", "trademark no", "tm"], 4);
      const colClass = findCol(["class", "class no", "class #"], 5);
      const colAppName = findCol(["applicant", "applicant name", "owner"], 6);
      const colAppTrade = findCol(["trading as", "trade as", "business name"], 7);
      const colLawFirm = findCol(["law firm", "consultant", "agent", "attorney"], 8);
      const colStatus = findCol(["workflow stage", "status", "filing process", "stage"], 9);
      const colTracking = findCol(["tracking id", "tracking", "courier tracking", "trk"], 10);
      const colDispDate = findCol(["dispatched date", "dispatch date", "dispatched"], 11);
      const colDispNote = findCol(["dispatched note", "dispatch note", "shipping note"], 12);
      const colDelivDate = findCol(["delivered date", "delivery date", "delivered"], 13);
      const colReceiver = findCol(["receiver name", "receiver", "received by"], 14);
      const colClientCode = findCol(["client code", "code", "client #"], 15);
      const colCnic = findCol(["cnic", "nic", "id card"], 16);
      const colAddress = findCol(["address", "applicant address"], 17);
      const colNotes = findCol(["notes", "internal notes", "note"], 18);

      const existing = persist ? this.getRecords() : [];
      const seenReferences = new Set(existing.map(record => `${String(record.selectionMenu || '').trim().toUpperCase()}-${String(record.clientCode || '').trim().padStart(3, '0')}-${String(record.caseNo || '').trim().padStart(3, '0')}`));
      let importedCount = 0;
      let maxId = persist && existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) : 0;
      const importedRecords: RecordItem[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const encoded = csvRowIsEncoded(row[headerRow.indexOf(CSV_ENCODING_HEADER.toLowerCase())]);
        const val = (idx: number) => {
          if (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
            return decodeCsvText(row[idx], encoded).trim();
          }
          return '';
        };

        const folder = val(colFolder);
        const appName = val(colAppName);
        const tm = val(colTm);
        if (!folder && !appName && !tm) continue;

        // The exported Case Ref is the only CSV field that carries the series.
        // Restore it so an export/import round-trip preserves X/A/N/B and the
        // original case identity instead of silently defaulting to series A.
        const caseReference = val(colCaseRef).toUpperCase();
        const modernReference = /^([A-Z][A-Z0-9]{0,7})-(\d{1,3})-(\d{1,3})$/.exec(caseReference);
        const caseReferenceMatch = /^([A-Z][A-Z0-9]{0,7}?)(\d{3})-(\d{3})$/.exec(caseReference);
        const legacyCaseReferenceMatch = /^(\d{1,3})-([A-Z][A-Z0-9]{0,7})-(\d{1,3})$/.exec(caseReference);
        const series = (val(headerRow.indexOf('series')) || modernReference?.[1] || caseReferenceMatch?.[1] || legacyCaseReferenceMatch?.[2] || '').toUpperCase();
        const code = val(colClientCode) || modernReference?.[2] || caseReferenceMatch?.[2] || legacyCaseReferenceMatch?.[1] || '';
        const number = val(headerRow.indexOf('case number')) || modernReference?.[3] || caseReferenceMatch?.[3] || legacyCaseReferenceMatch?.[3] || '';
        if (!/^[A-Z][A-Z0-9]{0,7}$/.test(series) || !/^\d{1,3}$/.test(code) || !/^\d{1,3}$/.test(number)) throw new Error(`Row ${i + 1}: missing or invalid series/client/case identity.`);
        const identity = `${series}-${code.padStart(3, '0')}-${number.padStart(3, '0')}`;
        if (caseReference && !modernReference && !caseReferenceMatch && !legacyCaseReferenceMatch) throw new Error(`Row ${i + 1}: invalid case reference.`);
        const fromReference = modernReference ? `${modernReference[1]}-${modernReference[2].padStart(3, '0')}-${modernReference[3].padStart(3, '0')}`
          : caseReferenceMatch ? `${caseReferenceMatch[1]}-${caseReferenceMatch[2].padStart(3, '0')}-${caseReferenceMatch[3].padStart(3, '0')}`
          : legacyCaseReferenceMatch ? `${legacyCaseReferenceMatch[2]}-${legacyCaseReferenceMatch[1].padStart(3, '0')}-${legacyCaseReferenceMatch[3].padStart(3, '0')}` : '';
        if (fromReference && fromReference !== identity) throw new Error(`Row ${i + 1}: reference conflicts with separate identity columns.`);
        if (seenReferences.has(identity)) throw new Error(`Row ${i + 1}: duplicate case identity ${identity}.`);
        seenReferences.add(identity);

        maxId++;
        const newRec: RecordItem = {
          id: maxId,
          date: val(colDate),
          folder: folder.toUpperCase(),
          tm: tm.toUpperCase(),
          classNo: val(colClass),
          appName: appName.toUpperCase(),
          appTrade: val(colAppTrade).toUpperCase(),
          conName: (val(colLawFirm) || 'BRANDEX LAW ASSOCIATES').toUpperCase(),
          lawFirm: (val(colLawFirm) || 'BRANDEX LAW ASSOCIATES').toUpperCase(),
          status: (val(colStatus) || 'PENDING').toUpperCase(),
          filingProcess: val(headerRow.indexOf('legal case stage')),
          trackingId: val(colTracking).toUpperCase(),
          dispatchedDate: val(colDispDate),
          dispatchedNote: val(colDispNote),
          deliveredDate: val(colDelivDate),
          receiverName: val(colReceiver).toUpperCase(),
          clientCode: code.padStart(3, '0'),
          selectionMenu: series,
          caseNo: number.padStart(3, '0'),
          cnic: val(colCnic),
          address: val(colAddress).toUpperCase(),
          notes: val(colNotes),
          year: val(headerRow.indexOf('using since')),
          ...Object.fromEntries(CASE_CSV_EXTRA_FIELDS.filter(([, field]) => !['selectionMenu', 'caseNo', 'clientId'].includes(field)).filter(([label]) => headerRow.includes(label.toLowerCase())).map(([label, field]) => [field, val(headerRow.indexOf(label.toLowerCase()))])),
          ...(val(headerRow.indexOf('client id')) ? { clientId: Number(val(headerRow.indexOf('client id'))) } : {})
        };

        existing.unshift(newRec);
        importedRecords.push(newRec);
        importedCount++;
      }

      if (persist) this.saveRecords(existing);
      return { success: true, message: `Successfully imported ${importedCount} cases from CSV`, count: importedCount, records: importedRecords };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to parse CSV file", count: 0 };
    }
  }

  public exportClientsCSV(clients: ClientProfile[] = this.getClients()): string {
    const headers = [
      "Client Prefix",
      "Client Code",
      "Full Name",
      "Father Name",
      "Trading As",
      "CNIC",
      "Address",
      "City",
      "Additional Folder Reference",
      "Consultant Name", "Phone", "Email", "Drive Folder ID"
    ];

    const data = clients.map(c => [
      c.client_prefix || '',
      c.client_code || '',
      c.client_name || '',
      c.father_name || '',
      c.trading_as || '',
      c.cnic || '',
      c.address || '',
      c.city || '',
      c.folder_reference || '',
      c.consultant_name || 'BRANDEX LAW ASSOCIATES', c.phone || '', c.email || '', c.drive_folder_id || ''
    ]);

    return Papa.unparse({
      fields: [...headers, CSV_ENCODING_HEADER],
      data: data.map(row => [...row.map(encodeCsvText), CSV_TEXT_ENCODING])
    });
  }

  public generateSampleClientsCSV(): string {
    return this.exportClientsCSV([]);
  }

  public importClientsCSV(csvText: string, persist = true): { success: boolean; message: string; count: number; clients?: Array<Omit<ClientProfile, 'id'>> } {
    if (!this.isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
    try {
      if (!csvText || !csvText.trim()) {
        return { success: false, message: "Uploaded file is empty", count: 0 };
      }

      const parseResult = Papa.parse<any[]>(csvText.trim(), {
        skipEmptyLines: 'greedy',
      });

      if (parseResult.errors.length) throw new Error(parseResult.errors[0].message || 'Invalid CSV syntax.');

      const rows = parseResult.data;
      if (!rows || rows.length < 2) {
        return { success: false, message: "CSV file contains no data rows", count: 0 };
      }

      const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      if (new Set(headerRow).size !== headerRow.length) throw new Error('Duplicate CSV headers are ambiguous. No clients were imported.');
      const findCol = (possibleNames: string[], defaultIndex: number): number => {
        for (const name of possibleNames) {
          const idx = headerRow.indexOf(name.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const colPrefix = findCol(["client prefix", "prefix", "client_prefix"], -1);
      const colCode = findCol(["client code", "code", "client #", "client_code"], 0);
      const colName = findCol(["full name", "client name", "name", "client_name"], 1);
      const colFather = findCol(["father name", "father", "father_name"], 2);
      const colTrade = findCol(["trading as", "trade as", "business", "trading_as", "company"], 3);
      const colCnic = findCol(["cnic", "nic", "cnic no"], 4);
      const colAddr = findCol(["address", "client address"], 5);
      const colCity = findCol(["city"], -1);
      const colFolderReference = findCol(["additional folder reference", "folder reference", "folder_reference"], -1);
      const colConsultant = findCol(["consultant name", "consultant", "law firm", "consultant_name"], 6);
      const colPhone = findCol(['phone', 'telephone'], -1);
      const colEmail = findCol(['email'], -1);
      if (colCode < 0 || colName < 0) throw new Error('Client CSV requires explicit Client Code and Full Name columns.');

      const existing = persist ? this.getClients() : [];
      const seenCodes = new Set(existing.map(client => String(client.client_code).trim().padStart(3, '0')));
      let importedCount = 0;
      const importedClients: Array<Omit<ClientProfile, 'id'>> = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const encoded = csvRowIsEncoded(row[headerRow.indexOf(CSV_ENCODING_HEADER.toLowerCase())]);
        const val = (idx: number) => (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) ? decodeCsvText(row[idx], encoded).trim() : '';

        const name = val(colName);
        if (!name) continue;

        const rawCode = val(colCode);
        if (!/^\d{1,3}$/.test(rawCode)) throw new Error(`Row ${i + 1}: client code must contain 1 to 3 digits. Missing identities are never generated.`);
        const clientCode = rawCode.padStart(3, '0');
        if (seenCodes.has(clientCode)) throw new Error(`Row ${i + 1}: duplicate client code ${clientCode}. No clients were imported.`);
        seenCodes.add(clientCode);
        
        const importedClient = {
          ...validateClientContact({ phone: val(colPhone), email: val(colEmail) }),
          client_code: clientCode.padStart(3, '0'),
          client_prefix: val(colPrefix).toUpperCase(),
          city: val(colCity).toUpperCase(),
          folder_reference: val(colFolderReference).toUpperCase(),
          client_name: name.toUpperCase(),
          father_name: val(colFather).toUpperCase(),
          trading_as: val(colTrade).toUpperCase(),
          cnic: val(colCnic),
          address: val(colAddr).toUpperCase(),
          consultant_name: (val(colConsultant) || 'BRANDEX LAW ASSOCIATES').toUpperCase(),
          total_cases: 0,
          created_at: new Date().toISOString()
        };
        importedClients.push(importedClient);
        importedCount++;
      }

      if (persist) importedClients.forEach(client => this.addClient(client));
      return { success: true, message: `Successfully imported ${importedCount} client profiles from CSV`, count: importedCount, clients: importedClients };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to parse client CSV file", count: 0 };
    }
  }

  // -------------------------------------------------------------
  // HISTORY AUDIT LOGS
  // -------------------------------------------------------------
  public getHistory(recordId: number): HistoryLog[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      const all: HistoryLog[] = raw ? JSON.parse(raw) : [];
      return all.filter(h => h.record_id === recordId).sort((a, b) => b.id - a.id);
    } catch {
      return [];
    }
  }

  public addHistory(recordId: number, action: string, notes: string): HistoryLog {
    if (!this.isBrowser()) {
      return { id: 1, record_id: recordId, action, notes, created_at: new Date().toISOString() };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      const all: HistoryLog[] = raw ? JSON.parse(raw) : [];
      const newEntry: HistoryLog = {
        id: all.length > 0 ? Math.max(...all.map(h => h.id || 0)) + 1 : 1,
        record_id: recordId,
        action,
        notes,
        created_at: new Date().toISOString()
      };
      all.unshift(newEntry);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(all));
      return newEntry;
    } catch {
      return { id: 1, record_id: recordId, action, notes, created_at: new Date().toISOString() };
    }
  }

  // -------------------------------------------------------------
  // DOCUMENTS
  // -------------------------------------------------------------
  public getDocuments(recordId: number): DocumentAttachment[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOCS);
      const all: DocumentAttachment[] = raw ? JSON.parse(raw) : [];
      return all.filter(d => d.record_id === recordId);
    } catch {
      return [];
    }
  }

  public addDocument(
    docOrRecordId: number | { record_id: number; file_name: string; file_size?: number; file_type?: string; storage_url?: string; file_url?: string },
    fileName?: string,
    fileType?: string,
    fileUrl?: string
  ): DocumentAttachment {
    let recId: number;
    let name: string;
    let type: string;
    let url: string;

    if (typeof docOrRecordId === 'object') {
      recId = docOrRecordId.record_id;
      name = docOrRecordId.file_name;
      type = docOrRecordId.file_type || 'application/pdf';
      url = docOrRecordId.file_url || docOrRecordId.storage_url || '#';
    } else {
      recId = docOrRecordId;
      name = fileName || 'document.pdf';
      type = fileType || 'application/pdf';
      url = fileUrl || '#';
    }

    if (!this.isBrowser()) {
      return { id: 1, record_id: recId, file_name: name, file_type: type, file_url: url, created_at: new Date().toISOString() };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOCS);
      const all: DocumentAttachment[] = raw ? JSON.parse(raw) : [];
      const newDoc: DocumentAttachment = {
        id: all.length > 0 ? Math.max(...all.map(d => d.id || 0)) + 1 : 1,
        record_id: recId,
        file_name: name,
        file_type: type,
        file_url: url,
        created_at: new Date().toISOString()
      };
      all.unshift(newDoc);
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(all));
      return newDoc;
    } catch {
      return { id: 1, record_id: recId, file_name: name, file_type: type, file_url: url, created_at: new Date().toISOString() };
    }
  }

  // -------------------------------------------------------------
  // BACKUP & RESTORE (FULL STANDALONE SOVEREIGNTY)
  // -------------------------------------------------------------
  public exportBackupJSON(dataOverrides: Partial<{ records: RecordItem[]; clients: ClientProfile[]; history: HistoryLog[]; documents: DocumentAttachment[] }> = {}): string {
    const data = createBackupPackage({
      records: dataOverrides.records ?? this.getRecords(),
      clients: dataOverrides.clients ?? this.getClients(),
      history: dataOverrides.history ?? (this.isBrowser() ? JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]') : []),
      documents: dataOverrides.documents ?? (this.isBrowser() ? JSON.parse(localStorage.getItem(STORAGE_KEY_DOCS) || '[]') : [])
    });
    return JSON.stringify(data, null, 2);
  }

  public importBackupJSON(jsonStr: string): { success: boolean; message: string; count: number } {
    if (!this.isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        return { success: false, message: "Invalid JSON format", count: 0 };
      }
      let recordCount = 0;
      if (Array.isArray(data.records)) {
        this.saveRecords(data.records);
        recordCount = data.records.length;
      }
      if (Array.isArray(data.clients)) {
        this.saveClients(data.clients);
      }
      if (Array.isArray(data.history)) {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(data.history));
      }
      if (Array.isArray(data.documents)) {
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(data.documents));
      }
      return { success: true, message: `Successfully restored ${recordCount} records!`, count: recordCount };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to parse backup JSON", count: 0 };
    }
  }

  public parseBackupJSON(jsonStr: string): {
    success: boolean;
    message: string;
    count: number;
    records?: RecordItem[];
    clients?: ClientProfile[];
    history?: HistoryLog[];
    documents?: DocumentAttachment[];
    assets?: Array<Record<string, any>>;
    backupStatus?: 'complete' | 'partial';
  } {
    const validated = validateBackupPackage(jsonStr);
    if (!validated.success || !validated.data) {
      return { success: false, message: validated.message, count: 0 };
    }
    const data = validated.data;
    return {
      success: true,
      message: validated.message,
      count: Array.isArray(data.records) ? data.records.length : 0,
      records: Array.isArray(data.records) ? data.records : [],
      clients: Array.isArray(data.clients) ? data.clients : [],
      history: Array.isArray(data.history) ? data.history : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
      assets: Array.isArray(data.assets) ? data.assets : [],
      backupStatus: data.backupStatus === 'complete' ? 'complete' : 'partial'
    };
  }

  public clearAllData(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_CLIENTS);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_DOCS);
  }
}

export const standaloneDB = new StandaloneDB();
