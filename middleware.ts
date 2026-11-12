import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthSession } from '@/lib/auth-session';

function constantTimeEqual(left: string, right: string) {
    let difference = left.length ^ right.length;
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
        difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
    }

    return difference === 0;
}

function authenticatedResponse() {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public auth routes
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    const username = process.env.APP_ACCESS_USER;
    const password = process.env.APP_ACCESS_PASSWORD;

    // Keep local development usable without deployment credentials.
    if (!username || !password) {
        if (process.env.NODE_ENV !== 'production') return authenticatedResponse();
        return new NextResponse('Application access is not configured.', {
            status: 503,
            headers: { 'Cache-Control': 'no-store' },
        });
    }

    const sessionCookie = request.cookies.get('brandex_auth')?.value;
    if (await verifyAuthSession(sessionCookie, username, password)) {
        return authenticatedResponse();
    }

    // Check HTTP Basic Auth header
    const authorization = request.headers.get('authorization') || '';
    const match = authorization.match(/^Basic\s+(.+)$/i);

    if (match) {
        try {
            const credentials = atob(match[1]);
            const separator = credentials.indexOf(':');
            const providedUsername = separator < 0 ? '' : credentials.slice(0, separator);
            const providedPassword = separator < 0 ? '' : credentials.slice(separator + 1);

            if (constantTimeEqual(providedUsername, username) && constantTimeEqual(providedPassword, password)) {
                return authenticatedResponse();
            }
        } catch {
            // Treat malformed Basic credentials as unauthorized.
        }
    }

    // For API requests, return 401
    if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ ok: false, error: 'Authentication required' }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'WWW-Authenticate': 'Basic realm="Brandex Workflow", charset="UTF-8"',
            },
        });
    }

    // For page requests, redirect to /login so the user can easily log in inside the iframe
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|brandex-mark.svg).*)'],
};