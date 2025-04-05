'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ApprovalPending() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [orgName, setOrgName] = useState<string>('');
    const [orgType, setOrgType] = useState<'issuer' | 'exchange_sponsor' | 'exchange' | null>(null);
    const supabase = getSupabaseClient();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = 'https://www.exlayr.ai';
                return;
            }

            // Fetch user profile to get organization type
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('account_type')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) return;
            setOrgType(profile.account_type);

            // Fetch organization name based on type
            const tableName = profile.account_type === 'issuer' ? 'issuers' :
                            profile.account_type === 'exchange_sponsor' ? 'exchange_sponsor' :
                            'exchange';
            
            const nameField = profile.account_type === 'issuer' ? 'issuer_name' :
                            profile.account_type === 'exchange_sponsor' ? 'sponsor_name' :
                            'exchange_name';

            const { data: org } = await supabase
                .from(tableName)
                .select(nameField)
                .eq('created_by', session.user.id)
                .single();

            if (org) setOrgName(org[nameField]);

            // Show the message for a few seconds then redirect
            setTimeout(async () => {
                await signOut();
                window.location.href = 'https://www.exlayr.ai';
            }, 5000);
        };

        if (!loading) {
            checkAuth();
        }
    }, [loading, signOut, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    const getOrgTypeDisplay = () => {
        switch (orgType) {
            case 'issuer':
                return 'Issuer';
            case 'exchange_sponsor':
                return 'Exchange Sponsor';
            case 'exchange':
                return 'Exchange';
            default:
                return 'organization';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-lg w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Access Pending
                    </h1>
                    <div className="space-y-4 text-gray-600 mb-8">
                        <p>
                            You cannot access {orgName ? <span className="font-semibold">{orgName}</span> : 'your organization'} yet 
                            as your {getOrgTypeDisplay().toLowerCase()} account is still pending approval.
                        </p>
                        <p>
                            Our team is reviewing your organization's application and verifying the provided information. 
                            You will receive an email notification when the approval process is complete.
                        </p>
                        <p>
                            In the meantime, you can find out more about us and our 
                            platform at Exlayr.AI.
                        </p>
                    </div>
                    <a
                        href="https://www.exlayr.ai"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent 
                                 text-base font-medium rounded-md text-white bg-blue-700 hover:bg-blue-600 
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                 transition-colors duration-200"
                    >
                        Visit Exlayr.AI
                    </a>
                </div>
            </div>
        </div>
    );
} 