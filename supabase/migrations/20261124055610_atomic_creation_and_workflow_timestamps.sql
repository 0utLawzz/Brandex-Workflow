ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS in_review_at TIMESTAMPTZ;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.capture_workflow_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE upper(trim(NEW.status))
      WHEN 'IN REVIEW' THEN NEW.in_review_at := statement_timestamp();
      WHEN 'APPROVED' THEN NEW.approved_at := statement_timestamp();
      WHEN 'REJECTED' THEN NEW.rejected_at := statement_timestamp();
      WHEN 'DISPATCHED' THEN NEW.dispatched_at := statement_timestamp();
      WHEN 'DELIVERED' THEN NEW.delivered_at := statement_timestamp();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capture_workflow_timestamp ON public.trademark_records;
CREATE TRIGGER capture_workflow_timestamp BEFORE UPDATE OF status ON public.trademark_records FOR EACH ROW EXECUTE FUNCTION public.capture_workflow_timestamp();
REVOKE ALL ON FUNCTION public.capture_workflow_timestamp() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capture_workflow_timestamp() TO service_role;

CREATE OR REPLACE FUNCTION public.create_case_record(p_row JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE payload JSONB; saved public.trademark_records;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.case_series WHERE series_code=p_row->>'selection_menu' AND is_active) THEN RAISE EXCEPTION 'Select an active saved case series'; END IF;
  payload := (p_row - 'id') || jsonb_build_object('status','IN REVIEW','in_review_at',statement_timestamp());
  -- Reuse the same identity/relationship/transaction validation as CSV insertion.
  PERFORM public.import_case_csv(jsonb_build_array(jsonb_build_object('row',payload)));
  SELECT * INTO STRICT saved FROM public.trademark_records r WHERE r.selection_menu=payload->>'selection_menu'
    AND r.client_code=payload->>'client_code' AND r.case_no=payload->>'case_no';
  UPDATE public.trademark_history SET status='RECORD_CREATED',notes='Case created in IN REVIEW' WHERE record_id=saved.id AND status='RECORD_IMPORTED';
  RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.create_case_record(JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_case_record(JSONB) TO service_role;
-- No historical timestamps are inferred or backfilled. Retain timestamp columns on rollback.
