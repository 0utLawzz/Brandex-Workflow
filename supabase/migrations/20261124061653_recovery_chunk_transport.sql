-- Expiring, service-role-only transfer staging; never part of a recovery snapshot.
CREATE TABLE public.recovery_transfers (
  id UUID PRIMARY KEY,
  direction TEXT NOT NULL CHECK(direction IN ('upload','download')),
  byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 67108864),
  chunk_count INTEGER NOT NULL CHECK(chunk_count BETWEEN 1 AND 128),
  sha256 TEXT NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  CHECK(chunk_count = (byte_length + 524287) / 524288)
);
CREATE INDEX recovery_transfers_expiry_idx ON public.recovery_transfers(expires_at);
CREATE TABLE public.recovery_transfer_chunks (
  transfer_id UUID NOT NULL REFERENCES public.recovery_transfers(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK(chunk_index BETWEEN 0 AND 127),
  content TEXT NOT NULL CHECK(octet_length(content) <= 699052),
  PRIMARY KEY(transfer_id,chunk_index)
);
ALTER TABLE public.recovery_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_transfer_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recovery_transfers,public.recovery_transfer_chunks FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recovery_transfers,public.recovery_transfer_chunks TO service_role;

CREATE FUNCTION public.begin_recovery_transfer(p_id UUID,p_direction TEXT,p_bytes INTEGER,p_chunks INTEGER,p_sha256 TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE public.recovery_transfers IN SHARE ROW EXCLUSIVE MODE;
  DELETE FROM public.recovery_transfers WHERE expires_at <= now();
  IF (SELECT count(*) FROM public.recovery_transfers) >= 8 THEN RAISE EXCEPTION 'Recovery transfer capacity reached; finish or remove an existing transfer'; END IF;
  INSERT INTO public.recovery_transfers(id,direction,byte_length,chunk_count,sha256) VALUES(p_id,p_direction,p_bytes,p_chunks,p_sha256);
END;
$$;

CREATE FUNCTION public.put_recovery_chunk(p_id UUID,p_index INTEGER,p_content TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE meta public.recovery_transfers; prior TEXT; expected INTEGER;
BEGIN
  SELECT * INTO meta FROM public.recovery_transfers WHERE id=p_id AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recovery transfer unavailable or expired'; END IF;
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
REVOKE ALL ON FUNCTION public.begin_recovery_transfer(UUID,TEXT,INTEGER,INTEGER,TEXT),public.put_recovery_chunk(UUID,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_recovery_transfer(UUID,TEXT,INTEGER,INTEGER,TEXT),public.put_recovery_chunk(UUID,INTEGER,TEXT) TO service_role;
-- Expiry denies reads immediately; creation purges expired rows and cascades chunks.
-- Rollback after reverting callers: drop these staging tables/functions only; no case data is involved.
