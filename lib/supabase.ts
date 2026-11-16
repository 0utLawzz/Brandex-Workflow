import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project endpoints for Brandex Law Associates
const DEFAULT_SUPABASE_URL = 'https://zbkgerbdnjmctqqnoqnd.supabase.co';
// Anonymous key placeholder or user-configured key
const DEFAULT_SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpia2dlcmJkbmptY3RxcW5vcW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg4MDB9.placeholder';

export function getSupabaseCredentials(): { url: string; key: string; isConfigured: boolean } {
  // Supabase endpoints and keys must come from deployment configuration.
  // Do not accept browser localStorage overrides: any staff member could
  // redirect the client to an attacker-controlled project or key.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = DEFAULT_SUPABASE_KEY;

  const isConfigured = Boolean(
    url &&
    !url.includes('placeholder') &&
    key &&
    !key.includes('placeholder')
  );

  return { url, key, isConfigured };
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseCredentials();

  if (cachedClient && url === lastUrl && key === lastKey) {
    return cachedClient;
  }

  lastUrl = url;
  lastKey = key;

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}

export const supabase = getSupabaseClient();
