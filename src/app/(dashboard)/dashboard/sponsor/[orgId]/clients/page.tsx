// 'use client'; // TODO: Remove if only passing props

import React from 'react';
import ClientsClient from './ClientsClient'; // Assuming the client component is in the same folder

// Define the expected shape of the params object
interface SponsorClientsPageProps {
  params: {
    orgId: string;
  };
}

// Make the component async
export default async function SponsorClientsPage({ params: { orgId } }: SponsorClientsPageProps) {
  // No need to await params directly here, destructuring works

  if (!orgId) {
    // Handle the case where orgId is missing, perhaps show an error or redirect
    return <div>Error: Organization ID is missing.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold mb-4">Issuers</h1>
      <p className="text-muted-foreground mb-6">
        List of issuers associated with your managed listings.
      </p>
      <ClientsClient orgId={orgId} />
    </div>
  );
} 