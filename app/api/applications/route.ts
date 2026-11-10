import { proxyAppsScript } from '@/lib/apps-script-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    let payload: Record<string, unknown>;

    try {
        const body: unknown = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return Response.json({ ok: false, error: 'Invalid application payload.' }, { status: 400 });
        }
        payload = body as Record<string, unknown>;
    } catch {
        return Response.json({ ok: false, error: 'Invalid application payload.' }, { status: 400 });
    }

    if (payload.action !== 'generateFromForm') {
        return Response.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
    }

    return proxyAppsScript(payload);
}