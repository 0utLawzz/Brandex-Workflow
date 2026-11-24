CREATE OR REPLACE FUNCTION public.import_case_csv(p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  entry JSONB; payload JSONB; cols TEXT; bad TEXT;
  matched_clients INTEGER; target_client BIGINT; new_id BIGINT; imported INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Import requires 1 to 5000 cases'; END IF;
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE public.clients, public.trademark_records IN SHARE ROW EXCLUSIVE MODE;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    payload := entry->'row';
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object' OR payload ? 'id' THEN RAISE EXCEPTION 'Invalid import payload'; END IF;
    IF COALESCE(payload->>'selection_menu','') !~ '^[A-Z][A-Z0-9]{0,7}$' OR COALESCE(payload->>'client_code','') !~ '^[0-9]{1,3}$' OR COALESCE(payload->>'case_no','') !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'Invalid case identity'; END IF;
    SELECT count(*), min(c.id) INTO matched_clients,target_client FROM public.clients c
      WHERE lpad(c.client_code,3,'0') = lpad(payload->>'client_code',3,'0');
    IF matched_clients <> 1 THEN RAISE EXCEPTION 'Client code % is missing or ambiguous', payload->>'client_code'; END IF;
    IF payload->>'client_id' IS NOT NULL AND (payload->>'client_id')::bigint <> target_client THEN RAISE EXCEPTION 'Client ID conflicts with client code'; END IF;
    payload := jsonb_set(payload,'{client_id}',to_jsonb(target_client));
    IF EXISTS (SELECT 1 FROM public.trademark_records r WHERE upper(trim(r.selection_menu)) = payload->>'selection_menu'
      AND lpad(r.client_code,3,'0') = lpad(payload->>'client_code',3,'0') AND lpad(r.case_no,3,'0') = lpad(payload->>'case_no',3,'0')) THEN RAISE EXCEPTION 'Duplicate case reference'; END IF;
    SELECT string_agg(k.key,',') INTO bad FROM jsonb_object_keys(payload) k(key) WHERE NOT EXISTS
      (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name='trademark_records' AND c.column_name=k.key);
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'Unsupported fields: %',bad; END IF;
    SELECT string_agg(format('%I',k.key),',' ORDER BY k.key) INTO cols FROM jsonb_object_keys(payload) k(key);
    EXECUTE format('INSERT INTO public.trademark_records (%s) SELECT %s FROM jsonb_populate_record(NULL::public.trademark_records,$1) RETURNING id',cols,cols) INTO new_id USING payload;
    IF NULLIF(entry->'proof'->>'url','') IS NOT NULL THEN
      INSERT INTO public.trademark_documents(record_id,file_name,file_type,file_url)
        VALUES(new_id,COALESCE(NULLIF(entry->'proof'->>'name',''),'Dispatch proof'),entry->'proof'->>'type',entry->'proof'->>'url');
    END IF;
    INSERT INTO public.trademark_history(record_id,status,notes) VALUES(new_id,'RECORD_IMPORTED','Identity-safe CSV import');
    imported := imported+1;
  END LOOP;
  RETURN imported;
END;
$$;
REVOKE ALL ON FUNCTION public.import_case_csv(JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_case_csv(JSONB) TO service_role;
-- Rollback: revert callers and drop this function; retain all imported case data.
