-- ========================================================
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
  dispatched_image TEXT,
  dispatched_doc_name TEXT,
  dispatched_doc_type TEXT,
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
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS dispatched_image TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS dispatched_doc_name TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS dispatched_doc_type TEXT;
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
CREATE POLICY "Allow public all on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
