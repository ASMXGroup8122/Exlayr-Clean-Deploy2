# Organization Admin Authentication and Access Standard

## Overview
This document outlines the standard flow for organization admin authentication and access in the Exlayr.AI platform. Organization admins (creators of organizations) follow a distinct authentication path that provides immediate dashboard access, bypassing standard organization status checks.

## Organization Admin Characteristics
```typescript
interface OrgAdmin {
    account_type: 'exchange_sponsor' | 'issuer' | 'exchange';
    is_org_admin: true;
    organization_id: string;  // Links to their organization
    status: string;  // Can be 'pending' or 'active'
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
   3. Identify is_org_admin flag
   4. Set user context
   5. Immediate redirect to organization dashboard
   ```

3. **Status Checks**
   - Organization admins bypass organization status checks
   - No approval flow verification needed
   - Direct access to dashboard on successful auth
   - Status field updates handled separately by approval process

## Routing Rules
1. **Organization Admin Routes**
   ```markdown
   /dashboard/{account_type}/*  // Based on organization type
   ```

2. **Protected Access**
   - All organization admin routes require:
     - Valid session
     - is_org_admin === true
     - Matching organization_id

## Implementation Notes

### 1. Authentication Context
```typescript
// Early return for organization admins
if (profile.is_org_admin === true) {
    setUser(profile);
    router.push(`/dashboard/${profile.account_type}`);
    return;
}
```

### 2. Key Differences from Regular Users
- No organization status checks
- No approval flow checks
- Direct dashboard access
- Ability to manage organization settings

### 3. Security Considerations
- is_org_admin flag must be explicitly set during organization creation
- No public registration as organization admin
- Regular session validation
- Protected route middleware checks

## Logging Standards
```typescript
// Organization admin authentication logging points
1. Sign in attempt
2. Profile fetch
3. Organization admin detection
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
1. **Organization Admin Authentication**
   - Always verify is_org_admin flag
   - Maintain separate org admin flow
   - Early return after org admin detection
   - Set user context before redirect

2. **Route Protection**
   - Use middleware checks
   - Verify org admin status
   - Validate organization ownership
   - Regular session checks

3. **State Management**
   - Clear user context on sign out
   - Maintain session consistency
   - Handle route changes securely

## Testing Requirements
1. **Authentication Tests**
   ```markdown
   - Successful org admin sign in
   - Failed authentication handling
   - Session management
   - Route protection
   ```

2. **Access Control Tests**
   ```markdown
   - Organization admin route access
   - Non-admin access attempts
   - Session expiry handling
   - Permission validation
   ```

## Relationship with Approval Process
1. **Organization Creation**
   - Creator automatically gets is_org_admin = true
   - Initial status set to 'pending'
   - Organization status set to 'pending'

2. **Organization Approval**
   - Organization status updated to 'active'
   - Creator's status updated to 'active'
   - Other members remain 'pending'

3. **Access Control**
   - Organization admin always has access regardless of status
   - Status field used for member approval process
   - Status updates don't affect admin access

## NOTES
1. Never modify organization admin authentication flow without security review
2. Maintain separation from regular user flows
3. Document all organization admin route changes
4. Regular security audits required
5. Organization admin status cannot be transferred (requires new organization creation)

## Session Management

### 1. Session Coordination
Organization admins follow the standard session coordination flow:
```typescript
// Middleware handling
if (isOrgAdmin && shouldRefreshSession(session)) {
    const refreshed = await refreshSession();
    setCoordinationCookie(response, {
        refreshed: true,
        timestamp: Date.now(),
        isOrgAdmin: true
    });
}

// Client handling
const checkOrgAdminSession = async () => {
    const authState = getAuthStateCookie();
    if (authState?.isOrgAdmin) {
        await handleOrgAdminCoordination(authState);
    }
    // Proceed with session check
};
```

### 2. Special Considerations
- Organization admins bypass organization status checks
- Session refresh still follows coordination pattern
- Auth state changes respect admin privileges
- Immediate dashboard access after coordination

### 3. Error Handling
```typescript
try {
    await checkOrgAdminSession();
} catch (error) {
    if (error.code === 'AUTH.COORDINATION_ERROR') {
        // Handle coordination failure
    } else if (error.code === 'AUTH.REFRESH_ERROR') {
        // Handle refresh failure
    }
}
``` 