import { NextResponse } from 'next/server';

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

        // If credentials are not set on server, allow
        if (!expectedUser || !expectedPass) {
            const res = NextResponse.json({ ok: true, message: 'No password required' });
            res.cookies.set('brandex_auth', '1', {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
            });
            return res;
        }

        if (
            username &&
            password &&
            constantTimeEqual(username, expectedUser) &&
            constantTimeEqual(password, expectedPass)
        ) {
            const res = NextResponse.json({ ok: true });
            res.cookies.set('brandex_auth', '1', {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
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
