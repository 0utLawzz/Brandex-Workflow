export function issueDateForSave(date?: string, issueDate?: string): string | undefined {
  if (date === undefined && issueDate === undefined) return undefined;
  if (date && issueDate && date !== issueDate) throw new Error('Date and Issue Date disagree. Correct the case date before saving.');
  return date || issueDate || '';
}
