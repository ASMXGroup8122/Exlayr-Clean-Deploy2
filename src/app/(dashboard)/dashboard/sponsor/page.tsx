'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SponsorRedirect() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const redirectToOrg = async () => {
            if (!user) {
                console.log('No user found, redirecting to sign in');
                router.replace('/sign-in');
                return;
            }

            try {
                console.log('Checking sponsor status for user:', user.id);
                
                // First check if we're already on an organization-specific route
                if (window.location.pathname.match(/^\/dashboard\/sponsor\/[^/]+$/)) {
                    console.log('Already on organization dashboard');
                    return;
                }

                // First try to get user data directly from auth context
                if (user.organization_id && user.account_type === 'exchange_sponsor' && user.status === 'active') {
                    console.log('Using cached user data');
                    const targetPath = `/dashboard/sponsor/${user.organization_id}`;
                    if (window.location.pathname !== targetPath) {
                        router.replace(targetPath);
                    }
                    return;
                }

                console.log('Fetching fresh user data from database');
                // If not in context, check database
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')  // Select all fields to debug
                    .eq('id', user.id)
                    .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

                console.log('User data response:', { userData, userError });

                if (userError) {
                    console.error('Error fetching user data:', userError);
                    router.replace('/auth/error?message=failed-to-fetch-user');
                    return;
                }

                if (!userData) {
                    console.error('No user found in database');
                    router.replace('/auth/error?message=no-user-record');
                    return;
                }

                // Log full user data for debugging
                console.log('Full user data:', userData);

                if (userData.account_type !== 'exchange_sponsor') {
                    console.error('Not a sponsor account:', userData.account_type);
                    router.replace('/auth/error?message=not-sponsor-account');
                    return;
                }

                if (!userData.organization_id) {
                    console.error('No organization linked');
                    router.replace('/select-organization');
                    return;
                }

                if (userData.status !== 'active') {
                    console.error('Account not active:', userData.status);
                    router.replace('/auth/error?message=account-not-active');
                    return;
                }

                // Only redirect if we're not already on the correct path
                const targetPath = `/dashboard/sponsor/${userData.organization_id}`;
                if (window.location.pathname !== targetPath) {
                    console.log('Redirecting to organization dashboard:', targetPath);
                    router.replace(targetPath);
                }
            } catch (error) {
                console.error('Error in sponsor redirect:', error);
                router.replace('/auth/error?message=unexpected-error');
            }
        };

        if (!loading) {
            redirectToOrg();
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return null;
} 
