type RecordSourceItem = {
  id?: number | string | null;
  folder?: string | null;
  tm?: string | null;
};

function getRecordSourceKey(record: RecordSourceItem): string {
  const folder = String(record.folder || '').trim();
  const trademark = String(record.tm || '').trim();
  if (folder || trademark) return `${folder}__${trademark}`;
  return `id:${record.id ?? ''}`;
}

/** Merge Apps Script rows with Supabase rows, preferring Supabase on duplicates. */
export function mergeRecordSources<T extends RecordSourceItem>(
  appsScriptRecords: T[],
  supabaseRecords: T[],
): T[] {
  const records = new Map<string, T>();
  appsScriptRecords.forEach((record) => records.set(getRecordSourceKey(record), record));
  supabaseRecords.forEach((record) => records.set(getRecordSourceKey(record), record));
  return Array.from(records.values());
}
