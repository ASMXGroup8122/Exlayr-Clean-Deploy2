import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Database } from '@/types/supabase';

// Constants for path matching
const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/auth/callback', '/auth/error'];
const AUTH_PATHS = ['/auth/callback', '/auth/error'];

// Helper functions
function shouldSkipAuth(request: NextRequest): boolean {
    const { pathname } = request.nextUrl;
    return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api/auth');
}

function redirectToSignIn(request: NextRequest) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
    try {
        // Create a response early to modify later
        const response = NextResponse.next();

        // Skip auth for public paths
        if (shouldSkipAuth(request)) {
            return response;
        }

        // Create supabase client
        const supabase = createMiddlewareClient<Database>({ req: request, res: response });

        // Get session and handle refresh if needed
        const {
            data: { session },
        } = await supabase.auth.getSession();

        // No session - redirect to sign in
        if (!session) {
            return redirectToSignIn(request);
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!profile) {
            console.error('No user profile found for session user');
            return redirectToSignIn(request);
        }

        // Special handling for admin users
        if (profile.account_type === 'admin' && profile.status === 'active') {
            return response;
        }

        // Special handling for organization admins
        if (profile.metadata?.is_org_admin === true && profile.status === 'active') {
            return response;
        }

        // Handle regular users based on status
        if (profile.status !== 'active') {
            const redirectUrl = new URL('/approval-pending', request.url);
            return NextResponse.redirect(redirectUrl);
        }

        // All checks passed
        return response;

    } catch (error) {
        console.error('Middleware error:', error);
        return redirectToSignIn(request);
    }
}

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