'use client';
import { useMemo } from 'react';
import { monthlyCaseAnalytics } from '@/lib/case-analytics';
import type { RecordItem } from '@/lib/standalone-db';
export default function MonthlyCaseChart({ records }: { records: RecordItem[] }) {
  const { buckets, missingCreatedDates, missingFilingDates } = useMemo(() => monthlyCaseAnalytics(records), [records]);
  const metrics = ['filed', 'created', 'dispatched', 'delivered'] as const;
  const maximum = Math.max(1, ...buckets.flatMap(bucket => metrics.map(key => bucket[key])));
  return <details className="mb-4 rounded border-2 border-[#0C0C0C] bg-[#FAF6EE] p-3"><summary className="cursor-pointer font-bold">Monthly case activity</summary>
    <p className="my-2 text-xs text-[#666]">Filed uses the Application Filing Date. Created, dispatch and delivery use their own recorded dates. Months follow Pakistan time.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Month</th><th className="p-2">Filed</th><th className="p-2">Created</th><th className="p-2">Dispatched</th><th className="p-2">Delivered</th></tr></thead><tbody>{buckets.map(bucket => <tr key={bucket.month} className="border-t"><th scope="row" className="p-2">{bucket.month}</th>{metrics.map((key, index) => <td key={key} className="relative min-w-24 p-2"><span aria-hidden="true" className={`absolute inset-y-1 left-0 opacity-20 ${['bg-purple-600', 'bg-orange-600', 'bg-blue-600', 'bg-green-600'][index]}`} style={{ width: `${bucket[key] / maximum * 100}%` }} /><span className="relative">{bucket[key]}</span></td>)}</tr>)}</tbody></table></div>
    {missingFilingDates > 0 && <p className="mt-2 text-xs">{missingFilingDates} cases have no filing date and are excluded from filed-month totals.</p>}
    {missingCreatedDates > 0 && <p className="mt-2 text-xs">{missingCreatedDates} cases have no valid creation date and are excluded from created-month totals.</p>}
  </details>;
}
