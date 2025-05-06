// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'; // OLD
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { Database } from '@/types/supabase'; // No longer needed here
import { updateSession } from '@/utils/supabase/middleware'; // NEW

// Constants for path matching
const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/auth/callback', '/auth/error'];
const AUTH_PATHS = ['/auth/callback', '/auth/error'];

// Helper functions
function shouldSkipAuth(request: NextRequest): boolean {
    const { pathname } = request.nextUrl;
    
    // Allow public access to POST /api/approvals
    if (pathname === '/api/approvals' && request.method === 'POST') {
        return true;
    }
    
    return PUBLIC_PATHS.includes(pathname) || 
           pathname.startsWith('/_next') || 
           pathname.startsWith('/api/auth');
}

function redirectToSignIn(request: NextRequest) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  // updateSession handles refreshing the session and returning the response
  return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}; 

// Removed old logic for checking public paths, redirecting, checking profiles etc.
// This simplified middleware focuses only on session refreshing.
// Auth checks should be done within specific pages/routes using createClient from server.ts
// // ... existing code ... 