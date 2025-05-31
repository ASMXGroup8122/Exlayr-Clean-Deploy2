'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { 
  Eye, 
  Users, 
  Building2, 
  Clock, 
  CheckCircle, 
  Target, 
  Plus, 
  Search,
  ChevronRight,
  X,
  Menu,
  Sparkles,
  FileText,
  Briefcase,
  Database,
  BarChart3,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// Updated based on actual issuers schema
interface Issuer {
  id: string;
  issuer_name: string | null;
  company_registration_number: number | null;
  country: string | null;
  main_contact: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Updated based on actual listing schema  
interface Listing {
  instrumentid: string;
  instrumentname: string;
  instrumentcategory: string | null;
  instrumentsubcategory: string | null;
  instrumentexchange: string | null;
  instrumentcreatedat: string | null;
  instrumentupdatedat: string | null;
  instrumentissuerid: string | null;
  instrumentcomplianceapproved: boolean | null;
  instrumentsponsorid: string | null;
}

interface IssuerWithListings extends Issuer {
  listings: Listing[];
}

interface ClientsClientProps {
  orgId: string;
}

export default function ClientsClient({ orgId }: ClientsClientProps) {
  const [issuers, setIssuers] = useState<IssuerWithListings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const supabase = getSupabaseClient();
  const router = useRouter();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchClientIssuers() {
      setLoading(true);
      setError(null);

      try {
        console.log("Fetching issuers for sponsor:", orgId);
        
        // Step 1: Get all listings for this sponsor
        const { data: listings, error: listingsError } = await supabase
          .from('listing')
          .select('*')
          .eq('instrumentsponsorid', orgId)
          .not('instrumentissuerid', 'is', null);

        if (listingsError) {
          console.error("Listings query error:", listingsError);
          throw new Error(`Listings query failed: ${listingsError.message}`);
        }

        console.log("Listings found:", listings?.length || 0);

        if (!listings || listings.length === 0) {
          console.log("No listings found for this sponsor");
          setIssuers([]);
          setLoading(false);
          return;
        }

        // Step 2: Get unique issuer IDs
        const issuerIds = [...new Set(listings.map(l => l.instrumentissuerid).filter(Boolean))];
        console.log("Unique issuer IDs:", issuerIds);

        if (issuerIds.length === 0) {
          console.log("No issuer IDs found in listings");
          setIssuers([]);
          setLoading(false);
          return;
        }

        // Step 3: Get issuer details
        const { data: issuersData, error: issuersError } = await supabase
          .from('issuers')
          .select('*')
          .in('id', issuerIds);

        if (issuersError) {
          console.error("Issuers query error:", issuersError);
          throw new Error(`Issuers query failed: ${issuersError.message}`);
        }

        console.log("Issuers found:", issuersData?.length || 0);

        if (!issuersData || issuersData.length === 0) {
          console.log("No issuer data found");
          setIssuers([]);
          setLoading(false);
          return;
        }

        // Step 4: Combine data
        const issuerMap = new Map<string, IssuerWithListings>();
        
        // Initialize issuers
        issuersData.forEach((issuer: any) => {
          issuerMap.set(issuer.id, {
            ...issuer,
            listings: []
          });
        });

        // Add listings to their respective issuers
        listings.forEach((listing: any) => {
          if (listing.instrumentissuerid && issuerMap.has(listing.instrumentissuerid)) {
            issuerMap.get(listing.instrumentissuerid)!.listings.push({
              instrumentid: listing.instrumentid,
              instrumentname: listing.instrumentname,
              instrumentcategory: listing.instrumentcategory,
              instrumentsubcategory: listing.instrumentsubcategory,
              instrumentexchange: listing.instrumentexchange,
              instrumentcreatedat: listing.instrumentcreatedat,
              instrumentupdatedat: listing.instrumentupdatedat,
              instrumentissuerid: listing.instrumentissuerid,
              instrumentcomplianceapproved: listing.instrumentcomplianceapproved,
              instrumentsponsorid: listing.instrumentsponsorid
            });
          }
        });

        const finalResult = Array.from(issuerMap.values());
        console.log("Final processed result:", finalResult.length, "issuers");
        setIssuers(finalResult);
        
      } catch (err: any) {
        console.error("Error fetching client issuers:", err);
        setError(`Failed to load client data: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      // Add timeout to prevent infinite hanging
      const timeoutId = setTimeout(() => {
        setError("Request timed out. Please refresh the page.");
        setLoading(false);
      }, 15000); // 15 second timeout

      fetchClientIssuers().finally(() => {
        clearTimeout(timeoutId);
      });
    }
  }, [orgId]); // Remove supabase from dependencies to prevent infinite loops

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Helper functions for real data
  const getInstrumentType = (listings: Listing[]) => {
    const categories = listings.map(l => l.instrumentcategory).filter(Boolean);
    return categories.length > 0 ? categories[0] : 'Equity';
  };

  const getInstrumentSubtype = (listings: Listing[]) => {
    const subcategories = listings.map(l => l.instrumentsubcategory).filter(Boolean);
    return subcategories.length > 0 ? subcategories[0] : 'Ordinary Shares';
  };

  const getExchangeName = (listings: Listing[]) => {
    const exchanges = listings.map(l => l.instrumentexchange).filter(Boolean);
    return exchanges.length > 0 ? exchanges[0] : 'Unknown Exchange';
  };

  const getLatestUpdateDate = (issuer: IssuerWithListings) => {
    const dates = [
      issuer.updated_at,
      issuer.created_at,
      ...issuer.listings.map(l => l.instrumentupdatedat || l.instrumentcreatedat)
    ].filter((date): date is string => Boolean(date));
    
    if (dates.length === 0) return new Date().toLocaleDateString();
    
    const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return latestDate.toLocaleDateString();
  };

  // Filter issuers
  const filteredIssuers = issuers.filter(issuer => 
    issuer.issuer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issuer.company_registration_number?.toString().includes(searchTerm.toLowerCase()) ||
    issuer.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                    Deal Center
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    Manage your issuer clients and create documents
                  </p>
                </div>
              </div>
              
              {/* Mobile Toggle Button */}
              <div className="md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg min-w-[44px] h-11"
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                <span className="font-bold">{issuers.length}</span>
                <span>Total</span>
              </Badge>
              
              <Badge className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                <span className="font-bold">{issuers.filter(c => c.status === 'approved').length}</span>
                <span>Approved</span>
              </Badge>
              
              <Badge className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs sm:text-sm font-medium">
                <span className="font-bold">{issuers.filter(c => c.status === 'pending').length}</span>
                <span>Pending</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
        {/* Content Table */}
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col min-h-[500px]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading clients...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading data</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="flex-shrink-0 bg-gray-50/80 border-b border-gray-200/50">
                <div className="hidden sm:grid grid-cols-12 gap-4 p-4 sm:p-6 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="col-span-3">CLIENT DETAILS</div>
                  <div className="col-span-2">CATEGORY</div>
                  <div className="col-span-2">EXCHANGE</div>
                  <div className="col-span-2">STATUS</div>
                  <div className="col-span-2">UPDATED</div>
                  <div className="col-span-1 text-right">ACTIONS</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {filteredIssuers.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                      <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No clients found</h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-6">You don't have any issuer clients yet. Create your first listing to get started.</p>
                    <Link href={`/dashboard/sponsor/${orgId}/clients/new`}>
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                        <Plus className="h-5 w-5 mr-2" />
                        Create New Issuer
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200/50">
                    {filteredIssuers.map((issuer) => (
                      <div key={issuer.id} className="p-4 sm:p-6 hover:bg-gray-50/50 transition-colors">
                        {/* Mobile View */}
                        <div className="sm:hidden space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{issuer.issuer_name}</h3>
                                <p className="text-sm text-gray-500">{issuer.company_registration_number || 'No reg. number'}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(issuer.status)} className="text-xs">
                              {issuer.status || 'pending'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                            <div>
                              <span className="font-medium">Exchange:</span>
                              <br />
                              <span>{getExchangeName(issuer.listings)}</span>
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>
                              <br />
                              <span>{getInstrumentType(issuer.listings)}</span>
                            </div>
                            <div>
                              <span className="font-medium">Country:</span>
                              <br />
                              <span>{issuer.country || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="font-medium">Updated:</span>
                              <br />
                              <span>{getLatestUpdateDate(issuer)}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients/${issuer.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients/${issuer.id}/edit`)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>

                        {/* Desktop View */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{issuer.issuer_name}</h3>
                                <p className="text-sm text-gray-500">{issuer.company_registration_number || 'No reg. number'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-gray-600">{getInstrumentType(issuer.listings)}</span>
                            <p className="text-xs text-gray-500">{getInstrumentSubtype(issuer.listings)}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-gray-600">{getExchangeName(issuer.listings)}</span>
                            <p className="text-xs text-gray-500">{issuer.country || 'Unknown'}</p>
                          </div>
                          <div className="col-span-2">
                            <Badge variant={getStatusBadgeVariant(issuer.status)} className="text-xs">
                              {issuer.status === 'pending' ? 'Needs revision' : issuer.status || 'pending'}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-gray-600">{getLatestUpdateDate(issuer)}</span>
                          </div>
                          <div className="col-span-1 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700 p-1"
                                onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients/${issuer.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-500 hover:text-gray-700 p-1"
                                onClick={() => router.push(`/dashboard/sponsor/${orgId}/clients/${issuer.id}/documents`)}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">Documents</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className={cn(
          "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
          // Mobile: Full screen overlay
          isMobile ? cn(
            "fixed inset-0 z-50 m-4",
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          ) : cn(
            // Desktop: Sidebar
            "min-h-[500px]",
            sidebarOpen ? "w-80" : "w-16"
          )
        )}>
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
            {sidebarOpen && (
              <h2 className="font-semibold text-gray-900 text-lg truncate mr-2 min-w-0">Quick Actions</h2>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg touch-manipulation flex-shrink-0 min-w-[44px] h-11",
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
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {sidebarOpen ? (
              <>
                {/* CREATE Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">CREATE</h3>
                  <div className="space-y-2">
                    <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-auto p-4">
                      <div className="flex items-center space-x-3 w-full">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium">Create Document</div>
                          <div className="text-xs opacity-90">Generate professional documents</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Link href={`/dashboard/sponsor/${orgId}/new-listing`}>
                      <Button variant="outline" className="w-full justify-start h-auto p-3 border-gray-200 hover:bg-gray-50">
                        <Plus className="h-4 w-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium text-sm">New Listing</div>
                          <div className="text-xs text-gray-500">Create exchange listing</div>
                        </div>
                      </Button>
                    </Link>
                    
                    <Button variant="outline" className="w-full justify-start h-auto p-3 border-gray-200 hover:bg-gray-50">
                      <Target className="h-4 w-4 mr-3" />
                      <div className="text-left">
                        <div className="font-medium text-sm">Create Token</div>
                        <div className="text-xs text-gray-500">Deploy new token</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* NAVIGATE Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">NAVIGATE</h3>
                  <div className="space-y-1">
                    <Link href={`/dashboard/sponsor/${orgId}/clients`}>
                      <Button variant="ghost" className="w-full justify-start text-blue-600 bg-blue-50 hover:bg-blue-100">
                        <Users className="h-4 w-4 mr-3" />
                        Deal Center
                      </Button>
                    </Link>
                    
                    <Link href={`/dashboard/sponsor/${orgId}/knowledge-vault`}>
                      <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                        <Database className="h-4 w-4 mr-3" />
                        Knowledge Vault
                      </Button>
                    </Link>
                    
                    <Link href={`/dashboard/sponsor/${orgId}/tools`}>
                      <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                        <Sparkles className="h-4 w-4 mr-3" />
                        Agent Center
                      </Button>
                    </Link>
                    
                    <Link href={`/dashboard/sponsor/${orgId}/analytics`}>
                      <Button variant="ghost" className="w-full justify-start hover:bg-gray-50">
                        <BarChart3 className="h-4 w-4 mr-3" />
                        Analytics
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              // Collapsed sidebar icons
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                    <Sparkles className="h-5 w-5 text-blue-600 mx-auto" />
                  </div>
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                    <Plus className="h-5 w-5 text-gray-600 mx-auto" />
                  </div>
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                    <Target className="h-5 w-5 text-gray-600 mx-auto" />
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="p-2 bg-blue-50 rounded-lg cursor-pointer">
                    <Users className="h-5 w-5 text-blue-600 mx-auto" />
                  </div>
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                    <Database className="h-5 w-5 text-gray-600 mx-auto" />
                  </div>
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                    <Sparkles className="h-5 w-5 text-gray-600 mx-auto" />
                  </div>
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer">
                    <BarChart3 className="h-5 w-5 text-gray-600 mx-auto" />
                  </div>
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