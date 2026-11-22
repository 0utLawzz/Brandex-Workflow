-- Add optional client folder metadata. Existing rows remain untouched.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_prefix TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS folder_reference TEXT;
