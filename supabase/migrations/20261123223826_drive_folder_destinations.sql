-- Separate actual Drive IDs from the user's additional naming/reference fields.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE public.trademark_records ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
-- No existing folder/reference is inferred, renamed, moved or deleted.
