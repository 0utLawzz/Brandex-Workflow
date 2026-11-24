'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, RefreshCw, X, ShieldCheck, Database, Check } from 'lucide-react';
import { standaloneDB } from '@/lib/standalone-db';
import { supabaseDB } from '@/lib/supabase-db';
import { preflightRestore } from '@/lib/restore-preflight';
import type { RestorePreflight } from '@/lib/restore-preflight';
import { planAssetRestore } from '@/lib/restore-assets';
import { buildBackupAssetManifest } from '@/lib/backup-package';
import type { RecoveryReport } from '@/lib/recovery-policy';
import { MAX_RECOVERY_BYTES } from '@/lib/recovery-transfer';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export default function DataBackupModal({ isOpen, onClose, onDataChanged }: DataBackupModalProps) {
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preflight, setPreflight] = useState<RestorePreflight | null>(null);
  const [checking, setChecking] = useState(false);
  const [allowMissingAssets, setAllowMissingAssets] = useState(false);
  const [restoreReport, setRestoreReport] = useState<RecoveryReport | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setChecking(true);
    setStatusMsg({ text: 'Preparing a consistent backup and checking available file copies…', type: 'warning' });
    try {
      const json = await supabaseDB.getBackupSnapshot(true);
      const parsed = JSON.parse(json);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandex-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg(parsed.backupStatus === 'partial'
        ? { text: `Backup downloaded, but it is PARTIAL: ${parsed.counts?.assetsMissingBytes || 0} external file(s) are only saved as links; their file contents are not included. Keep the original files safe.`, type: 'warning' }
        : { text: 'Backup JSON downloaded. Review the backup report before relying on it for recovery.', type: 'success' });
    } catch (e: any) {
      setStatusMsg({ text: e.message || 'Failed to export backup', type: 'error' });
    } finally { setChecking(false); }
  };

  const importBackup = async (content: string) => {
    if (new TextEncoder().encode(content).length > MAX_RECOVERY_BYTES) {
      setStatusMsg({ text: 'Backup exceeds the 64 MiB recovery limit.', type: 'error' });
      setPreflight(null); setImportText(''); return;
    }
    setChecking(true);
    setPreflight(null);
    setRestoreReport(null);
    setImportText('');
    setAllowMissingAssets(false);
    try {
      const destination = await supabaseDB.getBackupSnapshot();
      const report = preflightRestore(content, destination);
      if (report.valid) {
        const source = JSON.parse(content);
        const assets = await planAssetRestore(buildBackupAssetManifest({ records: source.records || [], clients: source.clients || [], history: source.history || [], documents: source.documents || [] }), source.assetCopies || []);
        report.counts.missingAssets = assets.missing;
        report.warnings = report.warnings.filter(warning => !warning.includes('file recovery is incomplete'));
        if (assets.missing) report.warnings.push(`${assets.missing} referenced files have no verified byte copy; recovery will be partial.`);
      }
      setPreflight(report);
      if (report.valid) setImportText(content);
      setStatusMsg({ text: report.valid ? 'Preflight completed. No data was changed. Review collisions and missing files below.' : 'Preflight failed. No data was changed.', type: report.valid ? 'warning' : 'error' });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to inspect backup', type: 'error' });
    } finally {
      setChecking(false);
    }
  };

  const executeRestore = async () => {
    if (!preflight?.valid || !importText || !confirm('Restore the reviewed cases, clients, history and document references into the administrator-approved target? Existing identities will never be overwritten.')) return;
    setChecking(true);
    try {
      const report = await supabaseDB.restoreBackupJSON(importText, { confirmed: true, allowMissingAssets });
      setRestoreReport(report);
      setStatusMsg({ text: `${report.alreadyRestored ? 'Previously restored' : 'Restored'} in ${report.projectRef}: ${report.count} cases, ${report.clients} clients, ${report.history} history entries, ${report.documents} document references; ${report.restoredAssets} verified files copied. ${report.originalIdsPreserved ? 'Original IDs preserved.' : 'IDs remapped; download the report.'} ${report.missingAssets ? `${report.missingAssets} files remain unavailable; recovery is PARTIAL.` : 'Available embedded/copy bytes retained.'} Series/settings recovery is separate.`, type: report.missingAssets ? 'warning' : 'success' });
      onDataChanged?.();
    } catch (error) {
      setStatusMsg({ text: error instanceof Error ? error.message : 'Restore failed.', type: 'error' });
    } finally { setChecking(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RECOVERY_BYTES) {
      setStatusMsg({ text: 'Backup exceeds the 64 MiB recovery limit.', type: 'error' });
      setPreflight(null); setImportText(''); e.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) void importBackup(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManualImport = () => {
    if (!importText.trim()) return;
    void importBackup(importText);
    setImportText('');
  };

  const handleReset = () => {
    if (confirm('Delete all records, clients, history, and documents saved in this browser? Export a backup first; this cannot be undone.')) {
      standaloneDB.clearAllData();
      setStatusMsg({ text: 'All browser data was cleared.', type: 'success' });
      if (onDataChanged) onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-[rgba(12,12,12,0.85)] flex items-center justify-center p-4">
      <div className="bg-[#FAF6EE] border-[3.5px] border-[#0C0C0C] shadow-[10px_10px_0_#C94A00] p-6 max-w-lg w-full rounded-[6px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#0C0C0C] mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#C94A00]" />
            <h2 className="font-['Bebas_Neue'] text-[1.8rem] tracking-[1.5px] text-[#0C0C0C]">
              SUPABASE DATA BACKUP
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#E8DFC7] rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-[#EBF7F2] border-2 border-[#0D9970] rounded-[4px] flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#0D9970] shrink-0" />
          <div className="text-[0.78rem] font-['DM_Mono',monospace] text-[#0C0C0C]">
            <span className="font-bold">Supabase is the system of record:</span> Cases and client profiles are stored in the Supabase database. Google Drive stores generated documents and files only.
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3 mb-4 border-2 border-[#0C0C0C] text-[0.8rem] font-['DM_Mono',monospace] font-bold ${
            statusMsg.type === 'success' ? 'bg-[#0D9970] text-white' : statusMsg.type === 'warning' ? 'bg-[#D4A800] text-[#0C0C0C]' : 'bg-[#C94A00] text-white'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Export Backup */}
        {restoreReport && <button type="button" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(restoreReport, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'brandex-restore-report.json'; anchor.click(); URL.revokeObjectURL(url); }} className="mb-4 rounded border-2 bg-white px-3 py-2 text-sm font-bold">Download restore report &amp; ID maps</button>}
        <div className="mb-5 p-4 border-2 border-[#0C0C0C] bg-white rounded-[4px]">
          <h3 className="font-['Bebas_Neue'] text-[1.3rem] tracking-[1px] mb-1">1. Download Backup File</h3>
          <p className="text-[0.75rem] font-['DM_Mono',monospace] text-[#555] mb-3">
            Save a database snapshot with cases, clients, history, document references, and a file-asset manifest. External Drive files may be links only; check the report.
          </p>
          <button
            onClick={handleExport}
            disabled={checking}
            className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-4 bg-[#C94A00] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
          >
            <Download className="w-4 h-4" /> EXPORT BACKUP (.JSON)
          </button>
        </div>

        {/* Import Backup */}
        <div className="mb-5 p-4 border-2 border-[#0C0C0C] bg-white rounded-[4px]">
          <h3 className="font-['Bebas_Neue'] text-[1.3rem] tracking-[1px] mb-1">2. Restore from Backup</h3>
          <p className="text-[0.75rem] font-['DM_Mono',monospace] text-[#555] mb-3">
            Inspect a backup against the current cloud snapshot before restoring. Execution requires an administrator-enabled target and explicit confirmation. Existing case/client identities are preserved; conflicts stop the transaction.
          </p>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              disabled={checking}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-4 bg-[#0D9970] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
            >
              <Upload className="w-4 h-4" /> {checking ? 'CHECKING…' : 'CHECK BACKUP FILE (.JSON)'}
            </button>
          </div>
          {preflight && <div role="status" className="mt-4 text-sm">
            <dl className="grid grid-cols-2 gap-2">{Object.entries(preflight.counts).map(([key, count]) => <React.Fragment key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{count}</dd></React.Fragment>)}</dl>
            {preflight.errors.map((error, index) => <p key={`error-${index}`} className="mt-2 text-red-800">{error}</p>)}
            {preflight.warnings.map((warning, index) => <p key={`warning-${index}`} className="mt-2 text-amber-900">{warning}</p>)}
            {preflight.valid && <div className="mt-3 border-t pt-3">
              {preflight.counts.missingAssets > 0 && <label className="mb-3 flex items-start gap-2"><input type="checkbox" checked={allowMissingAssets} onChange={event => setAllowMissingAssets(event.target.checked)} />I accept a partial file recovery: unavailable external bytes will not be restored.</label>}
              <button type="button" disabled={checking || (preflight.counts.missingAssets > 0 && !allowMissingAssets)} onClick={() => void executeRestore()} className="rounded border-2 border-[#0C0C0C] bg-[#C94A00] px-3 py-2 font-bold text-white disabled:opacity-50">{checking ? 'Working…' : 'Confirm database restore'}</button>
            </div>}
          </div>}
        </div>

        {/* Clear Browser Data */}
        <div className="p-4 border-2 border-[#0C0C0C] bg-[#FAF6EE] rounded-[4px] flex items-center justify-between">
          <div>
            <div className="font-['Bebas_Neue'] text-[1.15rem]">Clear Browser Data</div>
            <div className="text-[0.7rem] font-['DM_Mono',monospace] text-[#666]">
              Remove all records, clients, history, and documents from this browser.
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 font-['DM_Mono',monospace] text-[0.75rem] font-bold py-2 px-3 bg-[#FAF6EE] border-2 border-[#0C0C0C] rounded-[4px] hover:bg-[#E8DFC7] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}
