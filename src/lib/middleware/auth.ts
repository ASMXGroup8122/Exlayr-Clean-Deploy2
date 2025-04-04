import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, NextRequest } from 'next/server';
import { PUBLIC_PATHS, AUTH_PATHS, SESSION_CONFIG } from './constants';

function shouldSkipAuth(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    return (
        PUBLIC_PATHS.some(p => path.startsWith(p)) ||
        AUTH_PATHS.some(p => path.startsWith(p))
    );
}

function shouldRefreshSession(session: any): boolean {
    if (!session?.expires_at) return false;
    // Refresh if less than 5 minutes remaining or if token is expired
    return (
        (session.expires_at - Date.now() / 1000) < SESSION_CONFIG.REFRESH_THRESHOLD_SECONDS ||
        Date.now() / 1000 > session.expires_at
    );
}

function redirectToSignIn(request: NextRequest) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
}

export async function handleAuth(request: NextRequest, response: NextResponse) {
    // Skip middleware for public and auth paths
    if (shouldSkipAuth(request)) return response;

    const supabase = createMiddlewareClient({ req: request, res: response });
    
    try {
        // Get session without forcing refresh
        const { data: { session }, error: sessionError } = 
            await supabase.auth.getSession();

        if (sessionError) {
            console.error('Session error:', sessionError);
            return redirectToSignIn(request);
        }

        if (!session) {
            return redirectToSignIn(request);
        }

        // Handle session refresh if needed
        if (shouldRefreshSession(session)) {
            console.log('Refreshing session...');
            const { data: { session: refreshed }, error: refreshError } = 
                await supabase.auth.refreshSession();
                
            if (refreshError || !refreshed) {
                console.error('Session refresh error:', refreshError);
                return redirectToSignIn(request);
            }

            // Set coordination cookie with timestamp
            response.cookies.set('auth_state', JSON.stringify({
                refreshed: true,
                timestamp: Date.now(),
                access_token: refreshed.access_token
            }), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 2 // 2 seconds, just long enough for coordination
            });

            // Let Supabase handle session cookie management
            response.headers.set('x-supabase-auth', JSON.stringify({
                access_token: refreshed.access_token,
                refresh_token: refreshed.refresh_token
            }));
        }

        return response;
    } catch (error) {
        console.error('Auth middleware error:', error);
        return redirectToSignIn(request);
    }
} 