DO $test$
DECLARE
  snapshot jsonb := '{"clients":[{"id":910001,"client_code":"997","name":"RECOVERY ROLLBACK FIXTURE"}],"records":[{"id":920001,"selection_menu":"RESTEST","client_code":"997","case_no":"999","mark_name":"RECOVERY ROLLBACK FIXTURE","client_id":910001}],"history":[{"id":930001,"record_id":920001,"status":"IN REVIEW","notes":"test"}],"documents":[{"id":940001,"record_id":920001,"file_name":"fixture","file_url":"data:text/plain;base64,dGVzdA=="}]}'::jsonb;
  report jsonb;
  retry jsonb;
  case_id bigint;
  clients_before bigint;
BEGIN
  SELECT count(*) INTO clients_before FROM public.clients;
  report := public.restore_recovery_snapshot(snapshot);
  case_id := (report->'caseIdMap'->>'920001')::bigint;
  IF (SELECT count(*) FROM public.trademark_history WHERE record_id=case_id) <> 1 OR
     (SELECT count(*) FROM public.trademark_documents WHERE record_id=case_id) <> 1 THEN RAISE EXCEPTION 'child map failed'; END IF;
  IF (SELECT client_id FROM public.trademark_records WHERE id=case_id) <> (report->'clientIdMap'->>'910001')::bigint THEN RAISE EXCEPTION 'client map failed'; END IF;
  retry := public.restore_recovery_snapshot(snapshot);
  IF NOT (retry->>'alreadyRestored')::boolean OR (SELECT count(*) FROM public.clients) <> clients_before+1 THEN RAISE EXCEPTION 'retry duplicated rows'; END IF;
  BEGIN
    PERFORM public.restore_recovery_snapshot('{"clients":[{"id":1,"client_code":"996","name":"FAIL LATE"}],"records":[{"id":2,"selection_menu":"RESTEST","client_code":"996","case_no":"999","mark_name":"FAIL LATE","client_id":1}],"history":[{"id":3,"record_id":9999,"status":"BAD"}],"documents":[]}'::jsonb);
    RAISE EXCEPTION 'expected failure missing';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected failure missing' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.clients WHERE client_code='996') THEN RAISE EXCEPTION 'partial failure committed'; END IF;
  RAISE NOTICE 'Recovery mapping, retry and late-failure rollback passed';
END $test$;
SELECT 'mapping_retry_rollback_passed' AS result;
