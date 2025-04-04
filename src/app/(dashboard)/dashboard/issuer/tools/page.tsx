'use client';

import React from 'react';
import { FileText, BarChart2, Globe, MessageSquare, PenTool } from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import ToolsPage from '../../tools/page';
import { Agent } from '@/types/tools';

// Issuer-specific agents
const issuerAgents: Agent[] = [
    {
        id: 'document-writer',
        name: 'Document Writer',
        description: 'Create and edit listing documents and announcements',
        icon: <PenTool className="w-5 h-5" />,
        category: 'content'
    },
    {
        id: 'performance-metrics',
        name: 'Performance Metrics',
        description: 'Track and analyze your listing performance',
        icon: <BarChart2 className="w-5 h-5" />,
        category: 'analytics'
    },
    {
        id: 'regulatory-filing',
        name: 'Regulatory Filing',
        description: 'Prepare and review regulatory filings',
        icon: <FileText className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'market-updates',
        name: 'Market Updates',
        description: 'Get real-time market insights and updates',
        icon: <Globe className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'communication',
        name: 'Communication Hub',
        description: 'Manage communications with sponsors and exchanges',
        icon: <MessageSquare className="w-5 h-5" />,
        category: 'content'
    }
];

export default function IssuerToolsPage() {
    return (
        <ToolsPage
            roleAgents={issuerAgents}
            RouteGuard={(props) => (
                <RouteGuard allowedTypes={['issuer']} {...props} />
            )}
        />
    );
} 