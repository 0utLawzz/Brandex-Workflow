const CASE_FIELD_COLUMNS = {
  clientId: 'client_id',
  serialNo: 'serial_no',
  category: 'category',
  classDesc: 'class_desc',
  appType: 'app_type',
  expiryDate: 'expiry_date',
  filingDate: 'filing_date',
  conAddr: 'consultant_addr',
} as const;

const NO_IMAGE_NOTES_PREFIX = '__BRANDEX_NO_IMAGE_TEXT_V1__\n';
const CASE_NOTES_SEPARATOR = '\n__BRANDEX_CASE_NOTES_V1__\n';

export function decodeCaseNotesAndNoImage(notesValue: unknown, directNoImageValue?: unknown): { notes: string; noImg: string } {
  const storedNotes = String(notesValue || '');
  const directNoImage = String(directNoImageValue || '');
  if (!storedNotes.startsWith(NO_IMAGE_NOTES_PREFIX)) return { notes: storedNotes, noImg: directNoImage };

  const separatorIndex = storedNotes.indexOf(CASE_NOTES_SEPARATOR, NO_IMAGE_NOTES_PREFIX.length);
  if (separatorIndex < 0) return { notes: storedNotes, noImg: directNoImage };
  try {
    const noImg = decodeURIComponent(storedNotes.slice(NO_IMAGE_NOTES_PREFIX.length, separatorIndex));
    const notes = storedNotes.slice(separatorIndex + CASE_NOTES_SEPARATOR.length);
    return { notes, noImg: directNoImage || noImg };
  } catch {
    return { notes: storedNotes, noImg: directNoImage };
  }
}

export function encodeCaseNotesAndNoImage(notes: string | undefined, noImg: string): string {
  return `${NO_IMAGE_NOTES_PREFIX}${encodeURIComponent(noImg)}${CASE_NOTES_SEPARATOR}${notes || ''}`;
}

type CaseField = keyof typeof CASE_FIELD_COLUMNS;
export type CaseFields = {
  clientId?: number | null;
  serialNo?: string | null;
  category?: string | null;
  classDesc?: string | null;
  appType?: string | null;
  expiryDate?: string | null;
  filingDate?: string | null;
  conAddr?: string | null;
};

export function mapCaseFieldsToRow(fields: CaseFields): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {};
  for (const [field, column] of Object.entries(CASE_FIELD_COLUMNS) as [CaseField, string][]) {
    if (fields[field] !== undefined) row[column] = field === 'filingDate' && fields[field] === '' ? null : fields[field]!;
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
