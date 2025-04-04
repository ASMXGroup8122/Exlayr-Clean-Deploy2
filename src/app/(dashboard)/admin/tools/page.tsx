'use client';

import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import { 
    Linkedin, 
    Instagram, 
    Search, 
    FileText, 
    Globe, 
    PenTool, 
    BarChart2, 
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Send,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Agent {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'social' | 'research' | 'content' | 'analytics';
}

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'agent';
    agentId?: string;
    timestamp: Date;
}

const agents: Agent[] = [
    {
        id: 'linkedin',
        name: 'LinkedIn Post Creator',
        description: 'Create engaging LinkedIn posts for your business',
        icon: <Linkedin className="w-4 h-4" />,
        category: 'social'
    },
    {
        id: 'instagram',
        name: 'Instagram Content',
        description: 'Generate Instagram content ideas and captions',
        icon: <Instagram className="w-4 h-4" />,
        category: 'social'
    },
    {
        id: 'research',
        name: 'Deep Research',
        description: 'Conduct in-depth research on any topic',
        icon: <Search className="w-4 h-4" />,
        category: 'research'
    },
    {
        id: 'regulatory',
        name: 'Regulatory Analysis',
        description: 'Analyze regulatory requirements and compliance',
        icon: <FileText className="w-4 h-4" />,
        category: 'research'
    },
    {
        id: 'market',
        name: 'Market Intelligence',
        description: 'Get insights on market trends and competitors',
        icon: <Globe className="w-4 h-4" />,
        category: 'research'
    },
    {
        id: 'writer',
        name: 'Content Writer',
        description: 'Generate high-quality content for various purposes',
        icon: <PenTool className="w-4 h-4" />,
        category: 'content'
    },
    {
        id: 'analytics',
        name: 'Performance Analytics',
        description: 'Analyze and visualize performance metrics',
        icon: <BarChart2 className="w-4 h-4" />,
        category: 'analytics'
    },
    {
        id: 'knowledge',
        name: 'Knowledge Base',
        description: 'Access and search through your knowledge base',
        icon: <BookOpen className="w-4 h-4" />,
        category: 'research'
    }
];

export default function AdminToolsPage() {
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');

    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: `${agent.name} is ready to help you. What would you like to do?`,
            sender: 'agent',
            agentId: agent.id,
            timestamp: new Date()
        }]);
    };

    const handleSendMessage = () => {
        if (!input.trim()) return;

        // Add user message
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: input,
            sender: 'user',
            timestamp: new Date()
        }]);

        // Mock agent response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                content: `This is a mock response from ${selectedAgent?.name || 'the agent'}. In the real implementation, this would be handled by the MCP server.`,
                sender: 'agent',
                agentId: selectedAgent?.id,
                timestamp: new Date()
            }]);
        }, 1000);

        setInput('');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold text-center mb-8">THIS PAGE</h1>
            <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="flex h-[calc(100vh-8rem)]">
                    {/* Main Chat Area */}
                    <div className="flex-1 relative bg-white">
                        {/* Fixed Header */}
                        <div className="sticky top-0 z-20 bg-white border-b">
                            <div className="px-6 py-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {selectedAgent ? selectedAgent.name : 'Exlayr Tools'}
                                </h2>
                                {selectedAgent && (
                                    <p className="mt-1 text-sm text-gray-500">{selectedAgent.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Messages Area */}
                        <div className="h-[calc(100vh-16rem)] overflow-y-auto">
                            <ScrollArea className="h-full">
                                <div className="px-6 py-4 space-y-6">
                                    {messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex gap-3 max-w-[80%]",
                                                message.sender === 'user' ? "ml-auto" : ""
                                            )}
                                        >
                                            {message.sender === 'agent' && message.agentId && (
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    {agents.find(a => a.id === message.agentId)?.icon}
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    "rounded-lg px-4 py-2.5",
                                                    message.sender === 'user' 
                                                        ? "bg-blue-600 text-white" 
                                                        : "bg-gray-50 text-gray-900 border border-gray-100"
                                                )}
                                            >
                                                {message.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Fixed Input Area */}
                        <div className="sticky bottom-0 bg-white border-t">
                            <div className="px-6 py-4">
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    <Input
                                        placeholder={selectedAgent 
                                            ? `Message ${selectedAgent.name}...` 
                                            : "Select an agent to get started..."
                                        }
                                        value={input}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        disabled={!selectedAgent}
                                        className="min-h-[48px] px-4 py-3"
                                    />
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="shrink-0"
                                        onClick={handleSendMessage}
                                        disabled={!selectedAgent || !input.trim()}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agents Toolbar */}
                    <div className={cn(
                        "border-l bg-white flex flex-col transition-all duration-200",
                        isToolbarOpen ? "w-[320px]" : "w-12"
                    )}>
                        <div className="px-4 py-3 border-b flex items-center justify-between bg-white">
                            {isToolbarOpen && <h2 className="font-semibold text-gray-900">Agents</h2>}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                                className="text-gray-500 hover:text-gray-900"
                            >
                                {isToolbarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {isToolbarOpen ? (
                                <div className="p-3 space-y-1">
                                    {agents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => handleAgentSelect(agent)}
                                            className={cn(
                                                "w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                                                "hover:bg-gray-50",
                                                selectedAgent?.id === agent.id && "bg-gray-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                    {agent.icon}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{agent.name}</div>
                                                    <div className="text-sm text-gray-500">{agent.description}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-3 px-2 space-y-3">
                                    {agents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => handleAgentSelect(agent)}
                                            className={cn(
                                                "w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center",
                                                selectedAgent?.id === agent.id && "bg-blue-100"
                                            )}
                                            title={agent.name}
                                        >
                                            {agent.icon}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 