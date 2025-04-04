import { AccountType } from '@/types/supabase';

// Define organization types
export type OrganizationType = 'issuer' | 'exchange_sponsor' | 'exchange';

// Define user roles within organizations
export type OrganizationRole = 'admin' | 'employee' | 'advisor';

// Define feature permissions
export type FeaturePermission = 
  // Dashboard Access
  | 'view_dashboard'
  
  // User Management
  | 'manage_users'
  | 'approve_users'
  | 'reject_users'
  | 'view_user_requests'
  
  // Organization Management
  | 'manage_organizations'
  | 'approve_organizations'
  | 'reject_organizations'
  | 'view_organization_requests'
  
  // Document Management
  | 'view_documents'
  | 'upload_documents'
  | 'approve_documents'
  | 'reject_documents'
  
  // Knowledge Base
  | 'create_knowledge_base'
  | 'view_knowledge_base'
  | 'edit_knowledge_base'
  
  // Settings
  | 'manage_settings'
  | 'view_settings'
  
  // Exchange Management
  | 'manage_exchanges'
  | 'view_exchanges';

// Define permission map for each role
export const rolePermissions: Record<OrganizationRole, FeaturePermission[]> = {
  admin: [
    // Dashboard
    'view_dashboard',
    
    // User Management
    'manage_users',
    'approve_users',
    'reject_users',
    'view_user_requests',
    
    // Organization Management
    'manage_organizations',
    'approve_organizations',
    'reject_organizations',
    'view_organization_requests',
    
    // Document Management
    'view_documents',
    'upload_documents',
    'approve_documents',
    'reject_documents',
    
    // Knowledge Base
    'create_knowledge_base',
    'view_knowledge_base',
    'edit_knowledge_base',
    
    // Settings
    'manage_settings',
    'view_settings',
    
    // Exchange Management
    'manage_exchanges',
    'view_exchanges'
  ],
  
  employee: [
    // Dashboard
    'view_dashboard',
    
    // Document Management
    'view_documents',
    'upload_documents',
    
    // Knowledge Base
    'view_knowledge_base',
    
    // Settings
    'view_settings'
  ],
  
  advisor: [
    // Dashboard
    'view_dashboard',
    
    // Document Management
    'view_documents',
    
    // Knowledge Base
    'create_knowledge_base',
    'view_knowledge_base',
    'edit_knowledge_base',
    
    // Settings
    'view_settings'
  ]
};

// Helper function to check if a user has a specific permission
export function hasPermission(
  userRole: OrganizationRole,
  permission: FeaturePermission
): boolean {
  return rolePermissions[userRole]?.includes(permission) ?? false;
}

// Helper function to get all permissions for a role
export function getRolePermissions(role: OrganizationRole): FeaturePermission[] {
  return rolePermissions[role] || [];
}

// Helper function to check if a user can access a specific feature
export function canAccessFeature(
  userRole: OrganizationRole,
  requiredPermissions: FeaturePermission[]
): boolean {
  return requiredPermissions.every(permission => hasPermission(userRole, permission));
}

export type Permission = 'manage_users' | 'view_documents' | 'view_knowledge_base' | 'manage_exchanges' | 'view_exchanges';

export const routePermissions: Record<string, Permission[]> = {
    // Admin section
    '/dashboard/admin': ['manage_users', 'view_exchanges'],
    '/dashboard/admin/users': ['manage_users'],
    '/dashboard/admin/exchanges': ['view_exchanges'],
    '/dashboard/admin/exchanges/new': ['manage_exchanges'],
    
    // General routes
    '/dashboard/documents': ['view_documents'],
    '/dashboard/knowledge-base': ['view_knowledge_base']
};

export const accountTypePermissions: Record<AccountType, Permission[]> = {
    'admin': ['manage_users', 'manage_exchanges', 'view_exchanges', 'view_documents', 'view_knowledge_base'],
    'exchange_sponsor': ['view_exchanges', 'view_documents'],
    'issuer': ['view_documents'],
    'exchange': ['view_documents']
};

// Account type permissions
export function hasAccountTypePermission(accountType: AccountType, permission: Permission): boolean {
    return accountTypePermissions[accountType]?.includes(permission) || false;
}

export function hasRouteAccess(accountType: AccountType, route: string): boolean {
    // Normalize the route by removing trailing slash
    const normalizedRoute = route.replace(/\/$/, '');
    
    // Log for debugging
    console.log('Checking route access:', {
        accountType,
        route: normalizedRoute,
        permissions: routePermissions[normalizedRoute],
        accountPermissions: accountTypePermissions[accountType]
    });

    // Check exact route match first
    const exactPermissions = routePermissions[normalizedRoute];
    if (exactPermissions) {
        const hasAccess = exactPermissions.some(permission => hasAccountTypePermission(accountType, permission));
        console.log('Exact match found, access result:', hasAccess);
        return hasAccess;
    }

    // If no exact match, check parent routes
    const routeParts = normalizedRoute.split('/');
    while (routeParts.length > 1) {
        routeParts.pop(); // Remove last segment
        const parentRoute = routeParts.join('/');
        console.log('Checking parent route:', parentRoute);
        
        const parentPermissions = routePermissions[parentRoute];
        if (parentPermissions) {
            const hasAccess = parentPermissions.some(permission => hasAccountTypePermission(accountType, permission));
            console.log('Parent match found for', parentRoute, 'access result:', hasAccess);
            return hasAccess;
        }
    }

    // If no permissions defined for route or any parent, allow access
    console.log('No permissions defined for route or parents, allowing access');
    return true;
} 