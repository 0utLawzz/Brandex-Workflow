-- Add an optional client category/prefix without changing existing client identifiers.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_prefix TEXT DEFAULT 'A';

UPDATE public.clients
SET client_prefix = 'A'
WHERE client_prefix IS NULL OR BTRIM(client_prefix) = '';
