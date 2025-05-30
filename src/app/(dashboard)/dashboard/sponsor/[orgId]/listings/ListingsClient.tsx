'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, FileText, ArrowUpRight, Send, Loader2, Building2, Calendar, Tag, Globe, BarChart3, AlertTriangle, CheckCircle, Clock, XCircle, Menu, X, ChevronLeft, ChevronRight, Sparkles, Users, Settings, Brain, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

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
        draft: 'bg-gray-100 text-gray-700',
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
        needs_revision: 'bg-blue-100 text-blue-700'
    };
    return colors[status as keyof typeof colors] || colors.draft;
};

const getStatusIcon = (status: string) => {
    const icons = {
        draft: <Clock className="h-3 w-3 sm:h-4 sm:w-4" />,
        pending: <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />,
        approved: <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />,
        rejected: <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />,
        needs_revision: <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
    };
    return icons[status as keyof typeof icons] || icons.draft;
};

export default function ListingsClient() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;

    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [listingToSubmit, setListingToSubmit] = useState<string | null>(null);
    
    // New state for sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-open sidebar on desktop
            if (!mobile && !isSidebarOpen) {
                setIsSidebarOpen(true);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Use async operation for listings data
    const {
        data: listings,
        loading: isLoading,
        error: listingsError,
        execute: fetchListings
    } = useAsyncOperation(
        useCallback(async () => {
            if (!user || user.account_type !== 'exchange_sponsor') {
                throw new Error('Unauthorized access');
            }

            const result = await supabase
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
                .order('instrumentupdatedat', { ascending: false })
                .limit(50);
                
            if (result.error) throw result.error;
            return result.data || [];
        }, [user]),
        {
            timeout: 15000, // Reasonable 15-second timeout
            retryCount: 2,
            operationName: 'Fetch sponsor listings',
            onError: useCallback((error: Error) => {
                console.error('ListingsClient: Failed to load listings:', error);
                if (error.message.includes('timed out')) {
                    console.error('ListingsClient: Listings fetch specifically timed out after 15 seconds');
                }
                toast({
                    title: "Error",
                    description: "Failed to load listings. Please try again.",
                    variant: "destructive",
                });
            }, [])
        }
    );

    // Check authorization and fetch listings
    useEffect(() => {
        if (!user) return;
        
        if (user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
            return;
        }

        // Now safe to include fetchListings in dependencies since execute function is stable
        fetchListings();
    }, [user, router, fetchListings]); // FIXED: Can safely include fetchListings now

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
                fetchListings();
            }
        } catch (error) {
            console.error('Error submitting listing for approval:', error);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!listingToSubmit || !user) {
            console.error('No user or listing found');
            return;
        }

        const listingId = listingToSubmit;
        console.log(`Submitting/Resubmitting listing ${listingId} for approval.`);
        setIsSubmitting(listingId);
        setShowConfirmDialog(false);
        setListingToSubmit(null);

        try {
            const { error: updateError } = await supabase
                .from('listing')
                .update({ 
                    instrumentsecuritiesadmissionstatus: 'pending', 
                    updated_at: new Date().toISOString()
                })
                .eq('instrumentid', listingId)
                .in('instrumentsecuritiesadmissionstatus', ['draft', 'needs_revision']);

            if (updateError) throw updateError;

            toast({
                title: "Success",
                description: "Listing submitted for review.",
            });

            // Update local state
            fetchListings();

        } catch (error) {
            console.error('Error submitting/resubmitting listing for approval:', error);
            toast({
                title: "Error",
                description: "An error occurred while submitting/resubmitting the listing for approval.",
            });
        } finally {
            setIsSubmitting(null);
        }
    };

    const triggerSubmitConfirmation = (listingId: string) => {
        setShowConfirmDialog(true);
        setListingToSubmit(listingId);
    };

    if (isLoading) {
        return (
            <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden flex flex-col">
                <style jsx>{`
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                <div className="flex justify-center items-center py-16">
                    <div className="text-center">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                            <div className="absolute inset-0 rounded-full bg-blue-100/20 animate-pulse"></div>
                        </div>
                        <p className="mt-4 text-gray-600 font-medium">Loading listings...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden flex flex-col">
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
            <div className="relative mb-4 md:mb-6 flex-shrink-0">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                    Listings
                                </h1>
                                <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                                    Manage your exchange listings and create documents
                                </p>
                            </div>
                        </div>
                        
                        {/* Mobile Sidebar Toggle */}
                        <div className="md:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg"
                            >
                                {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                                <BarChart3 className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{listings?.length || 0} Total</span>
                            </div>
                            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                                <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{listings?.filter(l => l.instrumentsecuritiesadmissionstatus === 'approved').length || 0} Approved</span>
                            </div>
                            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-medium">
                                <Clock className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{listings?.filter(l => l.instrumentsecuritiesadmissionstatus === 'pending').length || 0} Pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/* Main Content Area */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
                {/* Listings Content Area */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Hero Action - Create Document */}
                    {!listings || listings.length === 0 ? (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8 sm:p-12 text-center flex-1 flex items-center justify-center">
                            <div className="max-w-md">
                                <div className="mx-auto rounded-full w-20 h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-6">
                                    <FileText className="h-10 w-10 text-blue-600" />
            </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Create Documents?</h3>
                                <p className="text-gray-600 mb-6">Start by creating professional documents for your listings, or create your first listing.</p>
                                <div className="space-y-3">
                        <Link
                            href={`/dashboard/sponsor/${orgId}/listings/generate-document`}
                            className={cn(
                                "block group touch-manipulation transition-all duration-300",
                                (isSidebarOpen || isMobile)
                                    ? "w-full rounded-xl p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                                    : "p-2 hover:bg-blue-50 rounded-lg mx-auto flex items-center justify-center"
                            )}>
                            <div className="flex items-center space-x-3 w-full">
                                {(isSidebarOpen || isMobile) ? (
                                    <>
                                        <div className="flex-shrink-0">
                                            <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-base text-white">Create Document</h4>
                                                <span className="px-2 py-1 bg-white/20 text-white rounded-full text-xs font-medium border border-white/30">AI</span>
                                            </div>
                                            <p className="text-sm text-blue-100 mt-1">Generate professional documents</p>
                                        </div>
                                    </>
                                ) : (
                                    <Sparkles className="h-4 w-4 text-blue-600" />
                                )}
                            </div>
                        </Link>
                    <Link
                        href={`/dashboard/sponsor/${orgId}/new-listing`}
                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-white/50 border border-gray-200/50 text-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-white/70 transition-all duration-300">
                        <div className="flex items-center">
                            <Plus className="h-5 w-5 mr-2" />
                            Create Your First Listing
                        </div>
                    </Link>
                                </div>
                            </div>
                </div>
            ) : (
                <>
                            {/* Listings Table/Cards */}
                            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
                    {/* Desktop Table View */}
                                <div className="hidden lg:block h-full">
                                    <div className="overflow-x-auto scrollbar-hide h-full">
                                <table className="min-w-full divide-y divide-gray-200/50">
                                            <thead className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Listing Details
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Category
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Exchange
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Updated
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white/50 divide-y divide-gray-200/30">
                                        {listings?.map((listing) => (
                                            <tr key={listing.instrumentid} className="hover:bg-blue-50/30 transition-colors duration-200">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                                            <Building2 className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-semibold text-gray-900 truncate">
                                                                {listing.instrumentname}
                                                            </div>
                                                            <div className="text-sm text-gray-500 truncate">
                                                                {listing.instrumentticker} • {listing.instrumentissuername}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{listing.instrumentcategory}</div>
                                                    <div className="text-sm text-gray-500">{listing.instrumentsubcategory}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{listing.instrumentexchange}</div>
                                                    <div className="text-sm text-gray-500">{listing.instrumentexchangeboard}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(listing.instrumentsecuritiesadmissionstatus)}`}>
                                                        {getStatusIcon(listing.instrumentsecuritiesadmissionstatus)}
                                                        <span>{listing.instrumentsecuritiesadmissionstatus?.charAt(0).toUpperCase() + listing.instrumentsecuritiesadmissionstatus?.slice(1).replace('_', ' ')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="flex items-center space-x-1">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>{new Date(listing.instrumentupdatedat).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        {['draft', 'needs_revision'].includes(listing.instrumentsecuritiesadmissionstatus) ? (
                                                            <Link
                                                                href={`/dashboard/sponsor/${orgId}/listings/${listing.instrumentid}/edit-document/canvas`}
                                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200">
                                                                <div className="flex items-center">
                                                                    <FileText className="h-3 w-3 mr-1" />
                                                                    Edit
                                                                </div>
                                                            </Link>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                                                                <FileText className="h-3 w-3 mr-1" />
                                                                Edit
                                                            </span>
                                                        )}
                                                        
                                                        {listing.instrumentsecuritiesadmissionstatus === 'draft' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => triggerSubmitConfirmation(listing.instrumentid)}
                                                                disabled={isSubmitting === listing.instrumentid}
                                                                className="h-8 px-3 text-xs bg-white/50 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                                                            >
                                                                {isSubmitting === listing.instrumentid ? (
                                                                     <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Send className="h-3 w-3 mr-1" />
                                                                )}
                                                                Submit
                                                            </Button>
                                                        )}
                                                        
                                                        {listing.instrumentsecuritiesadmissionstatus === 'needs_revision' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => triggerSubmitConfirmation(listing.instrumentid)}
                                                                disabled={isSubmitting === listing.instrumentid}
                                                                className="h-8 px-3 text-xs bg-white/50 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                                                            >
                                                                {isSubmitting === listing.instrumentid ? (
                                                                     <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Send className="h-3 w-3 mr-1" />
                                                                )}
                                                                Resubmit
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                                <div className="lg:hidden p-4 space-y-4 max-h-96 overflow-y-auto scrollbar-hide">
                        {listings?.map((listing) => (
                            <div key={listing.instrumentid} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-start space-x-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-semibold text-gray-900 truncate">
                                            {listing.instrumentname}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate">
                                            {listing.instrumentticker} • {listing.instrumentissuername}
                                        </p>
                                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(listing.instrumentsecuritiesadmissionstatus)}`}>
                                            {getStatusIcon(listing.instrumentsecuritiesadmissionstatus)}
                                            <span>{listing.instrumentsecuritiesadmissionstatus?.charAt(0).toUpperCase() + listing.instrumentsecuritiesadmissionstatus?.slice(1).replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <div className="flex items-center space-x-1 text-gray-500 mb-1">
                                            <Tag className="h-3 w-3" />
                                            <span>Category</span>
                                        </div>
                                        <div className="text-gray-900 font-medium">{listing.instrumentcategory}</div>
                                        <div className="text-gray-500 text-xs">{listing.instrumentsubcategory}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-1 text-gray-500 mb-1">
                                            <Globe className="h-3 w-3" />
                                            <span>Exchange</span>
                                        </div>
                                        <div className="text-gray-900 font-medium">{listing.instrumentexchange}</div>
                                        <div className="text-gray-500 text-xs">{listing.instrumentexchangeboard}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                                        <Calendar className="h-3 w-3" />
                                        <span>Updated {new Date(listing.instrumentupdatedat).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {['draft', 'needs_revision'].includes(listing.instrumentsecuritiesadmissionstatus) ? (
                                            <Link
                                                href={`/dashboard/sponsor/${orgId}/listings/${listing.instrumentid}/edit-document/canvas`}
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200">
                                                <div className="flex items-center">
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Edit
                                                </div>
                                            </Link>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                                                <FileText className="h-3 w-3 mr-1" />
                                                Edit
                                            </span>
                                        )}
                                        
                                        {(listing.instrumentsecuritiesadmissionstatus === 'draft' || listing.instrumentsecuritiesadmissionstatus === 'needs_revision') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => triggerSubmitConfirmation(listing.instrumentid)}
                                                disabled={isSubmitting === listing.instrumentid}
                                                className="h-8 px-3 text-xs bg-white/50 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                                            >
                                                {isSubmitting === listing.instrumentid ? (
                                                     <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Send className="h-3 w-3 mr-1" />
                                                )}
                                                {listing.instrumentsecuritiesadmissionstatus === 'draft' ? 'Submit' : 'Resubmit'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                                </div>
                    </div>
                </>
            )}
                </div>

                {/* Quick Actions Sidebar */}
                <div className={cn(
                    "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
                    // Mobile: Full screen overlay
                    isMobile ? cn(
                        "fixed inset-0 z-50 m-4",
                        isSidebarOpen ? "translate-x-0" : "translate-x-full"
                    ) : cn(
                        // Desktop: Sidebar
                        "min-h-[500px]",
                        isSidebarOpen ? "w-80" : "w-16"
                    )
                )}>
                    {/* Sidebar Header */}
                    <div className="flex-shrink-0 p-4 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
                        {isSidebarOpen && (
                            <h2 className="font-semibold text-gray-900 text-base truncate mr-2 min-w-0">Quick Actions</h2>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={cn(
                                "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg touch-manipulation flex-shrink-0",
                                !isSidebarOpen && "ml-auto"
                            )}
                        >
                            {isMobile ? (
                                <X className="h-4 w-4" />
                            ) : isSidebarOpen ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scrollbar-hide">
                        {/* Primary Actions */}
                        <div className="space-y-3">
                            {(isSidebarOpen || isMobile) && (
                                <div className="mb-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Create</h3>
                                </div>
                            )}
                            
                            <Link
                                href={`/dashboard/sponsor/${orgId}/listings/generate-document`}
                                className={cn(
                                    "block group touch-manipulation transition-all duration-300",
                                    (isSidebarOpen || isMobile)
                                        ? "w-full rounded-xl p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                                        : "p-2 hover:bg-blue-50 rounded-lg mx-auto flex items-center justify-center"
                                )}>
                                <div className="flex items-center space-x-3 w-full">
                                    {(isSidebarOpen || isMobile) ? (
                                        <>
                                            <div className="flex-shrink-0">
                                                <Sparkles className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-base text-white">Create Document</h4>
                                                    <span className="px-2 py-1 bg-white/20 text-white rounded-full text-xs font-medium border border-white/30">AI</span>
                                                </div>
                                                <p className="text-sm text-blue-100 mt-1">Generate professional documents</p>
                                            </div>
                                        </>
                                    ) : (
                                        <Sparkles className="h-4 w-4 text-blue-600" />
                                    )}
                                </div>
                            </Link>

                            <Link
                                href={`/dashboard/sponsor/${orgId}/new-listing`}
                                className={cn(
                                    "block group touch-manipulation transition-all duration-300",
                                    (isSidebarOpen || isMobile)
                                        ? "w-full border border-white/50 rounded-xl p-4 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg"
                                        : "p-2 hover:bg-white/50 rounded-lg mx-auto flex items-center justify-center"
                                )}>
                                <div className="flex items-center space-x-3 w-full">
                                    {(isSidebarOpen || isMobile) ? (
                                        <>
                                            <div className="flex-shrink-0">
                                                <Plus className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-medium text-sm text-gray-900">New Listing</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">Create exchange listing</p>
                                            </div>
                                        </>
                                    ) : (
                                        <Plus className="h-4 w-4 text-gray-600" />
                                    )}
                                </div>
                            </Link>

                            <Link
                                href={`/dashboard/sponsor/${orgId}/token-creation`}
                                className={cn(
                                    "block group touch-manipulation transition-all duration-300",
                                    (isSidebarOpen || isMobile)
                                        ? "w-full border border-white/50 rounded-xl p-4 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg"
                                        : "p-2 hover:bg-white/50 rounded-lg mx-auto flex items-center justify-center"
                                )}>
                                {(isSidebarOpen || isMobile) ? (
                                    <div className="flex items-center space-x-3 w-full">
                                        <div className="flex-shrink-0">
                                            <Plus className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-sm text-gray-900">Create Token</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Deploy new token</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Plus className="h-4 w-4 text-gray-600" />
                                )}
                            </Link>
                        </div>

                        {/* Navigation Actions */}
                        {(isSidebarOpen || isMobile) && (
                            <div className="pt-4 border-t border-gray-200/50">
                                <div className="mb-3">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigate</h3>
                                </div>
                                <div className="space-y-2">
                                    <Link
                                        href={`/dashboard/sponsor/${orgId}/clients`}
                                        className="block border border-white/50 rounded-xl p-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg transition-all duration-300">
                                        <div className="flex items-center space-x-3">
                                            <Users className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-900">Issuers</h4>
                                                <p className="text-xs text-gray-500">Manage issuer clients</p>
                                            </div>
                                        </div>
                                    </Link>

                                    <Link
                                        href={`/dashboard/sponsor/${orgId}/knowledge-vault`}
                                        className="block border border-white/50 rounded-xl p-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg transition-all duration-300">
                                        <div className="flex items-center space-x-3">
                                            <Brain className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-900">Knowledge Vault</h4>
                                                <p className="text-xs text-gray-500">AI knowledge base</p>
                                            </div>
                                        </div>
                                    </Link>

                                    <Link
                                        href={`/dashboard/sponsor/${orgId}/tools`}
                                        className="block border border-white/50 rounded-xl p-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg transition-all duration-300">
                                        <div className="flex items-center space-x-3">
                                            <Wrench className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-900">AI Tools</h4>
                                                <p className="text-xs text-gray-500">Connect and chat with AI</p>
                                            </div>
                                        </div>
                                    </Link>

                                    <Link
                                        href={`/dashboard/sponsor/${orgId}/analytics`}
                                        className="block border border-white/50 rounded-xl p-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg transition-all duration-300">
                                        <div className="flex items-center space-x-3">
                                            <BarChart3 className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-900">Analytics</h4>
                                                <p className="text-xs text-gray-500">Performance insights</p>
                                            </div>
                                        </div>
                                    </Link>

                                    <Link
                                        href={`/dashboard/sponsor/${orgId}/settings`}
                                        className="block border border-white/50 rounded-xl p-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg transition-all duration-300">
                                        <div className="flex items-center space-x-3">
                                            <Settings className="h-4 w-4 text-gray-600" />
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-900">Settings</h4>
                                                <p className="text-xs text-gray-500">Account configuration</p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Overlay Background */}
                {isMobile && isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>
            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/50 p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Submission</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to submit this listing for review? Once submitted, you won't be able to edit it until the review is complete.
                        </p>
                        <div className="flex space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowConfirmDialog(false);
                                    setListingToSubmit(null);
                                }}
                                className="flex-1 bg-white/50 border-gray-200 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmSubmit}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                Confirm Submit
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 