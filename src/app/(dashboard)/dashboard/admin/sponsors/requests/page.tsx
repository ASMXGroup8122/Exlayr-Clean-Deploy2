'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SponsorRequestsPage() {
    const { supabaseClient } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            const { data, error } = await supabaseClient
                .from('organization_members')
                .select(`
                    *,
                    profiles:user_id (
                        email,
                        first_name,
                        last_name
                    )
                `)
                .eq('organization_type', 'exchange_sponsor')
                .eq('status', 'pending');

            if (!error && data) {
                setRequests(data);
            }
            setLoading(false);
        };

        fetchRequests();
    }, [supabaseClient]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Pending Requests</h1>
            {/* Add your requests table/list UI here */}
        </div>
    );
} 
