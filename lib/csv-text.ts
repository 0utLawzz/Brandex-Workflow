export const CSV_ENCODING_HEADER = 'CSV Text Encoding';
export const CSV_TEXT_ENCODING = 'brandex-text-v1';
const needsGuard = (value: string) => /^(?:\s*[=+\-@]|[\t\r\n'])/.test(value);

/** Guard formulas without losing original apostrophes or international phone prefixes on reimport. */
export function encodeCsvText(value: unknown): unknown {
  return typeof value === 'string' && needsGuard(value) ? `'${value}` : value;
}
export function csvRowIsEncoded(value: unknown): boolean {
  const marker = String(value ?? '').trim();
  if (marker && marker !== CSV_TEXT_ENCODING) throw new Error('Unsupported CSV text encoding. No rows were imported.');
  return marker === CSV_TEXT_ENCODING;
}
export function decodeCsvText(value: unknown, encoded: boolean): string {
  const text = String(value ?? '');
  return encoded && text.startsWith("'") && needsGuard(text.slice(1)) ? text.slice(1) : text;
}
