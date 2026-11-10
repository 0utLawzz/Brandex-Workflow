'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, RefreshCw, X, ShieldCheck, Database, Check } from 'lucide-react';
import { standaloneDB } from '@/lib/standalone-db';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export default function DataBackupModal({ isOpen, onClose, onDataChanged }: DataBackupModalProps) {
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const json = standaloneDB.exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandex-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg({ text: 'Backup JSON downloaded successfully!', type: 'success' });
    } catch (e: any) {
      setStatusMsg({ text: e.message || 'Failed to export backup', type: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = standaloneDB.importBackupJSON(content);
      if (res.success) {
        setStatusMsg({ text: res.message, type: 'success' });
        if (onDataChanged) onDataChanged();
      } else {
        setStatusMsg({ text: res.message, type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManualImport = () => {
    if (!importText.trim()) return;
    const res = standaloneDB.importBackupJSON(importText);
    if (res.success) {
      setStatusMsg({ text: res.message, type: 'success' });
      setImportText('');
      if (onDataChanged) onDataChanged();
    } else {
      setStatusMsg({ text: res.message, type: 'error' });
    }
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
              STANDALONE DATA STORAGE
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
            <span className="font-bold">Browser storage active:</span> Records and client profiles are stored in this browser only. They are not shared across users or devices.
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3 mb-4 border-2 border-[#0C0C0C] text-[0.8rem] font-['DM_Mono',monospace] font-bold ${
            statusMsg.type === 'success' ? 'bg-[#0D9970] text-white' : 'bg-[#C94A00] text-white'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Export Backup */}
        <div className="mb-5 p-4 border-2 border-[#0C0C0C] bg-white rounded-[4px]">
          <h3 className="font-['Bebas_Neue'] text-[1.3rem] tracking-[1px] mb-1">1. Download Backup File</h3>
          <p className="text-[0.75rem] font-['DM_Mono',monospace] text-[#555] mb-3">
            Save a full snapshot of all your trademark records, client directory, and history logs as a JSON file.
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-4 bg-[#C94A00] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
          >
            <Download className="w-4 h-4" /> EXPORT BACKUP (.JSON)
          </button>
        </div>

        {/* Import Backup */}
        <div className="mb-5 p-4 border-2 border-[#0C0C0C] bg-white rounded-[4px]">
          <h3 className="font-['Bebas_Neue'] text-[1.3rem] tracking-[1px] mb-1">2. Restore from Backup</h3>
          <p className="text-[0.75rem] font-['DM_Mono',monospace] text-[#555] mb-3">
            Restore previously exported records onto any device or browser without needing an external database.
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
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2.5 px-4 bg-[#0D9970] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
            >
              <Upload className="w-4 h-4" /> CHOOSE BACKUP FILE (.JSON)
            </button>
          </div>
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
