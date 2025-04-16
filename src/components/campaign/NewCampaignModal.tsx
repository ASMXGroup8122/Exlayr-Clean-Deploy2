'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Globe,
    Newspaper,
    TrendingUp,
    Megaphone,
    DollarSign,
    Share2,
    Calendar,
    Users,
    Target
} from 'lucide-react';

// Campaign type definitions
const campaignTypes = [
    {
        id: 'social-media',
        name: 'Social Media Campaign',
        icon: <Share2 className="w-5 h-5" />,
        description: 'Create coordinated posts across multiple social media platforms',
        platforms: ['LinkedIn', 'Twitter', 'Facebook'],
        fields: ['headline', 'content', 'callToAction', 'targetAudience']
    },
    {
        id: 'press-release',
        name: 'Press Release Campaign',
        icon: <Newspaper className="w-5 h-5" />,
        description: 'Distribute press releases to media outlets and news platforms',
        fields: ['headline', 'summary', 'fullContent', 'quotes', 'mediaContact']
    },
    {
        id: 'share-price',
        name: 'Share Price Awareness',
        icon: <TrendingUp className="w-5 h-5" />,
        description: 'Communicate share price milestones and market performance',
        fields: ['milestone', 'performance', 'analysis', 'futureOutlook']
    },
    {
        id: 'post-fundraising',
        name: 'Post-Fundraising Awareness',
        icon: <Megaphone className="w-5 h-5" />,
        description: 'Announce successful fundraising rounds and future plans',
        fields: ['amount', 'investors', 'useOfFunds', 'growthPlans']
    },
    {
        id: 'fundraising',
        name: 'Fundraising Campaign',
        icon: <DollarSign className="w-5 h-5" />,
        description: 'Launch campaigns for new fundraising rounds',
        fields: ['target', 'equity', 'timeline', 'investorBenefits']
    }
];

interface NewCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (campaignData: any) => void;
}

export function NewCampaignModal({ isOpen, onClose, onSubmit }: NewCampaignModalProps) {
    const [selectedType, setSelectedType] = useState(campaignTypes[0].id);
    const [formData, setFormData] = useState({});

    const renderFields = (type: string) => {
        const campaign = campaignTypes.find(c => c.id === type);
        if (!campaign) return null;

        switch (type) {
            case 'social-media':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Campaign Name</Label>
                            <Input placeholder="Enter campaign name" />
                        </div>
                        <div>
                            <Label>Target Audience</Label>
                            <div className="flex gap-2 mb-2">
                                <Button variant="outline" size="sm">
                                    <Users className="w-4 h-4 mr-1" />
                                    Investors
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Target className="w-4 h-4 mr-1" />
                                    Stakeholders
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label>Platforms</Label>
                            <div className="flex gap-2 mb-4">
                                {campaign?.platforms?.map(platform => (
                                    <Button key={platform} variant="outline" size="sm">
                                        {platform}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>Content</Label>
                            <Textarea placeholder="Write your post content..." className="h-32" />
                        </div>
                        <div>
                            <Label>Schedule</Label>
                            <div className="flex gap-2 items-center">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-500">Select dates in the calendar</span>
                            </div>
                        </div>
                    </div>
                );

            case 'press-release':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Headline</Label>
                            <Input placeholder="Enter press release headline" />
                        </div>
                        <div>
                            <Label>Summary</Label>
                            <Textarea placeholder="Brief summary (will appear in previews)..." className="h-20" />
                        </div>
                        <div>
                            <Label>Full Content</Label>
                            <Textarea placeholder="Full press release content..." className="h-48" />
                        </div>
                        <div>
                            <Label>Quotes</Label>
                            <Textarea placeholder="Add relevant quotes from key figures..." className="h-32" />
                        </div>
                        <div>
                            <Label>Media Contact</Label>
                            <Input placeholder="Contact information for media inquiries" />
                        </div>
                    </div>
                );

            case 'share-price':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Milestone</Label>
                            <Input placeholder="e.g., 'Record high share price'" />
                        </div>
                        <div>
                            <Label>Performance Metrics</Label>
                            <Textarea placeholder="Key performance indicators and metrics..." className="h-32" />
                        </div>
                        <div>
                            <Label>Market Analysis</Label>
                            <Textarea placeholder="Analysis of market conditions and factors..." className="h-32" />
                        </div>
                        <div>
                            <Label>Future Outlook</Label>
                            <Textarea placeholder="Future projections and growth expectations..." className="h-32" />
                        </div>
                    </div>
                );

            case 'post-fundraising':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Amount Raised</Label>
                            <Input placeholder="Total amount raised" />
                        </div>
                        <div>
                            <Label>Key Investors</Label>
                            <Textarea placeholder="List key investors and their contributions..." className="h-24" />
                        </div>
                        <div>
                            <Label>Use of Funds</Label>
                            <Textarea placeholder="Detailed breakdown of fund allocation..." className="h-32" />
                        </div>
                        <div>
                            <Label>Growth Plans</Label>
                            <Textarea placeholder="Future plans and growth strategy..." className="h-32" />
                        </div>
                    </div>
                );

            case 'fundraising':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Fundraising Target</Label>
                            <Input placeholder="Target amount to raise" />
                        </div>
                        <div>
                            <Label>Equity Offering</Label>
                            <Input placeholder="Percentage of equity offered" />
                        </div>
                        <div>
                            <Label>Timeline</Label>
                            <div className="flex gap-2 items-center mb-4">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-500">Set campaign duration</span>
                            </div>
                        </div>
                        <div>
                            <Label>Investor Benefits</Label>
                            <Textarea placeholder="Key benefits and terms for investors..." className="h-32" />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue={selectedType} onValueChange={setSelectedType} className="w-full">
                    <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                        {campaignTypes.map(type => (
                            <TabsTrigger
                                key={type.id}
                                value={type.id}
                                className="flex flex-col items-center gap-1 p-2 text-center h-auto"
                            >
                                {type.icon}
                                <span className="text-xs">{type.name}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {campaignTypes.map(type => (
                        <TabsContent key={type.id} value={type.id} className="mt-4">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold">{type.name}</h3>
                                <p className="text-sm text-gray-500">{type.description}</p>
                            </div>
                            {renderFields(type.id)}
                        </TabsContent>
                    ))}
                </Tabs>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={() => onSubmit(formData)}>
                        Create Campaign
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 