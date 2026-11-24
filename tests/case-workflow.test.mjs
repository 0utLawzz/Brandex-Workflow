import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkflowTransition } from '../lib/case-workflow.ts';

test('pending and in-review cases can be approved or rejected', () => {
  assert.equal(validateWorkflowTransition('PENDING', 'APPROVED').valid, true);
  assert.equal(validateWorkflowTransition('IN REVIEW', 'REJECTED').valid, true);
  assert.equal(validateWorkflowTransition('IN_REVIEW', 'APPROVED').valid, true);
  assert.equal(validateWorkflowTransition('PENDING_IN_REVIEW', 'APPROVED').valid, true);
});

test('rejected cases cannot be dispatched', () => {
  const result = validateWorkflowTransition('REJECTED', 'DISPATCHED', {
    dispatchedDate: '2026-11-23', trackingId: 'TCS-123', dispatchedImage: 'data:image/png;base64,AA',
  });
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Rejected cases cannot be dispatched/);
});

test('dispatch requires approval, date and tracking detail while proof remains optional', () => {
  assert.equal(validateWorkflowTransition('IN REVIEW', 'DISPATCHED').valid, false);
  assert.equal(validateWorkflowTransition('APPROVED', 'DISPATCHED', {
    dispatchedDate: '2026-11-23', trackingId: 'TCS-123', dispatchedImage: 'data:image/png;base64,AA',
  }).valid, true);
  assert.equal(validateWorkflowTransition('APPROVED', 'DISPATCHED', {
    dispatchedDate: '2026-11-23', dispatchedNote: 'Sent by courier',
  }).valid, true);
  assert.equal(validateWorkflowTransition('APPROVED', 'DISPATCHED', {
    dispatchedDate: '2026-11-23',
  }).valid, false);
});

test('delivery requires dispatch, date, receiver and receipt', () => {
  assert.equal(validateWorkflowTransition('APPROVED', 'DELIVERED').valid, false);
  assert.equal(validateWorkflowTransition('DISPATCHED', 'DELIVERED', {
    deliveredDate: '2026-11-23', receiverName: 'A. Khan', receiptImage: 'data:image/png;base64,AA',
  }).valid, true);
});

test('unsupported and backward transitions are rejected while same-state updates are idempotent', () => {
  assert.equal(validateWorkflowTransition('DELIVERED', 'APPROVED').valid, false);
  assert.equal(validateWorkflowTransition('APPROVED', 'APPROVED').valid, true);
  assert.equal(validateWorkflowTransition('IN REVIEW', 'PENDING').valid, false);
});
