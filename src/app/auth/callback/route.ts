import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get('code');
        const next = requestUrl.searchParams.get('next') || '/dashboard';

        if (!code) {
            return NextResponse.redirect(
                new URL('/auth/error?message=AUTH.CODE_MISSING', request.url)
            );
        }

        // Create Supabase client
        const supabase = await createClient();

        // Exchange code for session
        const { data: { session }, error: exchangeError } = 
            await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError || !session?.user) {
            console.error('Session exchange error:', exchangeError);
            return NextResponse.redirect(
                new URL('/auth/error?message=AUTH.SESSION_ERROR', request.url)
            );
        }

        // Check if profile exists
        const { data: existingProfile, error: profileError } = await supabase
            .from('users')
            .select()
            .eq('id', session.user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.redirect(
                new URL('/auth/error?message=AUTH.PROFILE_ERROR', request.url)
            );
        }

        // Create profile if it doesn't exist
        if (!existingProfile) {
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: session.user.id,
                    email: session.user.email,
                    first_name: session.user.user_metadata.first_name,
                    last_name: session.user.user_metadata.last_name,
                    company_name: session.user.user_metadata.company_name,
                    account_type: session.user.user_metadata.account_type,
                    is_admin: session.user.user_metadata.is_admin,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('Profile creation error:', insertError);
                return NextResponse.redirect(
                    new URL('/auth/error?message=AUTH.PROFILE_CREATE_ERROR', request.url)
                );
            }

            // New users need to select organization
            return NextResponse.redirect(new URL('/org-select', request.url));
        }

        // Handle different user states
        if (existingProfile.status === 'pending') {
            return NextResponse.redirect(new URL('/approval-pending', request.url));
        }

        // Create response with auth transition cookie
        const response = NextResponse.redirect(new URL(next, request.url));
        
        // Add auth transition cookie to handle page loads during auth state change
        response.cookies.set('auth_transition', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 // 30 seconds
        });

        return response;

    } catch (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(
            new URL('/auth/error?message=AUTH.CALLBACK_ERROR', request.url)
        );
    }
} 