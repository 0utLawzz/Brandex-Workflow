-- Keep workflow status, proof reference, and history in one database transaction.
-- This migration is additive and is intentionally not applied by this PR.
CREATE OR REPLACE FUNCTION public.apply_case_workflow_transition(
  p_ids BIGINT[],
  p_new_status TEXT,
  p_audit_note TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_status TEXT := upper(trim(p_new_status));
  changed_count INTEGER;
  required_count INTEGER := COALESCE(cardinality(p_ids), 0);
  normalized_status TEXT;
BEGIN
  IF required_count = 0 THEN RAISE EXCEPTION 'At least one case is required'; END IF;
  IF target_status NOT IN ('APPROVED', 'REJECTED', 'DISPATCHED', 'DELIVERED') THEN
    RAISE EXCEPTION 'Unsupported workflow status: %', target_status;
  END IF;

  IF target_status = 'DISPATCHED' AND (
    nullif(trim(COALESCE(p_meta->>'dispatchedDate', '')), '') IS NULL OR
    nullif(trim(COALESCE(p_meta->>'trackingId', p_meta->>'dispatchedNote', '')), '') IS NULL OR
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
        tracking_id = CASE WHEN p_meta ? 'trackingId' THEN p_meta->>'trackingId' ELSE r.tracking_id END,
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
  SELECT count(*) INTO changed_count FROM changed;

  IF changed_count <> required_count THEN
    RAISE EXCEPTION 'One or more cases changed state concurrently or are not eligible';
  END IF;

  IF target_status = 'DISPATCHED' THEN
    INSERT INTO public.trademark_documents (record_id, file_name, file_type, file_url, created_at)
    SELECT id,
      COALESCE(NULLIF(p_meta->>'dispatchedDocName', ''), 'Dispatch_Receipt_' || id::TEXT),
      COALESCE(NULLIF(p_meta->>'dispatchedDocType', ''), CASE WHEN p_meta->>'dispatchedImage' LIKE 'data:application/pdf%' THEN 'application/pdf' ELSE 'image/jpeg' END),
      p_meta->>'dispatchedImage', now()
    FROM unnest(p_ids) AS ids(id);
  END IF;

  INSERT INTO public.trademark_history (record_id, status, notes, created_at)
  SELECT id, target_status, COALESCE(p_audit_note, 'Workflow stage updated to ' || target_status), now()
  FROM unnest(p_ids) AS ids(id);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_workflow_transition(BIGINT[], TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_case_workflow_transition(BIGINT[], TEXT, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_case_metadata_update(
  p_id BIGINT,
  p_updates JSONB,
  p_audit_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_id BIGINT;
BEGIN
  UPDATE public.trademark_records AS r
  SET selection_menu = CASE WHEN p_updates ? 'selection_menu' THEN p_updates->>'selection_menu' ELSE r.selection_menu END,
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
    );
  END IF;

  INSERT INTO public.trademark_history (record_id, status, notes, created_at)
  VALUES (p_id, 'RECORD UPDATED', COALESCE(p_audit_note, 'Case metadata edited'), now());
END;
$$;

REVOKE ALL ON FUNCTION public.apply_case_metadata_update(BIGINT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_case_metadata_update(BIGINT, JSONB, TEXT) TO service_role;
