'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// import { Skeleton } from "@/components/ui/skeleton"; // Removed Skeleton import
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Updated based on actual issuers schema
interface Issuer {
  id: string;
  issuer_name: string; // Corrected column name
  company_registration_number: string | null; // Corrected column name
  country: string | null;
  main_contact: string | null; // Corrected column name
  status: 'pending' | 'approved' | 'rejected' | 'archived' | null;
}

interface ClientsClientProps {
  orgId: string;
}

export default function ClientsClient({ orgId }: ClientsClientProps) {
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'prospects'>('approved');

  useEffect(() => {
    async function fetchClientIssuers() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch listings managed by this sponsor
        const { data: listings, error: listingsError } = await supabase
          .from('listing')
          .select('instrumentid, instrumentissuerid')
          .eq('instrumentsponsorid', orgId);

        if (listingsError) throw listingsError;
        if (!listings || listings.length === 0) {
          setIssuers([]);
          setLoading(false);
          return;
        }

        const issuerIds = [
            ...new Set(listings.map((listing: any) => listing.instrumentissuerid).filter((id: any) => id !== null))
        ];

        if (issuerIds.length === 0) {
          setIssuers([]);
          setLoading(false);
          return;
        }

        // 3. Fetch details for those issuers using correct column names
        const { data: issuerData, error: issuersError } = await supabase
          .from('issuers')
          // Select the correct columns based on schema
          .select('id, issuer_name, company_registration_number, country, main_contact, status')
          .in('id', issuerIds);

        if (issuersError) throw issuersError;

        // Cast the fetched data to the Issuer interface
        setIssuers((issuerData as Issuer[]) || []);
      } catch (err: any) {
        console.error("Error fetching client issuers:", err);
        setError(`Failed to load client data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      fetchClientIssuers();
    }
  }, [orgId, supabase]);

  const getStatusBadgeVariant = (status: Issuer['status']): "default" | "secondary" | "destructive" | "outline" => {
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

  // Tab filter logic
  const filteredIssuers = issuers.filter(issuer => {
    if (activeTab === 'approved') return issuer.status === 'approved';
    if (activeTab === 'pending') return issuer.status === 'pending';
    // @ts-expect-error: 'prospect' is a placeholder for future status
    if (activeTab === 'prospects') return issuer.status === 'prospect';
    return false;
  });

  if (loading) {
    // Simplified loading state
    return (
      <>
        <div className="flex justify-end px-4 pt-4">
          <Button asChild>
            <Link href={`/dashboard/sponsor/${orgId}/clients/new`}>
              Create new Issuer
            </Link>
          </Button>
        </div>
        <div>Loading issuers...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex justify-end px-4 pt-4">
          <Button asChild>
            <Link href={`/dashboard/sponsor/${orgId}/clients/new`}>
              Create new Issuer
            </Link>
          </Button>
        </div>
        <div className="text-red-600">Error: {error}</div>
      </>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Create new Issuer button */}
      <div className="flex justify-end px-4 pt-4">
        <Button asChild>
          <Link href={`/dashboard/sponsor/${orgId}/clients/new`}>
            Create new Issuer
          </Link>
        </Button>
      </div>
      {/* Tabs for status filtering */}
      <div className="border-b bg-gray-50 px-4 pt-4">
        <div className="flex space-x-4">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'approved' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'prospects' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('prospects')}
          >
            Prospects
          </button>
        </div>
      </div>
      {/* Table for filtered issuers */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Issuer Name</TableHead>
            <TableHead>Registration Number</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Main Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredIssuers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No issuers found for this tab.
              </TableCell>
            </TableRow>
          ) : (
            filteredIssuers.map((issuer) => (
              <TableRow key={issuer.id}>
                <TableCell className="font-medium">{issuer.issuer_name || '-'}</TableCell>
                <TableCell>{issuer.company_registration_number || '-'}</TableCell>
                <TableCell>{issuer.country || '-'}</TableCell>
                <TableCell>{issuer.main_contact || '-'}</TableCell>
                <TableCell>
                  {issuer.status ? (
                    <Badge variant={getStatusBadgeVariant(issuer.status)} className="capitalize">
                      {issuer.status}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/sponsor/${orgId}/clients/${issuer.id}`}
                      aria-label={`View details for ${issuer.issuer_name}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 