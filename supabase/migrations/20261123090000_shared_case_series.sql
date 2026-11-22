-- Shared independent case-series registry. Existing case rows are read only.
BEGIN;

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

-- Preserve all valid existing series values while also retaining the legacy options.
-- This inserts into the new registry only; trademark_records are never updated.
WITH discovered AS (
  SELECT unnest(ARRAY['A', 'X', 'N', 'B']::TEXT[]) AS series_code
  UNION
  SELECT DISTINCT UPPER(BTRIM(selection_menu)) AS series_code
  FROM public.trademark_records
  WHERE selection_menu IS NOT NULL
    AND UPPER(BTRIM(selection_menu)) ~ '^[A-Z][A-Z0-9]{0,7}$'
),
ordered AS (
  SELECT series_code,
    ROW_NUMBER() OVER (
      ORDER BY CASE series_code WHEN 'A' THEN 1 WHEN 'X' THEN 2 WHEN 'N' THEN 3 WHEN 'B' THEN 4 ELSE 5 END,
               series_code
    )::INTEGER AS sort_order
  FROM discovered
)
INSERT INTO public.case_series (series_code, is_active, sort_order)
SELECT series_code, TRUE, sort_order FROM ordered
ON CONFLICT DO NOTHING;

COMMIT;
