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
      <CampaignManagerClient orgId={orgId} />
    </div>
  );
} 