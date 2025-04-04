import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public paths that don't need auth
const PUBLIC_PATHS = [
    '/_next',
    '/api',
    '/static',
    '/images',
    '/favicon.ico',
    '/register-organization',
    '/create-sponsor',
    '/create-issuer',
    '/create-exchange'
];

// Define auth-specific paths that need special handling
const AUTH_PATHS = [
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/auth/error',
    '/auth/verify-email',
    '/approval-pending',
    '/organization-pending'
];

export async function middleware(request: NextRequest) {
    const res = NextResponse.next();
    
    // Skip middleware for public paths
    const isPublicPath = PUBLIC_PATHS.some(path => 
        request.nextUrl.pathname.startsWith(path)
    );
    if (isPublicPath) {
        return res;
    }

    // Skip middleware for auth paths
    const isAuthPath = AUTH_PATHS.some(path => 
        request.nextUrl.pathname.startsWith(path)
    );
    if (isAuthPath) {
        return res;
    }

    try {
        const supabase = createMiddlewareClient({ req: request, res });
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            throw error;
        }

        // If no session and trying to access protected route, redirect to sign-in
        if (!session) {
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('next', request.nextUrl.pathname);
            return NextResponse.redirect(signInUrl);
        }

        // Get user data to check status and organization
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('status, account_type, organization_id')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            throw userError;
        }

        // Handle user status checks
        if (userData.status === 'pending') {
            // Don't redirect if already on pending pages
            if (!request.nextUrl.pathname.includes('pending')) {
                return NextResponse.redirect(new URL('/approval-pending', request.url));
            }
            return res;
        }

        // Handle organization-specific routes
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            const urlParts = request.nextUrl.pathname.split('/');
            const requestedOrgType = urlParts[2]; // /dashboard/[orgType]/...
            
            // Validate organization type matches user's account type
            if (requestedOrgType === 'sponsor' && userData.account_type !== 'exchange_sponsor' ||
                requestedOrgType === 'issuer' && userData.account_type !== 'issuer' ||
                requestedOrgType === 'exchange' && userData.account_type !== 'exchange') {
                return NextResponse.redirect(new URL('/access-denied', request.url));
            }

            // If accessing org-specific route, validate organization ID
            if (urlParts.length > 3) {
                const requestedOrgId = urlParts[3]; // /dashboard/[orgType]/[orgId]/...
                if (requestedOrgId !== userData.organization_id) {
                    return NextResponse.redirect(new URL('/access-denied', request.url));
                }
            }
        }

        return res;
    } catch (error) {
        console.error('Middleware error:', error);
        const errorUrl = new URL('/auth/error', request.url);
        errorUrl.searchParams.set('message', 'AUTH.SESSION_ERROR');
        return NextResponse.redirect(errorUrl);
    }
}

// Configure middleware to run on specific paths
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/org-select',
        '/profile',
        '/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|auth|registration-pending).*)',
    ]
}; 