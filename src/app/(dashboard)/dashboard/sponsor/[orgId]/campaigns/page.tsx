'use client';

import React from 'react';
import CampaignManagerClient from './CampaignManagerClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, CheckSquare } from 'lucide-react';

interface PageParams {
  orgId: string;
}

interface CampaignManagerPageProps {
  params: Promise<PageParams>;
}

export default function CampaignManagerPage({ params }: CampaignManagerPageProps) {
  const resolvedParams = React.use(params);
  const { orgId } = resolvedParams;

  if (!orgId) {
    return <div>Error: Organization ID is missing.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/dashboard/sponsor/${orgId}/campaigns/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </Link>
          <Link href={`/dashboard/sponsor/${orgId}/campaigns/social-post`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Single Social Post
            </Button>
          </Link>
          <Link href={`/dashboard/approvals`}>
            <Button variant="outline">
              <CheckSquare className="mr-2 h-4 w-4" /> View Approvals
            </Button>
          </Link>
        </div>
      </div>

      <CampaignManagerClient orgId={orgId} />
    </div>
  );
} 