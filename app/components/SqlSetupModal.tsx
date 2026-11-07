'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Database, X } from 'lucide-react';

export const SUPABASE_SQL_SCRIPT = `-- ========================================================
-- BRANDEX LAW ASSOCIATES - SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zbkgerbdnjmctqqnoqnd/sql
-- ========================================================

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trademark_history (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES public.trademark_records(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trademark_documents (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES public.trademark_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id BIGSERIAL PRIMARY KEY,
  client_code TEXT,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  cnic TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trademark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on trademark_records" ON public.trademark_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on trademark_history" ON public.trademark_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on trademark_documents" ON public.trademark_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
`;

export default function SqlSetupModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#FAF6EE] border-[3px] border-[#0C0C0C] shadow-[8px_8px_0_#0C0C0C] p-6 max-w-2xl w-full rounded-[6px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#0C0C0C]">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#C94A00]" />
            <h2 className="font-['Bebas_Neue'] text-[1.6rem] tracking-[1px]">Supabase Database Setup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[#0C0C0C] bg-[#fee2e2] text-[#0C0C0C] cursor-pointer hover:bg-[#fca5a5]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="font-['Space_Grotesk'] text-[0.85rem] mb-3 text-[#333]">
          If you see <strong>&quot;Could not find table in schema cache&quot;</strong>, copy this SQL script and execute it once in your Supabase SQL Editor. This provisions <code>trademark_records</code>, <code>trademark_history</code>, <code>trademark_documents</code>, and <code>clients</code>.
        </p>

        <div className="flex gap-2 mb-3">
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

        <div className="flex-1 overflow-y-auto border-2 border-[#0C0C0C] bg-[#1A1A1A] text-[#0D9970] p-4 font-['DM_Mono',monospace] text-[0.75rem] rounded-[4px]">
          <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCRIPT}</pre>
        </div>

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
