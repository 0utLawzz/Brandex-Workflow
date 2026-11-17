import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { getSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { mapRowToRecord } from '@/lib/supabase-db';
import { mergeRecordSources } from '@/lib/record-source-merge';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isConfigured } = getSupabaseCredentials();
  let supabaseRecords: ReturnType<typeof mapRowToRecord>[] = [];
  let supabaseAvailable = false;

  // Read the configured Supabase source once.
  if (isConfigured) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('trademark_records')
        .select('*')
        .order('id', { ascending: false });

      if (!error && Array.isArray(data)) {
        supabaseRecords = data.map(mapRowToRecord);
        supabaseAvailable = true;
      }
    } catch (e) {
      console.warn('[API records] Supabase query failed:', e);
    }
  }

  // The Records page synchronizes cases written by Apps Script/Sheets too.
  if (process.env.APPS_SCRIPT_RECORDS_TOKEN) {
    const appsScriptResponse = await proxyAppsScript({ action: 'getRecords' });
    const appsScriptData = await appsScriptResponse.json().catch(() => null);

    if (appsScriptResponse.ok && appsScriptData?.ok === true && Array.isArray(appsScriptData.records)) {
      const records = mergeRecordSources(appsScriptData.records, supabaseRecords);
      return Response.json({
        ok: true,
        records,
        source: supabaseAvailable ? 'supabase+apps-script' : 'apps-script',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Keep CMS access available if Supabase succeeded but the Apps Script
    // synchronization source is temporarily unavailable.
    if (supabaseAvailable) {
      return Response.json({
        ok: true,
        records: supabaseRecords,
        source: 'supabase',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return new Response(JSON.stringify(appsScriptData || { ok: false, error: 'Apps Script records are unavailable.' }), {
      status: appsScriptResponse.status,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
    });
  }

  if (supabaseAvailable) {
    return Response.json({
      ok: true,
      records: supabaseRecords,
      source: 'supabase',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json({
    ok: true,
    records: [],
    source: 'empty'
  }, { headers: { 'Cache-Control': 'no-store' } });
}
