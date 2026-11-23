CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  brand_prefix TEXT NOT NULL CHECK (length(brand_prefix) BETWEEN 1 AND 12),
  tagline TEXT NOT NULL DEFAULT '' CHECK (length(tagline) <= 160),
  logo_url TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.workspace_settings TO service_role;
INSERT INTO public.workspace_settings(id, display_name, brand_prefix) VALUES (true, 'BRANDEX', 'BRANDEX') ON CONFLICT (id) DO NOTHING;
-- Rollback application use, retain shared settings and their revision history state.
