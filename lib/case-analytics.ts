import { toDateInputValue } from './case-reference.ts';
type AnalyticsCase = { createdAt?: string; dispatchedDate?: string; deliveredDate?: string };
function monthOf(value: string | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit' }).formatToParts(date);
    return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}`;
  }
  return toDateInputValue(value).slice(0, 7);
}
export function monthlyCaseAnalytics(records: AnalyticsCase[], now = new Date()) {
  const current = monthOf(now.toISOString());
  const [year, month] = current.split('-').map(Number);
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    return { month: date.toISOString().slice(0, 7), created: 0, dispatched: 0, delivered: 0 };
  });
  const byMonth = new Map(buckets.map(bucket => [bucket.month, bucket]));
  let missingCreatedDates = 0;
  for (const record of records) {
    const created = monthOf(record.createdAt);
    if (!created) missingCreatedDates++;
    for (const [key, value] of [['created', created], ['dispatched', monthOf(record.dispatchedDate)], ['delivered', monthOf(record.deliveredDate)]] as const) {
      const bucket = byMonth.get(value);
      if (bucket) bucket[key]++;
    }
  }
  return { buckets, missingCreatedDates };
}
