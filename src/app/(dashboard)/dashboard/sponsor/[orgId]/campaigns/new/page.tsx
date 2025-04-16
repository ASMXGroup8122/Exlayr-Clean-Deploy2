'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CampaignGoal } from '@/types/campaigns';
import { ArrowLeft } from 'lucide-react';
import { use } from 'react';

interface NewCampaignPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default function NewCampaignPage({ params }: NewCampaignPageProps) {
  const { orgId } = use(params);
  const router = useRouter();
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    goal: 'raise' as CampaignGoal,
    start_date: '',
    end_date: '',
    target_amount: 0
  });

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold text-[#202124]">Create New Campaign</h1>
      </div>

      <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        <div>
          <Label htmlFor="campaign-title">Campaign Title</Label>
          <Input
            id="campaign-title"
            value={newCampaign.title}
            onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
            placeholder="Enter campaign title"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="campaign-description">Description</Label>
          <Textarea
            id="campaign-description"
            value={newCampaign.description}
            onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
            placeholder="Describe your campaign"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="campaign-goal">Campaign Goal</Label>
          <Select 
            value={newCampaign.goal} 
            onValueChange={(value) => setNewCampaign({ ...newCampaign, goal: value as CampaignGoal })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select campaign goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raise">Fundraising</SelectItem>
              <SelectItem value="volume">Volume Drive</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="post_raise">Post-Raise Awareness</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="press_release">Press Release</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={newCampaign.start_date}
              onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={newCampaign.end_date}
              onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>

        {newCampaign.goal === 'raise' && (
          <div>
            <Label htmlFor="target-amount">Target Amount (£)</Label>
            <Input
              id="target-amount"
              type="number"
              value={newCampaign.target_amount}
              onChange={(e) => setNewCampaign({ ...newCampaign, target_amount: Number(e.target.value) })}
              placeholder="Enter target amount"
              className="mt-1.5"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement campaign creation
              console.log('Creating campaign:', newCampaign);
              router.push(`/dashboard/sponsor/${orgId}/campaigns`);
            }}
          >
            Create Campaign
          </Button>
        </div>
      </div>
    </div>
  );
} 