import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(request: NextRequest) {
    const username = process.env.APP_ACCESS_USER;
    const password = process.env.APP_ACCESS_PASSWORD;

    if (!username || !password) {
        return authenticatedResponse();
    }

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

    return new NextResponse('Authentication required.', {
        status: 401,
        headers: {
            'Cache-Control': 'no-store',
            'WWW-Authenticate': 'Basic realm="Brandex Workflow", charset="UTF-8"',
        },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};