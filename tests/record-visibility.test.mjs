import test from 'node:test';
import assert from 'node:assert/strict';
import { isDisplayableCase } from '../lib/record-visibility.ts';
import { readFile } from 'node:fs/promises';

const recordsPage = await readFile(new URL('../app/records/page.tsx', import.meta.url), 'utf8');

const blankPendingRecord = {
  id: 8, date: '', folder: '', tm: '', classNo: '', appName: '', appTrade: '', year: '',
  conName: '', status: 'PENDING', filingProcess: 'PENDING',
};

test('status-only legacy placeholders are hidden while case details stay visible', () => {
  assert.equal(isDisplayableCase(blankPendingRecord), false);
  assert.equal(isDisplayableCase({ ...blankPendingRecord, conName: 'BRANDEX LAW ASSOCIATES', lawFirm: 'BRANDEX LAW ASSOCIATES' }), false);
  assert.equal(isDisplayableCase({ ...blankPendingRecord, folder: 'Sample Applicant' }), true);
  assert.equal(isDisplayableCase({ ...blankPendingRecord, caseNo: '011' }), true);
  assert.equal(isDisplayableCase({ ...blankPendingRecord, notes: 'Needs review' }), true);
});

test('incomplete records remain recoverable from the records page', () => {
  assert.match(recordsPage, /Show incomplete records/);
  assert.match(recordsPage, /Nothing was deleted/);
  assert.match(recordsPage, /setShowIncompleteRecords/);
});

test('case reference keeps one group while exposing three unboxed segments', () => {
  assert.match(recordsPage, /role="group" aria-label=\{`Case reference/);
  assert.match(recordsPage, /inline-flex items-center gap-1/);
  assert.match(recordsPage, /aria-hidden="true" className="text-\[#666\]">-<\/span>/);
  assert.doesNotMatch(recordsPage, /inline-flex px-2 py-1 border border-\[#0C0C0C\] rounded bg-white/);
});
