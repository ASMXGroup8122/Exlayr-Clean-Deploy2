'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Coins } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

type Listing = {
    instrumentid: string;
    instrumentname: string;
    instrumentticker: string;
    // Add other relevant fields
};

export default function ListingDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;
    const listingId = params?.listingId as string;
    const supabase = getSupabaseClient();

    const [listing, setListing] = useState<Listing | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const { data, error } = await supabase
                    .from('listing')
                    .select('*')
                    .eq('instrumentid', listingId)
                    .single();

                if (error) throw error;
                setListing(data);
            } catch (err) {
                console.error('Error fetching listing:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchListing();
    }, [listingId]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!listing) {
        return <div>Listing not found</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/listings`}
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Listings
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {listing.instrumentname}
                            </h1>
                            <p className="mt-2 text-sm text-gray-600">
                                {listing.instrumentticker}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/dashboard/sponsor/${orgId}/listings/${listingId}/generate-document`}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Create Listing Document
                            </Link>
                            <Link
                                href={`/dashboard/sponsor/${orgId}/listings/${listingId}/create-token`}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <Coins className="h-4 w-4 mr-2" />
                                Create Token
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white shadow-sm rounded-lg">
                    {/* Add listing details content here */}
                </div>
            </div>
        </div>
    );
} 