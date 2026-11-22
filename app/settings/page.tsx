'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { Settings, Save, RotateCcw, CheckCircle2, Table2, Users, FilePlus2, ShieldCheck, Database } from 'lucide-react';
import DataBackupModal from '@/app/components/DataBackupModal';
import ClientCsvTools from '@/app/components/ClientCsvTools';
import CaseCsvTools from '@/app/components/CaseCsvTools';
import { DEFAULT_WORKSPACE_PREFERENCES, readWorkspacePreferences, saveWorkspacePreferences } from '@/lib/workspace-preferences';
import type { WorkspacePreferences } from '@/lib/workspace-preferences';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(DEFAULT_WORKSPACE_PREFERENCES);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);

  useEffect(() => { setPreferences(readWorkspacePreferences()); }, []);

  const update = (changes: Partial<WorkspacePreferences>) => {
    setPreferences(current => ({ ...current, ...changes }));
    setSaved(false);
    setError('');
  };

  const handleSave = () => {
    try {
      saveWorkspacePreferences(preferences);
      setSaved(true);
      setError('');
    } catch {
      setSaved(false);
      setError('Settings could not be saved in this browser. Check browser storage permissions and try again.');
    }
  };

  const handleReset = () => {
    setPreferences(DEFAULT_WORKSPACE_PREFERENCES);
    try {
      saveWorkspacePreferences(DEFAULT_WORKSPACE_PREFERENCES);
      setSaved(true);
      setError('');
    } catch {
      setSaved(false);
      setError('Default settings could not be saved. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F0E8D0] text-[#0C0C0C]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-9">
        <header className="mb-6 flex items-center gap-3">
          <div className="rounded-lg border-2 border-[#0C0C0C] bg-[#D4A800] p-3 shadow-[3px_3px_0_#0C0C0C]"><Settings className="h-6 w-6" /></div>
          <div><h1 className="font-['Bebas_Neue'] text-3xl tracking-wide sm:text-4xl">Workspace Settings</h1><p className="text-sm text-[#666]">Manage display preferences and review naming rules.</p></div>
        </header>

        {saved && <div role="status" className="mb-4 flex items-center gap-2 rounded border-2 border-[#0D9970] bg-[#EBF7F2] p-3 text-sm font-semibold text-[#08734F]"><CheckCircle2 className="h-4 w-4" /> Settings saved in this browser.</div>}
        {error && <div role="alert" className="mb-4 rounded border-2 border-[#DC2626] bg-[#FEE2E2] p-3 text-sm font-semibold text-[#991B1B]">{error}</div>}

        <section className="mb-5 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Table2 className="h-5 w-5 text-[#C94A00]" /> Records display</h2>
          <label className="mb-4 flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">Rows per page
            <select value={preferences.pageSize} onChange={event => update({ pageSize: Number(event.target.value) as WorkspacePreferences['pageSize'] })} className="w-full rounded border-2 border-[#0C0C0C] bg-white px-3 py-2 text-sm normal-case sm:w-44">
              <option value={10}>10 records</option><option value={25}>25 records</option><option value={50}>50 records</option><option value={100}>100 records</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-[#0C0C0C]/10 pt-4 text-sm">
            <span><strong className="block">Law firm summary</strong><span className="text-xs text-[#666]">Show or hide the consultant summary above the records.</span></span>
            <input type="checkbox" checked={preferences.showLawFirmWidget} onChange={event => update({ showLawFirmWidget: event.target.checked })} className="h-5 w-5 accent-[#C94A00]" />
          </label>
        </section>

        <section className="mb-5 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] sm:p-5">
          <h2 className="mb-3 text-lg font-bold">Client &amp; case naming</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-[#0C0C0C]/20 bg-white p-3"><span className="text-xs text-[#666]">Case reference</span><div className="mt-1 font-['DM_Mono',monospace] text-xl font-bold text-[#C94A00]">N-333-001</div><p className="mt-1 text-xs text-[#666]">Client prefix + client code + case number. Series stays separate.</p></div>
            <div className="rounded border border-[#0C0C0C]/20 bg-white p-3"><span className="text-xs text-[#666]">Numbering</span><div className="mt-1 text-base font-bold">Per client + series</div><p className="mt-1 text-xs text-[#666]">Har client aur series ka apna sequence.</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/clients" className="inline-flex items-center gap-2 rounded border border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold"><Users className="h-4 w-4" /> Manage client prefixes</Link>
            <Link href="/trademark-application" className="inline-flex items-center gap-2 rounded border border-[#0C0C0C] bg-[#E8DFC7] px-3 py-2 text-xs font-bold"><FilePlus2 className="h-4 w-4" /> Create case</Link>
          </div>
        </section>

        <ClientCsvTools />
        <div className="mt-5"><CaseCsvTools /></div>

        <section className="my-5 rounded-lg border-2 border-[#0C0C0C] bg-[#FAF6EE] p-4 shadow-[3px_3px_0_#0C0C0C] sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Database className="h-5 w-5 text-[#C94A00]" /> Backup &amp; restore</h2>
          <p className="mb-3 text-xs text-[#666]">Download or review the existing backup package. Keep your separate historical backup unchanged.</p>
          <button type="button" onClick={() => setShowBackupModal(true)} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-4 py-2.5 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4" /> Open backup tools</button>
        </section>

        <section className="mb-6 rounded-lg border border-[#0C0C0C]/20 bg-[#E8DFC7] p-4">
          <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9970]" /><div><strong className="text-sm">Access &amp; data protection</strong><p className="mt-1 text-xs text-[#555]">Login credentials are managed by secure deployment settings. They are intentionally not editable or stored on this page.</p></div></div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#E8DFC7] px-4 py-2.5 text-sm font-bold"><RotateCcw className="h-4 w-4" /> Reset defaults</button>
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-5 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_#0C0C0C]"><Save className="h-4 w-4" /> Save settings</button>
        </div>
      </main>
      <Footer />
      <DataBackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
    </div>
  );
}
