import { NextResponse } from 'next/server';
import { hasSameOrigin } from '@/lib/request-origin';

export async function POST(request: Request) {
    if (!hasSameOrigin(request)) return NextResponse.json({ ok: false, error: 'Cross-site request rejected.' }, { status: 403 });
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
    const isHttps =
        forwardedProto === 'https' ||
        request.url.startsWith('https://') ||
        origin.startsWith('https://') ||
        referer.startsWith('https://') ||
        host.endsWith('.run.app') ||
        process.env.NODE_ENV === 'production';
    const res = NextResponse.json({ ok: true, message: 'Logged out' });
    res.cookies.set('brandex_auth', '', {
        path: '/',
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        ...(isHttps ? { partitioned: true } : {}),
        maxAge: 0,
    });
    return res;
}
