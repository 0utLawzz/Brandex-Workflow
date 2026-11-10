'use client';

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

// Initial Seed Clients
export const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: 1,
    client_name: "MUHAMMAD USMAN RAZA",
    father_name: "ABDUL RAZZAQ",
    trading_as: "RAZA BROTHERS PHARMA",
    cnic: "35202-1234567-1",
    address: "DROP AT ABDULLAH CENTRE, JUNEJO COLONY, TARLAI, ISLAMABAD",
    consultant_name: "BRANDEX LAW ASSOCIATES",
    client_code: "646",
    total_cases: 4,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 2,
    client_name: "SYED ALI HASSAN",
    father_name: "SYED HASSAN MEHMOOD",
    trading_as: "INDUS VALLEY ENTERPRISES",
    cnic: "37405-7654321-3",
    address: "OFFICE # 4, GIGA MALL ROAD, DHA 2, ISLAMABAD",
    consultant_name: "BRANDEX LAW ASSOCIATES",
    client_code: "102",
    total_cases: 2,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString()
  },
  {
    id: 3,
    client_name: "MALIK TAHIR MEHMOOD",
    father_name: "MALIK ALLAH DITTA",
    trading_as: "TAHIR BEVERAGES & AGRO",
    cnic: "38403-9876543-5",
    address: "FACTORY AREA, CHOWK FAROOQ-E-AZAM, KHANEWAL",
    consultant_name: "NOOR BAAF LAW ASSOCIATES",
    client_code: "512",
    total_cases: 3,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString()
  },
  {
    id: 4,
    client_name: "CHAUDHRY NAVEED ANWAR",
    father_name: "ANWAR UL HAQ",
    trading_as: "PAK HERBAL LABORATORIES",
    cnic: "33100-3456789-7",
    address: "OFFICE # 6, MEDIACOM TRADE CITY, JARANWALA ROAD, FAISALABAD",
    consultant_name: "MUHAMMAD ADNAN BIN YOUSAF ASSOCIATES",
    client_code: "788",
    total_cases: 1,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  }
];

// Initial Seed Trademark Records
export const INITIAL_RECORDS: RecordItem[] = [
  {
    id: 1,
    date: "15-OCT-2026",
    folder: "NUTRI-PURE ORGANICS",
    tm: "684920",
    classNo: "5",
    appName: "MUHAMMAD USMAN RAZA",
    appTrade: "RAZA BROTHERS PHARMA",
    year: "2024",
    conName: "BRANDEX LAW ASSOCIATES",
    img: "1u3zF3i0d8jN_sample1",
    status: "APPROVED / REJECT",
    filingProcess: "COMPLETED",
    trackingId: "IPO-TM-2026-0091",
    selectionMenu: "A",
    clientCode: "646",
    caseNo: "001",
    address: "DROP AT ABDULLAH CENTRE, JUNEJO COLONY, TARLAI, ISLAMABAD",
    cnic: "35202-1234567-1",
    fatherName: "ABDUL RAZZAQ",
    notes: "TM-1 & TM-48 acknowledgment dispatched to client.",
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 2,
    date: "28-OCT-2026",
    folder: "INDUS COLD BREW",
    tm: "689104",
    classNo: "30",
    appName: "SYED ALI HASSAN",
    appTrade: "INDUS VALLEY ENTERPRISES",
    year: "2025",
    conName: "BRANDEX LAW ASSOCIATES",
    img: "",
    status: "IN REVIEW",
    filingProcess: "EXAMINATION",
    trackingId: "IPO-TM-2026-0144",
    selectionMenu: "X",
    clientCode: "102",
    caseNo: "001",
    address: "OFFICE # 4, GIGA MALL ROAD, DHA 2, ISLAMABAD",
    cnic: "37405-7654321-3",
    fatherName: "SYED HASSAN MEHMOOD",
    notes: "Awaiting Examiner report from IPO Islamabad Branch.",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 3,
    date: "02-NOV-2026",
    folder: "GOLDEN HARVEST JUICES",
    tm: "691255",
    classNo: "32",
    appName: "MALIK TAHIR MEHMOOD",
    appTrade: "TAHIR BEVERAGES & AGRO",
    year: "2023",
    conName: "NOOR BAAF LAW ASSOCIATES",
    img: "",
    status: "DISPATCHED",
    filingProcess: "DISPATCHED",
    trackingId: "LCS-TRK-881920",
    selectionMenu: "B",
    clientCode: "512",
    caseNo: "002",
    address: "FACTORY AREA, CHOWK FAROOQ-E-AZAM, KHANEWAL",
    cnic: "38403-9876543-5",
    fatherName: "MALIK ALLAH DITTA",
    notes: "Hardcopy TM-48 & legal power dispatched via Leopard Courier.",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: 4,
    date: "06-NOV-2026",
    folder: "HERBA-GLOW SKINCARE",
    tm: "694301",
    classNo: "3",
    appName: "CHAUDHRY NAVEED ANWAR",
    appTrade: "PAK HERBAL LABORATORIES",
    year: "2026",
    conName: "MUHAMMAD ADNAN BIN YOUSAF ASSOCIATES",
    img: "",
    status: "PENDING",
    filingProcess: "DRAFTED",
    trackingId: "",
    selectionMenu: "N",
    clientCode: "788",
    caseNo: "001",
    address: "OFFICE # 6, MEDIACOM TRADE CITY, JARANWALA ROAD, FAISALABAD",
    cnic: "33100-3456789-7",
    fatherName: "ANWAR UL HAQ",
    notes: "Class 3 specifications drafted. Ready for IPO online submission.",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 5,
    date: "07-NOV-2026",
    folder: "APEX LEGAL CONSULT",
    tm: "695120",
    classNo: "45",
    appName: "MUHAMMAD USMAN RAZA",
    appTrade: "RAZA BROTHERS PHARMA",
    year: "2026",
    conName: "BRANDEX LAW ASSOCIATES",
    img: "",
    status: "DELIVERED",
    filingProcess: "DELIVERED",
    trackingId: "TCS-99120488",
    selectionMenu: "A",
    clientCode: "646",
    caseNo: "002",
    address: "DROP AT ABDULLAH CENTRE, JUNEJO COLONY, TARLAI, ISLAMABAD",
    cnic: "35202-1234567-1",
    fatherName: "ABDUL RAZZAQ",
    notes: "Official IPO Acknowledgment receipt delivered to client.",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

class StandaloneDB {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // -------------------------------------------------------------
  // RECORDS
  // -------------------------------------------------------------
  public getRecords(): RecordItem[] {
    if (!this.isBrowser()) return INITIAL_RECORDS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (!raw) {
        // Seed initial records
        this.saveRecords(INITIAL_RECORDS);
        return INITIAL_RECORDS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      this.saveRecords(INITIAL_RECORDS);
      return INITIAL_RECORDS;
    } catch (e) {
      console.warn('Error reading standalone records:', e);
      return INITIAL_RECORDS;
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
    if (!this.isBrowser()) return INITIAL_CLIENTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (!raw) {
        this.saveClients(INITIAL_CLIENTS);
        return INITIAL_CLIENTS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      this.saveClients(INITIAL_CLIENTS);
      return INITIAL_CLIENTS;
    } catch (e) {
      console.warn('Error reading standalone clients:', e);
      return INITIAL_CLIENTS;
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
    meta?: { dispatchedDate?: string; dispatchedNote?: string; deliveredDate?: string; receiverName?: string; receiptImage?: string }
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

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      r.id,
      escapeCsv(r.date),
      escapeCsv(`${r.clientCode || '000'}-${r.selectionMenu || 'A'}-${r.caseNo || '001'}`),
      escapeCsv(r.folder),
      escapeCsv(r.tm),
      escapeCsv(r.classNo ? r.classNo.replace(/\D/g, '') : ''),
      escapeCsv(r.appName),
      escapeCsv(r.appTrade),
      escapeCsv(r.lawFirm || r.conName),
      escapeCsv(r.status),
      escapeCsv(r.trackingId || ''),
      escapeCsv(r.dispatchedDate || ''),
      escapeCsv(r.dispatchedNote || ''),
      escapeCsv(r.deliveredDate || ''),
      escapeCsv(r.receiverName || ''),
      escapeCsv(r.clientCode || ''),
      escapeCsv(r.cnic || ''),
      escapeCsv(r.address || ''),
      escapeCsv(r.notes || '')
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  public importRecordsCSV(csvText: string): { success: boolean; message: string; count: number } {
    if (!this.isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
    try {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) return { success: false, message: "CSV file has no data rows", count: 0 };

      const parseCsvLine = (text: string) => {
        const re = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^,]+)|(?=,)/g;
        const matches: string[] = [];
        let match;
        while ((match = re.exec(text)) !== null) {
          if (match[1] !== undefined) {
            matches.push(match[1].replace(/\"\"/g, '"'));
          } else if (match[2] !== undefined) {
            matches.push(match[2].trim());
          } else {
            matches.push('');
          }
        }
        return matches;
      };

      const existing = this.getRecords();
      let importedCount = 0;
      let maxId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) : 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCsvLine(line);
        if (cols.length < 4) continue;

        maxId++;
        const newRec: RecordItem = {
          id: maxId,
          date: cols[1] || new Date().toLocaleDateString('en-GB'),
          folder: cols[3] || 'UNTITLED CASE',
          tm: cols[4] || '',
          classNo: cols[5] ? cols[5].replace(/\D/g, '') : '1',
          appName: cols[6] || 'APPLICANT',
          appTrade: cols[7] || '',
          conName: cols[8] || 'BRANDEX LAW ASSOCIATES',
          lawFirm: cols[8] || 'BRANDEX LAW ASSOCIATES',
          status: cols[9] || 'PENDING',
          filingProcess: cols[9] || 'PENDING',
          trackingId: cols[10] || '',
          dispatchedDate: cols[11] || '',
          dispatchedNote: cols[12] || '',
          deliveredDate: cols[13] || '',
          receiverName: cols[14] || '',
          clientCode: cols[15] || '',
          cnic: cols[16] || '',
          address: cols[17] || '',
          notes: cols[18] || '',
          year: new Date().getFullYear().toString(),
          createdAt: new Date().toISOString()
        };
        existing.unshift(newRec);
        importedCount++;
      }

      this.saveRecords(existing);
      return { success: true, message: `Successfully imported ${importedCount} cases from CSV`, count: importedCount };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to parse CSV", count: 0 };
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

  public resetToFactoryDefaults(): void {
    if (!this.isBrowser()) return;
    this.saveRecords(INITIAL_RECORDS);
    this.saveClients(INITIAL_CLIENTS);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_DOCS);
  }
}

export const standaloneDB = new StandaloneDB();
