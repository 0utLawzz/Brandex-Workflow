export type WorkflowMetadata = {
  dispatchedDate?: string;
  dispatchedNote?: string;
  trackingId?: string;
  dispatchedImage?: string;
  deliveredDate?: string;
  receiverName?: string;
  receiptImage?: string;
};

export function normalizeWorkflowStatus(value: unknown): string {
  return String(value ?? '').trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function validateWorkflowTransition(
  currentValue: unknown,
  targetValue: unknown,
  metadata: WorkflowMetadata = {},
): { valid: boolean; error?: string } {
  const current = normalizeWorkflowStatus(currentValue);
  const target = normalizeWorkflowStatus(targetValue);
  if (!target) return { valid: false, error: 'A target workflow status is required.' };
  if (current === target) return { valid: true };

  if (target === 'APPROVED' || target === 'REJECTED') {
    if (current === 'PENDING' || current === 'IN REVIEW' || current === 'PENDING / IN REVIEW' || current === 'PENDING IN REVIEW') return { valid: true };
    return { valid: false, error: `Only pending or in-review cases can be marked ${target} (current: ${current || 'UNKNOWN'}).` };
  }

  if (target === 'DISPATCHED') {
    if (current === 'REJECTED') return { valid: false, error: 'Rejected cases cannot be dispatched.' };
    if (current !== 'APPROVED') return { valid: false, error: 'A case must be APPROVED before it can be dispatched.' };
    if (!String(metadata.dispatchedDate || '').trim()) return { valid: false, error: 'Dispatch date is required.' };
    if (!String(metadata.trackingId || metadata.dispatchedNote || '').trim()) return { valid: false, error: 'Enter a courier tracking ID or dispatch note.' };
    if (!String(metadata.dispatchedImage || '').trim()) return { valid: false, error: 'Attach proof of sending before confirming dispatch.' };
    return { valid: true };
  }

  if (target === 'DELIVERED') {
    if (current !== 'DISPATCHED') return { valid: false, error: 'A case must be DISPATCHED before it can be marked delivered.' };
    if (!String(metadata.deliveredDate || '').trim()) return { valid: false, error: 'Delivery date is required.' };
    if (!String(metadata.receiverName || '').trim()) return { valid: false, error: 'Receiver name is required.' };
    if (!String(metadata.receiptImage || '').trim()) return { valid: false, error: 'Attach delivery receipt before confirming delivery.' };
    return { valid: true };
  }

  return { valid: false, error: `Unsupported workflow transition: ${current || 'UNKNOWN'} → ${target}.` };
}
