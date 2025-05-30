'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/guards/RouteGuard';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { Exchange } from '@/lib/supabase-types';
import { 
    Plus, 
    Eye, 
    Building2,
    Loader2,
    AlertCircle
} from 'lucide-react';

function ExchangesContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isAdmin = user?.account_type === 'admin';

    useEffect(() => {
        const fetchExchanges = async () => {
            try {
                console.log('Starting fetchExchanges...');
                setLoading(true);
                setError(null);

                const response = await fetch('/api/exchanges');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch exchanges');
                }

                const data = await response.json();
                console.log('Exchanges fetched:', data);
                setExchanges(data);
            } catch (error) {
                console.error('Error fetching exchanges:', error);
                setError(error instanceof Error ? error.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchExchanges();
        }
    }, [user]);

    const handleViewExchange = (id: string) => {
        // Use shallow routing to prevent RSC fetch
        router.push(`/dashboard/admin/exchanges/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Loading exchanges...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
                    <p className="mt-2 text-sm text-red-500">Error: {error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Exchanges</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        {isAdmin 
                            ? 'A list of all exchanges in the system.'
                            : 'Your exchange information.'}
                    </p>
                </div>
                {isAdmin && (
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <Link
                            href="/dashboard/admin/exchanges/add"
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Exchange
                        </Link>
                    </div>
                )}
            </div>
            <div className="mt-8 flex flex-col">
                <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                        Exchange Name
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Jurisdiction
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Regulator
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Status
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Website
                                    </th>
                                    {isAdmin && (
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {exchanges.map((exchange) => (
                                    <tr key={exchange.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                            <div className="flex items-center">
                                                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                                                {exchange.exchange_name}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {exchange.jurisdiction}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {exchange.regulator}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                                exchange.status === 'active' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : exchange.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {exchange.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <a 
                                                href={exchange.website} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                {exchange.website}
                                            </a>
                                        </td>
                                        {isAdmin && (
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    onClick={() => handleViewExchange(exchange.id.toString())}
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-900"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExchangesPage() {
    return (
        <RouteGuard>
            <ExchangesContent />
        </RouteGuard>
    );
} 
