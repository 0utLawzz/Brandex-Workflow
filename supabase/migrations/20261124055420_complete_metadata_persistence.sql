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
BEGIN
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Metadata updates must be an object'; END IF;
  SELECT string_agg(key,', ') INTO unsupported FROM jsonb_object_keys(p_updates) key WHERE key <> ALL(ARRAY[
    'client_id','serial_no','category','selection_menu','client_code','case_no','mark_name','trademark_no','class_no','class_desc','app_type','applicant_name','father_name','cnic','issue_date','expiry_date','trading_as','address','usage_year','consultant_name','consultant_addr','logo_url','filing_process','tracking_id','dispatched_date','dispatched_note','delivered_date','receiver_name','receipt_image','notes','dispatchedImage','dispatchedDocName','dispatchedDocType']);
  IF unsupported IS NOT NULL THEN RAISE EXCEPTION 'Unsupported metadata fields: %',unsupported; END IF;
  UPDATE public.trademark_records AS r
  SET client_id = CASE WHEN p_updates ? 'client_id' THEN (p_updates->>'client_id')::bigint ELSE r.client_id END,
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
