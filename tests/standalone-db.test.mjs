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

  assert.deepEqual(imported, {
    success: true,
    message: 'Successfully imported 1 cases from CSV',
    count: 1,
  });
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
