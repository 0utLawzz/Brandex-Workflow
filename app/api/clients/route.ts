import { getSupabaseCredentials } from '@/lib/supabase';
import { supabaseDB } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isConfigured } = getSupabaseCredentials();
  if (!isConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: 'Supabase server access is not configured.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const result = await supabaseDB.getClients();
    if (result.error) throw new Error(result.error);
    return Response.json({ ok: true, clients: result.clients, source: result.source }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[API clients] Supabase query failed:', error);
    return Response.json({ ok: false, error: 'Client profiles could not be loaded from Supabase.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
