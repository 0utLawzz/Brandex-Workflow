-- Run after migrations inside BEGIN ... ROLLBACK in the disposable database only.
INSERT INTO public.clients(client_code,name) VALUES('995','CSV ROLLBACK TEST');
DO $$
DECLARE n integer; baseline bigint;
BEGIN
  SELECT count(*) INTO baseline FROM public.trademark_records;
  n:=public.import_case_csv('[{"row":{"selection_menu":"CSVTEST","client_code":"995","case_no":"001","mark_name":"TEST","status":"APPROVED","filing_process":"EXAMINATION"},"proof":{"url":"data:text/plain;base64,dGVzdA=="}}]');
  IF n<>1 THEN RAISE EXCEPTION 'count failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.trademark_records r JOIN public.trademark_documents d ON (d.id,d.record_id)=(r.dispatch_document_id,r.id) WHERE r.selection_menu='CSVTEST' AND r.client_code='995') THEN RAISE EXCEPTION 'CSV proof relationship missing'; END IF;
  BEGIN
    PERFORM public.import_case_csv('[{"row":{"selection_menu":"CSVTEST","client_code":"995","case_no":"002","mark_name":"FIRST"}},{"row":{"selection_menu":"CSVTEST","client_code":"994","case_no":"003","mark_name":"INVALID"}}]');
    RAISE EXCEPTION 'expected error missing';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='expected error missing' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.trademark_records)<>baseline+1 THEN RAISE EXCEPTION 'partial import escaped'; END IF;
END $$;
