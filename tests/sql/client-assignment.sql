DO $$
DECLARE target_id BIGINT; first_id BIGINT; second_id BIGINT; changed INTEGER;
BEGIN
  INSERT INTO public.clients(client_code,name,company_name) VALUES('776','PG17 CLIENT','PG17 BUSINESS') RETURNING id INTO target_id;
  INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no)
    VALUES('PG17 ASSIGN 1','A','775','001') RETURNING id INTO first_id;
  INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no)
    VALUES('PG17 ASSIGN 2','A','775','002') RETURNING id INTO second_id;
  BEGIN
    PERFORM public.assign_cases_to_client(ARRAY[first_id,99999999],target_id);
    RAISE EXCEPTION 'Missing case assignment unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%no longer exists%' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.trademark_records WHERE id=first_id AND client_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Failed assignment changed a case';
  END IF;
  SELECT public.assign_cases_to_client(ARRAY[first_id,second_id],target_id) INTO changed;
  IF changed<>2 OR (SELECT count(*) FROM public.trademark_records
      WHERE id IN(first_id,second_id) AND client_id=target_id AND client_code='776'
        AND applicant_name='PG17 CLIENT' AND trading_as='PG17 BUSINESS')<>2
    OR (SELECT count(*) FROM public.trademark_history WHERE record_id IN(first_id,second_id))<>2 THEN
    RAISE EXCEPTION 'Client assignment did not persist all linked fields and history';
  END IF;
END;
$$;
