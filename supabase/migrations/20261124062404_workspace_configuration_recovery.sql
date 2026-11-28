CREATE OR REPLACE FUNCTION public.get_recovery_snapshot()
RETURNS JSONB LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'records',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.trademark_records r),'[]'::jsonb),
    'clients',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.clients c),'[]'::jsonb),
    'history',COALESCE((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.id) FROM public.trademark_history h),'[]'::jsonb),
    'documents',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.id) FROM public.trademark_documents d),'[]'::jsonb),
    'series',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.case_series s),'[]'::jsonb),
    'workspaceSettings',COALESCE((SELECT jsonb_agg(to_jsonb(w)) FROM public.workspace_settings w),'[]'::jsonb),
    'capturedAt',statement_timestamp());
$$;

ALTER FUNCTION public.restore_recovery_snapshot(JSONB) RENAME TO restore_recovery_rows;
CREATE FUNCTION public.restore_recovery_snapshot(p_snapshot JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  item JSONB; source_settings JSONB; current_settings JSONB; report JSONB;
  existing public.case_series; seen TEXT[] := '{}'; code TEXT;
  series_count INTEGER := 0; settings_count INTEGER := 0; empty_target BOOLEAN;
BEGIN
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid recovery snapshot'; END IF;
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE public.clients,public.trademark_records,public.trademark_history,public.trademark_documents,
    public.case_series,public.workspace_settings IN SHARE ROW EXCLUSIVE MODE;
  empty_target := NOT EXISTS(SELECT 1 FROM public.clients) AND NOT EXISTS(SELECT 1 FROM public.trademark_records)
    AND NOT EXISTS(SELECT 1 FROM public.trademark_history) AND NOT EXISTS(SELECT 1 FROM public.trademark_documents);
  IF p_snapshot ? 'series' THEN
    IF jsonb_typeof(p_snapshot->'series') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid series collection'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_snapshot->'series') LOOP
      IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR item - ARRAY['id','series_code','is_active','sort_order','created_at','updated_at'] <> '{}'::jsonb THEN RAISE EXCEPTION 'Unsupported series fields'; END IF;
      code := item->>'series_code';
      IF code IS NULL OR code !~ '^[A-Z][A-Z0-9]{0,7}$' OR code=ANY(seen) OR jsonb_typeof(item->'is_active') IS DISTINCT FROM 'boolean'
        OR COALESCE(item->>'sort_order','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid or duplicate recovery series'; END IF;
      seen := array_append(seen,code);
      SELECT * INTO existing FROM public.case_series WHERE series_code=code;
      IF FOUND THEN
        IF existing.is_active IS DISTINCT FROM (item->>'is_active')::boolean OR existing.sort_order IS DISTINCT FROM (item->>'sort_order')::integer THEN
          RAISE EXCEPTION 'Series configuration conflicts for %. Review the destination registry before recovery',code;
        END IF;
      ELSE
        INSERT INTO public.case_series(series_code,is_active,sort_order,created_at,updated_at)
          VALUES(code,(item->>'is_active')::boolean,(item->>'sort_order')::integer,
            COALESCE((item->>'created_at')::timestamptz,now()),COALESCE((item->>'updated_at')::timestamptz,now()));
      END IF;
      series_count := series_count+1;
    END LOOP;
  END IF;
  IF p_snapshot ? 'workspaceSettings' THEN
    IF jsonb_typeof(p_snapshot->'workspaceSettings') IS DISTINCT FROM 'array' OR jsonb_array_length(p_snapshot->'workspaceSettings') <> 1 THEN RAISE EXCEPTION 'A single workspace settings row is required'; END IF;
    item := p_snapshot->'workspaceSettings'->0;
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR item - ARRAY['id','display_name','brand_prefix','tagline','logo_url','revision','updated_at'] <> '{}'::jsonb THEN RAISE EXCEPTION 'Unsupported workspace settings fields'; END IF;
    source_settings := item - ARRAY['id','revision','updated_at'];
    IF (SELECT count(*) FROM jsonb_object_keys(source_settings)) <> 4 OR item->>'brand_prefix' !~ '^[A-Za-z0-9 -]{1,12}$'
      OR item->>'logo_url' IS NULL OR item->>'logo_url' !~ '^(https://[^[:space:]@]+|)$' THEN RAISE EXCEPTION 'Invalid workspace settings'; END IF;
    SELECT to_jsonb(w) INTO current_settings FROM public.workspace_settings w WHERE id=true;
    IF current_settings IS NULL THEN RAISE EXCEPTION 'Destination workspace settings are missing; review migration setup'; END IF;
    IF source_settings IS DISTINCT FROM current_settings - ARRAY['id','revision','updated_at'] THEN
      IF NOT empty_target OR (current_settings->>'revision')::integer <> 1
        OR current_settings->>'display_name'<>'BRANDEX' OR current_settings->>'brand_prefix'<>'BRANDEX'
        OR current_settings->>'tagline'<>'' OR current_settings->>'logo_url'<>'' THEN RAISE EXCEPTION 'Workspace branding conflicts; review destination settings before recovery'; END IF;
      UPDATE public.workspace_settings SET display_name=item->>'display_name',brand_prefix=item->>'brand_prefix',
        tagline=item->>'tagline',logo_url=item->>'logo_url',revision=revision+1,updated_at=now() WHERE id=true;
    END IF;
    settings_count := 1;
  END IF;
  report := public.restore_recovery_rows(p_snapshot);
  RETURN report || jsonb_build_object('series',series_count,'workspaceSettings',settings_count,
    'configurationIncluded',(p_snapshot ? 'series' AND p_snapshot ? 'workspaceSettings'));
END;
$$;
REVOKE ALL ON FUNCTION public.restore_recovery_snapshot(JSONB),public.get_recovery_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.restore_recovery_snapshot(JSONB),public.get_recovery_snapshot() TO service_role;
-- Rollback callers/function wrapper only; retain restored configuration and case data.
