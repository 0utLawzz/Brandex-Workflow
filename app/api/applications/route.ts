import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { supabaseDB } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const origin = request.headers.get('origin');
    if (origin) {
        try {
            // Vercel and other reverse proxies may expose the public request
            // origin through forwarded headers while the runtime sees an
            // internal URL.
            const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
            const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
            const requestHost = forwardedHost || request.headers.get('host');
            const requestProto = forwardedProto || new URL(request.url).protocol.replace(':', '');
            const expectedOrigin = requestHost ? `${requestProto}://${requestHost}` : new URL(request.url).origin;
            if (new URL(origin).origin !== expectedOrigin) {
                return Response.json({ ok: false, error: 'Cross-site requests are not allowed.' }, { status: 403 });
            }
        } catch {
            return Response.json({ ok: false, error: 'Invalid request origin.' }, { status: 403 });
        }
    }

    let payload: Record<string, unknown>;

    try {
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > 16 * 1024 * 1024) {
            return Response.json({ ok: false, error: 'Application payload is too large.' }, { status: 413 });
        }
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

    const recordId = Number(payload.recordId);
    if (!Number.isSafeInteger(recordId) || recordId < 1) {
        return Response.json({ ok: false, error: 'A saved Supabase case ID is required before document generation.' }, { status: 400 });
    }

    const requiredTextFields = ['folder', 'classNo', 'appType', 'appName', 'appTrade', 'year'];
    for (const field of requiredTextFields) {
        if (typeof payload[field] !== 'string' || !payload[field].trim()) {
            return Response.json({ ok: false, error: `Missing required field: ${field}.` }, { status: 400 });
        }
    }

    if (payload.clientCode !== undefined &&
        (typeof payload.clientCode !== 'string' || !/^\d{1,3}$/.test(payload.clientCode))) {
        return Response.json({ ok: false, error: 'Client code must contain up to 3 digits.' }, { status: 400 });
    }

    if (payload.caseNo !== undefined &&
        (typeof payload.caseNo !== 'string' || !/^\d{1,3}$/.test(payload.caseNo))) {
        return Response.json({ ok: false, error: 'Case number must contain up to 3 digits.' }, { status: 400 });
    }

    if (typeof payload.clientCode !== 'string' || !/^\d{1,3}$/.test(payload.clientCode) ||
        typeof payload.selectionMenu !== 'string' || !/^[XANB]$/i.test(payload.selectionMenu) ||
        typeof payload.caseNo !== 'string' || !/^\d{1,3}$/.test(payload.caseNo)) {
        return Response.json({ ok: false, error: 'A valid client code, case series, and case number are required.' }, { status: 400 });
    }

    if (payload.imageBase64 !== undefined) {
        if (typeof payload.imageBase64 !== 'string' || payload.imageBase64.length > 3 * 1024 * 1024) {
            return Response.json({ ok: false, error: 'Logo image is too large.' }, { status: 413 });
        }
        if (typeof payload.imageMime !== 'string' || !['image/png', 'image/jpeg'].includes(payload.imageMime)) {
            return Response.json({ ok: false, error: 'Logo must be a PNG or JPEG image.' }, { status: 400 });
        }
        if (!new RegExp(`^data:${payload.imageMime.replace('/', '\\/')};base64,[A-Za-z0-9+/=]+$`).test(payload.imageBase64)) {
            return Response.json({ ok: false, error: 'Logo image data is invalid.' }, { status: 400 });
        }
    }

    if (payload.additionalFiles !== undefined && (!Array.isArray(payload.additionalFiles) || payload.additionalFiles.length > 10)) {
        return Response.json({ ok: false, error: 'Attach no more than 10 files.' }, { status: 400 });
    }

    if (Array.isArray(payload.additionalFiles)) {
        const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
        let totalBytes = 0;
        for (const item of payload.additionalFiles) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return Response.json({ ok: false, error: 'Invalid attachment.' }, { status: 400 });
            }
            const attachment = item as Record<string, unknown>;
            if (typeof attachment.name !== 'string' || typeof attachment.mimeType !== 'string' ||
                typeof attachment.dataUrl !== 'string' || !allowedTypes.has(attachment.mimeType)) {
                return Response.json({ ok: false, error: 'Attachments must be PDF, PNG, or JPEG files.' }, { status: 400 });
            }
            const prefix = `data:${attachment.mimeType};base64,`;
            if (!attachment.dataUrl.startsWith(prefix) || !/^[A-Za-z0-9+/=]+$/.test(attachment.dataUrl.slice(prefix.length))) {
                return Response.json({ ok: false, error: 'Invalid attachment data.' }, { status: 400 });
            }
            const byteLength = Math.floor((attachment.dataUrl.length - prefix.length) * 3 / 4);
            if (byteLength > 4 * 1024 * 1024) {
                return Response.json({ ok: false, error: 'Each attachment must be 4 MB or smaller.' }, { status: 413 });
            }
            totalBytes += byteLength;
        }
        if (totalBytes > 8 * 1024 * 1024) {
            return Response.json({ ok: false, error: 'Combined attachments must be 8 MB or smaller.' }, { status: 413 });
        }
    }

    const { recordId: _recordId, ...generationPayload } = payload;
    const generatedResponse = await proxyAppsScript(generationPayload);
    if (!generatedResponse.ok) return generatedResponse;

    const generated = await generatedResponse.clone().json().catch(() => null);
    try {
        if (!generated?.ok) throw new Error('Google Apps Script returned an invalid generation response.');
        const updates: Record<string, unknown> = {};
        if (typeof generated.serialNo === 'string' && generated.serialNo) updates.serialNo = generated.serialNo;
        if (typeof generated.imageId === 'string' && generated.imageId) updates.img = generated.imageId;
        if (Object.keys(updates).length) await supabaseDB.updateRecord(recordId, updates as any);

        const documents = [
            generated.tm1Url && { record_id: recordId, file_name: `${payload.folder} - TM-1`, file_type: 'application/vnd.google-apps.document', file_url: generated.tm1Url },
            generated.tm48Url && { record_id: recordId, file_name: `${payload.folder} - TM-48`, file_type: 'application/vnd.google-apps.document', file_url: generated.tm48Url },
            ...(Array.isArray(generated.attachments) ? generated.attachments.map((attachment: any) => ({
                record_id: recordId,
                file_name: attachment.name,
                file_size: attachment.size,
                file_type: attachment.mimeType,
                file_url: attachment.url,
            })) : []),
        ].filter((document): document is NonNullable<typeof document> => Boolean(document?.file_url));
        await supabaseDB.saveDocumentReferences(documents as any);
        return generatedResponse;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        return Response.json({
            ok: false,
            code: 'SUPABASE_DOCUMENT_REFERENCE_SAVE_FAILED',
            generated: true,
            error: `Google documents were generated, but the Supabase case update failed: ${message}`,
        }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
