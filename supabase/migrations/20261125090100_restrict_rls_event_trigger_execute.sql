-- Keep Supabase's RLS DDL event trigger, but do not expose its SECURITY DEFINER
-- helper as an RPC to untrusted roles. The event trigger continues to invoke it.
DO $migration$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$migration$;

-- Rollback, only if explicitly required: re-granting EXECUTE to PUBLIC/anon/authenticated
-- restores the advisor warning and should not be used as a routine rollback.
