'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, FileText, ArrowUpRight, Send, Loader2, Building2, Calendar, Tag, Globe, BarChart3, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

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

    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [listingToSubmit, setListingToSubmit] = useState<string | null>(null);

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
            setListings(currentListings => 
                currentListings.map(l => 
                    l.instrumentid === listingId 
                        ? { ...l, instrumentsecuritiesadmissionstatus: 'pending' } 
                        : l
                )
            );

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

            {/* Header Section */}
            <div className="relative mb-6 md:mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                    Listings
                                </h1>
                                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                                    Manage your exchange listings and submissions
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                                <BarChart3 className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{listings.length} Total</span>
                            </div>
                            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                                <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{listings.filter(l => l.instrumentsecuritiesadmissionstatus === 'approved').length} Approved</span>
                            </div>
                            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-medium">
                                <Clock className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{listings.filter(l => l.instrumentsecuritiesadmissionstatus === 'pending').length} Pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 md:mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Link
                            href={`/dashboard/sponsor/${orgId}/new-listing`}
                            className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm h-10 sm:h-12 w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            New Listing
                        </Link>
                        <Link
                            href={`/dashboard/sponsor/${orgId}/token-creation`}
                            className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-white/50 border border-gray-200/50 text-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-white/70 transition-all duration-300 text-sm h-10 sm:h-12 w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Create Token
                        </Link>
                        <Link
                            href={`/dashboard/sponsor/${orgId}/listings/generate-document`}
                            className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-white/50 border border-gray-200/50 text-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-white/70 transition-all duration-300 text-sm h-10 sm:h-12 w-full sm:w-auto"
                        >
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Create Document
                        </Link>
                    </div>
                </div>
            </div>

            {/* Listings Content */}
            {listings.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8 sm:p-12 text-center">
                    <div className="mx-auto rounded-full w-20 h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-6">
                        <Building2 className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No listings yet</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first listing or token.</p>
                    <Link
                        href={`/dashboard/sponsor/${orgId}/new-listing`}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Listing
                    </Link>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="min-w-full divide-y divide-gray-200/50">
                                    <thead className="bg-gradient-to-r from-gray-50/80 to-blue-50/80">
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
                                        {listings.map((listing) => (
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
                                                                href={`/dashboard/sponsor/${orgId}/listings/${listing.instrumentid}/edit-document`}
                                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                            >
                                                                <FileText className="h-3 w-3 mr-1" />
                                                                Edit
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
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4">
                        {listings.map((listing) => (
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
                                                href={`/dashboard/sponsor/${orgId}/listings/${listing.instrumentid}/edit-document`}
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                            >
                                                <FileText className="h-3 w-3 mr-1" />
                                                Edit
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
                </>
            )}

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