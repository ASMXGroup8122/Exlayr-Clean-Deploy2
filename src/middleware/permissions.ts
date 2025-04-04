import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { FeaturePermission, hasPermission } from '@/lib/permissions';

// Define route permissions
export const routePermissions: Record<string, FeaturePermission[]> = {
  // User Management
  '/dashboard/admin/users': ['manage_users'],
  '/dashboard/admin/users/new': ['manage_users'],
  
  // Organization Management
  '/dashboard/admin/issuers': ['manage_users'],
  '/dashboard/admin/issuers/new': ['manage_users'],
  '/dashboard/admin/sponsors': ['manage_users'],
  '/dashboard/admin/sponsors/new': ['manage_users'],
  '/dashboard/admin/exchanges': ['view_exchanges'],
  '/dashboard/admin/exchanges/new': ['manage_users'],
  
  // Approval Routes
  '/dashboard/admin/approvals': ['manage_users'],
  '/dashboard/admin/approvals/users': ['manage_users'],
  '/dashboard/admin/approvals/organizations': ['manage_users'],
  
  // Document Management
  '/dashboard/documents': ['view_documents'],
  '/dashboard/documents/upload': ['upload_documents'],
  
  // Knowledge Base
  '/dashboard/knowledge-base': ['view_knowledge_base'],
  '/dashboard/knowledge-base/create': ['create_knowledge_base'],
  
  // Settings
  '/dashboard/admin/settings': ['manage_settings'],
};

export async function permissionsMiddleware(request: NextRequest) {
  try {
    // Create Supabase client
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });

    // Get session and user data
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Get user's role from their account type
    const { data: userData, error } = await supabase
      .from('users')
      .select('account_type, status')
      .eq('id', session.user.id)
      .single();

    if (error || !userData) {
      console.error('Error fetching user data:', error);
      return NextResponse.redirect(new URL('/auth/error', request.url));
    }

    // Only allow approved users to access protected routes
    if (userData.status !== 'approved') {
      if (userData.status === 'pending') {
        return NextResponse.redirect(new URL('/auth/approval-pending', request.url));
      }
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Check if the route requires specific permissions
    const path = request.nextUrl.pathname;
    const requiredPermissions = routePermissions[path];

    if (requiredPermissions) {
      const hasAccess = requiredPermissions.every(permission => 
        hasPermission(userData.account_type, permission)
      );

      if (!hasAccess) {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Permissions middleware error:', error);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
} 