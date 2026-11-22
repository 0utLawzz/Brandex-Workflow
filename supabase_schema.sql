-- ========================================================
-- BRANDEX LAW ASSOCIATES - SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pjthtvkzuthxwpvcdqxy/sql
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

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_prefix TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS folder_reference TEXT;
-- Prevent duplicate case references for the same client and series.
-- The preflight check aborts safely rather than renumbering or deleting existing records.
DO $
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.trademark_records
    WHERE COALESCE(BTRIM(client_code), '') <> ''
      AND COALESCE(BTRIM(selection_menu), '') <> ''
      AND COALESCE(BTRIM(case_no), '') <> ''
    GROUP BY
      CASE WHEN length(regexp_replace(client_code, '[^0-9]', '', 'g')) < 3
        THEN lpad(regexp_replace(client_code, '[^0-9]', '', 'g'), 3, '0')
        ELSE regexp_replace(client_code, '[^0-9]', '', 'g') END,
      upper(btrim(selection_menu)),
      CASE WHEN length(regexp_replace(case_no, '[^0-9]', '', 'g')) < 3
        THEN lpad(regexp_replace(case_no, '[^0-9]', '', 'g'), 3, '0')
        ELSE regexp_replace(case_no, '[^0-9]', '', 'g') END
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate client/series/case references exist. Review them before applying the BrandEx case identity index.';
  END IF;
END $;

CREATE UNIQUE INDEX IF NOT EXISTS uq_trademark_records_client_series_case
ON public.trademark_records (
  (CASE WHEN length(regexp_replace(client_code, '[^0-9]', '', 'g')) < 3
    THEN lpad(regexp_replace(client_code, '[^0-9]', '', 'g'), 3, '0')
    ELSE regexp_replace(client_code, '[^0-9]', '', 'g') END),
  (upper(btrim(selection_menu))),
  (CASE WHEN length(regexp_replace(case_no, '[^0-9]', '', 'g')) < 3
    THEN lpad(regexp_replace(case_no, '[^0-9]', '', 'g'), 3, '0')
    ELSE regexp_replace(case_no, '[^0-9]', '', 'g') END)
)
WHERE COALESCE(BTRIM(client_code), '') <> ''
  AND COALESCE(BTRIM(selection_menu), '') <> ''
  AND COALESCE(BTRIM(case_no), '') <> '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consultant_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_cases INT DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Preserve the selected client as a real, nullable relationship on new cases.
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS client_id BIGINT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trademark_records_client_id_fkey'
      AND conrelid = 'public.trademark_records'::regclass
  ) THEN
    ALTER TABLE public.trademark_records
      ADD CONSTRAINT trademark_records_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS trademark_records_client_id_idx ON public.trademark_records(client_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trademark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS remains enabled. Do not create permissive anon/public policies here.
-- The application uses authenticated server-side API routes and a server-only
-- service-role key. Grant access only through an explicitly reviewed policy
-- strategy; never add USING (true) / WITH CHECK (true) policies.


-- 5. Shared independent case-series registry
CREATE TABLE IF NOT EXISTS public.case_series (
  id BIGSERIAL PRIMARY KEY,
  series_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_series_code_format_check
    CHECK (series_code = UPPER(BTRIM(series_code)) AND series_code ~ '^[A-Z][A-Z0-9]{0,7}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_case_series_code_normalized
  ON public.case_series (UPPER(BTRIM(series_code)));

ALTER TABLE public.case_series ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.case_series FROM anon, authenticated;
GRANT ALL ON TABLE public.case_series TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.case_series_id_seq TO service_role;

INSERT INTO public.case_series (series_code, is_active, sort_order)
VALUES ('A', TRUE, 1), ('X', TRUE, 2), ('N', TRUE, 3), ('B', TRUE, 4)
ON CONFLICT DO NOTHING;
