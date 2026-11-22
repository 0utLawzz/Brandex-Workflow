-- Add optional client folder metadata. Existing rows remain untouched.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_prefix TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS folder_reference TEXT;

-- Prevent duplicate case references for the same client and series.
-- The preflight check aborts safely rather than renumbering or deleting existing records.
DO $$
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
END $$;

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
