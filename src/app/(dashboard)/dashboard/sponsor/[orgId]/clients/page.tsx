// 'use client'; // TODO: Remove if only passing props

import React from 'react';
import ClientsClient from './ClientsClient'; // Assuming the client component is in the same folder

// Define the expected shape of the params object
interface SponsorClientsPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

// Make the component async and await params
export default async function SponsorClientsPage({ params }: SponsorClientsPageProps) {
  // Await params before destructuring - required in Next.js 15
  const { orgId } = await params;

  if (!orgId) {
    // Handle the case where orgId is missing, perhaps show an error or redirect
    return <div>Error: Organization ID is missing.</div>;
  }

  return <ClientsClient orgId={orgId} />;
} 