import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_MAX_AGE, createAuthSession, verifyAuthSession } from '@/lib/auth-session';

function constantTimeEqual(left: string, right: string) {
    let difference = left.length ^ right.length;
    const maxLength = Math.max(left.length, right.length);
    for (let index = 0; index < maxLength; index += 1) {
        difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    }
    return difference === 0;
}

function isHttpsRequest(request: Request): boolean {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
    return (
        forwardedProto === 'https' ||
        request.url.startsWith('https://') ||
        origin.startsWith('https://') ||
        referer.startsWith('https://') ||
        host.endsWith('.run.app') ||
        process.env.NODE_ENV === 'production'
    );
}

export async function GET(request: NextRequest) {
    const expectedUser = process.env.APP_ACCESS_USER;
    const expectedPass = process.env.APP_ACCESS_PASSWORD;
    if (!expectedUser || !expectedPass) {
        return NextResponse.json(
            { ok: true, authenticated: process.env.NODE_ENV !== 'production' },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    }
    const sessionCookie = request.cookies.get('brandex_auth')?.value;
    const authenticated = await verifyAuthSession(sessionCookie, expectedUser, expectedPass);
    return NextResponse.json(
        { ok: true, authenticated },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body || {};

        const expectedUser = process.env.APP_ACCESS_USER;
        const expectedPass = process.env.APP_ACCESS_PASSWORD;

        if (!expectedUser || !expectedPass) {
            return NextResponse.json(
                { ok: false, error: 'Application access is not configured.' },
                { status: 503, headers: { 'Cache-Control': 'no-store' } },
            );
        }

        if (
            typeof username === 'string' &&
            typeof password === 'string' &&
            constantTimeEqual(username, expectedUser) &&
            constantTimeEqual(password, expectedPass)
        ) {
            const isHttps = isHttpsRequest(request);
            const session = await createAuthSession(expectedUser, expectedPass);
            const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
            res.cookies.set('brandex_auth', session, {
                path: '/',
                httpOnly: true,
                secure: isHttps,
                sameSite: isHttps ? 'none' : 'lax',
                ...(isHttps ? { partitioned: true } : {}),
                maxAge: AUTH_SESSION_MAX_AGE,
            });
            return res;
        }

        return NextResponse.json(
            { ok: false, error: 'Invalid username or password' },
            { status: 401 }
        );
    } catch {
        return NextResponse.json(
            { ok: false, error: 'Invalid request payload' },
            { status: 400 }
        );
    }
}
