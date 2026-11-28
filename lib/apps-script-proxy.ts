import { APPS_SCRIPT_URL } from './data.ts';
import { describeAppsScriptFailure } from './apps-script-response.ts';
import { DEFAULT_PRODUCTION_PROJECT_REF, previewWriteError } from './preview-isolation.ts';

export function getAppsScriptEndpoint(): string {
    return process.env.NEXT_APPS_SCRIPT_URL || APPS_SCRIPT_URL;
}

export async function proxyAppsScript(payload: Record<string, unknown>) {
    const endpoint = getAppsScriptEndpoint();
    const isolationError = previewWriteError(process.env, process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${DEFAULT_PRODUCTION_PROJECT_REF}.supabase.co`, endpoint);
    if (isolationError) return Response.json({ ok: false, error: isolationError }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    const accessToken = process.env.APPS_SCRIPT_RECORDS_TOKEN;
    if (!accessToken) {
        return Response.json(
            { ok: false, error: 'Apps Script access is not configured.' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    try {
        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ ...payload, accessToken }),
            cache: 'no-store',
            redirect: 'follow',
            signal: AbortSignal.timeout(120000),
        });
        const data = await upstream.json();

        if (!upstream.ok || !data || data.ok !== true) {
            const upstreamError = typeof data?.error === 'string' ? data.error : '';
            const failure = describeAppsScriptFailure(upstreamError);
            return Response.json(
                {
                    ok: false,
                    ...(failure.code ? { code: failure.code } : {}),
                    error: failure.error,
                },
                { status: 502, headers: { 'Cache-Control': 'no-store' } },
            );
        }

        return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return Response.json(
            { ok: false, error: 'Apps Script is unavailable.' },
            { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}
