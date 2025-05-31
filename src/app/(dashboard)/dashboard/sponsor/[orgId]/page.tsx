'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    BarChart3,
    Calendar,
    Users,
    Brain,
    PlusCircle,
    DollarSign,
    ArrowRight,
    Bell,
    Building2,
    Clock,
    FileText,
    Plus,
    Activity,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Zap,
    ChevronLeft,
    ChevronRight,
    X,
    Menu,
    Shield,
    Target,
    BookOpen,
    BarChart2
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface StatusHistory {
    id: string;
    listing_id: string;
    old_status: string;
    new_status: string;
    changed_at: string;
    listing: {
        instrumentname: string;
    } | null;
}

interface DashboardMetrics {
    totalListings: number;
    draftListings: number;
    pendingListings: number;
    approvedListings: number;
    rejectedListings: number;
    totalCapital: number;
    activeOffers: number;
    completionRate: number;
}

export default function SponsorDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;
    const supabase = getSupabaseClient();

    // State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listings, setListings] = useState<ListingData[]>([]);
    const [recentActivity, setRecentActivity] = useState<StatusHistory[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalListings: 0,
        draftListings: 0,
        pendingListings: 0,
        approvedListings: 0,
        rejectedListings: 0,
        totalCapital: 0,
        activeOffers: 0,
        completionRate: 0
    });

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile && !sidebarOpen) {
                setSidebarOpen(true);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auth check
    useEffect(() => {
        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
        }
    }, [user, router]);

    // Data fetching
    useEffect(() => {
        if (!user || !orgId) return;

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch listings for this organization
                const { data: listingsData, error: listingsError } = await supabase
                    .from('listing')
                    .select('*')
                    .eq('instrumentsponsorid', orgId);

                if (listingsError) throw listingsError;

                setListings(listingsData || []);

                // Calculate metrics
                const totalListings = listingsData?.length || 0;
                const draftListings = listingsData?.filter(l => !l.instrumentcomplianceapproved).length || 0;
                const pendingListings = 0; // No status field, using placeholder
                const approvedListings = listingsData?.filter(l => l.instrumentcomplianceapproved).length || 0;
                const rejectedListings = 0; // No status field, using placeholder
                const totalCapital = listingsData?.reduce((sum, l) => {
                    const amount = parseFloat(l.instrumentofferproceeds || '0');
                    return sum + (isNaN(amount) ? 0 : amount);
                }, 0) || 0;
                const activeOffers = approvedListings;

                setMetrics({
                    totalListings,
                    draftListings,
                    pendingListings,
                    approvedListings,
                    rejectedListings,
                    totalCapital,
                    activeOffers,
                    completionRate: 85 // Placeholder - would calculate from document completion
                });

                // For now, create placeholder activity from listings data
                const placeholderActivity = listingsData?.slice(0, 3).map((listing, index) => ({
                    id: `activity-${index}`,
                    listing_id: listing.instrumentid,
                    old_status: 'draft',
                    new_status: listing.instrumentcomplianceapproved ? 'approved' : 'pending',
                    changed_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
                    listing: {
                        instrumentname: listing.instrumentname || listing.instrumentissuername || 'Unknown Instrument'
                    }
                })) || [];

                setRecentActivity(placeholderActivity);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, orgId, supabase]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${Math.floor(diffInHours / 24)}d ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600 font-medium">{error}</p>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                        Sponsor Dashboard
                                    </h1>
                                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                                        Manage your exchange listings and track performance
                                    </p>
                                </div>
                            </div>
                            
                            {/* Mobile Toggle Button */}
                            <div className="md:hidden">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg"
                                >
                                    {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    {/* Hero Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center">
                                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Total Listings</p>
                                    <p className="text-2xl font-bold text-gray-900">{metrics.totalListings}</p>
                                    <p className="text-xs text-gray-500">
                                        {metrics.activeOffers} active offers
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center">
                                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Pending Review</p>
                                    <p className="text-2xl font-bold text-gray-900">{metrics.pendingListings}</p>
                                    <p className="text-xs text-gray-500">
                                        {metrics.approvedListings} approved
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center">
                                <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg">
                                    <Target className="h-6 w-6 text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Prospects</p>
                                    <p className="text-2xl font-bold text-gray-900">{metrics.draftListings}</p>
                                    <p className="text-xs text-gray-500">
                                        In development
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center">
                                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                                    <DollarSign className="h-6 w-6 text-white" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm text-gray-600">Capital Raising</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalCapital)}</p>
                                    <p className="text-xs text-gray-500">
                                        Across all listings
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                                Recent Activity
                            </h2>
                        </div>
                        
                        <div className="space-y-3">
                            {recentActivity.length > 0 ? (
                                recentActivity.slice(0, 5).map((activity) => (
                                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg">
                                        <div className="flex-shrink-0">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">
                                                <span className="font-medium">{activity.listing?.instrumentname || 'Unknown Instrument'}</span> status changed from{' '}
                                                <span className="font-medium text-orange-600">{activity.old_status}</span> to{' '}
                                                <span className="font-medium text-green-600">{activity.new_status}</span>
                                            </p>
                                            <p className="text-xs text-gray-500">{formatTimeAgo(activity.changed_at)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compliance Section */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                                Compliance Overview
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-green-700">{metrics.completionRate}%</p>
                                <p className="text-sm text-gray-600">Documents Complete</p>
                            </div>
                            
                            <div className="text-center p-4 bg-amber-50 rounded-lg">
                                <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-amber-700">2</p>
                                <p className="text-sm text-gray-600">Pending Reviews</p>
                            </div>
                            
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-blue-700">{metrics.draftListings}</p>
                                <p className="text-sm text-gray-600">Draft Listings</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Zap className="h-5 w-5 mr-2 text-blue-600" />
                            Quick Actions
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Link href={`/dashboard/sponsor/${orgId}/clients/new`}>
                                <Button className="w-full h-16 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                    <Users className="h-5 w-5 mr-2" />
                                    Create New Issuer
                                </Button>
                            </Link>
                            
                            <Link href={`/dashboard/sponsor/${orgId}/new-listing`}>
                                <Button className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                    <PlusCircle className="h-5 w-5 mr-2" />
                                    Start New Listing
                                </Button>
                            </Link>
                            
                            <Link href={`/dashboard/sponsor/${orgId}/clients`}>
                                <Button className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                    <Building2 className="h-5 w-5 mr-2" />
                                    Go to Deal Center
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className={cn(
                    "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
                    isMobile ? cn(
                        "fixed inset-0 z-50 m-4",
                        sidebarOpen ? "translate-x-0" : "translate-x-full"
                    ) : cn(
                        "min-h-[500px]",
                        sidebarOpen ? "w-80" : "w-16"
                    )
                )}>
                    {/* Sidebar Header */}
                    <div className="flex-shrink-0 p-4 border-b border-gray-200/50 flex items-center justify-between bg-white/50 rounded-t-xl">
                        {sidebarOpen && (
                            <h2 className="font-semibold text-gray-900 text-lg truncate mr-2 min-w-0">Quick Access</h2>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={cn(
                                "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg flex-shrink-0",
                                !sidebarOpen && "ml-auto"
                            )}
                        >
                            {isMobile ? (
                                <X className="h-4 w-4" />
                            ) : sidebarOpen ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {sidebarOpen ? (
                            <>
                                {/* Notifications Panel */}
                                <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl p-4">
                                    <div className="flex items-center mb-3">
                                        <Bell className="h-5 w-5 text-gray-600 mr-2" />
                                        <h3 className="font-medium text-gray-900">Notifications</h3>
                                    </div>
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-500">Coming Soon</p>
                                        <p className="text-xs text-gray-400 mt-1">Real-time alerts and updates</p>
                                    </div>
                                </div>

                                {/* Key Dates */}
                                <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl p-4">
                                    <div className="flex items-center mb-3">
                                        <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                                        <h3 className="font-medium text-gray-900">Key Dates</h3>
                                    </div>
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-500">Coming Soon</p>
                                        <p className="text-xs text-gray-400 mt-1">Filing dates and reminders</p>
                                    </div>
                                </div>

                                {/* NAVIGATE Section */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">NAVIGATE</h3>
                                    <div className="space-y-2">
                                        <Link 
                                            href={`/dashboard/sponsor/${orgId}/clients`}
                                            className="flex items-center p-3 hover:bg-white/50 rounded-lg transition-all duration-200 group"
                                        >
                                            <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                                <Users className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-900">Deal Center</span>
                                                <p className="text-xs text-gray-500 mt-0.5">Manage issuer clients</p>
                                            </div>
                                        </Link>
                                        
                                        <Link 
                                            href={`/dashboard/sponsor/${orgId}/knowledge-vault`}
                                            className="flex items-center p-3 hover:bg-white/50 rounded-lg transition-all duration-200 group"
                                        >
                                            <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                                <BookOpen className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-900">Knowledge Vault</span>
                                                <p className="text-xs text-gray-500 mt-0.5">AI knowledge base</p>
                                            </div>
                                        </Link>
                                        
                                        <Link 
                                            href={`/dashboard/sponsor/${orgId}/tools`}
                                            className="flex items-center p-3 hover:bg-white/50 rounded-lg transition-all duration-200 group"
                                        >
                                            <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                                <Zap className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-900">Agent Center</span>
                                                <p className="text-xs text-gray-500 mt-0.5">Connect and chat with AI</p>
                                            </div>
                                        </Link>
                                        
                                        <Link 
                                            href={`/dashboard/sponsor/${orgId}/analytics`}
                                            className="flex items-center p-3 hover:bg-white/50 rounded-lg transition-all duration-200 group"
                                        >
                                            <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                                <BarChart2 className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-900">Analytics</span>
                                                <p className="text-xs text-gray-500 mt-0.5">Performance insights</p>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200">
                                    <Bell className="h-5 w-5 text-gray-600 mx-auto" />
                                </div>
                                <div className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200">
                                    <Calendar className="h-5 w-5 text-gray-600 mx-auto" />
                                </div>
                                <div className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200">
                                    <Users className="h-5 w-5 text-gray-600 mx-auto" />
                                </div>
                                <div className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200">
                                    <BookOpen className="h-5 w-5 text-gray-600 mx-auto" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Overlay Background */}
                {isMobile && sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
} 