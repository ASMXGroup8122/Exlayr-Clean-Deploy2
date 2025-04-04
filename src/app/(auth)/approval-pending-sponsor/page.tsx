'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import Link from 'next/link';

export default function ApprovalPendingSponsor() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [orgName, setOrgName] = useState<string>('');
    const supabase = createClientComponentClient<Database>();
    const [hydrated, setHydrated] = useState(false);

    // This effect runs once after hydration is complete
    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        const fetchSponsorDetails = async () => {
            if (!user) return;

            try {
                // Fetch organization name
                const { data: org, error } = await supabase
                    .from('exchange_sponsor')
                    .select('sponsor_name')
                    .eq('id', user.organization_id)
                    .single();

                if (error) {
                    console.error('Error fetching sponsor details:', error);
                    return;
                }

                if (org) {
                    setOrgName(org.sponsor_name);
                }
            } catch (error) {
                console.error('Error in fetchSponsorDetails:', error);
            }
        };

        if (!loading && user) {
            fetchSponsorDetails();
        }
    }, [loading, user, supabase]);

    // If not hydrated yet, render a simple loading state
    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-lg w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4" suppressHydrationWarning>
                        Exchange Sponsor Membership Pending
                    </h1>
                    <div className="space-y-4 text-gray-600 mb-8">
                        <p suppressHydrationWarning>
                            Thank you for registering with {orgName ? <span className="font-semibold">{orgName}</span> : 'the exchange sponsor'}.
                        </p>
                        <p suppressHydrationWarning>
                            Your membership request is now pending approval from the exchange sponsor administrators.
                            You will receive an email notification when your membership is approved.
                        </p>
                        <p suppressHydrationWarning>
                            Once approved, you'll have access to the exchange sponsor dashboard and all its features.
                        </p>
                    </div>
                    <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                        <Link
                            href="/sign-in"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent 
                                     text-base font-medium rounded-md text-white bg-blue-700 hover:bg-blue-600 
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                     transition-colors duration-200"
                            suppressHydrationWarning
                        >
                            Return to Sign In
                        </Link>
                        <a
                            href="https://www.exlayr.ai"
                            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 
                                     text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                     transition-colors duration-200"
                            target="_blank"
                            rel="noopener noreferrer"
                            suppressHydrationWarning
                        >
                            Visit Exlayr.AI
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
} 