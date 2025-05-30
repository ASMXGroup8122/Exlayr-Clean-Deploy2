'use client';

import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface User {
    id: string;
    email: string;
    account_type: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer';
    organization_id: string | null;
    user_role: 'employee' | 'advisor' | null;
    status: 'pending' | 'active' | 'rejected';
    first_name: string;
    last_name: string;
    is_org_admin: boolean;
}

interface SignUpData {
    email: string;
    password: string;
    account_type: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer';
    first_name: string;
    last_name: string;
    company_name: string;
    phone_number?: string;
    organization_id: number;
    user_role: 'employee' | 'advisor';
    status: 'pending';
    is_org_admin: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    supabaseClient: typeof supabase;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generatePKCEVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

async function generatePKCEChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer: Uint8Array) {
    return btoa(String.fromCharCode.apply(null, Array.from(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const supabaseClient = useMemo(() => supabase, []);

    const fetchUser = async (userId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }
        return data;
    };

    const signUp = async (data: SignUpData) => {
        try {
            setLoading(true);
            console.log('🚪 Starting sign-up process...', data);

            // 1. Create user profile first
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .insert([{
                    email: data.email,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    account_type: data.account_type,
                    company_name: data.company_name,
                    phone_number: data.phone_number,
                    organization_id: data.organization_id,
                    user_role: data.user_role,
                    status: 'pending',
                    is_org_admin: false
                }])
                .select()
                .single();

            if (profileError) {
                console.error('Failed to create user profile:', profileError);
                throw profileError;
            }

            // 2. Sign up AND sign in with auth
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        id: profileData.id,
                        email: data.email,
                        account_type: data.account_type,
                        first_name: data.first_name,
                        last_name: data.last_name,
                        company_name: data.company_name,
                        organization_id: data.organization_id,
                        user_role: data.user_role,
                        status: 'pending',
                        is_org_admin: false
                    }
                }
            });

            if (signUpError) {
                await supabase.from('users').delete().eq('id', profileData.id);
                throw signUpError;
            }

            // 3. Explicitly sign in after signup
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
            });

            if (signInError) {
                console.error('Failed to sign in after signup:', signInError);
                throw signInError;
            }

            // 4. Set the user in context
            setUser(profileData);

            // 5. Wait a moment for the session to be established
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 6. Navigate to approval-pending
            router.push('/approval-pending');

        } catch (error) {
            console.error('❌ Sign-up process failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            console.log('🚪 Starting sign-in process...', { email });

            // 1. Auth Check
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            console.log('📍 Auth response:', { authData, signInError });

            if (signInError) throw signInError;

            // 2. Fetch Complete User Data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')  // Make sure to select all needed fields
                .eq('email', email)
                .single();
            console.log('📍 User data:', { userData, userError });

            if (userError) throw userError;

            // 3. Validation Checks
            if (!userData.account_type || !['admin', 'exchange_sponsor', 'exchange', 'issuer'].includes(userData.account_type)) {
                throw new Error('Invalid account type');
            }

            if (!userData.user_role || !['employee', 'advisor'].includes(userData.user_role)) {
                throw new Error('Invalid user role');
            }

            // Organization check (skip for admin)
            if (userData.account_type !== 'admin' && !userData.organization_id) {
                throw new Error('Organization ID required');
            }

            // 4. Set user in context
            setUser(userData);
            console.log('📍 User set in context:', userData);

            // 5. Handle routing based on validated account type
            const basePath = '/dashboard';
            const targetPath = userData.account_type === 'admin' 
                ? `${basePath}/admin`
                : `${basePath}/${userData.account_type}`;

            console.log('🚀 Routing to:', targetPath);
            router.replace(targetPath);

        } catch (error) {
            console.error('❌ Sign in error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            console.log('🚪 Starting sign out...');

            // First clear cookies before calling supabase.auth.signOut()
            document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'sb-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Then sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('🚨 Supabase signOut error:', error);
                throw error;
            }
            
            console.log('✅ Sign out successful');
            setUser(null);
            
            // Use window.location.href for a hard redirect
            window.location.href = '/sign-in';
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const getRedirectPath = (accountType: string) => {
        switch (accountType) {
            case 'admin':
                return '/dashboard/[role]/admin';
            case 'exchange_sponsor':
                return '/dashboard/[role]/sponsor';
            case 'exchange':
                return '/dashboard/[role]/exchange';
            case 'issuer':
                return '/dashboard/[role]/issuer';
            default:
                return '/dashboard';
        }
    };

    const logError = (error: any) => {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                details: error.details,
                code: error.code
            }
        };
        localStorage.setItem('lastAuthError', JSON.stringify(errorLog));
        console.error('Error logged to localStorage:', errorLog);
    };

    // Enhanced router error event listener
    useEffect(() => {
        const handleRouteChangeStart = (url: string) => {
            console.log('Route change starting:', {
                to: url,
                from: window.location.pathname,
                timestamp: new Date().toISOString()
            });
        };

        const handleRouteChangeComplete = (url: string) => {
            console.log('Route change complete:', {
                url,
                timestamp: new Date().toISOString()
            });
        };

        const handleRouteError = (err: Error, url: string) => {
            console.error('Navigation error:', {
                error: err,
                url: url,
                currentPath: window.location.pathname,
                currentUser: user,
                timestamp: new Date().toISOString()
            });
        };

        router.events?.on('routeChangeStart', handleRouteChangeStart);
        router.events?.on('routeChangeComplete', handleRouteChangeComplete);
        router.events?.on('routeChangeError', handleRouteError);
        
        return () => {
            router.events?.off('routeChangeStart', handleRouteChangeStart);
            router.events?.off('routeChangeComplete', handleRouteChangeComplete);
            router.events?.off('routeChangeError', handleRouteError);
        };
    }, [router, user]);

    // Initialize session and set up auth state listener
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔑 Auth state change:', { 
                    event, 
                    sessionExists: !!session,
                    hasAccessToken: !!session?.access_token
                });
                
                if (event === 'SIGNED_IN' && session?.user?.id) {
                    if (session.access_token) {
                        // Set cookies without domain for local development
                        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
                        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=3600; SameSite=Lax`;
                        document.cookie = `sb-token=${JSON.stringify({
                            access_token: session.access_token,
                            refresh_token: session.refresh_token
                        })}; path=/; max-age=3600; SameSite=Lax`;
                    }

                    const { data: userData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', session.user.email)
                        .maybeSingle();
                    
                    if (userData) {
                        setUser(userData);
                    }
                } else if (event === 'SIGNED_OUT') {
                    // Clear cookies without domain
                    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'sb-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    setUser(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchAndSetUser = async (userId: string, isInitial = false) => {
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            setUser(userData);
            
            if (!isInitial && pathname === '/sign-in') {
                const redirectPath = searchParams.get('redirect') || 
                    (userData.account_type === 'admin' 
                        ? `/dashboard/${userData.account_type}/admin` 
                        : `/dashboard/${userData.account_type}`);
                router.replace(redirectPath);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            await signOut();
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            supabaseClient,
            signIn,
            signUp,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 
