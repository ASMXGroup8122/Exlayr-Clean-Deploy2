'use client';

import React, { useState, KeyboardEvent, ChangeEvent, useEffect } from 'react';
import { 
    Search, 
    FileText, 
    Globe, 
    PenTool, 
    BarChart2, 
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Send,
    Plus,
    Settings,
    LineChart,
    FileJson,
    Database,
    Cloud,
    Mail,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import ChatInput from '@/components/chat/ChatInput';

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

// Base agents that are available to all roles
export const baseAgents: Agent[] = [
    {
        id: 'research',
        name: 'Deep Research',
        description: 'Conduct in-depth research on any topic',
        icon: <Search className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'market',
        name: 'Market Intelligence',
        description: 'Get insights on market trends and competitors',
        icon: <Globe className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'writer',
        name: 'Content Writer',
        description: 'Generate high-quality content for various purposes',
        icon: <PenTool className="w-5 h-5" />,
        category: 'content'
    },
    {
        id: 'knowledge',
        name: 'Knowledge Base',
        description: 'Access and search through your knowledge base',
        icon: <BookOpen className="w-5 h-5" />,
        category: 'research'
    }
];

// MCP agents for third-party integrations
export const mcpAgents: Agent[] = [
    {
        id: 'exchange-data',
        name: 'Exchange Agent',
        description: 'Connect to real-time market data, price feeds, and trading information. Get instant access to market prices and trends.',
        icon: <LineChart className="w-5 h-5" />,
        category: 'research'
    },
    {
        id: 'file-manager',
        name: 'File Manager',
        description: 'Connect your Google Drive, Dropbox, or local storage. Search, manage, and analyze your documents directly from chat.',
        icon: <FileJson className="w-5 h-5" />,
        category: 'content'
    },
    {
        id: 'data-connector',
        name: 'Data Connector',
        description: 'Connect to your databases and data warehouses. Query and analyze your data without leaving the chat.',
        icon: <Database className="w-5 h-5" />,
        category: 'analytics'
    },
    {
        id: 'cloud-storage',
        name: 'Cloud Storage',
        description: 'Access and manage files across multiple cloud storage providers. Seamlessly integrate with AWS, Azure, or GCP.',
        icon: <Cloud className="w-5 h-5" />,
        category: 'content'
    },
    {
        id: 'email-assistant',
        name: 'Email Assistant',
        description: 'Connect your email accounts to send, receive, and analyze emails. Schedule meetings and manage communications.',
        icon: <Mail className="w-5 h-5" />,
        category: 'content'
    },
    {
        id: 'calendar-sync',
        name: 'Calendar Sync',
        description: 'Integrate with your calendar to schedule meetings, set reminders, and manage your time efficiently.',
        icon: <Calendar className="w-5 h-5" />,
        category: 'content'
    }
];

interface ToolsPageProps {
    // Additional agents specific to the role
    roleAgents?: Agent[];
    // Role-specific route guard component
    RouteGuard?: React.ComponentType<{ children: React.ReactNode }>;
}

interface EnabledAgents {
    [key: string]: boolean;
}

declare function mcp_supabase_query(params: { sql: string }): Promise<any>;

// Define Content component outside ToolsPage
interface ContentProps {
    messages: Message[];
    agents: Agent[];
    selectedAgent: Agent | null;
    input: string;
    setInput: (value: string) => void;
    handleSendMessage: () => void;
    isToolbarOpen: boolean;
    setIsToolbarOpen: (isOpen: boolean) => void;
    handleAgentSelect: (agent: Agent) => void;
}

const Content: React.FC<ContentProps> = ({
    messages,
    agents,
    selectedAgent,
    input,
    setInput,
    handleSendMessage,
    isToolbarOpen,
    setIsToolbarOpen,
    handleAgentSelect
}) => {
    const messagesEndRef = React.useRef<HTMLDivElement>(null); // Ref for scrolling

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    return (
        <div className="fixed inset-0 pt-16 pl-64">
            <div className="h-full flex">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white relative">
                    {/* Messages Area */}
                    <div className="absolute inset-0 bottom-[100px] overflow-hidden">
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
                                            {/* Use whitespace-pre-wrap to render newlines from JSON */}
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} /> {/* Element to scroll to */}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Fixed Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 border-t bg-white">
                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onSend={handleSendMessage}
                            placeholder={selectedAgent 
                                ? `Message ${selectedAgent.name}...` 
                                : "Select an agent to get started..."
                            }
                            disabled={!selectedAgent}
                        />
                    </div>
                </div>

                {/* Agents Toolbar */}
                <div className={cn(
                    "h-full border-l bg-white flex flex-col",
                    isToolbarOpen ? "w-[320px]" : "w-12"
                )}>
                    <div className="flex-none p-6 border-b flex items-center justify-between">
                        {isToolbarOpen && (
                            <div className="flex-1 mr-2">
                                <h2 className="text-lg font-medium text-gray-900">
                                    {selectedAgent ? selectedAgent.name : 'Select an Agent'}
                                </h2>
                                {selectedAgent && (
                                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{selectedAgent.description}</p>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard/tools/settings">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-gray-500 hover:text-gray-900"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                                className="shrink-0 text-gray-500 hover:text-gray-900"
                            >
                                {isToolbarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </Button>
                        </div>
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
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-gray-900 truncate">{agent.name}</div>
                                                <div className="text-sm text-gray-500 line-clamp-2">{agent.description}</div>
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
    );
};

function ToolsPage({ roleAgents = [], RouteGuard }: ToolsPageProps) {
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    // Initialize with an empty object, let useEffect handle loading
    const [enabledAgents, setEnabledAgents] = useState<EnabledAgents>({});

    // Update enabledAgents state if localStorage changes (e.g., in settings)
    useEffect(() => {
        const loadAndListen = () => { // Renamed function for clarity
            let initialState: EnabledAgents = {};
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('enabledTools');
                if (stored) {
                    try {
                        initialState = JSON.parse(stored);
                    } catch (error) {
                        console.error("Failed to parse enabledTools from localStorage", error);
                        // Fallback to default if parsing fails
                        const defaultAgents = [...baseAgents, ...mcpAgents, ...roleAgents];
                        initialState = defaultAgents.reduce((acc, agent) => ({ ...acc, [agent.id]: true }), {});
                    }
                } else {
                    // Fallback to default if not found in localStorage
                    const defaultAgents = [...baseAgents, ...mcpAgents, ...roleAgents];
                    initialState = defaultAgents.reduce((acc, agent) => ({ ...acc, [agent.id]: true }), {});
                }
            }
            setEnabledAgents(initialState);
        };

        // Load initial state
        loadAndListen();

        // Set up listener for changes
        window.addEventListener('storage', loadAndListen);
        return () => {
            window.removeEventListener('storage', loadAndListen);
        };
    // Only include roleAgents as dependency if default state depends on it
    }, [roleAgents]);

    // Combine base agents, MCP agents, and role-specific agents and filter enabled ones
    // Use a memoized value for agents to prevent unnecessary recalculations
    const agents = React.useMemo(() => 
        [...baseAgents, ...mcpAgents, ...roleAgents].filter(agent => enabledAgents[agent.id] ?? true),
        [roleAgents, enabledAgents] // Re-filter only when roleAgents or enabledAgents change
    );

    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: `${agent.name} is ready to help you. What would you like to do?`,
            sender: 'agent',
            agentId: agent.id,
            timestamp: new Date()
        }]);
        setInput(''); // Clear input when selecting a new agent
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !selectedAgent) return; // Ensure agent is selected

        const userMessageContent = input;
        setInput(''); // Clear input immediately

        // Add user message
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: userMessageContent,
            sender: 'user',
            timestamp: new Date()
        }]);

        // Add a temporary typing indicator (optional)
        const typingMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: typingMessageId,
            content: '...', // Or use a spinner component
            sender: 'agent',
            agentId: selectedAgent.id,
            timestamp: new Date()
        }]);


        try {
            let agentResponseContent = '';
            if (selectedAgent.id === 'data-connector') {
                // Check if the MCP function exists on the window object
                const mcpQueryFunc = (window as any).mcp_supabase_query;
                if (typeof mcpQueryFunc === 'function') {
                    // Execute the query
                    const result = await mcpQueryFunc({
                        sql: userMessageContent
                    });

                    // Format the result as a nice message
                    const formattedResult = JSON.stringify(result, null, 2);
                    agentResponseContent = `Query Results:\n\`\`\`json\n${formattedResult}\n\`\`\``;
                } else {
                    agentResponseContent = 'Error: MCP function (mcp_supabase_query) is not available in this environment.';
                }
            } else {
                // Mock response for other agents
                agentResponseContent = `This is a mock response from ${selectedAgent.name}. In the real implementation, this would be handled differently.`;
            }

            // Replace typing indicator with actual response
            setMessages(prev => prev.map(msg => 
                msg.id === typingMessageId 
                    ? { ...msg, content: agentResponseContent, timestamp: new Date() } 
                    : msg
            ));

        } catch (error) {
            const errorMessage = `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`;
             // Replace typing indicator with error message
             setMessages(prev => prev.map(msg => 
                msg.id === typingMessageId 
                    ? { ...msg, content: errorMessage, timestamp: new Date() } 
                    : msg
            ));
        }
    };

    const wrappedContent = (
        <Content 
            messages={messages}
            agents={agents}
            selectedAgent={selectedAgent}
            input={input}
            setInput={setInput}
            handleSendMessage={handleSendMessage}
            isToolbarOpen={isToolbarOpen}
            setIsToolbarOpen={setIsToolbarOpen}
            handleAgentSelect={handleAgentSelect}
        />
    );

    // Apply RouteGuard if provided
    const finalContent = RouteGuard ? (
        <RouteGuard>
            {wrappedContent}
        </RouteGuard>
    ) : wrappedContent;

    return finalContent;
}

export default ToolsPage; 