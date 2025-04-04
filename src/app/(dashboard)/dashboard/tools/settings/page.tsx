'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { baseAgents, mcpAgents } from '../page';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParams } from 'next/navigation';

interface Agent {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'social' | 'research' | 'content' | 'analytics';
}

interface EnabledAgents {
    [key: string]: boolean;
}

function ToolCard({ tool, enabled, onToggle }: { 
    tool: Agent, 
    enabled: boolean,
    onToggle: () => void 
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card 
            className={cn(
                "relative transition-all duration-200 cursor-pointer group",
                isExpanded 
                    ? "aspect-square" 
                    : "h-[120px]"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
                <Switch 
                    checked={enabled} 
                    onCheckedChange={onToggle}
                    aria-label={`Toggle ${tool.name}`}
                />
            </div>

            <div className={cn(
                "h-full p-4 flex flex-col",
                isExpanded ? "justify-between" : "justify-start"
            )}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {tool.icon}
                    </div>
                    <h3 className="font-medium flex-1 pr-12">{tool.name}</h3>
                </div>

                {isExpanded ? (
                    <>
                        <p className="text-sm text-gray-600 flex-1 overflow-auto">{tool.description}</p>
                        <div className="flex justify-center mt-4">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-gray-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }}
                            >
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Show Less
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-600 line-clamp-2">{tool.description}</p>
                        <div className="flex justify-center mt-auto">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-gray-500"
                            >
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show More
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}

export default function ToolsSettingsPage() {
    const { user } = useAuth();
    const { orgId } = useParams();
    const [selectedSection, setSelectedSection] = useState<'all' | 'base' | 'mcp' | 'role'>('all');
    const [roleSpecificAgents, setRoleSpecificAgents] = useState<Agent[]>([]);
    const [enabledTools, setEnabledTools] = useState<EnabledAgents>(() => {
        // Load enabled state from localStorage using the same key as base tools page
        const stored = localStorage.getItem('enabledTools');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse stored tools state:', error);
                // Default all agents to enabled
                const agents = [...baseAgents, ...mcpAgents];
                const defaultState = agents.reduce((acc, agent) => ({
                    ...acc,
                    [agent.id]: true
                }), {});
                localStorage.setItem('enabledTools', JSON.stringify(defaultState));
                return defaultState;
            }
        }
        // Default all agents to enabled
        const agents = [...baseAgents, ...mcpAgents];
        const defaultState = agents.reduce((acc, agent) => ({
            ...acc,
            [agent.id]: true
        }), {});
        localStorage.setItem('enabledTools', JSON.stringify(defaultState));
        return defaultState;
    });

    // Load sponsor agents dynamically to avoid circular dependencies
    useEffect(() => {
        async function loadRoleAgents() {
            if (user?.account_type === 'exchange_sponsor') {
                try {
                    const module = await import('../../sponsor/[orgId]/tools/page');
                    setRoleSpecificAgents(module.sponsorAgents);
                } catch (error) {
                    console.error('Failed to load sponsor agents:', error);
                    setRoleSpecificAgents([]);
                }
            } else {
                setRoleSpecificAgents([]);
            }
        }
        loadRoleAgents();
    }, [user?.account_type]);

    // Update enabled tools when role agents change
    useEffect(() => {
        if (roleSpecificAgents.length === 0) return;

        const currentTools = [...baseAgents, ...mcpAgents, ...roleSpecificAgents];
        const newState = currentTools.reduce((acc, tool) => ({
            ...acc,
            [tool.id]: enabledTools[tool.id] ?? true
        }), {} as EnabledAgents);
        
        localStorage.setItem('enabledTools', JSON.stringify(newState));
        setEnabledTools(newState);
    }, [roleSpecificAgents]);

    const toggleTool = (toolId: string) => {
        const newState = {
            ...enabledTools,
            [toolId]: !enabledTools[toolId]
        };
        localStorage.setItem('enabledTools', JSON.stringify(newState));
        setEnabledTools(newState);
    };

    // Map section keys to display names
    const sectionNames: Record<string, string> = {
        all: 'All Sections',
        base: 'Base Tools',
        mcp: 'MCP Agents',
        role: 'Role-Specific Tools'
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href={user?.organization_id ? `/dashboard/sponsor/${user.organization_id}/tools` : "/dashboard/tools"}>
                        <Button variant="ghost" size="sm">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Tools
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold">Tools Settings</h1>
                        <p className="text-gray-600 mt-1">
                            Enable or disable tools to customize your sidebar. Disabled tools won't appear in the tools sidebar.
                        </p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            {sectionNames[selectedSection]}
                            <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSection('all')}>All Sections</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedSection('base')}>Base Tools</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedSection('mcp')}>MCP Agents</DropdownMenuItem>
                        {roleSpecificAgents.length > 0 && (
                            <DropdownMenuItem onClick={() => setSelectedSection('role')}>Role-Specific Tools</DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="space-y-8">
                {(selectedSection === 'all' || selectedSection === 'base') && (
                    <div>
                        <h2 className="text-lg font-medium mb-4">Base Tools</h2>
                        <p className="text-sm text-gray-600 mb-4">Core AI capabilities available to all users.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                            {baseAgents.map(tool => (
                                <ToolCard
                                    key={tool.id}
                                    tool={tool}
                                    enabled={enabledTools[tool.id] ?? true}
                                    onToggle={() => toggleTool(tool.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {(selectedSection === 'all' || selectedSection === 'mcp') && (
                    <div>
                        <h2 className="text-lg font-medium mb-4">MCP Agents</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Connect to third-party services and external data sources directly from chat.
                            Enable these agents to access specific functionalities like market data, file storage, or email integration.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                            {mcpAgents.map(tool => (
                                <ToolCard
                                    key={tool.id}
                                    tool={tool}
                                    enabled={enabledTools[tool.id] ?? true}
                                    onToggle={() => toggleTool(tool.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {roleSpecificAgents.length > 0 && (selectedSection === 'all' || selectedSection === 'role') && (
                    <div>
                        <h2 className="text-lg font-medium mb-4">Role-Specific Tools</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Tools specific to your role as a {user?.account_type?.replace('_', ' ')}.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                            {roleSpecificAgents.map(tool => (
                                <ToolCard
                                    key={tool.id}
                                    tool={tool}
                                    enabled={enabledTools[tool.id] ?? true}
                                    onToggle={() => toggleTool(tool.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 