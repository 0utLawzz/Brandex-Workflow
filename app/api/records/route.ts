import { getSupabaseCredentials } from '@/lib/supabase';
import { supabaseDB } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

function getSupabaseRecordKeys(records: Array<{ id?: number | string | null; folder?: string | null; tm?: string | null }>) {
  return records.map((record) => {
    const folder = String(record.folder || '').trim();
    const trademark = String(record.tm || '').trim();
    return folder || trademark ? `${folder}__${trademark}` : `id:${record.id ?? ''}`;
  });
}

export async function GET() {
  const { isConfigured } = getSupabaseCredentials();
  if (!isConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: 'Supabase server access is not configured.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  try {
    const result = await supabaseDB.getRecords();
    if (result.error) throw new Error(result.error);
    const supabaseRecords = result.records;
    return Response.json({
      ok: true,
      records: supabaseRecords,
      supabaseRecordKeys: getSupabaseRecordKeys(supabaseRecords),
      source: 'supabase',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[API records] Supabase query failed:', error);
    return Response.json({ ok: false, error: 'Supabase records could not be loaded.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
