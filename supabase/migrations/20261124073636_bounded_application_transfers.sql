-- Bounded input/output transport for authenticated application APIs; separate from recovery permissions.
-- Track backend table privileges explicitly, rather than adding them only in test fixtures.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.clients,public.trademark_records,public.trademark_history,public.trademark_documents TO service_role;
ALTER TABLE public.recovery_transfers ADD COLUMN purpose TEXT NOT NULL DEFAULT 'recovery'
  CHECK(purpose IN ('recovery','applications','database','api-result'));
ALTER TABLE public.recovery_transfers ADD COLUMN claimed_at TIMESTAMPTZ;
ALTER TABLE public.recovery_transfers ADD COLUMN response_status INTEGER CHECK(response_status BETWEEN 200 AND 599);

CREATE OR REPLACE FUNCTION public.put_recovery_chunk(p_id UUID,p_index INTEGER,p_content TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE meta public.recovery_transfers; prior TEXT; expected INTEGER;
BEGIN
  SELECT * INTO meta FROM public.recovery_transfers WHERE id=p_id AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recovery transfer unavailable or expired'; END IF;
  IF meta.claimed_at IS NOT NULL THEN RAISE EXCEPTION 'Request execution already started; chunks are immutable'; END IF;
  IF p_index IS NULL OR p_index < 0 OR p_index >= meta.chunk_count OR p_content IS NULL OR octet_length(p_content)>699052
    OR p_content !~ '^[A-Za-z0-9+/]+={0,2}$' OR length(p_content)%4<>0 THEN RAISE EXCEPTION 'Invalid recovery chunk'; END IF;
  expected := LEAST(524288,meta.byte_length-p_index*524288);
  IF octet_length(decode(p_content,'base64'))<>expected THEN RAISE EXCEPTION 'Recovery chunk size mismatch'; END IF;
  SELECT content INTO prior FROM public.recovery_transfer_chunks WHERE transfer_id=p_id AND chunk_index=p_index;
  IF FOUND THEN
    IF prior IS DISTINCT FROM p_content THEN RAISE EXCEPTION 'Recovery chunk conflicts with previous upload'; END IF;
    RETURN;
  END IF;
  INSERT INTO public.recovery_transfer_chunks(transfer_id,chunk_index,content) VALUES(p_id,p_index,p_content);
END;
$$;

CREATE FUNCTION public.begin_application_transfer(p_id UUID,p_purpose TEXT,p_bytes INTEGER,p_chunks INTEGER,p_sha256 TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_purpose IS NULL OR p_purpose NOT IN ('applications','database')
    OR p_bytes > (CASE p_purpose WHEN 'applications' THEN 16777216 ELSE 12582912 END) THEN RAISE EXCEPTION 'Application payload exceeds its limit or has an invalid target'; END IF;
  PERFORM public.begin_recovery_transfer(p_id,'upload',p_bytes,p_chunks,p_sha256);
  UPDATE public.recovery_transfers SET purpose=p_purpose WHERE id=p_id;
END;
$$;

CREATE FUNCTION public.claim_application_transfer(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE meta public.recovery_transfers;
BEGIN
  SELECT * INTO meta FROM public.recovery_transfers WHERE id=p_id AND expires_at>now() FOR UPDATE;
  IF NOT FOUND OR meta.purpose NOT IN ('applications','database') OR meta.direction<>'upload' THEN RAISE EXCEPTION 'Application request unavailable'; END IF;
  IF meta.claimed_at IS NOT NULL THEN RAISE EXCEPTION 'Request execution already started. Reload current data before retrying'; END IF;
  IF (SELECT count(*) FROM public.recovery_transfer_chunks WHERE transfer_id=p_id)<>meta.chunk_count THEN RAISE EXCEPTION 'Request upload is incomplete'; END IF;
  UPDATE public.recovery_transfers SET claimed_at=now() WHERE id=p_id;
END;
$$;

CREATE FUNCTION public.start_application_request(p_id UUID,p_purpose TEXT,p_content TEXT,p_sha256 TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE bytes BYTEA := decode(p_content,'base64');
BEGIN
  IF octet_length(bytes)>262144 OR encode(sha256(bytes),'hex') IS DISTINCT FROM p_sha256 THEN RAISE EXCEPTION 'Invalid inline request'; END IF;
  PERFORM public.begin_application_transfer(p_id,p_purpose,octet_length(bytes),1,p_sha256);
  PERFORM public.put_recovery_chunk(p_id,0,p_content);
  PERFORM public.claim_application_transfer(p_id);
END;
$$;

CREATE FUNCTION public.complete_application_transfer(p_id UUID,p_bytes INTEGER,p_chunks INTEGER,p_sha256 TEXT,p_status INTEGER,p_content TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE meta public.recovery_transfers; bytes BYTEA;
BEGIN
  SELECT * INTO meta FROM public.recovery_transfers WHERE id=p_id AND expires_at>now() FOR UPDATE;
  IF NOT FOUND OR meta.purpose NOT IN ('applications','database') OR meta.direction<>'upload' OR meta.claimed_at IS NULL THEN RAISE EXCEPTION 'Request outcome capture unavailable. Reload data before retrying'; END IF;
  IF p_status IS NULL OR p_status NOT BETWEEN 200 AND 599 THEN RAISE EXCEPTION 'Invalid response status'; END IF;
  IF p_content IS NOT NULL THEN
    bytes := decode(p_content,'base64');
    IF p_chunks<>1 OR octet_length(bytes)<>p_bytes OR encode(sha256(bytes),'hex') IS DISTINCT FROM p_sha256 THEN RAISE EXCEPTION 'Response checksum mismatch'; END IF;
  END IF;
  DELETE FROM public.recovery_transfer_chunks WHERE transfer_id=p_id;
  UPDATE public.recovery_transfers SET direction='download',purpose='api-result',byte_length=p_bytes,chunk_count=p_chunks,
    sha256=p_sha256,response_status=p_status,claimed_at=NULL,expires_at=now()+interval '1 hour' WHERE id=p_id;
  IF p_content IS NOT NULL THEN PERFORM public.put_recovery_chunk(p_id,0,p_content); END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_application_transfer(UUID,TEXT,INTEGER,INTEGER,TEXT),public.claim_application_transfer(UUID),
  public.start_application_request(UUID,TEXT,TEXT,TEXT),public.complete_application_transfer(UUID,INTEGER,INTEGER,TEXT,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_application_transfer(UUID,TEXT,INTEGER,INTEGER,TEXT),public.claim_application_transfer(UUID),
  public.start_application_request(UUID,TEXT,TEXT,TEXT),public.complete_application_transfer(UUID,INTEGER,INTEGER,TEXT,INTEGER,TEXT) TO service_role;
-- Same table RLS, byte/chunk bounds, immutable chunk retries, capacity and expiry apply.
-- Revert callers before rollback; retain no application data changes by deleting staging.

