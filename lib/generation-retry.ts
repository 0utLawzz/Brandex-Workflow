import type { RecordItem } from './standalone-db';
import { buildCaseEditUpdates } from './case-edit-payload.ts';

export interface GenerationRetryDraft {
  id: number;
  serialNo: string;
  category: string;
  selectionMenu: string;
  clientCode: string;
  caseNo: string;
  clientId: number | null;
  classNo: string;
  classDesc: string;
  conName: string;
  conAddr: string;
  folder: string;
  tm: string;
  appType: string;
  appName: string;
  appSo: string;
  appCnic: string;
  issueDate: string;
  expiryDate: string;
  filingDate: string;
  appTrade: string;
  appAdd: string;
  year: string;
  noImg: string;
  status: string;
  trackingId: string;
  imageData: string;
}

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

export function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return '';

  const displayDate = value.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (displayDate) {
    const [, day, month, year, rawHour, minute, meridiem] = displayDate;
    const monthIndex = MONTHS[month.toUpperCase()];
    if (monthIndex !== undefined) {
      let hour = Number(rawHour) % 12;
      if (meridiem.toUpperCase() === 'PM') hour += 12;
      const date = new Date(Number(year), monthIndex, Number(day), hour, Number(minute));
      return formatLocalDateTime(date);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : formatLocalDateTime(parsed);
}

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildGenerationRetryDraft(record: RecordItem): GenerationRetryDraft {
  const issueDate = toDateTimeLocalInput(record.issueDate || record.date);
  return {
    id: Number(record.id),
    serialNo: record.serialNo || '',
    category: record.category || 'INITIAL',
    selectionMenu: record.selectionMenu || '',
    clientCode: record.clientCode || '',
    caseNo: record.caseNo || '',
    clientId: record.clientId ?? null,
    classNo: record.classNo || '',
    classDesc: record.classDesc || '',
    conName: record.conName || record.lawFirm || 'BRANDEX LAW ASSOCIATES',
    conAddr: record.conAddr || '',
    folder: record.folder || '',
    tm: record.tm || '',
    appType: record.appType || 'SOLE PROPRIETOR',
    appName: record.appName || '',
    appSo: record.fatherName || '',
    appCnic: record.cnic || '',
    issueDate,
    expiryDate: record.expiryDate || '',
    filingDate: record.filingDate || '',
    appTrade: record.appTrade || '',
    appAdd: record.address || '',
    year: record.year || '',
    noImg: record.noImg || '[NO IMAGE PROVIDED]',
    status: record.status || 'PENDING',
    trackingId: record.trackingId || '',
    imageData: record.img?.startsWith('data:image/') ? record.img : '',
  };
}

export function findGenerationRetryRecord(records: RecordItem[], id: number): RecordItem | null {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const matches = records.filter(record => Number(record.id) === id);
  return matches.length === 1 ? matches[0] : null;
}

/** Retry saves only deliberately edited fields; workflow, legal stage and missing values survive. */
export function buildGenerationRetryUpdates(original: RecordItem, draft: GenerationRetryDraft, formattedIssueDate: string, imageData?: string): Partial<RecordItem> {
  if (draft.id !== original.id) throw new Error('Retry case identity changed. Reload the saved case.');
  const before = buildGenerationRetryDraft(original);
  const current = { ...original };
  const fields = [
    ['category','category'], ['selectionMenu','selectionMenu'], ['clientCode','clientCode'], ['caseNo','caseNo'], ['clientId','clientId'],
    ['classNo','classNo'], ['classDesc','classDesc'], ['conName','conName'], ['conAddr','conAddr'], ['folder','folder'], ['tm','tm'],
    ['appType','appType'], ['appName','appName'], ['appSo','fatherName'], ['appCnic','cnic'], ['expiryDate','expiryDate'],
    ['filingDate','filingDate'], ['appTrade','appTrade'], ['appAdd','address'], ['year','year'], ['noImg','noImg'], ['trackingId','trackingId']
  ] as const;
  for (const [input, field] of fields) {
    if (input === 'tm' && before.tm === 'PENDING' && !draft.tm) continue;
    if (draft[input] !== before[input]) current[field] = draft[input] as never;
  }
  if (draft.issueDate !== before.issueDate) { current.date = formattedIssueDate; current.issueDate = formattedIssueDate; }
  if (imageData !== undefined && imageData !== original.img) current.img = imageData;
  return buildCaseEditUpdates(current, original);
}
