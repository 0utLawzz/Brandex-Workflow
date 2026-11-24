import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCaseNotesAndNoImage, encodeCaseNotesAndNoImage, mapCaseFieldsFromRow, mapCaseFieldsToRow, mapDispatchProofFromRow } from '../lib/case-fields.ts';

test('maps all case identity and application fields to existing Supabase columns', () => {
  const fields = {
    clientId: 42,
    serialNo: 'BX-1024',
    category: 'RENEWAL',
    classDesc: 'LEGAL SERVICES',
    appType: 'COMPANY',
    expiryDate: '2030-01-01',
    filingDate: '2026-11-24',
    conAddr: 'MAIN STREET',
  };
  assert.deepEqual(mapCaseFieldsToRow(fields), {
    client_id: 42,
    serial_no: 'BX-1024',
    category: 'RENEWAL',
    class_desc: 'LEGAL SERVICES',
    app_type: 'COMPANY',
    expiry_date: '2030-01-01',
    filing_date: '2026-11-24',
    consultant_addr: 'MAIN STREET',
  });
  assert.deepEqual(mapCaseFieldsFromRow(mapCaseFieldsToRow(fields)), fields);
});

test('saved dispatch pointer is numeric and explicit joined proof survives row mapping', () => {
  assert.deepEqual(mapCaseFieldsFromRow({dispatch_document_id:'123'}),{dispatchDocumentId:123});
  assert.deepEqual(mapCaseFieldsToRow({dispatchDocumentId:null}),{dispatch_document_id:null});
  assert.deepEqual(mapDispatchProofFromRow({dispatch_document:{file_url:'https://example.com/proof.pdf',file_name:'Proof.pdf',file_type:'application/pdf'}}),{dispatchedImage:'https://example.com/proof.pdf',dispatchedDocName:'Proof.pdf',dispatchedDocType:'application/pdf'});
  assert.equal(mapDispatchProofFromRow({}).dispatchedImage,'');
});

test('does not replace omitted fields during a partial case update', () => {
  assert.deepEqual(mapCaseFieldsToRow({ classDesc: '' }), { class_desc: '' });
  assert.deepEqual(mapCaseFieldsToRow({}), {});
  assert.deepEqual(mapCaseFieldsToRow({ filingDate: '' }), { filing_date: null });
});

test('preserves fallback text and case notes together in existing Supabase notes column', () => {
  const stored = encodeCaseNotesAndNoImage('Case note stays visible.', '[FALLBACK TEXT]');
  assert.deepEqual(decodeCaseNotesAndNoImage(stored), {
    notes: 'Case note stays visible.',
    noImg: '[FALLBACK TEXT]',
  });
});
