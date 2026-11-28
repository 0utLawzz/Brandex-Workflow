-- Additive recovery ledger. Rollback the application/function, retain this audit data.
CREATE TABLE IF NOT EXISTS public.recovery_runs (
  package_hash TEXT PRIMARY KEY,
  report JSONB NOT NULL,
  restored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recovery_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recovery_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.recovery_runs TO service_role;
GRANT USAGE,SELECT,UPDATE ON SEQUENCE public.clients_id_seq,public.trademark_records_id_seq,public.trademark_history_id_seq,public.trademark_documents_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.restore_recovery_snapshot(p_snapshot JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_package_hash TEXT := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  prior JSONB;
  result JSONB := '{}'::jsonb;
  client_map JSONB := '{}'::jsonb;
  case_map JSONB := '{}'::jsonb;
  collection TEXT;
  target_table TEXT;
  item JSONB;
  payload JSONB;
  source_id BIGINT;
  destination_id BIGINT;
  parent_id TEXT;
  columns_sql TEXT;
  unsupported TEXT;
  seen JSONB;
  inserted_count INTEGER;
  preserve_ids BOOLEAN;
  sequence_name TEXT;
  highest_id BIGINT;
BEGIN
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN RAISE EXCEPTION 'Invalid recovery snapshot'; END IF;
  -- Serialize restores and ordinary writes while identities are checked and inserted.
  LOCK TABLE public.clients, public.trademark_records, public.trademark_history,
    public.trademark_documents IN SHARE ROW EXCLUSIVE MODE;
  SELECT r.report INTO prior FROM public.recovery_runs r WHERE r.package_hash = v_package_hash;
  IF prior IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM jsonb_each_text(prior->'caseIdMap') m WHERE NOT EXISTS (SELECT 1 FROM public.trademark_records r WHERE r.id=m.value::bigint))
      OR EXISTS (SELECT 1 FROM jsonb_each_text(prior->'clientIdMap') m WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id=m.value::bigint)) THEN
      RAISE EXCEPTION 'Previously restored rows are missing. Review recovery state before retrying';
    END IF;
    RETURN prior || jsonb_build_object('alreadyRestored', true);
  END IF;
  preserve_ids := NOT EXISTS(SELECT 1 FROM public.clients) AND NOT EXISTS(SELECT 1 FROM public.trademark_records)
    AND NOT EXISTS(SELECT 1 FROM public.trademark_history) AND NOT EXISTS(SELECT 1 FROM public.trademark_documents);
  FOREACH collection IN ARRAY ARRAY['clients', 'records', 'history', 'documents'] LOOP
    IF jsonb_typeof(p_snapshot->collection) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Missing recovery collection: %', collection; END IF;
    target_table := CASE collection WHEN 'clients' THEN 'clients' WHEN 'records' THEN 'trademark_records'
      WHEN 'history' THEN 'trademark_history' ELSE 'trademark_documents' END;
    seen := '{}'::jsonb;
    inserted_count := 0;
    FOR item IN SELECT value FROM jsonb_array_elements(p_snapshot->collection) LOOP
      source_id := (item->>'id')::bigint;
      IF source_id IS NULL OR source_id <= 0 OR seen ? source_id::text THEN RAISE EXCEPTION 'Invalid or duplicate % ID', collection; END IF;
      seen := seen || jsonb_build_object(source_id::text, true);
      payload := item - 'id';
      IF preserve_ids THEN payload := payload || jsonb_build_object('id',source_id); END IF;
      IF collection = 'clients' THEN
        IF COALESCE(payload->>'client_code','') !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'Missing client identity'; END IF;
        IF EXISTS (SELECT 1 FROM public.clients c WHERE lpad(c.client_code,3,'0') = lpad(payload->>'client_code',3,'0')) THEN
          RAISE EXCEPTION 'Existing client code %. Review and reconcile before restore', payload->>'client_code';
        END IF;
      ELSIF collection = 'records' THEN
        IF COALESCE(payload->>'selection_menu','') !~ '^[A-Za-z][A-Za-z0-9]{0,7}$'
          OR COALESCE(payload->>'client_code','') !~ '^[0-9]{1,3}$'
          OR COALESCE(payload->>'case_no','') !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'Missing case identity'; END IF;
        IF EXISTS (SELECT 1 FROM public.trademark_records r WHERE upper(trim(r.selection_menu)) = upper(trim(payload->>'selection_menu'))
          AND lpad(r.client_code,3,'0') = lpad(payload->>'client_code',3,'0') AND lpad(r.case_no,3,'0') = lpad(payload->>'case_no',3,'0')) THEN
          RAISE EXCEPTION 'Existing case reference. Review and reconcile before restore';
        END IF;
        parent_id := payload->>'client_id';
        IF parent_id IS NOT NULL THEN
          IF NOT client_map ? parent_id THEN RAISE EXCEPTION 'Unresolved client relationship'; END IF;
          payload := jsonb_set(payload, '{client_id}', client_map->parent_id);
        END IF;
      ELSE
        parent_id := payload->>'record_id';
        IF parent_id IS NULL OR NOT case_map ? parent_id THEN RAISE EXCEPTION 'Unresolved child case relationship'; END IF;
        payload := jsonb_set(payload, '{record_id}', case_map->parent_id);
      END IF;
      SELECT string_agg(k.key, ', ') INTO unsupported FROM jsonb_object_keys(payload) AS k(key)
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = target_table AND c.column_name = k.key);
      IF unsupported IS NOT NULL THEN RAISE EXCEPTION 'Unsupported % fields: %', collection, unsupported; END IF;
      SELECT string_agg(format('%I', k.key), ', ' ORDER BY k.key) INTO columns_sql FROM jsonb_object_keys(payload) AS k(key);
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) RETURNING id', target_table, columns_sql, columns_sql, target_table)
        INTO destination_id USING payload;
      IF collection = 'clients' THEN client_map := client_map || jsonb_build_object(source_id::text, destination_id);
      ELSIF collection = 'records' THEN case_map := case_map || jsonb_build_object(source_id::text, destination_id); END IF;
      inserted_count := inserted_count + 1;
    END LOOP;
    IF preserve_ids AND inserted_count > 0 THEN
      sequence_name := pg_get_serial_sequence('public.' || target_table,'id');
      EXECUTE format('SELECT max(id) FROM public.%I',target_table) INTO highest_id;
      PERFORM setval(sequence_name::regclass,greatest(highest_id,COALESCE(pg_sequence_last_value(sequence_name::regclass),1)),true);
    END IF;
    result := result || jsonb_build_object(collection, inserted_count);
  END LOOP;
  result := result || jsonb_build_object('clientIdMap', client_map, 'caseIdMap', case_map, 'originalIdsPreserved',preserve_ids,'alreadyRestored', false, 'packageHash', v_package_hash);
  INSERT INTO public.recovery_runs(package_hash, report) VALUES (v_package_hash, result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_recovery_snapshot(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_recovery_snapshot(JSONB) TO service_role;
