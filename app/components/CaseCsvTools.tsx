'use client';

import React, { useState } from 'react';
import type { RecordItem } from '@/lib/standalone-db';
import { Download, FileSpreadsheet } from 'lucide-react';
import { standaloneDB } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';

export default function CaseCsvTools() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<RecordItem[]>([]);
  const inspectFile = async (file?: File) => {
    setPending([]); setError(''); setMessage('');
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('CSV must be 8 MiB or smaller.'); return; }
    const result = standaloneDB.importRecordsCSV(await file.text(), false);
    if (!result.success || !result.records?.length) { setError(result.message); return; }
    setPending(result.records); setMessage(`Reviewed ${result.records.length} cases. Confirm to import; duplicate or unresolved identities stop the entire file.`);
  };
  const importCases = async () => {
    setBusy(true); setError('');
    try {
      const count = await supabaseDB.importRecords(pending.map(({ id: _id, ...record }) => record));
      setMessage(`Imported ${count} cases, their dispatch references and import audit entries.`); setPending([]);
    } catch (error) { setError(error instanceof Error ? error.message : 'Import failed.'); }
    finally { setBusy(false); }
  };

  const download = (content: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportCases = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await supabaseDB.getRecords();
      if (result.error) throw new Error(String(result.error));
      download(standaloneDB.exportRecordsCSV(result.records), `Brandex_Records_${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage(`Exported ${result.records.length} case records.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Case export failed.'); }
    finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    download(standaloneDB.generateSampleRecordsCSV(), 'brandex-case-template.csv');
    setMessage('Case CSV template downloaded.'); setError('');
  };

  return (
    <section className="rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] sm:p-5">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><FileSpreadsheet className="h-5 w-5 text-[#C94A00]" /> Case CSV tools</h2>
      <p className="mb-4 text-xs text-[#666]">Review a CSV before importing. Series, client code and case number identify each case. Clients must already exist; conflicts stop the entire file. Use JSON recovery for history and file-byte backups.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" /> Template</button>
        <label className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold">Review CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={event => { void inspectFile(event.target.files?.[0]).catch(() => setError('CSV file could not be read.')); event.target.value = ''; }} className="max-w-48 text-xs" /></label>
        <button type="button" disabled={busy} onClick={exportCases} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      {pending.length > 0 && <div className="mt-3 flex gap-3"><button type="button" disabled={busy} onClick={() => void importCases()} className="rounded border-2 bg-[#C94A00] px-3 py-2 text-xs font-bold text-white">Confirm import of {pending.length} cases</button><button type="button" disabled={busy} onClick={() => { setPending([]); setMessage('Import cancelled; no data changed.'); }} className="text-xs underline">Cancel</button></div>}
      {busy && <p role="status" className="mt-3 text-xs text-[#666]">Working…</p>}
      {message && <p role="status" className="mt-3 text-xs font-semibold text-[#08734F]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-[#991B1B]">{error}</p>}
    </section>
  );
}
