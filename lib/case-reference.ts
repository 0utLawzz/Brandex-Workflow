export function normalizeCaseSeries(value: string | null | undefined): string {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{0,7}$/.test(normalized)) {
    throw new Error('Series must start with a letter and contain 1–8 letters or numbers.');
  }
  return normalized;
}

export function formatCaseReference(series: string, clientCode: string, caseNo: string): string {
  const prefix = normalizeCaseSeries(series);
  const code = String(clientCode || '').replace(/\D/g, '');
  const number = String(caseNo || '').replace(/\D/g, '');
  if (!code || code.length > 3 || !number || number.length > 3) return '';
  return `${prefix}-${code.padStart(3, '0')}-${number.padStart(3, '0')}`;
}

export function getNextCaseNumber(
  records: Array<{ clientCode?: string | null; selectionMenu?: string | null; caseNo?: string | null }>,
  clientCode: string,
  series: string
): string {
  const code = String(clientCode || '').replace(/\D/g, '').padStart(3, '0');
  const prefix = normalizeCaseSeries(series);
  let max = 0;
  for (const record of records) {
    if (String(record.clientCode || '').replace(/\D/g, '').padStart(3, '0') !== code) continue;
    let recordSeries = '';
    try { recordSeries = normalizeCaseSeries(record.selectionMenu); } catch { continue; }
    if (recordSeries !== prefix) continue;
    const number = Number.parseInt(String(record.caseNo || ''), 10);
    if (Number.isInteger(number) && number > max) max = number;
  }
  if (max >= 999) throw new Error(`Case numbering limit reached for ${prefix}${code}.`);
  return String(max + 1).padStart(3, '0');
}

export function formatPakistaniCnic(value: string | null | undefined): string {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidPakistaniCnic(value: string | null | undefined): boolean {
  return /^\d{5}-\d{7}-\d$/.test(formatPakistaniCnic(value)) &&
    String(value || '').replace(/\D/g, '').length === 13;
}

export function toDateInputValue(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const namedDate = /^(?:[A-Z]{3},?\s+)?(\d{1,2})[-\s]([A-Z]{3})[-\s](\d{2,4})$/i.exec(raw);
  if (namedDate) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = months.indexOf(namedDate[2].toUpperCase());
    if (monthIndex >= 0) {
      const yearNumber = Number(namedDate[3]);
      const year = namedDate[3].length === 2 ? 2000 + yearNumber : yearNumber;
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(Number(namedDate[1])).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
