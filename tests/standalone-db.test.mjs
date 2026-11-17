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
