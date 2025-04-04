'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, FileText, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface Listing {
    instrumentid: string;
    instrumentname: string;
    instrumentticker: string;
    instrumentexchange: string;
    instrumentexchangeboard: string;
    instrumentcategory: string;
    instrumentsubcategory: string;
    instrumentlistingtype: string;
    instrumentsecuritiesadmissionstatus: string;
    instrumentupdatedat: string;
    instrumentissuerid: string;
    instrumentissuername: string;
    instrumentsponsor: string;
}

const getStatusColor = (status: string) => {
    const colors = {
        draft: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.draft;
};

export default function ListingsClient() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;

    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isSubscribed = true;

        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
            return;
        }

        const fetchListings = async () => {
            try {
                const { data, error } = await supabase
                    .from('listing')
                    .select(`
                        instrumentid,
                        instrumentname,
                        instrumentticker,
                        instrumentexchange,
                        instrumentexchangeboard,
                        instrumentcategory,
                        instrumentsubcategory,
                        instrumentlistingtype,
                        instrumentsecuritiesadmissionstatus,
                        instrumentupdatedat,
                        instrumentissuerid,
                        instrumentissuername,
                        instrumentsponsor
                    `)
                    .eq('instrumentcreatedby', user.id)
                    .order('instrumentupdatedat', { ascending: false });

                if (error) throw error;

                if (data && isSubscribed) {
                    setListings(data);
                }
            } catch (error) {
                if (isSubscribed) {
                    console.error('Error fetching listings:', error);
                }
            } finally {
                if (isSubscribed) {
                    setIsLoading(false);
                }
            }
        };

        fetchListings();

        return () => {
            isSubscribed = false;
        };
    }, [user, orgId, router]);

    const handleSubmitForApproval = async (listingId: string) => {
        if (!user) {
            console.error('No user found');
            return;
        }

        try {
            const { error } = await supabase
                .rpc('submit_listing_for_approval', {
                    p_listing_id: parseInt(listingId),
                    p_user_id: user.id
                });

            if (error) throw error;

            // Refresh the listings after successful submission
            const { data: updatedData, error: fetchError } = await supabase
                .from('listing')
                .select(`
                    instrumentid,
                    instrumentname,
                    instrumentticker,
                    instrumentexchange,
                    instrumentexchangeboard,
                    instrumentcategory,
                    instrumentsubcategory,
                    instrumentlistingtype,
                    instrumentsecuritiesadmissionstatus,
                    instrumentupdatedat,
                    instrumentissuerid,
                    instrumentissuername,
                    instrumentsponsor
                `)
                .eq('instrumentcreatedby', user.id)
                .order('instrumentupdatedat', { ascending: false });

            if (fetchError) throw fetchError;

            if (updatedData) {
                setListings(updatedData);
            }
        } catch (error) {
            console.error('Error submitting listing for approval:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Listings</h1>
                <div className="flex items-center gap-4">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/token-creation`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Token
                    </Link>
                    <Link
                        href={`/dashboard/sponsor/${orgId}/new-listing`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Listing
                    </Link>
                    <Link
                        href={`/dashboard/sponsor/${orgId}/listings/generate-document`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Listing Document
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Listing Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ticker
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Exchange
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Board
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Updated
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {listings.map((listing) => (
                                <tr key={listing.instrumentid}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {listing.instrumentname}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {listing.instrumentissuername}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.instrumentticker}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.instrumentcategory} - {listing.instrumentsubcategory}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.instrumentexchange}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {listing.instrumentexchangeboard}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(listing.instrumentsecuritiesadmissionstatus)}`}>
                                            {listing.instrumentsecuritiesadmissionstatus?.charAt(0).toUpperCase() + listing.instrumentsecuritiesadmissionstatus?.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(listing.instrumentupdatedat).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex space-x-4">
                                            <Link
                                                href={`/dashboard/sponsor/${orgId}/listings/${listing.instrumentid}/due-diligence/director`}
                                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                            >
                                                <FileText className="h-4 w-4 mr-1" />
                                                Edit
                                            </Link>
                                            {listing.instrumentsecuritiesadmissionstatus === 'draft' && (
                                                <button
                                                    onClick={() => handleSubmitForApproval(listing.instrumentid)}
                                                    className="text-green-600 hover:text-green-900 flex items-center"
                                                >
                                                    <ArrowUpRight className="h-4 w-4 mr-1" />
                                                    Submit
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 