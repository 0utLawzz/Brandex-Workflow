-- Additive parity only: no inferred relationships or historical data rewrites.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS client_id BIGINT;

-- A single SQL statement uses one MVCC snapshot for every related collection.
-- Raw rows retain all stored metadata; the application also exports mapped fields.
CREATE OR REPLACE FUNCTION public.get_recovery_snapshot()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'records', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.trademark_records r), '[]'::jsonb),
    'clients', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.clients c), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.id) FROM public.trademark_history h), '[]'::jsonb),
    'documents', COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.id) FROM public.trademark_documents d), '[]'::jsonb),
    'series', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.case_series s), '[]'::jsonb),
    'capturedAt', statement_timestamp()
  );
$$;
REVOKE ALL ON FUNCTION public.get_recovery_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recovery_snapshot() TO service_role;

-- Rollback: revoke/drop get_recovery_snapshot after reverting callers.
-- Retain additive columns and their data; column deletion is not a rollback step.
