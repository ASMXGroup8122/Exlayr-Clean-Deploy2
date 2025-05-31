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
         * - Static assets (svg, png, jpg, jpeg, gif, webp, ico, css, js)
         * - API routes that don't need auth
         * - DevTools and Chrome extension requests
         * 
         * Also exclude prefetch requests to prevent unnecessary auth calls
         */
        {
            source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|robots)$|api/auth|api/webhook|\\.well-known).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
                { type: 'header', key: 'x-middleware-prefetch' }
            ]
        }
    ],
}; 

// Removed old logic for checking public paths, redirecting, checking profiles etc.
// This simplified middleware focuses only on session refreshing.
// Auth checks should be done within specific pages/routes using createClient from server.ts
// // ... existing code ... 