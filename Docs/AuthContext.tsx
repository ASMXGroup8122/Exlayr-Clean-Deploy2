'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Database } from '@/types/supabase';
import { AuthError, Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { getSupabaseClient } from '@/lib/supabase/client';

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
    signOut: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    basicSignUp: (data: BasicSignUpData) => Promise<void>;
    completeSignUp: (data: OrganizationSelectionData) => Promise<void>;
    fetchOrganizations: (accountType: string) => Promise<Organization[]>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => {},
    signIn: async () => {},
    basicSignUp: async () => {},
    completeSignUp: async () => {},
    fetchOrganizations: async () => []
});

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
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = getSupabaseClient();

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
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Let auth state change handle cleanup and redirect
        } catch (error) {
            // Use standardized error handling
            if (error instanceof AuthError) {
                router.push(`/auth/error?message=${error.message}`);
            } else {
                router.push('/auth/error?message=signout-failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        console.log('=== SIGN IN FLOW START ===');
        console.log('1. Initial state:', { email, isLoading: loading });
        
        try {
            setLoading(true);
            console.log('2. Calling supabase.auth.signInWithPassword');
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('3. ERROR: Sign in failed:', error);
                throw error;
            }

            if (!data?.user) {
                console.error('3. ERROR: No user data returned');
                throw new Error('No user data returned');
            }

            console.log('4. Fetching user profile');
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('4. ERROR: Profile fetch failed:', profileError);
                throw profileError;
            }

            setUser(profile);

            // Handle admin path separately and early
            if (profile.account_type === 'admin') {
                console.log('6. Admin user detected - proceeding with admin flow');
                console.log('6a. Admin status:', profile.status);
                router.push('/dashboard/admin');
                return;
            }

            // Handle organization admins - they get immediate access to their dashboard
            if (profile.metadata?.is_org_admin === true) {
                console.log('6. Organization admin detected - proceeding with org admin flow');
                router.push(getDashboardPath(profile.account_type));
                return;
            }

            console.log('6. Regular user - checking organization status');
            
            // Handle users without organizations
            if (!profile.organization_id) {
                console.log('6a. No organization found - redirecting to select-organization');
                router.push('/select-organization');
                return;
            }

            // Only proceed with org checks for non-admin users with organizations
            console.log('7. Fetching organization details');
            const tableName = profile.account_type === 'issuer' ? 'issuers' :
                            profile.account_type === 'exchange_sponsor' ? 'exchange_sponsor' :
                            'exchange';
            
            console.log('7a. Querying organization from:', {
                table: tableName,
                orgId: profile.organization_id,
                userType: profile.account_type
            });

            const { data: org, error: orgError } = await supabase
                .from(tableName)
                .select('status')
                .eq('id', profile.organization_id)
                .maybeSingle(); // Use maybeSingle() instead of single()

            if (orgError) {
                console.error('7b. ERROR: Organization fetch failed:', orgError);
                throw orgError;
            }

            console.log('8. Status check:', {
                userStatus: profile.status,
                orgStatus: org ? org.status : 'null',
                accountType: profile.account_type
            });

            // Check if org exists and statuses are active
            if (!org || org.status !== 'active' || profile.status !== 'active') {
                console.log('8a. User or org not active - redirecting to approval pending');
                router.push('/auth/approval-pending');
            } else {
                console.log('8b. User and org active - redirecting to dashboard');
                router.push(getDashboardPath(profile.account_type));
            }

        } catch (error) {
            console.error('=== SIGN IN FLOW ERROR ===', error);
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

    const checkAuthState = async () => {
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds between retries

        const tryGetSession = async (): Promise<boolean> => {
            try {
                // Check for auth_state cookie
                const authStateCookie = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('auth_state='));
                
                if (authStateCookie) {
                    const authState = JSON.parse(decodeURIComponent(authStateCookie.split('=')[1]));
                    const timeSinceRefresh = Date.now() - authState.timestamp;
                    
                    // If refresh was very recent, wait for the full coordination period
                    if (timeSinceRefresh < 2000) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }

                // Get session after coordination wait
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    throw sessionError;
                }

                if (!session) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Session not found, retry ${retryCount}/${maxRetries}`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        return false;
                    }
                    setSession(null);
                    setUser(null);
                    return true;
                }

                // Set session first
                setSession(session);
                
                // Then fetch profile
                if (session?.user) {
                    try {
                        // Fix the API request format
                        const { data: profile, error: profileError } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();

                        if (profileError) {
                            console.error('Profile fetch error:', profileError);
                            setUser(null);
                        } else if (profile) {
                            setUser(profile as UserProfile);
                        } else {
                            console.warn('No profile found for user:', session.user.id);
                            setUser(null);
                        }
                    } catch (error) {
                        console.error('Error fetching user profile:', error);
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }

                return true;
            } catch (error) {
                console.error('Auth state check error:', error);
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Error getting session, retry ${retryCount}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return false;
                }
                setSession(null);
                setUser(null);
                return true;
            }
        };

        while (!(await tryGetSession()) && retryCount < maxRetries) {
            // Continue retrying
        }

        setLoading(false);
    };

    useEffect(() => {
        checkAuthState();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            
            if (session?.user) {
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        console.error('Profile fetch error:', profileError);
                        setUser(null);
                    } else {
                        setUser(profile as UserProfile);
                    }
                } catch (error) {
                    console.error('Profile fetch error:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user, 
            session, 
            loading, 
            signOut,
            signIn, 
            basicSignUp,
            completeSignUp,
            fetchOrganizations 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export a dynamic version of the AuthProvider that only runs on the client
export const AuthProviderDynamic = dynamic(() => Promise.resolve(AuthProvider), {
    ssr: false
}); 