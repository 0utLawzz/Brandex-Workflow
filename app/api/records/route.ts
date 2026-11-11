import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { getSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { mapRowToRecord } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isConfigured } = getSupabaseCredentials();

  // If Supabase is configured, fetch records from Supabase
  if (isConfigured) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('trademark_records')
        .select('*')
        .order('id', { ascending: false });

      if (!error && Array.isArray(data)) {
        return Response.json({
          ok: true,
          records: data.map(mapRowToRecord),
          source: 'supabase'
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch (e) {
      console.warn('[API records] Supabase query failed:', e);
    }
  }

  // Fallback to Apps Script if token is configured
  if (process.env.APPS_SCRIPT_RECORDS_TOKEN) {
    return proxyAppsScript({ action: 'getRecords' });
  }

  return Response.json({
    ok: true,
    records: [],
    source: 'empty'
  }, { headers: { 'Cache-Control': 'no-store' } });
}