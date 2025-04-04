import { handleAuth } from '@/lib/middleware/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const response = NextResponse.next();
    return handleAuth(request, response);
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/select-organization',
        '/profile',
        '/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|auth).*)',
    ]
}; 