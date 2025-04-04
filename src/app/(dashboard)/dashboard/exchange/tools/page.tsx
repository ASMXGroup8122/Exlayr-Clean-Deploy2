'use client';

import React from 'react';
import { FileText, BarChart2, Globe, Calculator, BookOpen } from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import ToolsPage from '../../tools/page';
import { Agent } from '@/types/tools';

// Exchange-specific agents
const exchangeAgents: Agent[] = [
    {
        id: 'listing-analysis',
        name: 'Listing Analysis',
        description: 'Analyze and review listing applications',
        icon: <FileText className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'market-data',
        name: 'Market Data Analytics',
        description: 'Track and analyze market performance metrics',
        icon: <BarChart2 className="w-5 h-5" />,
        category: 'analytics'
    },
    {
        id: 'regulatory-check',
        name: 'Regulatory Check',
        description: 'Verify compliance with exchange regulations',
        icon: <BookOpen className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'fee-calculator',
        name: 'Fee Calculator',
        description: 'Calculate listing and maintenance fees',
        icon: <Calculator className="w-5 h-5" />,
        category: 'analytics'
    },
    {
        id: 'market-trends',
        name: 'Market Trends',
        description: 'Analyze global market trends and opportunities',
        icon: <Globe className="w-5 h-5" />,
        category: 'research'
    }
];

export default function ExchangeToolsPage() {
    return (
        <ToolsPage
            roleAgents={exchangeAgents}
            RouteGuard={(props) => (
                <RouteGuard allowedTypes={['exchange']} {...props} />
            )}
        />
    );
} 