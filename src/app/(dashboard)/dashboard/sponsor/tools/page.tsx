'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { FileText, BarChart2, Globe } from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import ToolsPage from '../../tools/page';
import { Agent } from '@/types/tools';

// Sponsor-specific agents
const sponsorAgents: Agent[] = [
    {
        id: 'sponsor-analytics',
        name: 'Sponsor Analytics',
        description: 'Track and analyze your sponsorship performance metrics',
        icon: <BarChart2 className="w-5 h-5" />,
        category: 'analytics'
    },
    {
        id: 'compliance-check',
        name: 'Compliance Check',
        description: 'Verify compliance with sponsorship regulations and requirements',
        icon: <FileText className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'market-analysis',
        name: 'Market Analysis',
        description: 'Analyze market trends and opportunities in sponsorship',
        icon: <Globe className="w-5 h-5" />,
        category: 'research'
    }
];

export default function SponsorToolsPage() {
    return (
        <ToolsPage
            roleAgents={sponsorAgents}
            RouteGuard={(props) => (
                <RouteGuard allowedTypes={['exchange_sponsor']} {...props} />
            )}
        />
    );
} 
