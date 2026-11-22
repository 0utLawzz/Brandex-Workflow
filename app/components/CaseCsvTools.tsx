'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { standaloneDB } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';

export default function CaseCsvTools() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><FileSpreadsheet className="h-5 w-5 text-[#C94A00]" /> Case import &amp; export</h2>
      <p className="mb-4 text-xs text-[#666]">Download a case CSV or the current template. Case import is temporarily held until the importer can preserve Series, client prefix, client code, and case number as separate fields.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" /> Template</button>
        <button type="button" disabled title="Temporarily disabled until identity-safe CSV import is implemented" className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C]/30 bg-[#E8DFC7] px-3 py-2 text-xs font-bold opacity-50">Import CSV (paused)</button>
        <button type="button" disabled={busy} onClick={exportCases} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      {busy && <p role="status" className="mt-3 text-xs text-[#666]">Working…</p>}
      {message && <p role="status" className="mt-3 text-xs font-semibold text-[#08734F]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-[#991B1B]">{error}</p>}
    </section>
  );
}
