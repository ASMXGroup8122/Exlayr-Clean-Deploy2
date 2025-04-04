import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, NextRequest } from 'next/server';

export async function checkPermissions(request: NextRequest, response: NextResponse) {
    const supabase = createMiddlewareClient({ req: request, res: response });
    
    try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return response; // Auth middleware will handle this

        // Get user data to check status and organization
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('status, account_type, organization_id')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            console.error('User data error:', userError);
            return NextResponse.redirect(new URL('/auth/error?message=AUTH.USER_ERROR', request.url));
        }

        // Handle user status checks
        if (userData.status === 'pending') {
            if (!request.nextUrl.pathname.includes('pending')) {
                return NextResponse.redirect(new URL('/approval-pending', request.url));
            }
            return response;
        }

        // Handle organization-specific routes
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            const urlParts = request.nextUrl.pathname.split('/');
            const requestedSection = urlParts[2]; // /dashboard/[section]/...
            
            // Handle admin routes
            if (requestedSection === 'admin') {
                if (userData.account_type !== 'admin') {
                    return NextResponse.redirect(new URL('/access-denied', request.url));
                }
                return response;
            }

            // Validate organization type matches user's account type
            if (requestedSection === 'sponsor' && userData.account_type !== 'exchange_sponsor' ||
                requestedSection === 'issuer' && userData.account_type !== 'issuer' ||
                requestedSection === 'exchange' && userData.account_type !== 'exchange') {
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

        return response;
    } catch (error) {
        console.error('Permissions middleware error:', error);
        return NextResponse.redirect(new URL('/auth/error?message=AUTH.PERMISSION_ERROR', request.url));
    }
} 