import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCaseFieldsFromRow, mapCaseFieldsToRow } from '../lib/case-fields.ts';

test('maps all case identity and application fields to existing Supabase columns', () => {
  const fields = {
    clientId: 42,
    serialNo: 'BX-1024',
    category: 'RENEWAL',
    classDesc: 'LEGAL SERVICES',
    appType: 'COMPANY',
    expiryDate: '2030-01-01',
    conAddr: 'MAIN STREET',
  };
  assert.deepEqual(mapCaseFieldsToRow(fields), {
    client_id: 42,
    serial_no: 'BX-1024',
    category: 'RENEWAL',
    class_desc: 'LEGAL SERVICES',
    app_type: 'COMPANY',
    expiry_date: '2030-01-01',
    consultant_addr: 'MAIN STREET',
  });
  assert.deepEqual(mapCaseFieldsFromRow(mapCaseFieldsToRow(fields)), fields);
});

test('does not replace omitted fields during a partial case update', () => {
  assert.deepEqual(mapCaseFieldsToRow({ classDesc: '' }), { class_desc: '' });
  assert.deepEqual(mapCaseFieldsToRow({}), {});
});
