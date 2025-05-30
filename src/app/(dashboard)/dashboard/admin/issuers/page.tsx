'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/guards/RouteGuard';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { 
    Plus, 
    Eye, 
    Building2,
    Loader2,
    AlertCircle
} from 'lucide-react';

interface Issuer {
    id: string;
    issuer_name: string;
    company_registration_number: string;
    country: string;
    main_contact: string;
    business_website: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

function IssuersContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIssuers = async () => {
            try {
                console.log('Starting fetchIssuers...');
                setLoading(true);
                setError(null);

                const response = await fetch('/api/issuers');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch issuers');
                }

                const data = await response.json();
                console.log('Issuers fetched:', data);
                setIssuers(data);
            } catch (error) {
                console.error('Error fetching issuers:', error);
                setError(error instanceof Error ? error.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchIssuers();
        }
    }, [user]);

    const handleViewIssuer = (id: string) => {
        router.push(`/dashboard/admin/issuers/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Loading issuers...</p>
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
                    <h1 className="text-2xl font-semibold text-gray-900">Issuers</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all issuers in the system.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link
                        href="/dashboard/admin/issuers/add"
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Issuer
                    </Link>
                </div>
            </div>
            <div className="mt-8 flex flex-col">
                <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                        Issuer Name
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Registration Number
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Country
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Main Contact
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Status
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {issuers.map((issuer) => (
                                    <tr key={issuer.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                            <div className="flex items-center">
                                                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                                                {issuer.issuer_name}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {issuer.company_registration_number}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {issuer.country}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {issuer.main_contact}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                                issuer.status === 'approved' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : issuer.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {issuer.status}
                                            </span>
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <button
                                                onClick={() => handleViewIssuer(issuer.id)}
                                                className="inline-flex items-center text-blue-600 hover:text-blue-900"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </button>
                                        </td>
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

export default function IssuersPage() {
    return (
        <RouteGuard allowedTypes={['admin']}>
            <IssuersContent />
        </RouteGuard>
    );
} 
