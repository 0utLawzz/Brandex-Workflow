-- Reassign every selected case and its client relationship in one transaction.
CREATE FUNCTION public.assign_cases_to_client(p_ids BIGINT[], p_client_id BIGINT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE selected_client public.clients%ROWTYPE; selected_count INTEGER; changed_count INTEGER;
BEGIN
  IF p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 500 OR p_client_id IS NULL OR p_client_id < 1
    OR EXISTS (SELECT 1 FROM unnest(p_ids) AS item(id) WHERE id IS NULL OR id < 1)
    OR (SELECT count(DISTINCT id) FROM unnest(p_ids) AS item(id)) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'Choose distinct saved cases and one saved client';
  END IF;
  SELECT * INTO selected_client FROM public.clients WHERE id=p_client_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selected client no longer exists'; END IF;
  SELECT count(*) INTO selected_count FROM (SELECT id FROM public.trademark_records WHERE id=ANY(p_ids) FOR UPDATE) locked;
  IF selected_count <> cardinality(p_ids) THEN RAISE EXCEPTION 'A selected case no longer exists; nothing was changed'; END IF;
  WITH changed AS (
    UPDATE public.trademark_records r SET
      client_id=selected_client.id, client_code=selected_client.client_code,
      applicant_name=selected_client.name, trading_as=selected_client.company_name,
      father_name=selected_client.father_name, cnic=selected_client.cnic,
      address=selected_client.address, consultant_name=selected_client.consultant_name,
      updated_at=now()
    WHERE r.id=ANY(p_ids) RETURNING r.id,r.status
  ), logged AS (
    INSERT INTO public.trademark_history(record_id,status,notes,created_at)
    SELECT id,status,'Client assigned: ' || selected_client.client_code,now() FROM changed RETURNING id
  ) SELECT count(*) INTO changed_count FROM logged;
  IF changed_count <> cardinality(p_ids) THEN RAISE EXCEPTION 'Client assignment was incomplete'; END IF;
  RETURN changed_count;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_cases_to_client(BIGINT[],BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_cases_to_client(BIGINT[],BIGINT) TO service_role;
