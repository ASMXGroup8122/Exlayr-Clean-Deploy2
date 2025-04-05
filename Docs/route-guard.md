# RouteGuard Component Documentation

## Overview
The RouteGuard component is a client-side authentication and authorization wrapper that protects routes based on user account types and admin status. It handles both platform-level and organization-level access control.

## Features
- Client-side route protection
- Account type-based access control
- Organization admin privilege handling
- Automatic redirection for unauthorized access
- Loading state management

## Type Definitions

### UserMetadata
```typescript
interface UserMetadata {
    is_org_admin?: boolean;
    [key: string]: any;
}
```
- `is_org_admin`: Boolean flag stored in user metadata indicating organization admin status
- Additional metadata fields are allowed through index signature

### RouteGuardProps
```typescript
interface RouteGuardProps {
    children: React.ReactNode;
    allowedTypes?: AccountType[];
}
```
- `children`: Protected content to render
- `allowedTypes`: Array of account types allowed to access the route

## Access Control Logic

### Organization Admin Access
1. Organization admin status is checked via the `getIsOrgAdmin` helper:
   ```typescript
   const getIsOrgAdmin = (metadata: UserProfile['metadata']): boolean => {
       if (!metadata || typeof metadata !== 'object') return false;
       return (metadata as UserMetadata).is_org_admin === true;
   };
   ```
2. Access is granted if either:
   - User's account type is in `allowedTypes`
   - User is an organization admin AND their account type is in `allowedTypes`

### Access Denied Behavior
- Unauthenticated users are redirected to `/sign-in`
- Unauthorized users are redirected to their type-specific dashboard: `/dashboard/${user.account_type}`
- Detailed access denial logs include:
  - User's account type
  - Organization admin status
  - Allowed account types

## Usage Example
```typescript
// Protect an admin-only route
<RouteGuard allowedTypes={['admin']}>
  <AdminDashboard />
</RouteGuard>

// Protect a route for both regular users and admins
<RouteGuard allowedTypes={['user', 'admin']}>
  <SharedContent />
</RouteGuard>
```

## Security Considerations
1. **Metadata Validation**: The component safely handles missing or malformed metadata
2. **Type Safety**: Uses TypeScript for compile-time type checking
3. **Double Protection**: Implements both useEffect checks and render-time validation
4. **Safe Defaults**: Defaults to denying access when validation fails

## Best Practices
1. Always specify `allowedTypes` for protected routes
2. Use in combination with server-side validation
3. Keep route protection consistent across similar routes
4. Monitor access denial logs for security issues

## Error Handling
- Invalid metadata returns `false` for admin status
- Loading states are properly handled
- Failed authorizations trigger redirects
- Console logs provide debugging information

## Dependencies
- Next.js Router (`next/navigation`)
- AuthContext (`@/contexts/AuthContext`)
- Database types (`@/types/supabase`)

## Performance Considerations
- Minimal re-renders due to proper dependency array usage
- Early returns for unauthorized states
- Efficient metadata checking 