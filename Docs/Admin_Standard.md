# Admin Authentication and Access Standard

## Overview
This document outlines the standard flow for admin authentication and access in the Exlayr.AI platform. Admin users follow a distinct authentication path separate from organization users to ensure immediate dashboard access without organization status checks.

## Admin User Characteristics
```typescript
interface AdminUser {
    account_type: 'admin';
    status: 'active';
    organization_id: null;  // Admins don't belong to organizations
}
```

## Authentication Flow
1. **Sign In Initiation**
   ```typescript
   // User submits credentials
   email: string;
   password: string;
   ```

2. **Authentication Steps**
   ```markdown
   1. Initial authentication with Supabase
   2. Fetch user profile
   3. Identify admin account_type
   4. Set user context
   5. Immediate redirect to admin dashboard
   ```

3. **Status Checks**
   - Admin users bypass organization status checks
   - No organization relationship verification needed
   - Direct access to dashboard on successful auth

## Routing Rules
1. **Admin Routes**
   ```markdown
   /dashboard/admin/*  // All admin routes
   ```

2. **Protected Access**
   - All admin routes require:
     - Valid session
     - account_type === 'admin'
     - status === 'active'

## Implementation Notes

### 1. Authentication Context
```typescript
// Early return for admin users
if (profile.account_type === 'admin') {
    setUser(profile);
    router.push('/dashboard/admin');
    return;
}
```

### 2. Key Differences from Organization Users
- No organization status checks
- No approval flow
- Direct dashboard access
- Separate routing rules

### 3. Security Considerations
- Admin status must be explicitly set in database
- No public registration as admin
- Regular session validation
- Protected route middleware checks

## Logging Standards
```typescript
// Admin authentication logging points
1. Sign in attempt
2. Profile fetch
3. Admin detection
4. Redirect to dashboard
```

## Error Handling
1. **Authentication Failures**
   ```markdown
   - Invalid credentials → /auth/error
   - Profile fetch failure → /auth/error
   - Session validation failure → /sign-in
   ```

2. **Access Control**
   ```markdown
   - Invalid admin status → /auth/error
   - Missing permissions → /access-denied
   ```

## Best Practices
1. **Admin Authentication**
   - Always verify account_type
   - Maintain separate admin flow
   - Early return after admin detection
   - Set user context before redirect

2. **Route Protection**
   - Use middleware checks
   - Verify admin status
   - Validate permissions
   - Regular session checks

3. **State Management**
   - Clear user context on sign out
   - Maintain session consistency
   - Handle route changes securely

## Testing Requirements
1. **Authentication Tests**
   ```markdown
   - Successful admin sign in
   - Failed authentication handling
   - Session management
   - Route protection
   ```

2. **Access Control Tests**
   ```markdown
   - Admin route access
   - Non-admin access attempts
   - Session expiry handling
   - Permission validation
   ```

## NOTES
1. Never modify admin authentication flow without security review
2. Maintain separation from organization flows
3. Document all admin route changes
4. Regular security audits required

## Session Management

### 1. Admin Session Coordination
Admin users follow a specialized session coordination flow:
```typescript
// Middleware handling
if (isAdmin && shouldRefreshSession(session)) {
    const refreshed = await refreshSession();
    setCoordinationCookie(response, {
        refreshed: true,
        timestamp: Date.now(),
        isAdmin: true
    });
}

// Client handling
const checkAdminSession = async () => {
    const authState = getAuthStateCookie();
    if (authState?.isAdmin) {
        await handleAdminCoordination(authState);
    }
    // Proceed with session check
};
```

### 2. Special Considerations
- Admins bypass all organization checks
- Session refresh follows coordination pattern
- Auth state changes respect admin status
- Direct dashboard access after coordination

### 3. Error Handling
```typescript
try {
    await checkAdminSession();
} catch (error) {
    if (error.code === 'AUTH.COORDINATION_ERROR') {
        // Handle coordination failure
    } else if (error.code === 'AUTH.REFRESH_ERROR') {
        // Handle refresh failure
    }
}
``` 