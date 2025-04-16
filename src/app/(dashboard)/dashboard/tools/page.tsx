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
        <div className="fixed inset-0 pt-16 pl-0 sm:pl-64">
            <div className="h-full flex flex-col sm:flex-row">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white relative">
                    {/* Chat Header - Mobile Only */}
                    <div className="sm:hidden flex items-center px-4 py-2 border-b bg-white">
                        <button
                            onClick={() => setIsToolbarOpen(true)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Tools</span>
                        </button>
                        {selectedAgent && (
                            <div className="ml-4 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                                    {selectedAgent.icon}
                                </div>
                                <span className="text-sm font-medium">{selectedAgent.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div className="absolute inset-0 top-[40px] sm:top-0 bottom-[100px] overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="px-4 sm:px-6 py-4 space-y-6">
                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            "flex gap-3 max-w-[90%] sm:max-w-[80%]",
                                            message.sender === 'user' ? "ml-auto" : ""
                                        )}
                                    >
                                        {message.sender === 'agent' && message.agentId && (
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                {agents.find(a => a.id === message.agentId)?.icon}
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base",
                                                message.sender === 'user' 
                                                    ? "bg-blue-600 text-white" 
                                                    : "bg-gray-50 text-gray-900 border border-gray-100"
                                            )}
                                        >
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onSend={handleSendMessage}
                            placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : 'Select an agent to get started...'}
                            disabled={!selectedAgent}
                        />
                    </div>
                </div>

                {/* Agent Selection Sidebar */}
                <div 
                    className={cn(
                        "fixed inset-y-0 right-0 w-full sm:w-80 bg-white border-l transform transition-transform duration-200 ease-in-out z-20",
                        "pt-16 pb-4",
                        isToolbarOpen ? "translate-x-0" : "translate-x-full sm:translate-x-0"
                    )}
                >
                    {/* Mobile Toggle Button */}
                    <button
                        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                        className={cn(
                            "sm:hidden fixed top-20 right-4 p-2 bg-white rounded-full shadow-lg border",
                            "transform transition-transform duration-200 ease-in-out z-30",
                            isToolbarOpen ? "rotate-180 translate-x-0" : "translate-x-0"
                        )}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="h-full flex flex-col">
                        <div className="px-4 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Select an Agent</h2>
                        </div>
                        <ScrollArea className="flex-1 px-4">
                            <div className="grid grid-cols-1 gap-3">
                                {agents.map(agent => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            handleAgentSelect(agent);
                                            setIsToolbarOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                                            "hover:bg-gray-50",
                                            selectedAgent?.id === agent.id
                                                ? "bg-blue-50 border-blue-100 border"
                                                : "border border-gray-100"
                                        )}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            {agent.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {agent.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                {agent.description}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
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
        // Clear previous messages and start fresh with the new agent
        setMessages([{
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