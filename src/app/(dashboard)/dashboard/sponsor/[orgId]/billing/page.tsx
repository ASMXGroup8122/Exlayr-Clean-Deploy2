import React from 'react';

// Define the expected shape of the params object for Next.js 15
interface BillingPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

// Make the component async and await params - required in Next.js 15
export default async function BillingPage({ params }: BillingPageProps) {
  // Await params before destructuring - required in Next.js 15
  const { orgId } = await params;

  if (!orgId) {
    return <div>Error: Organization ID is missing.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold mb-4">Billing</h1>
      <p className="text-muted-foreground mb-6">
        Manage your billing and subscription details.
      </p>
      
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-medium mb-4">Current Plan</h2>
        <p className="text-gray-600 mb-4">Professional Plan - $99/month</p>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Next billing date:</span>
            <span className="font-medium">January 15, 2025</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Status:</span>
            <span className="text-green-600 font-medium">Active</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500">
            Billing features are currently in development. Please contact support for billing inquiries.
          </p>
        </div>
      </div>
    </div>
  );
} 