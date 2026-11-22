'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { standaloneDB } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';

export default function ClientCsvTools() {
  const fileRef = useRef<HTMLInputElement>(null);
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

  const exportClients = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await supabaseDB.getClients();
      if (result.error) throw new Error(String(result.error));
      download(standaloneDB.exportClientsCSV(result.clients), `brandex-clients-${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage(`Exported ${result.clients.length} client profiles.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Client export failed.'); }
    finally { setBusy(false); }
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const content = await file.text();
      const parsed = standaloneDB.importClientsCSV(content, false);
      if (!parsed.success) throw new Error(parsed.message);
      const count = await supabaseDB.importClients(parsed.clients || []);
      setMessage(`Imported ${count} client profiles.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Client import failed.'); }
    finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    download(standaloneDB.generateSampleClientsCSV(), 'brandex-client-template.csv');
    setMessage('Client CSV template downloaded.'); setError('');
  };

  return (
    <section className="rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] sm:p-5">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><FileSpreadsheet className="h-5 w-5 text-[#C94A00]" /> Client import &amp; export</h2>
      <p className="mb-4 text-xs text-[#666]">CSV tools are kept here so the Client Profiles page stays focused. Existing client fields remain unchanged.</p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importFile} className="hidden" />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" /> Template</button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold disabled:opacity-50"><Upload className="h-4 w-4" /> Import CSV</button>
        <button type="button" disabled={busy} onClick={exportClients} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      {busy && <p role="status" className="mt-3 text-xs text-[#666]">Working…</p>}
      {message && <p role="status" className="mt-3 text-xs font-semibold text-[#08734F]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-[#991B1B]">{error}</p>}
    </section>
  );
}
