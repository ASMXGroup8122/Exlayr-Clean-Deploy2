# Authentication Standard for Exlayr

## Core Principles

1. **Authentication Flow**
   - Use PKCE (Proof Key for Code Exchange) flow exclusively
   - Coordinated session management between middleware and client
   - No manual session checking or management in components
   - No implicit flow or direct token handling

2. **Session Management**
   ```typescript
   // Middleware Session Management
   - Check session validity
   - Handle token refresh
   - Set coordination cookies
   - Manage redirects

   // Client Session Management
   - Respect middleware coordination
   - Handle auth state changes
   - Manage user context
   - Handle navigation state
   ```

3. **Session Coordination**
   ```typescript
   // Middleware sets coordination cookie
   response.cookies.set('auth_state', {
       refreshed: true,
       timestamp: Date.now(),
       access_token: refreshed.access_token
   }, {
       maxAge: 2,
       httpOnly: true
   });

   // Client respects coordination
   const checkAuthState = async () => {
       const authState = getAuthStateCookie();
       if (authState?.refreshed) {
           await waitForRefresh(authState.timestamp);
       }
       // Proceed with session fetch
   };
   ```

4. **Session States**
   - Initial Load: Fresh session check
   - Navigation: Use existing session
   - Refresh: Coordinated refresh
   - Expiry: Auto-refresh
   - Error: Redirect to sign-in

## Implementation Details

### 1. Middleware Implementation
```typescript
export async function handleAuth(request: NextRequest, response: NextResponse) {
    if (shouldSkipAuth(request)) return response;
    
    try {
        // Get session
        const { session } = await getSession();
        
        // Handle refresh if needed
        if (shouldRefreshSession(session)) {
            const refreshed = await refreshSession();
            setCoordinationCookie(response, refreshed);
        }
        
        return response;
    } catch (error) {
        return redirectToSignIn(request);
    }
}
```

### 2. Client Implementation
```typescript
function AuthProvider({ children }) {
    useEffect(() => {
        const checkAuthState = async () => {
            // Check for coordination
            await handleCoordination();
            
            // Get session
            const session = await getSession();
            
            // Update state
            updateAuthState(session);
        };
        
        checkAuthState();
    }, []);
}
```

### 3. Error Handling
```typescript
const ERROR_MESSAGES = {
    'AUTH.SESSION_ERROR': 'Session error occurred',
    'AUTH.REFRESH_ERROR': 'Failed to refresh session',
    'AUTH.COORDINATION_ERROR': 'Session coordination failed'
};
```

## Best Practices

1. **Session Management**
   - Always use middleware for session checks
   - Respect coordination cookies
   - Handle auth state changes properly
   - Clean up expired sessions

2. **Error Handling**
   - Log all auth errors
   - Provide user-friendly messages
   - Handle edge cases gracefully
   - Clean up on errors

3. **Security**
   - Use HTTPS only
   - Secure cookie settings
   - No sensitive data in logs
   - Regular security audits

## Testing

1. **Session Tests**
   ```typescript
   describe('Session Management', () => {
       test('handles fresh session');
       test('coordinates refresh');
       test('handles errors');
   });
   ```

2. **Integration Tests**
   ```typescript
   describe('Auth Flow', () => {
       test('sign in flow');
       test('refresh flow');
       test('error handling');
   });
   ```

## Debugging

1. **Session Issues**
   - Check coordination cookies
   - Verify token expiry
   - Check refresh timing
   - Validate auth state

2. **Common Problems**
   - Refresh loops
   - Missing coordination
   - Race conditions
   - State inconsistencies

## Security Considerations

1. **Cookie Security**
   - HttpOnly flags
   - Secure flags
   - SameSite policy
   - Short expiry times

2. **Token Management**
   - Secure storage
   - Regular rotation
   - Proper invalidation
   - Access control

## Maintenance

1. **Regular Tasks**
   - Monitor auth logs
   - Check error rates
   - Update security settings
   - Review access patterns

2. **Updates**
   - Document changes
   - Test thoroughly
   - Deploy carefully
   - Monitor impact 