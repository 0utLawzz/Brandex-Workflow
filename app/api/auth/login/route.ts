import { NextResponse } from 'next/server';
import { AUTH_SESSION_MAX_AGE, createAuthSession } from '@/lib/auth-session';

function constantTimeEqual(left: string, right: string) {
    let difference = left.length ^ right.length;
    const maxLength = Math.max(left.length, right.length);
    for (let index = 0; index < maxLength; index += 1) {
        difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    }
    return difference === 0;
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
            const session = await createAuthSession(expectedUser, expectedPass);
            const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
            res.cookies.set('brandex_auth', session, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
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
