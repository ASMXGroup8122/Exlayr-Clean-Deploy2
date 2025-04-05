# Middleware & Permissions System

## Overview

The application uses Next.js middleware for authentication and permission control, with a hierarchical route-based permission system.

## Middleware Implementation

### Location
- Main middleware file: `src/middleware.ts`

### Features
1. **Path Filtering**
   - Public paths (no auth required)
   - Auth-specific paths (sign-in, sign-up, etc.)
   - Protected paths (require authentication)

2. **Authentication**
   - Session validation via Supabase
   - Automatic redirection to sign-in for unauthenticated users
   - Session refresh handling

3. **User Status Checks**
   - Validates user status (active/pending)
   - Redirects pending users to approval page
   - Organization validation for specific routes

## Permission System

### Route Permissions
Located in `src/lib/permissions.ts`:

```typescript
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
```

### Account Type Permissions
```typescript
export const accountTypePermissions: Record<AccountType, Permission[]> = {
    'admin': ['manage_users', 'manage_exchanges', 'view_exchanges', 'view_documents', 'view_knowledge_base'],
    'exchange_sponsor': ['view_exchanges', 'view_documents'],
    'issuer': ['view_documents'],
    'exchange': ['view_documents']
};
```

### Permission Types
```typescript
export type Permission = 
    | 'manage_users' 
    | 'view_documents' 
    | 'view_knowledge_base' 
    | 'manage_exchanges' 
    | 'view_exchanges';
```

## Route Access Control

### Hierarchical Permission Checking
1. Exact route match check
2. Parent route fallback
3. Default access (if no permissions defined)

### Example Flow
```typescript
// For route: /dashboard/admin/exchanges
1. Check exact match permissions
2. If no match, check parent (/dashboard/admin)
3. If still no match, allow access
```

## Protected Routes

### Admin Routes
- `/dashboard/admin/*` - Requires admin permissions
- `/dashboard/admin/exchanges` - Requires 'view_exchanges' permission
- `/dashboard/admin/users` - Requires 'manage_users' permission

### General Routes
- `/dashboard/documents` - Requires 'view_documents' permission
- `/dashboard/knowledge-base` - Requires 'view_knowledge_base' permission

## Usage in Components

### RouteGuard Component
Use the `RouteGuard` component to protect page content:

```typescript
export default function ProtectedPage() {
    return (
        <RouteGuard>
            <PageContent />
        </RouteGuard>
    );
}
```

## Error Handling

### Redirect Paths
- Unauthenticated: `/sign-in`
- Unauthorized: `/access-denied`
- Pending Approval: `/approval-pending`
- System Error: `/auth/error`

## Best Practices

1. **Route Definition**
   - Always define permissions for sensitive routes
   - Use parent route permissions for shared access control
   - Keep permission granularity appropriate to needs

2. **Permission Assignment**
   - Follow principle of least privilege
   - Group related permissions logically
   - Document permission changes

3. **Testing**
   - Verify permission changes in development
   - Test with different account types
   - Check parent route inheritance 