import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();

    // Check for auth transition cookie
    const isAuthTransition = req.cookies.get('auth_transition');
    
    // Only protect dashboard routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
        try {
            console.log('🔒 Middleware session check:', {
                hasSession: !!session,
                path: req.nextUrl.pathname,
                isAuthTransition: !!isAuthTransition,
                timestamp: new Date().toISOString()
            });

            // If there's no session and not in auth transition
            if (!session && !isAuthTransition) {
                console.log('❌ No valid session, redirecting to sign-in');
                const redirectUrl = new URL('/sign-in', req.url);
                redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
                return NextResponse.redirect(redirectUrl);
            }

            // Clear auth transition cookie if it exists
            if (isAuthTransition) {
                res.cookies.delete('auth_transition');
            }

            return res;
        } catch (error) {
            console.error('🚨 Middleware error:', error);
            return NextResponse.redirect(new URL('/sign-in', req.url));
        }
    }

    return res;
}

export const config = {
    matcher: ['/dashboard/:path*', '/sign-in']
}; 