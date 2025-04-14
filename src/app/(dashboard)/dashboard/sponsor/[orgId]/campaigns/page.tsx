import React from 'react';
import CampaignManagerClient from './CampaignManagerClient';

interface CampaignManagerPageProps {
  params: {
    orgId: string;
  };
}

export default async function CampaignManagerPage({ params: { orgId } }: CampaignManagerPageProps) {
  if (!orgId) {
    return <div>Error: Organization ID is missing.</div>;
  }

  return (
    <div className="container mx-auto">
      <CampaignManagerClient orgId={orgId} />
    </div>
  );
} 