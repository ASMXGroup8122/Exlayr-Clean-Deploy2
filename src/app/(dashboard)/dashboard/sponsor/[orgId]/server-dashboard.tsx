import React from 'react';
import { redirect } from 'next/navigation';
import { getFastSession, getSecureUser } from '@/utils/supabase/auth-cache';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
    BarChart3,
    Users,
    DollarSign,
    CheckCircle,
    Clock,
    Target,
    PlusCircle,
    ArrowRight,
    Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Types
interface ListingData {
    instrumentid: string;
    instrumentname: string;
    instrumentissuername: string;
    instrumentofferproceeds: string;
    instrumentcreatedat: string;
    instrumentsponsorid: string;
    instrumentcomplianceapproved: boolean;
}

interface DashboardMetrics {
    totalListings: number;
    pendingReview: number;
    prospects: number;
    capitalRaising: number;
}

interface ServerDashboardProps {
    orgId: string;
}

async function fetchDashboardData(orgId: string): Promise<{
    listings: ListingData[];
    metrics: DashboardMetrics;
}> {
    try {
        const supabase = getSupabaseClient();
        
        // Fetch listings for this organization
        const { data: listingsData, error: listingsError } = await supabase
            .from('listing')
            .select('*')
            .eq('instrumentsponsorid', orgId);

        if (listingsError) throw listingsError;

        const listings = listingsData || [];

        // Calculate metrics optimized for performance
        const totalListings = listings.length;
        const pendingReview = listings.filter(l => !l.instrumentcomplianceapproved).length;
        const prospects = listings.filter(l => l.instrumentcomplianceapproved).length;
        const capitalRaising = listings.reduce((sum, l) => {
            const amount = parseFloat(l.instrumentofferproceeds || '0');
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        return {
            listings,
            metrics: {
                totalListings,
                pendingReview,
                prospects,
                capitalRaising
            }
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
            listings: [],
            metrics: {
                totalListings: 0,
                pendingReview: 0,
                prospects: 0,
                capitalRaising: 0
            }
        };
    }
}

export default async function ServerSponsorDashboard({ orgId }: ServerDashboardProps) {
    // Use fast session check for initial load (cached and optimized)
    const { user, error: sessionError } = await getFastSession();

    // Redirect if no user (this is much faster than getUser())
    if (!user || sessionError) {
        redirect('/sign-in');
    }

    // For critical operations, we could use getSecureUser() but for dashboard display, fast session is sufficient
    // Only use secure validation when absolutely necessary for security-critical operations
    
    // Fetch dashboard data
    const { listings, metrics } = await fetchDashboardData(orgId);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Header */}
            <div className="relative mb-6 md:mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                    Sponsor Dashboard
                                </h1>
                                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                                    Welcome back, {user.email}! Manage your listings and track performance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Total Listings</p>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {metrics.totalListings}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Pending Review</p>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {metrics.pendingReview}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-xl">
                            <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Prospects</p>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {metrics.prospects}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Target className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Capital Raising</p>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {formatCurrency(metrics.capitalRaising)}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link href={`/dashboard/sponsor/${orgId}/clients/new`}>
                        <Button className="w-full h-auto p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center space-x-3">
                                <PlusCircle className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Create New Issuer</div>
                                    <div className="text-xs opacity-90">Add a new client</div>
                                </div>
                            </div>
                        </Button>
                    </Link>

                    <Link href={`/dashboard/sponsor/${orgId}/new-listing`}>
                        <Button className="w-full h-auto p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Start New Listing</div>
                                    <div className="text-xs opacity-90">Create offering</div>
                                </div>
                            </div>
                        </Button>
                    </Link>

                    <Link href={`/dashboard/sponsor/${orgId}/clients`}>
                        <Button className="w-full h-auto p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center space-x-3">
                                <Users className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Go to Deal Center</div>
                                    <div className="text-xs opacity-90">Manage clients</div>
                                </div>
                            </div>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Performance Note */}
            <div className="bg-green-50/80 backdrop-blur-sm rounded-xl border border-green-200/50 p-4 mb-4">
                <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800 text-sm font-medium">
                        ⚡ This page uses optimized authentication with React cache - significantly faster loading!
                    </p>
                </div>
            </div>
        </div>
    );
} 