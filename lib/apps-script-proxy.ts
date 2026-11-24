import { APPS_SCRIPT_URL } from './data.ts';
import { describeAppsScriptFailure } from './apps-script-response.ts';

export async function proxyAppsScript(payload: Record<string, unknown>) {
    const accessToken = process.env.APPS_SCRIPT_RECORDS_TOKEN;
    if (!accessToken) {
        return Response.json(
            { ok: false, error: 'Apps Script access is not configured.' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    try {
        const upstream = await fetch(APPS_SCRIPT_URL, {
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
