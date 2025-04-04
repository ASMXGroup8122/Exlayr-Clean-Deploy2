'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MemberList } from '@/components/exchange/MemberList';
import { ApprovalQueue } from '@/components/exchange/ApprovalQueue';
import { ExchangeManagementProvider } from '@/contexts/ExchangeManagementContext';
import { Exchange } from '@/types/exchange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import RouteGuard from '@/components/guards/RouteGuard';

interface ExchangeMembersPageProps {
    params: {
        id: string;
    };
}

export default function ExchangeMembersPage({ params }: ExchangeMembersPageProps) {
    const [exchange, setExchange] = useState<Exchange | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchExchange() {
            try {
                const { data, error } = await supabase
                    .from('exchange')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                setExchange(data);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch exchange'));
            } finally {
                setLoading(false);
            }
        }

        fetchExchange();
    }, [params.id, supabase]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-500">
                Error: {error.message}
            </div>
        );
    }

    if (!exchange) {
        return (
            <div className="p-4">
                Exchange not found
            </div>
        );
    }

    return (
        <RouteGuard>
            <ExchangeManagementProvider>
                <div className="container mx-auto py-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">
                            {exchange.exchange_name} - Member Management
                        </h1>
                    </div>

                    <Card className="p-6">
                        <Tabs defaultValue="members">
                            <TabsList>
                                <TabsTrigger value="members">Members</TabsTrigger>
                                <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
                            </TabsList>

                            <TabsContent value="members" className="mt-4">
                                <MemberList exchangeId={params.id} />
                            </TabsContent>

                            <TabsContent value="approvals" className="mt-4">
                                <ApprovalQueue exchangeId={params.id} />
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </ExchangeManagementProvider>
        </RouteGuard>
    );
} 