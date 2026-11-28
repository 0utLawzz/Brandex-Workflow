import { hasSameOrigin } from '@/lib/request-origin';
import { proxyAppsScript } from '@/lib/apps-script-proxy';
import { supabaseDB } from '@/lib/supabase-db';
import { resolveGenerationDestination } from '@/lib/generation-destination';
import { readBoundedJson, RequestPayloadError } from '@/lib/request-json';
import { previewWriteError } from '@/lib/preview-isolation';
import { getSupabaseCredentials } from '@/lib/supabase';
import { CASE_ATTACHMENT_MIME_TYPES, CASE_ATTACHMENT_MAX_FILES, CASE_ATTACHMENT_MAX_FILE_BYTES, CASE_ATTACHMENT_MAX_TOTAL_BYTES } from '@/lib/attachment-policy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    if (!hasSameOrigin(request)) return Response.json({ ok: false, error: 'Cross-site request rejected.' }, { status: 403 });
    const isolationError = previewWriteError(process.env, getSupabaseCredentials().url);
    if (isolationError) return Response.json({ ok: false, error: isolationError }, { status: 503 });

    let payload: Record<string, unknown>;

    try {
        const body = await readBoundedJson(request, 16 * 1024 * 1024);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return Response.json({ ok: false, error: 'Invalid application payload.' }, { status: 400 });
        }
        payload = body as Record<string, unknown>;
    } catch (error) {
        return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Invalid application payload.' }, { status: error instanceof RequestPayloadError ? error.status : 400 });
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
        typeof payload.selectionMenu !== 'string' || !/^[A-Z][A-Z0-9]{0,7}$/i.test(payload.selectionMenu) ||
        typeof payload.caseNo !== 'string' || !/^\d{1,3}$/.test(payload.caseNo)) {
        return Response.json({ ok: false, error: 'A valid client code, case series, and case number are required.' }, { status: 400 });
    }

    if (payload.imageBase64 !== undefined) {
        if (payload.imageName !== undefined && (typeof payload.imageName !== 'string' || !payload.imageName.trim() || payload.imageName.length > 240 || /[\u0000-\u001f]/.test(payload.imageName))) {
            return Response.json({ ok: false, error: 'Logo file name is invalid or too long.' }, { status: 400 });
        }
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

    if (payload.additionalFiles !== undefined && (!Array.isArray(payload.additionalFiles) || payload.additionalFiles.length > CASE_ATTACHMENT_MAX_FILES)) {
        return Response.json({ ok: false, error: 'Attach no more than 10 files.' }, { status: 400 });
    }

    if (Array.isArray(payload.additionalFiles)) {
        const allowedTypes = new Set<string>(CASE_ATTACHMENT_MIME_TYPES);
        let totalBytes = 0;
        for (const item of payload.additionalFiles) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return Response.json({ ok: false, error: 'Invalid attachment.' }, { status: 400 });
            }
            const attachment = item as Record<string, unknown>;
            if (typeof attachment.name !== 'string' || !attachment.name.trim() || attachment.name.length > 240 || /[\u0000-\u001f]/.test(attachment.name) || typeof attachment.mimeType !== 'string' ||
                typeof attachment.dataUrl !== 'string' || !allowedTypes.has(attachment.mimeType)) {
                return Response.json({ ok: false, error: 'Attachments must be PDF, PNG, JPEG, XLS, or XLSX files.' }, { status: 400 });
            }
            const prefix = `data:${attachment.mimeType};base64,`;
            if (!attachment.dataUrl.startsWith(prefix) || !/^[A-Za-z0-9+/=]+$/.test(attachment.dataUrl.slice(prefix.length))) {
                return Response.json({ ok: false, error: 'Invalid attachment data.' }, { status: 400 });
            }
            const byteLength = Math.floor((attachment.dataUrl.length - prefix.length) * 3 / 4);
            if (byteLength > CASE_ATTACHMENT_MAX_FILE_BYTES) {
                return Response.json({ ok: false, error: 'Each attachment must be 4 MB or smaller.' }, { status: 413 });
            }
            totalBytes += byteLength;
        }
        if (totalBytes > CASE_ATTACHMENT_MAX_TOTAL_BYTES) {
            return Response.json({ ok: false, error: 'Combined attachments must be 8 MB or smaller.' }, { status: 413 });
        }
    }

    const { recordId: _recordId, ...generationPayload } = payload;
    let destination;
    try { destination = await resolveGenerationDestination(recordId); }
    catch (error) { return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Destination unavailable.' }, { status: 409 }); }
    const generatedResponse = await proxyAppsScript({ ...generationPayload, ...destination });
    if (!generatedResponse.ok) return generatedResponse;

    const generated = await generatedResponse.clone().json().catch(() => null);
    try {
        if (!generated?.ok) throw new Error('Google Apps Script returned an invalid generation response.');
        const updates: Record<string, unknown> = {};
        if (typeof generated.serialNo === 'string' && generated.serialNo) updates.serialNo = generated.serialNo;
        if (typeof generated.imageId === 'string' && generated.imageId) updates.img = generated.imageId;
        if (Object.keys(updates).length) await supabaseDB.updateRecord(recordId, updates as any);

        const documents = [
            generated.tm1Url && { record_id: recordId, file_name: generated.tm1Name || `${payload.folder} - TM-1`, file_type: 'application/vnd.google-apps.document', file_url: generated.tm1Url },
            generated.tm48Url && { record_id: recordId, file_name: generated.tm48Name || `${payload.folder} - TM-48`, file_type: 'application/vnd.google-apps.document', file_url: generated.tm48Url },
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
