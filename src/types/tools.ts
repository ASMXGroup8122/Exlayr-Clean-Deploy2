import { ReactNode } from 'react';

export interface Agent {
    id: string;
    name: string;
    description: string;
    icon: ReactNode;
    category: 'social' | 'research' | 'content' | 'analytics';
}

export interface Message {
    id: string;
    content: string;
    sender: 'user' | 'agent';
    agentId?: string;
    timestamp: Date;
}

export interface ToolsPageProps {
    // Additional agents specific to the role
    roleAgents?: Agent[];
    // Role-specific route guard component
    RouteGuard?: React.ComponentType<{ children: React.ReactNode }>;
} 