'use client';
import { useMemo } from 'react';
import { monthlyCaseAnalytics } from '@/lib/case-analytics';
import type { RecordItem } from '@/lib/standalone-db';
export default function MonthlyCaseChart({ records }: { records: RecordItem[] }) {
  const { buckets, missingCreatedDates } = useMemo(() => monthlyCaseAnalytics(records), [records]);
  const maximum = Math.max(1, ...buckets.flatMap(bucket => [bucket.created, bucket.dispatched, bucket.delivered]));
  return <details className="mb-4 rounded border-2 border-[#0C0C0C] bg-[#FAF6EE] p-3"><summary className="cursor-pointer font-bold">Monthly case activity</summary>
    <p className="my-2 text-xs text-[#666]">Created uses database creation time; dispatch and delivery use their recorded dates. Months follow Pakistan time. These are not legal filing counts.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Month</th><th className="p-2">Created</th><th className="p-2">Dispatched</th><th className="p-2">Delivered</th></tr></thead><tbody>{buckets.map(bucket => <tr key={bucket.month} className="border-t"><th scope="row" className="p-2">{bucket.month}</th>{(['created', 'dispatched', 'delivered'] as const).map((key, index) => <td key={key} className="relative min-w-24 p-2"><span aria-hidden="true" className={`absolute inset-y-1 left-0 opacity-20 ${['bg-orange-600', 'bg-blue-600', 'bg-green-600'][index]}`} style={{ width: `${bucket[key] / maximum * 100}%` }} /><span className="relative">{bucket[key]}</span></td>)}</tr>)}</tbody></table></div>
    {missingCreatedDates > 0 && <p className="mt-2 text-xs">{missingCreatedDates} cases have no valid creation date and are excluded from created-month totals.</p>}
  </details>;
}
