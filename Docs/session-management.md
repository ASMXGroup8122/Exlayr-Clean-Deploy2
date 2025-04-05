# Session Management and Secondary Navigation

## Overview

This document outlines how Exlayr.AI handles session management and secondary navigation in the application, particularly focusing on protected routes and dashboard pages.

## Session Management

### 1. Session State

```typescript
// Session state management
const [isInitialized, setIsInitialized] = useState(false);
const [sessionStatus, setSessionStatus] = useState<'active' | 'expired' | 'refreshing'>('refreshing');
const [sessionError, setSessionError] = useState<string | null>(null);
```

### 2. Session Initialization

The application initializes the session on component mount:

```typescript
useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
        try {
            // Get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;

            if (!session) {
                // No session exists, try to refresh
                const { data: { session: refreshedSession }, error: refreshError } = 
                    await supabase.auth.refreshSession();
                
                if (refreshError) throw refreshError;
                
                if (!refreshedSession) {
                    if (mounted) {
                        setSessionStatus('expired');
                        setSessionError('No active session found');
                    }
                    router.push('/sign-in');
                    return;
                }
            }

            if (mounted) {
                setSessionStatus('active');
                setSessionError(null);
                setIsInitialized(true);
            }
        } catch (error) {
            console.error('Session initialization error:', error);
            if (mounted) {
                setSessionStatus('expired');
                setSessionError(error instanceof Error ? error.message : 'Session initialization failed');
            }
            router.push('/sign-in');
        }
    };

    initializeSession();

    // Cleanup function
    return () => {
        mounted = false;
    };
}, [router, supabase.auth]);
```

### 3. Session Change Listener

We maintain a listener for auth state changes:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
        if (mounted) {
            setSessionStatus('expired');
            setSessionError('User signed out');
        }
        router.push('/sign-in');
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (mounted) {
            setSessionStatus('active');
            setSessionError(null);
        }
    }
});
```

## Secondary Navigation

### 1. Session Verification

Before any data operations, we verify the session:

```typescript
const checkSession = async () => {
    if (!isInitialized) {
        throw new Error('Session not initialized');
    }

    if (sessionStatus === 'expired') {
        throw new Error('Session expired');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    
    if (!session) {
        setSessionStatus('expired');
        throw new Error('No active session');
    }

    return session;
};
```

### 2. Protected Route Handling

Protected routes implement the following pattern:

1. **Initial Load**:
   - Check session status
   - Redirect to sign-in if no valid session
   - Initialize component state only after session verification

2. **Secondary Navigation**:
   - Maintain session state across navigation
   - Re-verify session before data operations
   - Handle expired sessions gracefully

3. **Error Handling**:
   - Catch and handle session-related errors
   - Provide clear feedback to users
   - Redirect to appropriate pages when needed

### 3. Best Practices

1. **Session State**:
   - Always check session before data operations
   - Maintain session state across navigation
   - Handle session expiration gracefully

2. **Navigation**:
   - Use Next.js router for navigation
   - Preserve state where appropriate
   - Clean up subscriptions and listeners

3. **Error Handling**:
   - Provide clear error messages
   - Implement retry logic where appropriate
   - Handle edge cases (network issues, expired tokens)

## Implementation Example

```typescript
// Protected page component
export default function ProtectedPage() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'expired' | 'refreshing'>('refreshing');

    // Initialize session
    useEffect(() => {
        let mounted = true;
        
        const initializeSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    if (mounted) setSessionStatus('expired');
                    router.push('/sign-in');
                    return;
                }

                if (mounted) {
                    setSessionStatus('active');
                    setIsInitialized(true);
                }
            } catch (error) {
                if (mounted) setSessionStatus('expired');
                router.push('/sign-in');
            }
        };

        initializeSession();

        return () => {
            mounted = false;
        };
    }, []);

    // Handle data operations
    const handleDataOperation = async () => {
        try {
            await checkSession();
            // Proceed with data operation
        } catch (error) {
            // Handle error
        }
    };

    if (!isInitialized) {
        return <LoadingSpinner />;
    }

    return <PageContent />;
}
```

## Common Issues and Solutions

1. **Session Expiration During Operation**
   - Implement retry logic
   - Show appropriate error messages
   - Redirect to sign-in when necessary

2. **State Loss During Navigation**
   - Use appropriate state management
   - Implement proper cleanup
   - Preserve necessary state

3. **Race Conditions**
   - Use mounted flag
   - Implement proper async handling
   - Clean up subscriptions

## Security Considerations

1. **Session Management**
   - Never store sensitive data in client state
   - Use secure session storage
   - Implement proper token refresh

2. **Route Protection**
   - Verify session on both client and server
   - Implement proper middleware
   - Handle edge cases

3. **Error Handling**
   - Don't expose sensitive information
   - Log errors appropriately
   - Provide user-friendly messages

## Refresh Handling

### 1. Client Instance Management

When the page refreshes, you might encounter multiple Supabase client instances. To prevent this:

```typescript
// Create a singleton instance
let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = () => {
    if (!supabaseInstance) {
        supabaseInstance = createClientComponentClient<Database>();
    }
    return supabaseInstance;
};

// Use in component
export default function ProtectedPage() {
    const supabase = useMemo(() => getSupabaseClient(), []);
    // ... rest of the component
}
```

### 2. Resource Preloading

To handle resource preloading warnings:

```typescript
// In your layout or page component
useEffect(() => {
    // Clean up any unused preloaded resources
    const cleanup = () => {
        const unusedLinks = document.querySelectorAll('link[rel="preload"][as]');
        unusedLinks.forEach(link => {
            if (!link.getAttribute('data-used')) {
                link.remove();
            }
        });
    };

    window.addEventListener('load', cleanup);
    return () => window.removeEventListener('load', cleanup);
}, []);
```

### 3. State Rehydration

On page refresh, ensure state is properly rehydrated:

```typescript
useEffect(() => {
    let mounted = true;

    const rehydrateState = async () => {
        try {
            // First check session
            const session = await checkSession();
            if (!session) return;

            // Then rehydrate necessary state
            if (mounted) {
                // Fetch and restore any necessary state
                const savedState = localStorage.getItem('savedState');
                if (savedState) {
                    // Restore state carefully
                    const parsed = JSON.parse(savedState);
                    // ... restore relevant state
                }
            }
        } catch (error) {
            console.error('State rehydration error:', error);
        }
    };

    rehydrateState();

    return () => {
        mounted = false;
    };
}, []);
```

### 4. Best Practices for Refresh Handling

1. **Client Instance Management**:
   - Use singleton pattern for client instances
   - Clean up unused instances
   - Handle concurrent access properly

2. **Resource Loading**:
   - Properly mark preloaded resources with appropriate 'as' attributes
   - Clean up unused preloaded resources
   - Monitor resource loading performance

3. **State Management**:
   - Implement proper state rehydration
   - Handle race conditions during refresh
   - Clean up stale state

4. **Error Recovery**:
   - Implement retry mechanisms
   - Provide clear feedback during refresh
   - Handle failed refreshes gracefully 