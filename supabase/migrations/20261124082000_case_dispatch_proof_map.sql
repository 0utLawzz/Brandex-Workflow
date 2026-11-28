-- Save per-case Drive proof references with one atomic workflow transition.
CREATE FUNCTION public.apply_case_dispatch_with_proofs(p_ids BIGINT[],p_audit_note TEXT,p_meta JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE id_value BIGINT; proof JSONB; changed_count INTEGER;
BEGIN
  IF p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 10
    OR (SELECT count(DISTINCT id) FROM unnest(p_ids) AS item(id)) <> cardinality(p_ids)
    OR jsonb_typeof(p_meta->'proofByCase') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(p_meta->'proofByCase')) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'Choose 1 to 10 distinct cases with individual Drive proofs';
  END IF;
  PERFORM id FROM public.trademark_records WHERE id=ANY(p_ids) ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.trademark_records WHERE id=ANY(p_ids) AND upper(trim(status))='APPROVED') <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'Every selected case must be APPROVED before dispatch';
  END IF;
  FOREACH id_value IN ARRAY p_ids LOOP
    proof := p_meta->'proofByCase'->(id_value::text);
    IF jsonb_typeof(proof) IS DISTINCT FROM 'object'
      OR nullif(trim(proof->>'dispatchedImage'),'') IS NULL
      OR nullif(trim(proof->>'dispatchedDocName'),'') IS NULL
      OR proof->>'dispatchedDocType' NOT IN ('application/pdf','image/png','image/jpeg') THEN
      RAISE EXCEPTION 'A case Drive proof is missing or invalid';
    END IF;
  END LOOP;
  -- The established guarded transition owns status, audit, and document creation.
  -- Give it the first validated proof, then replace every new pointer below.
  PERFORM public.apply_case_workflow_transition(
    p_ids,
    'DISPATCHED',
    p_audit_note,
    jsonb_set(
      jsonb_set(
        jsonb_set(p_meta - 'proofByCase', '{dispatchedImage}', to_jsonb(p_meta->'proofByCase'->(p_ids[1]::text)->>'dispatchedImage')),
        '{dispatchedDocName}', to_jsonb(p_meta->'proofByCase'->(p_ids[1]::text)->>'dispatchedDocName')
      ),
      '{dispatchedDocType}', to_jsonb(p_meta->'proofByCase'->(p_ids[1]::text)->>'dispatchedDocType')
    )
  );
  UPDATE public.trademark_documents d SET
    file_url=p_meta->'proofByCase'->(r.id::text)->>'dispatchedImage',
    file_name=p_meta->'proofByCase'->(r.id::text)->>'dispatchedDocName',
    file_type=p_meta->'proofByCase'->(r.id::text)->>'dispatchedDocType'
  FROM public.trademark_records r
  WHERE r.id=ANY(p_ids) AND d.id=r.dispatch_document_id AND d.record_id=r.id;
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count<>cardinality(p_ids) THEN RAISE EXCEPTION 'Per-case proof linkage was incomplete'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_case_dispatch_with_proofs(BIGINT[],TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_case_dispatch_with_proofs(BIGINT[],TEXT,JSONB) TO service_role;
