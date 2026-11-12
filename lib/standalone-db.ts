'use client';

import Papa from 'papaparse';

// =========================================================================
// BRANDEX LAW ASSOCIATES — STANDALONE IN-APP DATABASE ENGINE
// 100% Client-Side Persistent Storage (localStorage + in-memory cache)
// Zero External Database Dependencies · 0ms Latency · Full Data Sovereignty
// =========================================================================

export interface RecordItem {
  id: number;
  date: string;
  folder: string;
  tm: string;
  classNo: string;
  appName: string;
  appTrade: string;
  year: string;
  conName: string;
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
  id: number;
  client_name: string;
  father_name: string;
  trading_as: string;
  cnic: string;
  address: string;
  consultant_name: string;
  client_code: string;
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
  created_at: string;
}

const STORAGE_KEY_RECORDS = 'brandex_standalone_records_v2';
const STORAGE_KEY_CLIENTS = 'brandex_standalone_clients_v2';
const STORAGE_KEY_HISTORY = 'brandex_standalone_history_v2';
const STORAGE_KEY_DOCS = 'brandex_standalone_docs_v2';

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

  public addRecord(record: Omit<RecordItem, 'id'> & { id?: number }): RecordItem {
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

    // Auto-log initial history
    this.addHistory(newId, 'RECORD_CREATED', `Case #${newRecord.caseNo || '001'} created with initial status: ${newRecord.status || 'PENDING'}`);
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

    // If status changed, auto-log history
    if (updates.status && updates.status !== prev.status) {
      this.addHistory(id, 'STATUS_CHANGE', `Status changed from ${prev.status} to ${updates.status}`);
    }

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
          filingProcess: newStatus,
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

  public exportRecordsCSV(): string {
    const records = this.getRecords();
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
      "Notes"
    ];

    const data = records.map(r => [
      r.id,
      r.date || '',
      `${r.clientCode || '000'}-${r.selectionMenu || 'A'}-${r.caseNo || '001'}`,
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
      r.notes || ''
    ]);

    return Papa.unparse({
      fields: headers,
      data
    });
  }

  public generateSampleRecordsCSV(): string {
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
      "Notes"
    ];

    const sampleRows = [
      [
        1,
        "02/10/2026",
        "646-A-001",
        "AEROFLEX COURIER",
        "TM-589201",
        "39",
        "MUHAMMAD USMAN RAZA",
        "AEROFLEX LOGISTICS PAKISTAN",
        "BRANDEX LAW ASSOCIATES",
        "DISPATCHED",
        "TCS-99201488",
        "Tue 10-Nov-2026",
        "Dispatched hardcopy Form TM-1 and TM-48 via TCS Express.",
        "",
        "",
        "646",
        "35201-1234567-1",
        "PLOT 14, SECTOR I-9, ISLAMABAD",
        "Priority examination requested."
      ],
      [
        2,
        "05/10/2026",
        "646-A-002",
        "NOVACURE PHARMA",
        "TM-602114",
        "5",
        "DR. TARIQ MAHMOOD",
        "NOVACURE HEALTH LABORATORIES",
        "BRANDEX LAW ASSOCIATES",
        "DELIVERED",
        "LCS-7718290",
        "Mon 09-Nov-2026",
        "Original Registration Certificate dispatched via Leopards.",
        "12-Nov-26",
        "DR. TARIQ MAHMOOD (DIRECTOR)",
        "646",
        "37405-7654321-3",
        "COMMERCIAL PLAZA, BLUE AREA, ISLAMABAD",
        "Delivered with signed acknowledgment copy."
      ],
      [
        3,
        "12/10/2026",
        "647-A-001",
        "GOLDEN GRAIN MILLS",
        "TM-614882",
        "30",
        "CHAUDHRY ASLAM PERVAIZ",
        "GOLDEN AGRI FOODS",
        "BRANDEX LAW ASSOCIATES",
        "APPROVED",
        "",
        "",
        "",
        "",
        "",
        "647",
        "35102-9988776-5",
        "G.T. ROAD, GUJRANWALA",
        "Trademark advertised in Trademark Journal."
      ],
      [
        4,
        "18/10/2026",
        "648-A-001",
        "ZENITH TECH SOFTWARES",
        "TM-620441",
        "42",
        "HAMZA KHALID",
        "ZENITH CLOUD INNOVATIONS",
        "BRANDEX LAW ASSOCIATES",
        "IN REVIEW",
        "",
        "",
        "",
        "",
        "",
        "648",
        "35202-3344556-7",
        "ARFA SOFTWARE TECHNOLOGY PARK, LAHORE",
        "Filing completed, waiting for hearing notice."
      ]
    ];

    return Papa.unparse({
      fields: headers,
      data: sampleRows
    });
  }

  public importRecordsCSV(csvText: string): { success: boolean; message: string; count: number } {
    if (!this.isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
    try {
      if (!csvText || !csvText.trim()) {
        return { success: false, message: "Uploaded file is empty", count: 0 };
      }

      const parseResult = Papa.parse<any[]>(csvText.trim(), {
        skipEmptyLines: 'greedy',
      });

      if (parseResult.errors && parseResult.errors.length > 0 && (!parseResult.data || parseResult.data.length === 0)) {
        return { success: false, message: parseResult.errors[0]?.message || "CSV parse error", count: 0 };
      }

      const rows = parseResult.data;
      if (!rows || rows.length < 2) {
        return { success: false, message: "CSV file contains no data rows", count: 0 };
      }

      // Check header row (case-insensitive fuzzy detection)
      const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      
      const findCol = (possibleNames: string[], defaultIndex: number): number => {
        for (const name of possibleNames) {
          const idx = headerRow.findIndex((h: string) => h === name.toLowerCase() || h.includes(name.toLowerCase()));
          if (idx !== -1) return idx;
        }
        return defaultIndex;
      };

      const colDate = findCol(["date", "filing date"], 1);
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

      const existing = this.getRecords();
      let importedCount = 0;
      let maxId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) : 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const val = (idx: number) => {
          if (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
            return String(row[idx]).trim();
          }
          return '';
        };

        const folder = val(colFolder);
        const appName = val(colAppName);
        const tm = val(colTm);
        if (!folder && !appName && !tm) continue;

        maxId++;
        const newRec: RecordItem = {
          id: maxId,
          date: val(colDate) || new Date().toLocaleDateString('en-GB'),
          folder: (folder || 'UNTITLED CASE').toUpperCase(),
          tm: tm.toUpperCase(),
          classNo: val(colClass).replace(/\D/g, '') || '1',
          appName: (appName || 'APPLICANT').toUpperCase(),
          appTrade: val(colAppTrade).toUpperCase(),
          conName: (val(colLawFirm) || 'BRANDEX LAW ASSOCIATES').toUpperCase(),
          lawFirm: (val(colLawFirm) || 'BRANDEX LAW ASSOCIATES').toUpperCase(),
          status: (val(colStatus) || 'PENDING').toUpperCase(),
          filingProcess: (val(colStatus) || 'PENDING').toUpperCase(),
          trackingId: val(colTracking).toUpperCase(),
          dispatchedDate: val(colDispDate),
          dispatchedNote: val(colDispNote),
          deliveredDate: val(colDelivDate),
          receiverName: val(colReceiver).toUpperCase(),
          clientCode: val(colClientCode) || '646',
          cnic: val(colCnic),
          address: val(colAddress).toUpperCase(),
          notes: val(colNotes),
          year: new Date().getFullYear().toString(),
          createdAt: new Date().toISOString()
        };

        existing.unshift(newRec);
        importedCount++;
      }

      this.saveRecords(existing);
      return { success: true, message: `Successfully imported ${importedCount} cases from CSV`, count: importedCount };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to parse CSV file", count: 0 };
    }
  }

  public exportClientsCSV(): string {
    const clients = this.getClients();
    const headers = [
      "Client Code",
      "Full Name",
      "Father Name",
      "Trading As",
      "CNIC",
      "Address",
      "Consultant Name"
    ];

    const data = clients.map(c => [
      c.client_code || '',
      c.client_name || '',
      c.father_name || '',
      c.trading_as || '',
      c.cnic || '',
      c.address || '',
      c.consultant_name || 'BRANDEX LAW ASSOCIATES'
    ]);

    return Papa.unparse({
      fields: headers,
      data
    });
  }

  public generateSampleClientsCSV(): string {
    const headers = [
      "Client Code",
      "Full Name",
      "Father Name",
      "Trading As",
      "CNIC",
      "Address",
      "Consultant Name"
    ];

    const sampleRows = [
      [
        "646",
        "MUHAMMAD USMAN RAZA",
        "HAJI ABDUL RAZZAQ",
        "AEROFLEX LOGISTICS PAKISTAN",
        "35201-1234567-1",
        "PLOT 14, SECTOR I-9, ISLAMABAD",
        "BRANDEX LAW ASSOCIATES"
      ],
      [
        "647",
        "CHAUDHRY ASLAM PERVAIZ",
        "CHAUDHRY BASHIR AHMED",
        "GOLDEN AGRI FOODS",
        "35102-9988776-5",
        "G.T. ROAD, GUJRANWALA",
        "BRANDEX LAW ASSOCIATES"
      ],
      [
        "648",
        "HAMZA KHALID",
        "KHALID MEHMOOD",
        "ZENITH CLOUD INNOVATIONS",
        "35202-3344556-7",
        "ARFA SOFTWARE TECHNOLOGY PARK, LAHORE",
        "BRANDEX LAW ASSOCIATES"
      ]
    ];

    return Papa.unparse({
      fields: headers,
      data: sampleRows
    });
  }

  public importClientsCSV(csvText: string): { success: boolean; message: string; count: number } {
    if (!this.isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
    try {
      if (!csvText || !csvText.trim()) {
        return { success: false, message: "Uploaded file is empty", count: 0 };
      }

      const parseResult = Papa.parse<any[]>(csvText.trim(), {
        skipEmptyLines: 'greedy',
      });

      const rows = parseResult.data;
      if (!rows || rows.length < 2) {
        return { success: false, message: "CSV file contains no data rows", count: 0 };
      }

      const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      const findCol = (possibleNames: string[], defaultIndex: number): number => {
        for (const name of possibleNames) {
          const idx = headerRow.findIndex((h: string) => h === name.toLowerCase() || h.includes(name.toLowerCase()));
          if (idx !== -1) return idx;
        }
        return defaultIndex;
      };

      const colCode = findCol(["client code", "code", "client #", "client_code"], 0);
      const colName = findCol(["full name", "client name", "name", "client_name"], 1);
      const colFather = findCol(["father name", "father", "father_name"], 2);
      const colTrade = findCol(["trading as", "trade as", "business", "trading_as", "company"], 3);
      const colCnic = findCol(["cnic", "nic", "cnic no"], 4);
      const colAddr = findCol(["address", "client address"], 5);
      const colConsultant = findCol(["consultant name", "consultant", "law firm", "consultant_name"], 6);

      const existing = this.getClients();
      let importedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const val = (idx: number) => (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) ? String(row[idx]).trim() : '';

        const name = val(colName);
        if (!name) continue;

        const clientCode = val(colCode) || String(646 + existing.length + importedCount);
        
        this.addClient({
          client_code: clientCode,
          client_name: name.toUpperCase(),
          father_name: val(colFather).toUpperCase(),
          trading_as: val(colTrade).toUpperCase(),
          cnic: val(colCnic),
          address: val(colAddr).toUpperCase(),
          consultant_name: (val(colConsultant) || 'BRANDEX LAW ASSOCIATES').toUpperCase(),
          total_cases: 0,
          created_at: new Date().toISOString()
        });
        importedCount++;
      }

      return { success: true, message: `Successfully imported ${importedCount} client profiles from CSV`, count: importedCount };
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
  public exportBackupJSON(): string {
    const data = {
      version: "2.0-standalone",
      exportedAt: new Date().toISOString(),
      appName: "Brandex Law Associates CMS",
      records: this.getRecords(),
      clients: this.getClients(),
      history: this.isBrowser() ? JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]') : [],
      documents: this.isBrowser() ? JSON.parse(localStorage.getItem(STORAGE_KEY_DOCS) || '[]') : []
    };
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

  public clearAllData(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_CLIENTS);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_DOCS);
  }
}

export const standaloneDB = new StandaloneDB();
