const CASE_FIELD_COLUMNS = {
  clientId: 'client_id',
  serialNo: 'serial_no',
  category: 'category',
  classDesc: 'class_desc',
  appType: 'app_type',
  expiryDate: 'expiry_date',
  conAddr: 'consultant_addr',
} as const;

type CaseField = keyof typeof CASE_FIELD_COLUMNS;
export type CaseFields = {
  clientId?: number | null;
  serialNo?: string | null;
  category?: string | null;
  classDesc?: string | null;
  appType?: string | null;
  expiryDate?: string | null;
  conAddr?: string | null;
};

export function mapCaseFieldsToRow(fields: CaseFields): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {};
  for (const [field, column] of Object.entries(CASE_FIELD_COLUMNS) as [CaseField, string][]) {
    if (fields[field] !== undefined) row[column] = fields[field]!;
  }
  return row;
}

export function mapCaseFieldsFromRow(row: Record<string, unknown>): CaseFields {
  const fields: CaseFields = {};
  for (const [field, column] of Object.entries(CASE_FIELD_COLUMNS) as [CaseField, string][]) {
    const value = row[column];
    if (value !== undefined && value !== null) {
      (fields as Record<string, string | number | null>)[field] = field === 'clientId' ? Number(value) : String(value);
    }
  }
  return fields;
}
