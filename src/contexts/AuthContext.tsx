'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Database } from '@/types/supabase';
import { AuthError, Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { getSupabaseClient } from '@/lib/supabase/client';
import SearchParamsProvider from '@/components/SearchParamsProvider';
import { isActiveAdmin, isActiveOrgAdmin, getDashboardPath } from '@/lib/auth/helpers';
import { supabaseWithTimeout } from '@/lib/utils/requestTimeout';

type UserProfile = Database['public']['Tables']['users']['Row'] & {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone_number?: string;
  user_role?: string;
  is_org_admin?: boolean;
  location?: string;
};

interface SignUpData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    company_name: string;
    phone_number?: string;
    account_type: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer';
    organization_id: string;
    user_role: 'employee' | 'advisor';
    status: 'pending';
    is_org_admin: boolean;
}

interface Organization {
    id: string;
    name: string;
}

interface BasicSignUpData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    company_name: string;
    phone_number?: string;
    account_type: 'issuer' | 'exchange_sponsor' | 'exchange';
}

interface OrganizationSelectionData {
    account_type: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer';
    organization_id: string;
    user_role: 'employee' | 'advisor';
}

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    loading: boolean;
    initialized: boolean;
    signOut: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    basicSignUp: (data: BasicSignUpData) => Promise<void>;
    completeSignUp: (data: OrganizationSelectionData) => Promise<void>;
    fetchOrganizations: (accountType: string) => Promise<Organization[]>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generatePKCEVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

function base64URLEncode(buffer: Uint8Array) {
    return btoa(String.fromCharCode.apply(null, Array.from(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function generatePKCEChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = getSupabaseClient();
    const initializationRef = useRef(false);

    const getDashboardPath = (accountType: string) => {
        switch (accountType) {
            case 'exchange_sponsor':
                return '/dashboard/sponsor';
            case 'admin':
                return '/dashboard/admin';
            default:
                return `/dashboard/${accountType}`;
        }
    };

    const basicSignUp = async (data: BasicSignUpData) => {
        try {
            console.log('=== SIGN UP FLOW START ===');
            setLoading(true);
            
            // 1. Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        first_name: data.first_name,
                        last_name: data.last_name,
                        company_name: data.company_name,
                        phone_number: data.phone_number,
                        account_type: data.account_type
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('No user data returned');

            console.log('Auth user created successfully:', authData.user.id);

            // 2. Create user profile
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: data.email,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    company_name: data.company_name,
                    phone_number: data.phone_number,
                    account_type: data.account_type,
                    status: 'pending'
                });

            if (profileError) {
                console.error('Error creating user profile:', profileError);
                throw profileError;
            }

            console.log('User profile created successfully');

            // Wait a moment to ensure the user profile is properly created in the database
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Remove manual cookie - rely on Supabase's auth state change events
            // The onAuthStateChange listener will handle the auth state update

            // 3. Redirect to select-organization (correct path)
            router.push('/select-organization');

        } catch (error) {
            console.error('=== SIGN UP FLOW ERROR ===', error);
            if (error instanceof AuthError) {
                router.push(`/auth/error?message=${error.message}`);
            } else {
                router.push('/auth/error?message=signup-failed');
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const completeSignUp = async (data: OrganizationSelectionData) => {
        try {
            console.log('=== COMPLETE SIGN UP FLOW START ===', data);
            console.log('User session:', session);
            setLoading(true);
            
            if (!session?.user) {
                console.error('No authenticated session found');
                throw new Error('No authenticated session found');
            }

            console.log('1. Updating user profile with organization details');
            console.log('User ID:', session.user.id);
            console.log('Organization ID:', data.organization_id);
            console.log('Account Type:', data.account_type);
            console.log('User Role:', data.user_role);
            
            // Update existing user profile with organization details
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    account_type: data.account_type,
                    organization_id: data.organization_id,
                    user_role: data.user_role
                })
                .eq('id', session.user.id);

            if (updateError) {
                console.error('Failed to update user profile:', updateError);
                throw updateError;
            }
            console.log('User profile updated successfully');

            console.log(`2. Adding user to ${data.account_type} member table`);
            // Add user to the appropriate member table based on account type
            let memberAddSuccess = false;
            
            switch (data.account_type) {
                case 'exchange':
                    try {
                        // Use the actual role value from user selection
                        // This should be 'employee' or 'advisor'
                        const roleValue = data.user_role;
                        
                        console.log('Attempting to add user to exchange_member_roles table with role:', roleValue);
                        
                        const { data: insertData, error: memberError } = await supabase
                            .from('exchange_member_roles')
                            .insert({
                                user_id: session.user.id,
                                exchange_id: data.organization_id,
                                status: 'pending',
                                role: roleValue
                            })
                            .select();
                        
                        if (memberError) {
                            console.error(`Failed to add user to exchange_member_roles with role '${roleValue}':`, memberError);
                            throw memberError;
                        }
                        
                        console.log('Successfully added user to exchange_member_roles table, response:', insertData);
                        memberAddSuccess = true;
                    } catch (error) {
                        console.error('Error adding exchange member:', error);
                        throw error; // Rethrow to stop the flow if this fails
                    }
                    break;
                
                case 'issuer':
                    try {
                        // Add user to user_issuers table
                        const { error: issuerMemberError } = await supabase
                            .from('user_issuers')
                            .insert({
                                user_id: session.user.id,
                                issuer_id: data.organization_id,
                                status: 'pending',
                                role: data.user_role
                            });
                        
                        if (issuerMemberError) {
                            console.error('Failed to add user to user_issuers:', issuerMemberError);
                            throw issuerMemberError;
                        }
                        console.log('Successfully added user to user_issuers table');
                        memberAddSuccess = true;
                    } catch (error) {
                        console.error('Error adding issuer member:', error);
                        throw error; // Rethrow to stop the flow if this fails
                    }
                    break;
                
                case 'exchange_sponsor':
                    try {
                        // Try exchange_sponsor table
                        const { error: sponsorMemberError } = await supabase
                            .from('exchange_sponsor')
                            .insert({
                                user_id: session.user.id,
                                sponsor_id: data.organization_id,
                                status: 'pending',
                                role: data.user_role
                            });
                        
                        if (sponsorMemberError) {
                            console.error('Failed to add user to exchange_sponsor:', sponsorMemberError);
                            throw sponsorMemberError;
                        }
                        console.log('Successfully added user to exchange_sponsor table');
                        memberAddSuccess = true;
                    } catch (error) {
                        console.error('Error adding sponsor member:', error);
                        throw error; // Rethrow to stop the flow if this fails
                    }
                    break;
            }

            console.log(`Member add success: ${memberAddSuccess}`);

            console.log('3. Fetching updated user profile');
            // Ensure we have the latest user data
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.error('Failed to fetch updated user profile:', profileError);
                    // Don't throw here, just log the error and continue
                } else if (profile) {
                    // Update local state
                    setUser(profile);
                    console.log('4. Updated user state with profile:', profile);
                } else {
                    console.warn('No profile found, but continuing with flow');
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                // Don't throw here, just log the error and continue
            }

            // Set auth transition cookie with account type
            document.cookie = `auth_transition=true; path=/; max-age=5`;
            document.cookie = `account_type=${data.account_type}; path=/; max-age=5`;
            document.cookie = `organization_id=${data.organization_id}; path=/; max-age=5`;
            document.cookie = `user_role=${data.user_role}; path=/; max-age=5`;
            console.log('5. Set auth transition cookies');

            // Redirect directly to the appropriate pending page based on account type
            console.log(`6. Redirecting to pending approval page for ${data.account_type}`);
            
            // Determine the appropriate pending page based on account type
            let pendingPage = '/approval-pending';
            switch (data.account_type) {
                case 'exchange':
                    pendingPage = '/approval-pending-exchange';
                    break;
                case 'issuer':
                    pendingPage = '/approval-pending-issuer';
                    break;
                case 'exchange_sponsor':
                    pendingPage = '/approval-pending-sponsor';
                    break;
            }
            
            // If the specific pending page doesn't exist, fall back to the generic approval-request page
            try {
                router.push(pendingPage);
            } catch (error) {
                console.warn(`Pending page ${pendingPage} not found, falling back to approval-request`);
                router.push(`/approval-request?type=${data.account_type}&org=${data.organization_id}&role=${data.user_role}&skip_selection=true`);
            }

        } catch (error) {
            console.error('=== COMPLETE SIGN UP FLOW ERROR ===', error);
            if (error instanceof AuthError) {
                router.push(`/auth/error?message=${error.message}`);
            } else {
                router.push('/auth/error?message=profile-update-failed');
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            console.log('🔴 Starting complete sign out process...');
            setLoading(true);
            
            // Step 1: Immediately clear local auth state
            setUser(null);
            setSession(null);
            
            // Step 2: Clear ALL possible Supabase cookies and localStorage
            const allCookies = [
                'sb-access-token',
                'sb-refresh-token', 
                'sb-token',
                'sb-provider-token',
                'sb-user',
                'supabase.auth.token',
                'supabase-auth-token',
                'auth_state',
                'auth_transition',
                'account_type',
                'organization_id',
                'user_role',
                'pkce_code_verifier'
            ];
            
            // Clear each cookie with multiple domains/paths
            allCookies.forEach(cookieName => {
                // Clear for current domain with different paths
                document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                document.cookie = `${cookieName}=; path=/dashboard; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                document.cookie = `${cookieName}=; path=/sign-in; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                // Clear for domain variations
                document.cookie = `${cookieName}=; domain=.localhost; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                document.cookie = `${cookieName}=; domain=localhost; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
            });

            // Step 3: Clear localStorage completely
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (storageError) {
                console.warn('Storage clear failed:', storageError);
            }
            
            // Step 4: Sign out from Supabase (with timeout)
            try {
                const signOutPromise = supabase.auth.signOut();
                await Promise.race([
                    signOutPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('SignOut timeout')), 3000)
                    )
                ]);
                console.log('Supabase signOut completed');
            } catch (supabaseError) {
                console.warn('Supabase signOut failed or timed out:', supabaseError);
                // Continue anyway - we've already cleared local state
            }
            
            console.log('🔴 Sign out completed - redirecting...');
            
            // Step 5: Force redirect with page reload to ensure clean state
            window.location.href = '/sign-in';
            
        } catch (error) {
            console.error('Sign out error:', error);
            // Even if signOut fails, force clear everything and redirect
            setUser(null);
            setSession(null);
            
            // Nuclear option: clear all cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            localStorage.clear();
            window.location.href = '/sign-in';
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        console.log('🔵 FAST SIGN IN: Starting...');
        
        try {
            setLoading(true);
            
            // Step 1: Quick sign in with timeout
            const signInPromise = supabase.auth.signInWithPassword({ email, password });
            const { data, error } = await Promise.race([
                signInPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Sign-in timeout')), 8000)
                )
            ]) as any;

            if (error) {
                console.error('🔵 Sign in failed:', error);
                throw error;
            }

            if (!data?.user) {
                throw new Error('No user data returned');
            }

            console.log('🔵 Auth successful, fetching profile...');
            
            // Step 2: Quick profile fetch with timeout
            const profilePromise = supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();
                
            const { data: profile, error: profileError } = await Promise.race([
                profilePromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Profile timeout')), 5000)
                )
            ]) as any;

            if (profileError || !profile) {
                console.error('🔵 Profile fetch failed:', profileError);
                throw new Error('Failed to load user profile');
            }

            console.log('🔵 Profile loaded:', profile.account_type);
            setUser(profile);

            // Step 3: Fast redirect based on account type (no org status checks)
            let redirectPath = '/dashboard';
            
            switch (profile.account_type) {
                case 'admin':
                    redirectPath = '/dashboard/admin';
                    break;
                case 'exchange_sponsor':
                    redirectPath = profile.organization_id 
                        ? `/dashboard/sponsor/${profile.organization_id}` 
                        : '/select-organization';
                    break;
                case 'exchange':
                    redirectPath = profile.organization_id 
                        ? '/dashboard/exchange' 
                        : '/select-organization';
                    break;
                case 'issuer':
                    redirectPath = profile.organization_id 
                        ? '/dashboard/issuer' 
                        : '/select-organization';
                    break;
                default:
                    redirectPath = '/select-organization';
            }

            console.log('🔵 Redirecting to:', redirectPath);
            router.push(redirectPath);

        } catch (error: any) {
            console.error('🔵 SIGN IN ERROR:', error);
            if (error instanceof AuthError) {
                router.push(`/auth/error?message=${error.message}`);
            } else {
                router.push('/auth/error?message=signin-failed');
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const fetchOrganizations = async (accountType: string): Promise<Organization[]> => {
        try {
            let query;
            switch (accountType) {
                case 'exchange_sponsor':
                    query = supabase.from('exchange_sponsor').select('id, sponsor_name');
                    break;
                case 'issuer':
                    query = supabase.from('issuers').select('id, issuer_name');
                    break;
                case 'exchange':
                    query = supabase.from('exchange').select('id, exchange_name');
                    break;
                default:
                    return [];
            }

            const { data, error } = await query;
            if (error) throw error;
            
            return data.map((org: any) => ({
                id: org.id.toString(),
                name: org.sponsor_name || org.issuer_name || org.exchange_name
            }));
        } catch (error) {
            console.error('Error fetching organizations:', error);
            return [];
        }
    };

    // Refresh session helper
    const refreshSession = useCallback(async () => {
        try {
            console.log('refreshSession: Starting session refresh attempt with timeout protection...');
            
            // 🔥 CRITICAL FIX: Use timeout protection for session refresh
            const refreshResult = await supabaseWithTimeout(
                async () => supabase.auth.refreshSession(),
                15000, // 15 second timeout
                'Session refresh'
            );
            
            const refreshedSession = refreshResult.data?.session;
            const error = refreshResult.error;
            
            console.log('refreshSession: Refresh completed.', { session: !!refreshedSession, error });
            
            if (error) {
                console.error('refreshSession: Error from session refresh:', error);
                throw error;
            }

            if (refreshedSession) {
                console.log('refreshSession: Session refreshed successfully.');
                setSession(refreshedSession);
                console.log('refreshSession: Session state updated. Fetching profile...');
                
                // 🔥 CRITICAL FIX: Use timeout protection for profile fetch during refresh
                try {
                    const profileResult = await supabaseWithTimeout(
                        async () => {
                            const result = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', refreshedSession.user.id)
                                .single();
                            return result;
                        },
                        15000, // 15 second timeout
                        'Profile fetch during refresh'
                    );
                    
                    console.log('refreshSession: Profile fetch completed.');
                    
                    if (profileResult.data) {
                        console.log('refreshSession: User profile found.');
                        setUser(profileResult.data);
                    } else {
                        console.log('refreshSession: No user profile found.');
                        setUser(null);
                    }
                } catch (profileError: any) {
                    console.log('AuthContext: Background profile failed, continuing without:', profileError?.message || 'Unknown error');
                    // Continue without profile - UI is already showing
                }
            } else {
                console.log('refreshSession: Refresh returned no session.');
            }
        } catch (error) {
            console.error('refreshSession: Session refresh timed out or failed:', error);
            // Only sign out if this is an auth error, not a timeout
            if (error instanceof Error && !error.message.includes('timed out')) {
                await signOut();
            } else {
                console.warn('refreshSession: Continuing with existing session due to timeout');
            }
        }
    }, [supabase]);

    // Initialize auth state
    useEffect(() => {
        if (initializationRef.current) return;
        initializationRef.current = true;

        let mounted = true;
        let authListener: any = null;

        const initializeAuth = async () => {
            try {
                console.log('AuthContext: Starting immediate initialization...');
                
                // 🔥 CRITICAL: Set initialized immediately to show UI
                setInitialized(true);
                setLoading(false);
                
                console.log('AuthContext: UI unlocked - running auth in background...');

                // Now do auth check in background with aggressive timeout
                const authTimeout = setTimeout(() => {
                    if (mounted) {
                        console.log('AuthContext: Background auth timed out - using fallback state');
                        setUser(null);
                        setSession(null);
                    }
                }, 2000); // 2 second background timeout

                try {
                    // Quick session check
                    console.log('AuthContext: Background session check...');
                    const sessionPromise = supabase.auth.getSession();
                    const { data: sessionData, error: sessionError } = await Promise.race([
                        sessionPromise,
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Session check timeout')), 1500)
                        )
                    ]) as any;
                    
                    if (sessionError || !sessionData?.session) {
                        console.log('AuthContext: No session or session error in background');
                        if (mounted) {
                            setUser(null);
                            setSession(null);
                        }
                        clearTimeout(authTimeout);
                        return;
                    }

                    if (!mounted) return;
                    console.log('AuthContext: Background session found');
                    setSession(sessionData.session);
                    
                    // Try profile fetch with even more aggressive timeout
                    try {
                        const profilePromise = supabase
                            .from('users')
                            .select('*')
                            .eq('id', sessionData.session.user.id)
                            .single();
                            
                        const { data: profileData } = await Promise.race([
                            profilePromise,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Profile timeout')), 1000)
                            )
                        ]) as any;
                        
                        if (mounted && profileData) {
                            console.log('AuthContext: Background profile loaded');
                            setUser(profileData);
                        }
                    } catch (profileError: any) {
                        console.log('AuthContext: Background profile failed, continuing without:', profileError?.message || 'Unknown error');
                        // Continue without profile - UI is already showing
                    }

                    clearTimeout(authTimeout);

                } catch (error: any) {
                    console.log('AuthContext: Background auth failed:', error?.message || 'Unknown error');
                    clearTimeout(authTimeout);
                    if (mounted) {
                        setUser(null);
                        setSession(null);
                    }
                }

                // Set up auth state change listener (non-blocking)
                try {
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        (event, currentSession) => {
                            if (!mounted) return;
                            console.log('Auth state change:', event);

                            if (event === 'SIGNED_OUT') {
                                setUser(null);
                                setSession(null);
                            } else if (currentSession) {
                                setSession(currentSession);
                                // Don't fetch profile here to avoid blocking
                            } else {
                                setSession(null);
                                setUser(null);
                            }
                        }
                    );

                    authListener = subscription;
                } catch (listenerError) {
                    console.warn('AuthContext: Failed to set up auth listener:', listenerError);
                    // Continue without listener - not critical for UI
                }

            } catch (error) {
                console.error('AuthContext: Critical initialization error:', error);
                if (mounted) {
                    setUser(null);
                    setSession(null);
                    setLoading(false);
                    setInitialized(true);
                }
            }
        };

        initializeAuth();

        return () => {
            mounted = false;
            if (authListener) {
                authListener.unsubscribe();
            }
        };
    }, []); // Remove supabase dependency to prevent loops

    // Session refresh interval - Re-enabled to prevent token expiration
    useEffect(() => {
        if (!initialized || !session) return;

        // Calculate refresh interval - 3.5 minutes (210000ms)
        // This is less than the typical 4-minute expiration to ensure tokens are always fresh
        const refreshInterval = setInterval(() => {
            console.log('Running periodic session refresh');
            refreshSession();
        }, 210000);

        // Also refresh when the window regains focus to handle returning from idle
        const handleFocus = () => {
            console.log('Window focused - refreshing session');
            refreshSession();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(refreshInterval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [initialized, session, refreshSession]);

    const value = {
        user,
        session,
        loading,
        initialized,
        signOut,
        signIn,
        basicSignUp,
        completeSignUp,
        fetchOrganizations,
        refreshSession
    };

    return (
        <SearchParamsProvider>
            {(searchParams) => (
                <AuthContext.Provider value={value}>
                    {children}
                </AuthContext.Provider>
            )}
        </SearchParamsProvider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export a client-only version of the provider
export const AuthProviderClient = AuthProvider;

// Export a dynamic version of the AuthProvider that only runs on the client
export const AuthProviderDynamic = dynamic(() => Promise.resolve(AuthProvider), {
    ssr: false
}); 
