-- Dispatch proof is optional; preserve the guarded atomic workflow and persist proof only when supplied.
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
    COALESCE(NULLIF(trim(p_meta->>'trackingId'), ''), NULLIF(trim(p_meta->>'dispatchedNote'), '')) IS NULL
  ) THEN RAISE EXCEPTION 'Dispatch date and tracking/note are required'; END IF;

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

  IF target_status = 'DISPATCHED' AND nullif(trim(COALESCE(p_meta->>'dispatchedImage', '')), '') IS NOT NULL THEN
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

-- Rollback: restore the previous required-proof function from 20261124064951_dispatch_document_relationship.sql.
