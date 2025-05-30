import { Database } from '@/lib/supabase-types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

interface RegisterOrgData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    company_name: string;
    organizationType: 'issuer' | 'exchange_sponsor' | 'exchange';
}

interface RegisterOrgContextType {
    loading: boolean;
    error: Error | null;
    registerOrg: (data: RegisterOrgData) => Promise<void>;
}

const RegisterOrgContext = createContext<RegisterOrgContextType | undefined>(undefined);

export function RegisterOrgProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const supabase = getSupabaseClient();
    const router = useRouter();

    const registerOrg = async (data: RegisterOrgData) => {
        setLoading(true);
        setError(null);

        try {
            console.log('🚀 === REGISTER ORG FLOW START ===');
            console.log('📝 Registration data:', {
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                company_name: data.company_name,
                organizationType: data.organizationType
            });
            
            // 1. Sign up with auth
            console.log('1️⃣ Starting auth signup...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        first_name: data.first_name,
                        last_name: data.last_name,
                        company_name: data.company_name,
                        account_type: data.organizationType
                    }
                }
            });
            console.log('📍 Auth signup response:', {
                user: signUpData?.user ? {
                    id: signUpData.user.id,
                    email: signUpData.user.email,
                    metadata: signUpData.user.user_metadata
                } : null,
                error: signUpError
            });

            if (signUpError || !signUpData.user) {
                console.error('❌ Sign up error:', signUpError);
                throw signUpError || new Error('Failed to create auth user');
            }

            // 2. Explicitly sign in to establish session
            console.log('2️⃣ Signing in to establish session...');
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
            });
            console.log('📍 Sign in response:', { error: signInError });

            if (signInError) {
                console.error('❌ Sign in error:', signInError);
                throw signInError;
            }

            // 3. Wait for session to be valid
            console.log('3️⃣ Getting session...');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log('📍 Session response:', {
                session: session ? {
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        metadata: session.user.user_metadata
                    },
                    expires_at: session.expires_at
                } : null,
                error: sessionError
            });
            
            if (sessionError || !session) {
                console.error('❌ Session error:', sessionError);
                throw sessionError || new Error('No valid session');
            }

            // 4. Create user profile
            console.log('4️⃣ Creating user profile...');
            console.log('📝 Profile data:', {
                id: session.user.id,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                company_name: data.company_name,
                account_type: data.organizationType,
                is_org_admin: true,
                status: 'pending'
            });
            const { error: profileError } = await supabase
                .from('users')
                .insert([{
                    id: session.user.id,
                    email: data.email,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    company_name: data.company_name,
                    account_type: data.organizationType,
                    is_org_admin: true,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            console.log('📍 Profile creation response:', { error: profileError });

            if (profileError) {
                console.error('❌ Failed to create user profile:', profileError);
                throw profileError;
            }

            console.log('✅ === REGISTER ORG FLOW COMPLETE ===');
            console.log('🔄 Getting redirect path based on organization type...');
            const redirectTo = (() => {
                switch (data.organizationType) {
                    case 'exchange_sponsor':
                        return '/create-sponsor';
                    case 'issuer':
                        return '/create-issuer';
                    case 'exchange':
                        return '/create-exchange';
                    default:
                        throw new Error('Invalid organization type');
                }
            })();
            console.log(`🔄 Redirecting to ${redirectTo}...`);
            router.push(redirectTo);
        } catch (err) {
            console.error('❌ === REGISTER ORG FLOW ERROR ===');
            console.error('📍 Error details:', err);
            setError(err instanceof Error ? err : new Error('Registration failed'));
            throw err;
        } finally {
            console.log('🏁 Setting loading to false');
            setLoading(false);
        }
    };

    return (
        <RegisterOrgContext.Provider value={{ loading, error, registerOrg }}>
            {children}
        </RegisterOrgContext.Provider>
    );
}

export function useRegisterOrg() {
    const context = useContext(RegisterOrgContext);
    if (!context) {
        throw new Error('useRegisterOrg must be used within a RegisterOrgProvider');
    }
    return context;
} 
