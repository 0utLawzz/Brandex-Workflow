DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.clients WHERE trim(client_code) ~ '^[0-9]{1,3}$' GROUP BY lpad(trim(client_code),3,'0') HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate normalized client codes require review before migration';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS clients_unique_normalized_code ON public.clients(lpad(trim(client_code),3,'0')) WHERE trim(client_code) ~ '^[0-9]{1,3}$';

CREATE OR REPLACE FUNCTION public.guard_client_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.trademark_records r WHERE r.client_id=OLD.id OR (trim(OLD.client_code) ~ '^[0-9]{1,3}$' AND lpad(trim(r.client_code),3,'0')=lpad(trim(OLD.client_code),3,'0'))) THEN RAISE EXCEPTION 'Client has cases; preserve its profile and relationships'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='INSERT' OR NEW.client_code IS DISTINCT FROM OLD.client_code THEN
    IF COALESCE(NEW.client_code,'') !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'Client code requires 1 to 3 digits'; END IF;
    IF TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM public.trademark_records r WHERE r.client_id=OLD.id OR lpad(trim(r.client_code),3,'0')=lpad(trim(OLD.client_code),3,'0')) THEN RAISE EXCEPTION 'Client code is in use; use a reviewed reassignment workflow'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_client_identity ON public.clients;
CREATE TRIGGER guard_client_identity BEFORE INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.guard_client_identity();

CREATE OR REPLACE FUNCTION public.guard_case_client_relationship()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id=NEW.client_id AND lpad(trim(c.client_code),3,'0')=lpad(trim(NEW.client_code),3,'0')) THEN RAISE EXCEPTION 'Case client ID and code do not identify the same client'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_case_client_relationship ON public.trademark_records;
CREATE TRIGGER guard_case_client_relationship BEFORE INSERT OR UPDATE OF client_id,client_code ON public.trademark_records FOR EACH ROW EXECUTE FUNCTION public.guard_case_client_relationship();
REVOKE ALL ON FUNCTION public.guard_client_identity(),public.guard_case_client_relationship() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_client_identity(),public.guard_case_client_relationship() TO service_role;

CREATE OR REPLACE FUNCTION public.import_client_csv(p_rows JSONB)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item JSONB; cols TEXT; bad TEXT; n INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Import requires 1 to 5000 clients'; END IF;
  SET LOCAL lock_timeout='5s';
  LOCK TABLE public.clients IN SHARE ROW EXCLUSIVE MODE;
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR item ? 'id' THEN RAISE EXCEPTION 'Invalid client import row'; END IF;
    SELECT string_agg(k.key,',') INTO bad FROM jsonb_object_keys(item) k(key) WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name='clients' AND c.column_name=k.key);
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'Unsupported client fields: %',bad; END IF;
    SELECT string_agg(format('%I',k.key),',' ORDER BY k.key) INTO cols FROM jsonb_object_keys(item) k(key);
    EXECUTE format('INSERT INTO public.clients (%s) SELECT %s FROM jsonb_populate_record(NULL::public.clients,$1)',cols,cols) USING item;
    n:=n+1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.import_client_csv(JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_client_csv(JSONB) TO service_role;
-- Existing codes/relationships are never rewritten or inferred. Revert callers/functions to roll back; retain rows.
