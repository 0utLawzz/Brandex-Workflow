import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

globalThis.window = {};
globalThis.localStorage = new MemoryStorage();

const { standaloneDB } = await import('../lib/standalone-db.ts');

test('records CSV round-trip preserves client, series, and case number', () => {
  standaloneDB.clearAllData();
  standaloneDB.addRecord({
    date: '17/11/2026',
    folder: 'SERIES PRESERVATION TEST',
    tm: 'TM-123',
    classNo: '45',
    appName: 'TEST APPLICANT',
    appTrade: 'TEST TRADING',
    year: '2026',
    conName: 'BRANDEX LAW ASSOCIATES',
    status: 'PENDING',
    filingProcess: 'PENDING',
    clientCode: '325',
    selectionMenu: 'N',
    caseNo: '046',
  }, false);

  const exported = standaloneDB.exportRecordsCSV();
  standaloneDB.clearAllData();
  const imported = standaloneDB.importRecordsCSV(exported);
  const [record] = standaloneDB.getRecords();

  assert.equal(imported.success, true);
  assert.equal(imported.message, 'Successfully imported 1 cases from CSV');
  assert.equal(imported.count, 1);
  assert.equal(record.clientCode, '325');
  assert.equal(record.selectionMenu, 'N');
  assert.equal(record.caseNo, '046');
});

test('clients CSV round-trip preserves the client profile', () => {
  standaloneDB.clearAllData();
  standaloneDB.addClient({
    client_code: '325',
    client_name: 'TEST CLIENT',
    father_name: 'TEST FATHER',
    trading_as: 'TEST TRADING',
    cnic: '12345-1234567-1',
    address: 'TEST ADDRESS',
    consultant_name: 'BRANDEX LAW ASSOCIATES',
    total_cases: 0,
    created_at: '2026-11-17T00:00:00.000Z',
  });

  const exported = standaloneDB.exportClientsCSV();
  standaloneDB.clearAllData();
  const imported = standaloneDB.importClientsCSV(exported);
  const [client] = standaloneDB.getClients();

  assert.equal(imported.success, true);
  assert.equal(imported.count, 1);
  assert.equal(client.client_code, '325');
  assert.equal(client.client_name, 'TEST CLIENT');
  assert.equal(client.trading_as, 'TEST TRADING');
  assert.equal(client.cnic, '12345-1234567-1');
});

test('cloud-mode record CSV parsing does not mutate browser storage', () => {
  standaloneDB.clearAllData();
  standaloneDB.addRecord({
    date: '17/11/2026', folder: 'EXISTING CASE', tm: 'TM-OLD', classNo: '1', appName: 'EXISTING CLIENT',
    appTrade: '', year: '2026', conName: 'BRANDEX LAW ASSOCIATES', status: 'PENDING', filingProcess: 'PENDING'
  }, false);
  const before = standaloneDB.getRecords();
  const imported = standaloneDB.importRecordsCSV('Case Ref,Case Name,TM No,Applicant\n325-X-002,NEW CASE,TM-NEW,NEW APPLICANT', false);

  assert.equal(imported.success, true);
  assert.equal(imported.records?.[0].selectionMenu, 'X');
  assert.deepEqual(standaloneDB.getRecords(), before);
});

test('cloud-mode client CSV parsing returns profiles without mutating browser storage', () => {
  standaloneDB.clearAllData();
  const before = standaloneDB.getClients();
  const imported = standaloneDB.importClientsCSV('Client Code,Full Name,Trading As\n325,NEW CLIENT,NEW COMPANY', false);

  assert.equal(imported.success, true);
  assert.equal(imported.clients?.[0].client_code, '325');
  assert.deepEqual(standaloneDB.getClients(), before);
});
