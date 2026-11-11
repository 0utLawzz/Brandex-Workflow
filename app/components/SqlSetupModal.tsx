'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Database, X, RefreshCw, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseCredentials } from '@/lib/supabase';
import { supabaseDB, SupabaseStatus } from '@/lib/supabase-db';

export const SUPABASE_SQL_SCRIPT = `-- ========================================================
-- BRANDEX LAW ASSOCIATES - SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zbkgerbdnjmctqqnoqnd/sql
-- ========================================================

-- 1. Trademark Records Table
CREATE TABLE IF NOT EXISTS public.trademark_records (
  id BIGSERIAL PRIMARY KEY,
  serial_no TEXT,
  trademark_no TEXT,
  category TEXT DEFAULT 'INITIAL TRADEMARK',
  mark_name TEXT NOT NULL,
  class_no TEXT,
  class_desc TEXT,
  app_type TEXT,
  applicant_name TEXT,
  father_name TEXT,
  cnic TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  trading_as TEXT,
  address TEXT,
  usage_year TEXT,
  consultant_name TEXT,
  consultant_addr TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'PENDING',
  filing_process TEXT DEFAULT 'PENDING',
  tracking_id TEXT,
  selection_menu TEXT DEFAULT 'A',
  client_code TEXT DEFAULT '646',
  case_no TEXT DEFAULT '001',
  dispatched_date TEXT,
  dispatched_note TEXT,
  delivered_date TEXT,
  receiver_name TEXT,
  receipt_image TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist if table was already created
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS dispatched_date TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS dispatched_note TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS delivered_date TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS receipt_image TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Status Change History Table
CREATE TABLE IF NOT EXISTS public.trademark_history (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES public.trademark_records(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attached Documents Table (PDFs, Scans)
CREATE TABLE IF NOT EXISTS public.trademark_documents (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES public.trademark_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trademark_documents ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 4. Clients Profile Table
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGSERIAL PRIMARY KEY,
  client_code TEXT,
  name TEXT NOT NULL,
  company_name TEXT,
  father_name TEXT,
  phone TEXT,
  cnic TEXT,
  address TEXT,
  consultant_name TEXT,
  total_cases INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consultant_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_cases INT DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable Row Level Security (RLS)
ALTER TABLE public.trademark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for authenticated and anon app clients
DROP POLICY IF EXISTS "Allow public all on trademark_records" ON public.trademark_records;
CREATE POLICY "Allow public all on trademark_records" ON public.trademark_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on trademark_history" ON public.trademark_history;
CREATE POLICY "Allow public all on trademark_history" ON public.trademark_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on trademark_documents" ON public.trademark_documents;
CREATE POLICY "Allow public all on trademark_documents" ON public.trademark_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on clients" ON public.clients;
CREATE POLICY "Allow public all on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);`;

export default function SqlSetupModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'credentials'>('sql');
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrlInput(creds.url);
      setKeyInput(creds.key.includes('placeholder') ? '' : creds.key);
      testConnection();
    }
  }, [isOpen]);

  const testConnection = async () => {
    setChecking(true);
    try {
      const st = await supabaseDB.checkConnection();
      setStatus(st);
    } catch {
      setStatus({ connected: false, tableReady: false, error: 'Connection check failed', url: '' });
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      if (urlInput.trim()) {
        localStorage.setItem('brandex_supabase_url', urlInput.trim());
      } else {
        localStorage.removeItem('brandex_supabase_url');
      }

      if (keyInput.trim()) {
        localStorage.setItem('brandex_supabase_key', keyInput.trim());
      } else {
        localStorage.removeItem('brandex_supabase_key');
      }
    }
    testConnection();
    if (onSuccess) onSuccess();
  };

  const handlePushToSupabase = async () => {
    setSyncing(true);
    setSyncMsg('');
    const res = await supabaseDB.pushLocalToSupabase();
    if (res.success) {
      setSyncMsg(`✅ Synced ${res.count} records/clients to Supabase successfully!`);
      testConnection();
      if (onSuccess) onSuccess();
    } else {
      setSyncMsg(`❌ Sync error: ${res.error || 'Failed to sync'}`);
    }
    setSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-6 max-w-3xl w-full rounded-[6px] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#0C0C0C]">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#C94A00]" />
            <h2 className="font-['Bebas_Neue'] text-[1.6rem] tracking-[1px]">Supabase Database Link &amp; SQL</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[#0C0C0C] bg-[#fee2e2] text-[#0C0C0C] cursor-pointer hover:bg-[#fca5a5]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Banner */}
        <div className="mb-4 p-3 bg-white border-2 border-[#0C0C0C] rounded-[4px] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[0.8rem] font-['Space_Grotesk']">
            <span className="font-bold">STATUS:</span>
            {checking ? (
              <span className="flex items-center gap-1 text-[#666]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing connection...
              </span>
            ) : status?.tableReady ? (
              <span className="flex items-center gap-1 font-bold text-[#0D9970]">
                <CheckCircle2 className="w-4 h-4" /> Connected &amp; Tables Ready
              </span>
            ) : status?.connected ? (
              <span className="flex items-center gap-1 font-bold text-[#C94A00]">
                <AlertCircle className="w-4 h-4" /> Connected, but schema/tables pending
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-[#DC2626]">
                <AlertCircle className="w-4 h-4" /> {status?.error || 'Supabase Key Required'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={testConnection}
              disabled={checking}
              className="text-[0.72rem] font-['DM_Mono',monospace] px-2.5 py-1 border border-[#0C0C0C] bg-[#FAF6EE] hover:bg-[#E8DFC7] rounded flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={handlePushToSupabase}
              disabled={syncing || !status?.tableReady}
              className="text-[0.72rem] font-['DM_Mono',monospace] px-2.5 py-1 border border-[#0C0C0C] bg-[#0D9970] text-white hover:bg-[#0b805d] disabled:opacity-50 rounded flex items-center gap-1 cursor-pointer"
            >
              {syncing ? 'Syncing...' : 'Push Local Records to Supabase'}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="mb-3 p-2 bg-[#E8DFC7] border border-[#0C0C0C] rounded text-[0.78rem] font-['DM_Mono',monospace]">
            {syncMsg}
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('sql')}
            className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3 border-2 border-[#0C0C0C] rounded-[4px] cursor-pointer ${
              activeTab === 'sql' ? 'bg-[#0C0C0C] text-[#FAF6EE]' : 'bg-[#FAF6EE] text-[#0C0C0C]'
            }`}
          >
            1. SQL Schema Script
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`font-['DM_Mono',monospace] text-[0.75rem] font-bold py-1.5 px-3 border-2 border-[#0C0C0C] rounded-[4px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'credentials' ? 'bg-[#0C0C0C] text-[#FAF6EE]' : 'bg-[#FAF6EE] text-[#0C0C0C]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> 2. Supabase API Keys
          </button>
        </div>

        {activeTab === 'sql' ? (
          <>
            <p className="font-['Space_Grotesk'] text-[0.82rem] mb-3 text-[#333]">
              Run this script in your Supabase SQL Editor to provision <code>trademark_records</code>, <code>trademark_history</code>, <code>trademark_documents</code>, and <code>clients</code> with permissive RLS policies.
            </p>

            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.78rem] font-bold py-2 px-4 bg-[#0D9970] text-white border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px]"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}
              </button>
              <a
                href="https://supabase.com/dashboard/project/zbkgerbdnjmctqqnoqnd/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-['DM_Mono',monospace] text-[0.78rem] font-bold py-2 px-4 bg-[#FAF6EE] text-[#0C0C0C] border-2 border-[#0C0C0C] rounded-[4px] shadow-[3px_3px_0_#0C0C0C] no-underline hover:bg-[#E8DFC7]"
              >
                Open Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex-1 overflow-y-auto border-2 border-[#0C0C0C] bg-[#1A1A1A] text-[#0D9970] p-4 font-['DM_Mono',monospace] text-[0.73rem] rounded-[4px]">
              <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCRIPT}</pre>
            </div>
          </>
        ) : (
          <form onSubmit={handleSaveCredentials} className="flex-1 flex flex-col gap-3 font-['Space_Grotesk']">
            <p className="text-[0.82rem] text-[#333]">
              Configure your Supabase project URL and anon public API key below. These can also be configured via <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in environment variables.
            </p>

            <div>
              <label className="block text-[0.75rem] font-bold mb-1 font-['DM_Mono',monospace]">
                SUPABASE PROJECT URL:
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://zbkgerbdnjmctqqnoqnd.supabase.co"
                className="w-full p-2 bg-white border-2 border-[#0C0C0C] rounded font-['DM_Mono',monospace] text-[0.8rem]"
              />
            </div>

            <div>
              <label className="block text-[0.75rem] font-bold mb-1 font-['DM_Mono',monospace]">
                SUPABASE ANON PUBLIC KEY:
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-2 bg-white border-2 border-[#0C0C0C] rounded font-['DM_Mono',monospace] text-[0.8rem]"
              />
              <span className="text-[0.7rem] text-[#666] block mt-1">
                Find this in your Supabase Dashboard under <strong>Project Settings → API → Project API Keys (anon / public)</strong>.
              </span>
            </div>

            <div className="mt-auto pt-3 border-t border-[#0C0C0C]/20 flex justify-between items-center">
              <a
                href="https://supabase.com/dashboard/project/zbkgerbdnjmctqqnoqnd/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.75rem] font-['DM_Mono',monospace] text-[#C94A00] flex items-center gap-1 hover:underline"
              >
                Get API Keys from Supabase Dashboard <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="submit"
                className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2 px-5 bg-[#0C0C0C] text-[#FAF6EE] border-2 border-[#0C0C0C] rounded-[4px] shadow-[2px_2px_0_#0C0C0C] cursor-pointer hover:bg-[#333]"
              >
                Save &amp; Test Connection
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-[#0C0C0C]/20 flex justify-end">
          <button
            onClick={onClose}
            className="font-['DM_Mono',monospace] text-[0.8rem] font-bold py-2 px-5 bg-[#0C0C0C] text-[#FAF6EE] border-2 border-[#0C0C0C] rounded-[4px] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
