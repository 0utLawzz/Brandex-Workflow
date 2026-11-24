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

test('modern case CSV retains independent workflow/legal stage and never invents metadata', () => {
  const parsed = standaloneDB.importRecordsCSV('Case Ref,Case Name,Applicant,Workflow Stage,Legal Case Stage,Using Since,Father Name,Expiry Date\nN-333-012,CASE,PERSON,APPROVED,EXAMINATION,2018,FATHER,2030-01-01', false);
  assert.equal(parsed.success, true);
  const record = parsed.records[0];
  assert.equal(record.selectionMenu, 'N'); assert.equal(record.clientCode, '333'); assert.equal(record.caseNo, '012');
  assert.equal(record.status, 'APPROVED'); assert.equal(record.filingProcess, 'EXAMINATION');
  assert.equal(record.year, '2018'); assert.equal(record.fatherName, 'FATHER'); assert.equal(record.expiryDate, '2030-01-01');
  assert.equal(record.date, ''); assert.equal(record.createdAt, undefined);
});
test('case CSV rejects conflicting and duplicate identities before local writes', () => {
  standaloneDB.clearAllData();
  const result = standaloneDB.importRecordsCSV('Case Ref,Case Name,Applicant\nN-333-001,FIRST,PERSON\nN-333-1,SECOND,PERSON');
  assert.equal(result.success, false); assert.deepEqual(standaloneDB.getRecords(), []);
  assert.equal(standaloneDB.importRecordsCSV('Case Ref,Case Name,Client Code\nN-333-001,CASE,444', false).success, false);
});

test('client CSV validates every identity before any local writes', () => {
  standaloneDB.clearAllData();
  const missing = standaloneDB.importClientsCSV('Client Code,Full Name\n123,VALID\n,MISSING');
  assert.equal(missing.success, false);
  assert.match(missing.message, /never generated/);
  assert.deepEqual(standaloneDB.getClients(), []);
  const duplicate = standaloneDB.importClientsCSV('Client Code,Full Name\n1,FIRST\n001,SECOND');
  assert.equal(duplicate.success, false);
  assert.match(duplicate.message, /duplicate client code 001/);
  assert.deepEqual(standaloneDB.getClients(), []);
});

test('ambiguous CSV columns, malformed rows and conflicting legacy references fail before writes', () => {
  standaloneDB.clearAllData();
  for (const csv of [
    'Case Ref,Case Name,Client Code\nN333-001,CASE,444',
    'Case Ref,Case Name,Series\n333-N-001,CASE,X',
    'Case Ref,Case Name,Series,Client Code,Case Number\ninvalid,CASE,N,333,001',
    'Case Ref,Case Ref,Case Name\nN-333-001,N-444-001,CASE',
    'Case Ref,Case Name\nN-333-001,"unterminated'
  ]) assert.equal(standaloneDB.importRecordsCSV(csv).success, false, csv);
  assert.deepEqual(standaloneDB.getRecords(), []);
  for (const csv of [
    'Client Prefix,Full Name\n123,PERSON',
    'Client Code,Consultant Name\n123,CONSULTANT',
    'Client Code,Client Code,Full Name\n123,456,PERSON',
    'Client Code,Full Name\n123,"unterminated'
  ]) {
    const result = standaloneDB.importClientsCSV(csv);
    assert.equal(result.count, 0, csv);
  }
  assert.deepEqual(standaloneDB.getClients(), []);
});

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
    client_prefix: 'X',
    city: 'LAHORE',
    folder_reference: 'CA',
    phone: '+92 300 1234567',
    email: 'Staff@example.com',
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
  assert.equal(client.client_prefix, 'X');
  assert.equal(client.city, 'LAHORE');
  assert.equal(client.folder_reference, 'CA');
  assert.equal(client.phone, '+92 300 1234567');
  assert.equal(client.email, 'Staff@example.com');
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
