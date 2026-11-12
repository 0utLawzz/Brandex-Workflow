const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): ArrayBuffer {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return bytes.buffer as ArrayBuffer;
}

async function getSigningKey(password: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    );
}

export const AUTH_SESSION_MAX_AGE = SESSION_DURATION_SECONDS;

export async function createAuthSession(username: string, password: string): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
    const payload = `${username}:${expiresAt}`;
    const signature = await crypto.subtle.sign('HMAC', await getSigningKey(password), encoder.encode(payload));
    return `${expiresAt}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthSession(
    token: string | undefined,
    username: string,
    password: string,
): Promise<boolean> {
    if (!token) return false;

    const separator = token.indexOf('.');
    if (separator <= 0) return false;

    const expiresAt = Number(token.slice(0, separator));
    const signature = token.slice(separator + 1);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) {
        return false;
    }

    try {
        const payload = `${username}:${expiresAt}`;
        return await crypto.subtle.verify(
            'HMAC',
            await getSigningKey(password),
            fromBase64Url(signature),
            encoder.encode(payload),
        );
    } catch {
        return false;
    }
}
