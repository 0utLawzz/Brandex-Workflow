import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCaseReference,
  getNextCaseNumber,
  formatPakistaniCnic,
  isValidPakistaniCnic,
  normalizeCaseSeries
} from '../lib/case-reference.ts';

test('case reference follows prefix + three-digit client + case number', () => {
  assert.equal(formatCaseReference('A', '5', '10'), 'A005-010');
  assert.equal(formatCaseReference('X', '842', '1'), 'X842-001');
});

test('custom series is normalized and validated', () => {
  assert.equal(normalizeCaseSeries('brand2'), 'BRAND2');
  assert.throws(() => normalizeCaseSeries('2BRAND'));
  assert.throws(() => normalizeCaseSeries('TOO-LONG-PREFIX'));
});

test('case numbering is independent for each client and series', () => {
  const records = [
    { clientCode: '005', selectionMenu: 'A', caseNo: '010' },
    { clientCode: '005', selectionMenu: 'A', caseNo: '012' },
    { clientCode: '005', selectionMenu: 'X', caseNo: '099' },
    { clientCode: '008', selectionMenu: 'A', caseNo: '080' }
  ];
  assert.equal(getNextCaseNumber(records, '005', 'A'), '013');
  assert.equal(getNextCaseNumber(records, '005', 'X'), '100');
  assert.equal(getNextCaseNumber(records, '008', 'A'), '081');
  assert.equal(getNextCaseNumber(records, '009', 'A'), '001');
});

test('Pakistani CNIC is formatted and requires exactly 13 digits', () => {
  assert.equal(formatPakistaniCnic('3520212345671'), '35202-1234567-1');
  assert.equal(isValidPakistaniCnic('35202-1234567-1'), true);
  assert.equal(isValidPakistaniCnic('35202-123456-1'), false);
});
