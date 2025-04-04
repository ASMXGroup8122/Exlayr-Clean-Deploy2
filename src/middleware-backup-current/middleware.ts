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
    '/register-organization'
];

// Define auth-specific paths that need special handling
const AUTH_PATHS = [
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/auth/error',
    '/auth/verify-email'
];

export async function middleware(request: NextRequest) {
    try {
        // Create a response to modify
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

        // Create Supabase client
        const supabase = createMiddlewareClient({ 
            req: request, 
            res
        });

        // Try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error in middleware:', sessionError);
            return redirectToSignIn(request);
        }

        // If no session, redirect to sign-in
        if (!session) {
            return redirectToSignIn(request);
        }

        // If session exists but is expired, try to refresh
        if (session.expires_at && Date.now() / 1000 > session.expires_at) {
            const { data: { session: refreshedSession }, error: refreshError } = 
                await supabase.auth.refreshSession();

            if (refreshError || !refreshedSession) {
                console.error('Session refresh error:', refreshError);
                return redirectToSignIn(request);
            }
        }

        // Get user data to check status and organization
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('status, account_type, organization_id')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            console.error('User data error:', userError);
            return redirectToSignIn(request);
        }

        // Handle user status checks
        if (userData.status === 'pending') {
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

        // Set session cookie with appropriate options
        res.cookies.set('sb-auth-token', session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return res;

    } catch (error) {
        console.error('Middleware error:', error);
        return redirectToSignIn(request);
    }
}

function redirectToSignIn(request: NextRequest) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
}

// Update config to include all paths that need middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
}; 