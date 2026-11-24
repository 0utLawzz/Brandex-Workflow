-- Explicit current proof pointer. Historical documents remain unchanged; no filename-based backfill.
ALTER TABLE public.trademark_records ADD COLUMN dispatch_document_id BIGINT;
ALTER TABLE public.trademark_documents ADD CONSTRAINT uq_document_case_identity UNIQUE(id,record_id);
ALTER TABLE public.trademark_records ADD CONSTRAINT fk_case_dispatch_document
  FOREIGN KEY(dispatch_document_id,id) REFERENCES public.trademark_documents(id,record_id)
  DEFERRABLE INITIALLY DEFERRED;



CREATE OR REPLACE FUNCTION public.apply_case_metadata_update(
  p_id BIGINT,
  p_updates JSONB,
  p_audit_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  updated_id BIGINT;
  unsupported TEXT;
  proof_id BIGINT;
BEGIN
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Metadata updates must be an object'; END IF;
  SELECT string_agg(key,', ') INTO unsupported FROM jsonb_object_keys(p_updates) key WHERE key <> ALL(ARRAY[
    'client_id','serial_no','category','selection_menu','client_code','case_no','mark_name','trademark_no','class_no','class_desc','app_type','applicant_name','father_name','cnic','issue_date','expiry_date','filing_date','dispatch_document_id','trading_as','address','usage_year','consultant_name','consultant_addr','logo_url','filing_process','tracking_id','dispatched_date','dispatched_note','delivered_date','receiver_name','receipt_image','notes','dispatchedImage','dispatchedDocName','dispatchedDocType']);
  IF unsupported IS NOT NULL THEN RAISE EXCEPTION 'Unsupported metadata fields: %',unsupported; END IF;
  IF p_updates->>'dispatch_document_id' IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.trademark_documents WHERE id=(p_updates->>'dispatch_document_id')::bigint AND record_id=p_id
  ) THEN RAISE EXCEPTION 'Dispatch proof must belong to this case'; END IF;
  UPDATE public.trademark_records AS r
  SET client_id = CASE WHEN p_updates ? 'client_id' THEN (p_updates->>'client_id')::bigint ELSE r.client_id END,
      dispatch_document_id = CASE WHEN p_updates ? 'dispatch_document_id' THEN (p_updates->>'dispatch_document_id')::bigint
        WHEN p_updates ? 'dispatchedImage' AND NULLIF(trim(COALESCE(p_updates->>'dispatchedImage','')),'') IS NULL THEN NULL ELSE r.dispatch_document_id END,
      serial_no = CASE WHEN p_updates ? 'serial_no' THEN p_updates->>'serial_no' ELSE r.serial_no END,
      category = CASE WHEN p_updates ? 'category' THEN p_updates->>'category' ELSE r.category END,
      selection_menu = CASE WHEN p_updates ? 'selection_menu' THEN p_updates->>'selection_menu' ELSE r.selection_menu END,
      client_code = CASE WHEN p_updates ? 'client_code' THEN p_updates->>'client_code' ELSE r.client_code END,
      case_no = CASE WHEN p_updates ? 'case_no' THEN p_updates->>'case_no' ELSE r.case_no END,
      mark_name = CASE WHEN p_updates ? 'mark_name' THEN p_updates->>'mark_name' ELSE r.mark_name END,
      trademark_no = CASE WHEN p_updates ? 'trademark_no' THEN p_updates->>'trademark_no' ELSE r.trademark_no END,
      class_no = CASE WHEN p_updates ? 'class_no' THEN p_updates->>'class_no' ELSE r.class_no END,
      class_desc = CASE WHEN p_updates ? 'class_desc' THEN p_updates->>'class_desc' ELSE r.class_desc END,
      app_type = CASE WHEN p_updates ? 'app_type' THEN p_updates->>'app_type' ELSE r.app_type END,
      applicant_name = CASE WHEN p_updates ? 'applicant_name' THEN p_updates->>'applicant_name' ELSE r.applicant_name END,
      father_name = CASE WHEN p_updates ? 'father_name' THEN p_updates->>'father_name' ELSE r.father_name END,
      cnic = CASE WHEN p_updates ? 'cnic' THEN p_updates->>'cnic' ELSE r.cnic END,
      issue_date = CASE WHEN p_updates ? 'issue_date' THEN p_updates->>'issue_date' ELSE r.issue_date END,
      expiry_date = CASE WHEN p_updates ? 'expiry_date' THEN p_updates->>'expiry_date' ELSE r.expiry_date END,
      filing_date = CASE WHEN p_updates ? 'filing_date' THEN NULLIF(p_updates->>'filing_date','')::date ELSE r.filing_date END,
      trading_as = CASE WHEN p_updates ? 'trading_as' THEN p_updates->>'trading_as' ELSE r.trading_as END,
      address = CASE WHEN p_updates ? 'address' THEN p_updates->>'address' ELSE r.address END,
      usage_year = CASE WHEN p_updates ? 'usage_year' THEN p_updates->>'usage_year' ELSE r.usage_year END,
      consultant_name = CASE WHEN p_updates ? 'consultant_name' THEN p_updates->>'consultant_name' ELSE r.consultant_name END,
      consultant_addr = CASE WHEN p_updates ? 'consultant_addr' THEN p_updates->>'consultant_addr' ELSE r.consultant_addr END,
      logo_url = CASE WHEN p_updates ? 'logo_url' THEN p_updates->>'logo_url' ELSE r.logo_url END,
      filing_process = CASE WHEN p_updates ? 'filing_process' THEN p_updates->>'filing_process' ELSE r.filing_process END,
      tracking_id = CASE WHEN p_updates ? 'tracking_id' THEN p_updates->>'tracking_id' ELSE r.tracking_id END,
      dispatched_date = CASE WHEN p_updates ? 'dispatched_date' THEN p_updates->>'dispatched_date' ELSE r.dispatched_date END,
      dispatched_note = CASE WHEN p_updates ? 'dispatched_note' THEN p_updates->>'dispatched_note' ELSE r.dispatched_note END,
      delivered_date = CASE WHEN p_updates ? 'delivered_date' THEN p_updates->>'delivered_date' ELSE r.delivered_date END,
      receiver_name = CASE WHEN p_updates ? 'receiver_name' THEN p_updates->>'receiver_name' ELSE r.receiver_name END,
      receipt_image = CASE WHEN p_updates ? 'receipt_image' THEN p_updates->>'receipt_image' ELSE r.receipt_image END,
      notes = CASE WHEN p_updates ? 'notes' THEN p_updates->>'notes' ELSE r.notes END,
      updated_at = now()
  WHERE r.id = p_id
  RETURNING r.id INTO updated_id;

  IF updated_id IS NULL THEN RAISE EXCEPTION 'Case was not found'; END IF;

  IF nullif(trim(COALESCE(p_updates->>'dispatchedImage', '')), '') IS NOT NULL THEN
    INSERT INTO public.trademark_documents (record_id, file_name, file_type, file_url, created_at)
    VALUES (
      p_id,
      COALESCE(NULLIF(p_updates->>'dispatchedDocName', ''), 'Dispatch_Receipt_' || p_id::TEXT),
      COALESCE(NULLIF(p_updates->>'dispatchedDocType', ''), CASE WHEN p_updates->>'dispatchedImage' LIKE 'data:application/pdf%' THEN 'application/pdf' ELSE 'image/jpeg' END),
      p_updates->>'dispatchedImage', now()
    ) RETURNING id INTO proof_id;
    UPDATE public.trademark_records SET dispatch_document_id=proof_id WHERE id=p_id;
  END IF;

  INSERT INTO public.trademark_history (record_id, status, notes, created_at)
  VALUES (p_id, 'RECORD UPDATED', COALESCE(p_audit_note, 'Case metadata edited'), now());
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_metadata_update(BIGINT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_case_metadata_update(BIGINT, JSONB, TEXT) TO service_role;

-- Rollback: revert application first; retain filing_date and its values. Restore the preceding metadata function only after removing its new caller.

CREATE OR REPLACE FUNCTION public.apply_case_workflow_transition(
  p_ids BIGINT[],
  p_new_status TEXT,
  p_audit_note TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_status TEXT := upper(trim(p_new_status));
  changed_count INTEGER;
  required_count INTEGER := COALESCE(cardinality(p_ids), 0);
  already_count INTEGER;
  found_count INTEGER;
  changed_ids BIGINT[];
BEGIN
  IF required_count = 0 THEN RAISE EXCEPTION 'At least one case is required'; END IF;
  IF target_status NOT IN ('APPROVED', 'REJECTED', 'DISPATCHED', 'DELIVERED') THEN
    RAISE EXCEPTION 'Unsupported workflow status: %', target_status;
  END IF;

  IF required_count <> (SELECT count(DISTINCT id) FROM unnest(p_ids) id) THEN RAISE EXCEPTION 'Duplicate selected case IDs'; END IF;
  PERFORM id FROM public.trademark_records WHERE id=ANY(p_ids) ORDER BY id FOR UPDATE;
  SELECT count(*), count(*) FILTER (WHERE upper(trim(status))=target_status) INTO found_count,already_count FROM public.trademark_records WHERE id=ANY(p_ids);
  IF found_count <> required_count THEN RAISE EXCEPTION 'Selected case was not found'; END IF;
  IF already_count=required_count THEN RETURN; END IF;

  IF target_status = 'DISPATCHED' AND (
    nullif(trim(COALESCE(p_meta->>'dispatchedDate', '')), '') IS NULL OR
    COALESCE(NULLIF(trim(p_meta->>'trackingId'), ''), NULLIF(trim(p_meta->>'dispatchedNote'), '')) IS NULL OR
    nullif(trim(COALESCE(p_meta->>'dispatchedImage', '')), '') IS NULL
  ) THEN RAISE EXCEPTION 'Dispatch date, tracking/note, and proof are required'; END IF;

  IF target_status = 'DELIVERED' AND (
    nullif(trim(COALESCE(p_meta->>'deliveredDate', '')), '') IS NULL OR
    nullif(trim(COALESCE(p_meta->>'receiverName', '')), '') IS NULL OR
    nullif(trim(COALESCE(p_meta->>'receiptImage', '')), '') IS NULL
  ) THEN RAISE EXCEPTION 'Delivery date, receiver, and receipt are required'; END IF;

  WITH changed AS (
    UPDATE public.trademark_records AS r
    SET status = target_status,
        tracking_id = CASE WHEN p_meta ? 'trackingId' OR p_meta ? 'dispatchedNote'
          THEN COALESCE(NULLIF(trim(p_meta->>'trackingId'), ''), NULLIF(trim(p_meta->>'dispatchedNote'), ''))
          ELSE r.tracking_id END,
        dispatched_date = CASE WHEN p_meta ? 'dispatchedDate' THEN p_meta->>'dispatchedDate' ELSE r.dispatched_date END,
        dispatched_note = CASE WHEN p_meta ? 'dispatchedNote' THEN p_meta->>'dispatchedNote' ELSE r.dispatched_note END,
        delivered_date = CASE WHEN p_meta ? 'deliveredDate' THEN p_meta->>'deliveredDate' ELSE r.delivered_date END,
        receiver_name = CASE WHEN p_meta ? 'receiverName' THEN p_meta->>'receiverName' ELSE r.receiver_name END,
        receipt_image = CASE WHEN p_meta ? 'receiptImage' THEN p_meta->>'receiptImage' ELSE r.receipt_image END,
        updated_at = now()
    WHERE r.id = ANY(p_ids)
      AND CASE target_status
        WHEN 'APPROVED' THEN upper(regexp_replace(trim(COALESCE(r.status, '')), '[_-]+', ' ', 'g')) IN ('PENDING', 'IN REVIEW', 'PENDING / IN REVIEW', 'PENDING IN REVIEW')
        WHEN 'REJECTED' THEN upper(regexp_replace(trim(COALESCE(r.status, '')), '[_-]+', ' ', 'g')) IN ('PENDING', 'IN REVIEW', 'PENDING / IN REVIEW', 'PENDING IN REVIEW')
        WHEN 'DISPATCHED' THEN upper(trim(COALESCE(r.status, ''))) = 'APPROVED'
        WHEN 'DELIVERED' THEN upper(trim(COALESCE(r.status, ''))) = 'DISPATCHED'
        ELSE false
      END
    RETURNING r.id
  )
  SELECT count(*), array_agg(id) INTO changed_count,changed_ids FROM changed;

  IF changed_count <> required_count - already_count THEN
    RAISE EXCEPTION 'One or more cases changed state concurrently or are not eligible';
  END IF;

  IF target_status = 'DISPATCHED' THEN
    WITH proof AS (INSERT INTO public.trademark_documents (record_id, file_name, file_type, file_url, created_at)
    SELECT id,
      COALESCE(NULLIF(p_meta->>'dispatchedDocName', ''), 'Dispatch_Receipt_' || id::TEXT),
      COALESCE(NULLIF(p_meta->>'dispatchedDocType', ''), CASE WHEN p_meta->>'dispatchedImage' LIKE 'data:application/pdf%' THEN 'application/pdf' ELSE 'image/jpeg' END),
      p_meta->>'dispatchedImage', now()
    FROM unnest(changed_ids) AS ids(id) RETURNING id,record_id)
    UPDATE public.trademark_records r SET dispatch_document_id=proof.id FROM proof WHERE r.id=proof.record_id;
  END IF;

  INSERT INTO public.trademark_history (record_id, status, notes, created_at)
  SELECT id, target_status, COALESCE(p_audit_note, 'Workflow stage updated to ' || target_status), now()
  FROM unnest(changed_ids) AS ids(id);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_workflow_transition(BIGINT[], TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_case_workflow_transition(BIGINT[], TEXT, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.import_case_csv(p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  entry JSONB; payload JSONB; cols TEXT; bad TEXT;
  matched_clients INTEGER; target_client BIGINT; new_id BIGINT; proof_id BIGINT; imported INTEGER := 0;
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
        VALUES(new_id,COALESCE(NULLIF(entry->'proof'->>'name',''),'Dispatch proof'),entry->'proof'->>'type',entry->'proof'->>'url') RETURNING id INTO proof_id;
      UPDATE public.trademark_records SET dispatch_document_id=proof_id WHERE id=new_id;
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

CREATE OR REPLACE FUNCTION public.restore_recovery_rows(p_snapshot JSONB)
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
  row_ids JSONB := '{}'::jsonb;
  fingerprints JSONB := '{}'::jsonb;
  document_map JSONB := '{}'::jsonb;
  ids JSONB;
  fingerprint TEXT;
BEGIN
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN RAISE EXCEPTION 'Invalid recovery snapshot'; END IF;
  -- Serialize restores and ordinary writes while identities are checked and inserted.
  LOCK TABLE public.clients, public.trademark_records, public.trademark_history,
    public.trademark_documents IN SHARE ROW EXCLUSIVE MODE;
  SELECT r.report INTO prior FROM public.recovery_runs r WHERE r.package_hash = v_package_hash;
  IF prior IS NOT NULL THEN
    IF NOT prior ? 'restoredIds' OR NOT prior ? 'fingerprints' THEN RAISE EXCEPTION 'Recovery report predates content integrity checks; review the target before retrying'; END IF;
    FOREACH collection IN ARRAY ARRAY['clients','records','history','documents'] LOOP
      target_table := CASE collection WHEN 'clients' THEN 'clients' WHEN 'records' THEN 'trademark_records'
        WHEN 'history' THEN 'trademark_history' ELSE 'trademark_documents' END;
      fingerprint := public.recovery_rows_fingerprint(target_table,prior->'restoredIds'->collection);
      IF fingerprint IS DISTINCT FROM prior->'fingerprints'->>collection THEN
        RAISE EXCEPTION 'Previously restored rows are missing or changed in %. Review recovery state before retrying',collection;
      END IF;
    END LOOP;
    RETURN (prior - 'restoredIds' - 'fingerprints') || jsonb_build_object('alreadyRestored',true);
  END IF;
  preserve_ids := NOT EXISTS(SELECT 1 FROM public.clients) AND NOT EXISTS(SELECT 1 FROM public.trademark_records)
    AND NOT EXISTS(SELECT 1 FROM public.trademark_history) AND NOT EXISTS(SELECT 1 FROM public.trademark_documents);
  FOREACH collection IN ARRAY ARRAY['clients', 'records', 'history', 'documents'] LOOP
    IF jsonb_typeof(p_snapshot->collection) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Missing recovery collection: %', collection; END IF;
    target_table := CASE collection WHEN 'clients' THEN 'clients' WHEN 'records' THEN 'trademark_records'
      WHEN 'history' THEN 'trademark_history' ELSE 'trademark_documents' END;
    seen := '{}'::jsonb;
    inserted_count := 0;
    ids := '[]'::jsonb;
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
      ids := ids || to_jsonb(destination_id);
      IF collection = 'clients' THEN client_map := client_map || jsonb_build_object(source_id::text, destination_id);
      ELSIF collection = 'records' THEN case_map := case_map || jsonb_build_object(source_id::text, destination_id);
      ELSIF collection = 'documents' THEN document_map := document_map || jsonb_build_object(source_id::text,destination_id); END IF;
      inserted_count := inserted_count + 1;
    END LOOP;
    IF preserve_ids AND inserted_count > 0 THEN
      sequence_name := pg_get_serial_sequence('public.' || target_table,'id');
      EXECUTE format('SELECT max(id) FROM public.%I',target_table) INTO highest_id;
      PERFORM setval(sequence_name::regclass,greatest(highest_id,COALESCE(pg_sequence_last_value(sequence_name::regclass),1)),true);
    END IF;
    row_ids := row_ids || jsonb_build_object(collection,ids);
    result := result || jsonb_build_object(collection, inserted_count);
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(p_snapshot->'records') LOOP
    IF item->>'dispatch_document_id' IS NOT NULL THEN
      destination_id := (case_map->>(item->>'id'))::bigint;
      source_id := (document_map->>(item->>'dispatch_document_id'))::bigint;
      IF source_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.trademark_documents WHERE id=source_id AND record_id=destination_id) THEN
        RAISE EXCEPTION 'Unresolved or mismatched dispatch proof relationship';
      END IF;
      UPDATE public.trademark_records SET dispatch_document_id=source_id WHERE id=destination_id;
    END IF;
  END LOOP;
  FOREACH collection IN ARRAY ARRAY['clients','records','history','documents'] LOOP
    target_table := CASE collection WHEN 'clients' THEN 'clients' WHEN 'records' THEN 'trademark_records'
      WHEN 'history' THEN 'trademark_history' ELSE 'trademark_documents' END;
    fingerprints := fingerprints || jsonb_build_object(collection,public.recovery_rows_fingerprint(target_table,row_ids->collection));
  END LOOP;
  result := result || jsonb_build_object('restoredIds',row_ids,'fingerprints',fingerprints);
  result := result || jsonb_build_object('clientIdMap', client_map, 'caseIdMap', case_map, 'originalIdsPreserved',preserve_ids,'alreadyRestored', false, 'packageHash', v_package_hash);
  INSERT INTO public.recovery_runs(package_hash, report) VALUES (v_package_hash, result);
  RETURN result - 'restoredIds' - 'fingerprints';
END;
$$;
REVOKE ALL ON FUNCTION public.restore_recovery_rows(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_recovery_rows(JSONB) TO service_role;

-- Rollback application/functions first; retain the pointer and proof/history rows. Do not infer or delete historical evidence.
