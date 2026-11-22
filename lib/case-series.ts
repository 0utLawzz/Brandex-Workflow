export interface CaseSeriesUpdateInput {
  series_code?: string;
  is_active?: boolean;
  sort_order?: number;
}

export function normalizeSeriesCode(value: unknown): string {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{0,7}$/.test(normalized)) {
    throw new Error('Series must start with a letter and contain 1–8 letters or numbers.');
  }
  return normalized;
}

export function validateSeriesUpdate(value: unknown): CaseSeriesUpdateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Series updates must be an object.');
  }

  const input = value as Record<string, unknown>;
  const allowed = new Set(['series_code', 'is_active', 'sort_order']);
  if (Object.keys(input).some(key => !allowed.has(key))) {
    throw new Error('Series update contains an unsupported field.');
  }

  const updates: CaseSeriesUpdateInput = {};
  if (Object.prototype.hasOwnProperty.call(input, 'series_code')) {
    updates.series_code = normalizeSeriesCode(input.series_code);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'is_active')) {
    if (typeof input.is_active !== 'boolean') throw new Error('Series active state must be true or false.');
    updates.is_active = input.is_active;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sort_order')) {
    if (!Number.isInteger(input.sort_order) || Number(input.sort_order) < 0 || Number(input.sort_order) > 10000) {
      throw new Error('Series order must be a whole number between 0 and 10000.');
    }
    updates.sort_order = Number(input.sort_order);
  }
  if (Object.keys(updates).length === 0) throw new Error('Choose at least one series field to update.');
  return updates;
}
