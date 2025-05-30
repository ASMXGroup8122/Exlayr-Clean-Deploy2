'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [sponsors, setSponsors] = useState([]);

    useEffect(() => {
        const fetchSponsors = async () => {
            const { data, error } = await supabase
                .from('exchange_sponsor')
                .select('*')
                .eq('status', 'pending');

            if (error) {
                console.error('Error fetching sponsors:', error);
            } else {
                setSponsors(data);
            }
        };

        fetchSponsors();
    }, []);

    return (
        <div className="min-h-screen flex">
            <Sidebar userRole={user?.role || ''} />
            <div className="flex-1">
                <Header />
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
} 
