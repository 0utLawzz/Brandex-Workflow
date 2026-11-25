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
  assert.equal(isDisplayableCase({ ...blankPendingRecord, folder: 'Sample Applicant' }), true);
  assert.equal(isDisplayableCase({ ...blankPendingRecord, caseNo: '011' }), true);
  assert.equal(isDisplayableCase({ ...blankPendingRecord, notes: 'Needs review' }), true);
});

test('incomplete records remain recoverable from the records page', () => {
  assert.match(recordsPage, /Show incomplete records/);
  assert.match(recordsPage, /Nothing was deleted/);
  assert.match(recordsPage, /setShowIncompleteRecords/);
});
