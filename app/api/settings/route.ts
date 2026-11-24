import { hasSameOrigin } from '@/lib/request-origin';
import { getSupabaseClient } from '@/lib/supabase';
import { validateSharedSettings } from '@/lib/shared-settings';
import { readBoundedJson, RequestPayloadError } from '@/lib/request-json';

const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  const { data, error } = await getSupabaseClient().from('workspace_settings').select('display_name,brand_prefix,tagline,logo_url,revision').eq('id', true).single();
  return error ? Response.json({ error: 'Shared settings unavailable. Verify the workspace settings migration.' }, { status: 503, headers }) : Response.json(data, { headers });
}
export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) return Response.json({ error: 'Cross-site request rejected.' }, { status: 403, headers });
    const settings = validateSharedSettings(await readBoundedJson(request, 8192));
    const { revision, ...values } = settings;
    const { data, error } = await getSupabaseClient().from('workspace_settings').update({ ...values, revision: revision + 1, updated_at: new Date().toISOString() }).eq('id', true).eq('revision', revision).select('display_name,brand_prefix,tagline,logo_url,revision').maybeSingle();
    if (error || !data) return Response.json({ error: 'Settings changed elsewhere or could not be saved. Reload before retrying.' }, { status: 409, headers });
    return Response.json(data, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Invalid settings.' }, { status: error instanceof RequestPayloadError ? error.status : 400, headers }); }
}
