import { NextResponse } from 'next/server';

export async function POST() {
    const res = NextResponse.json({ ok: true, message: 'Logged out' });
    res.cookies.set('brandex_auth', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
    });
    return res;
}
