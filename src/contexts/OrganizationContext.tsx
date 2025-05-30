'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type SponsorOrg = Database['public']['Tables']['exchange_sponsor']['Row'];

interface OrganizationContextType {
    organization: SponsorOrg | null;
    loading: boolean;
    error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextType>({
    organization: null,
    loading: true,
    error: null
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const params = useParams<{ orgId: string }>();
    const [organization, setOrganization] = useState<SponsorOrg | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchOrganization = async () => {
            if (!user || !params.orgId) {
                setLoading(false);
                return;
            }

            try {
                const { data, error: orgError } = await supabase
                    .from('exchange_sponsor')
                    .select('*')
                    .eq('id', params.orgId)
                    .single();

                if (orgError) throw orgError;
                setOrganization(data);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch organization'));
            } finally {
                setLoading(false);
            }
        };

        fetchOrganization();
    }, [user, params.orgId]);

    return (
        <OrganizationContext.Provider value={{ organization, loading, error }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
} 
