'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Settings,
    Mail,
    Calendar,
    Sparkles,
    MessageSquare,
    Mic,
    Twitter,
    Linkedin,
    Video,
    CheckCircle2,
    Cloud,
    Zap,
    ChevronLeft,
    ChevronRight,
    Send,
    Loader2,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Trash2,
    Plus,
    Menu,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Connection {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    isConnected: boolean;
    category: 'social' | 'productivity' | 'communication';
    isLoading?: boolean;
}

interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

interface ToolsPageProps {
    roleAgents?: any[];
    RouteGuard?: React.ComponentType<any>;
}

export default function ToolsPage({ roleAgents, RouteGuard }: ToolsPageProps = {}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [connectionsState, setConnectionsState] = useState<Connection[]>([
        // Active Connections
        {
            id: 'twitter',
            name: 'X (Twitter)',
            description: 'Post tweets and threads',
            icon: <Twitter className="h-4 w-4 text-gray-900" />,
            isConnected: false,
            category: 'social',
            isLoading: false
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            description: 'Professional networking posts',
            icon: <Linkedin className="h-4 w-4 text-blue-700" />,
            isConnected: false,
            category: 'social',
            isLoading: false
        },
        {
            id: 'elevenlabs',
            name: 'ElevenLabs',
            description: 'Voice synthesis',
            icon: <Mic className="h-4 w-4 text-purple-600" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        {
            id: 'buzzsprout',
            name: 'BuzzSprout',
            description: 'Podcast hosting',
            icon: <Video className="h-4 w-4 text-blue-500" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        // Coming Soon - Content & Collaboration
        {
            id: 'google-docs',
            name: 'Google Docs',
            description: 'Document collaboration',
            icon: <FileText className="h-4 w-4 text-blue-600" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        {
            id: 'google-sheets',
            name: 'Google Sheets',
            description: 'Spreadsheet management',
            icon: <FileText className="h-4 w-4 text-green-600" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        {
            id: 'airtable',
            name: 'Airtable',
            description: 'Database organization',
            icon: <FileText className="h-4 w-4 text-teal-500" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        // Coming Soon - Scheduling
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            description: 'Schedule management',
            icon: <Calendar className="h-4 w-4 text-blue-500" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        {
            id: 'calendly',
            name: 'Calendly',
            description: 'Meeting scheduling',
            icon: <Calendar className="h-4 w-4 text-blue-600" />,
            isConnected: false,
            category: 'productivity',
            isLoading: false
        },
        // Coming Soon - Email & CRM
        {
            id: 'mailchimp',
            name: 'Mailchimp',
            description: 'Email marketing',
            icon: <Mail className="h-4 w-4 text-yellow-500" />,
            isConnected: false,
            category: 'communication',
            isLoading: false
        },
        {
            id: 'hubspot',
            name: 'HubSpot',
            description: 'CRM & marketing',
            icon: <Settings className="h-4 w-4 text-orange-500" />,
            isConnected: false,
            category: 'communication',
            isLoading: false
        }
    ]);
    
    // Mobile-first: sidebar closed by default on mobile, open on desktop
    const [isConnectionsSidebarOpen, setIsConnectionsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isCheckingConnections, setIsCheckingConnections] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // On desktop, open sidebar by default; on mobile, keep it closed
            if (!mobile && !isConnectionsSidebarOpen) {
                setIsConnectionsSidebarOpen(true);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check real connection statuses from database
    const checkConnectionStatuses = useCallback(async () => {
        if (!user?.organization_id) return;
        
        setIsCheckingConnections(true);
        try {
            const supabase = getSupabaseClient();
            
            // Check OAuth connections (Twitter, LinkedIn, BuzzSprout)
            const { data: tokens, error: tokensError } = await supabase
                .from('oauth_tokens')
                .select('provider')
                .eq('organization_id', user.organization_id);

            // Check ElevenLabs API key in organization_settings
            const { data: orgSettings, error: orgError } = await supabase
                .from('organization_settings')
                .select('elevenlabs_api_key')
                .eq('organization_id', user.organization_id)
                .single();

            if (tokensError && tokensError.code !== 'PGRST116') {
                console.error('Error checking OAuth tokens:', tokensError);
            }

            if (orgError && orgError.code !== 'PGRST116') {
                console.error('Error checking organization settings:', orgError);
            }

            // Update connection states
            setConnectionsState(prev => prev.map(conn => {
                let isConnected = false;
                
                switch (conn.id) {
                    case 'twitter':
                        isConnected = tokens?.some(token => token.provider === 'twitter') || false;
                        break;
                    case 'linkedin':
                        isConnected = tokens?.some(token => token.provider === 'linkedin') || false;
                        break;
                    case 'buzzsprout':
                        isConnected = tokens?.some(token => token.provider === 'buzzsprout') || false;
                        break;
                    case 'elevenlabs':
                        isConnected = !!(orgSettings?.elevenlabs_api_key);
                        break;
                    default:
                        isConnected = false;
                }
                
                return { ...conn, isConnected };
            }));
        } catch (error) {
            console.error('Error checking connection statuses:', error);
        } finally {
            setIsCheckingConnections(false);
        }
    }, [user?.organization_id]);

    useEffect(() => {
        checkConnectionStatuses();
    }, [checkConnectionStatuses]);

    // Handle connecting a service
    const handleConnect = async (connectionId: string) => {
        if (!user?.organization_id) {
            toast({
                title: "Error",
                description: "Organization ID is missing. Please reload the page.",
                variant: "destructive"
            });
            return;
        }

        // Set loading state
        setConnectionsState(prev => prev.map(conn => 
            conn.id === connectionId ? { ...conn, isLoading: true } : conn
        ));

        try {
            switch (connectionId) {
                case 'twitter':
                    {
                        const authUrl = `/api/auth/twitter/authorize?organizationId=${user.organization_id}`;
                        const width = 600;
                        const height = 700;
                        const left = window.screen.width / 2 - width / 2;
                        const top = window.screen.height / 2 - height / 2;
                        
                        const authWindow = window.open(
                            authUrl,
                            'Twitter Authorization',
                            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
                        );
                        
                        // Poll for popup closure
                        const checkPopupInterval = setInterval(() => {
                            if (authWindow?.closed) {
                                clearInterval(checkPopupInterval);
                                setConnectionsState(prev => prev.map(conn => 
                                    conn.id === connectionId ? { ...conn, isLoading: false } : conn
                                ));
                                
                                // Check connection status after popup closes
                                setTimeout(() => {
                                    checkConnectionStatuses();
                                }, 1000);
                            }
                        }, 500);
                    }
                    break;
                    
                case 'linkedin':
                    {
                        const authUrl = `/api/auth/linkedin/authorize?organizationId=${user.organization_id}`;
                        const width = 600;
                        const height = 700;
                        const left = window.screen.width / 2 - width / 2;
                        const top = window.screen.height / 2 - height / 2;
                        
                        const authWindow = window.open(
                            authUrl,
                            'LinkedIn Authorization',
                            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
                        );
                        
                        // Poll for popup closure
                        const checkPopupInterval = setInterval(() => {
                            if (authWindow?.closed) {
                                clearInterval(checkPopupInterval);
                                setConnectionsState(prev => prev.map(conn => 
                                    conn.id === connectionId ? { ...conn, isLoading: false } : conn
                                ));
                                
                                // Check connection status after popup closes
                                setTimeout(() => {
                                    checkConnectionStatuses();
                                }, 1000);
                            }
                        }, 500);
                    }
                    break;
                    
                case 'elevenlabs':
                case 'buzzsprout':
                    // Show connection setup experience instead of redirect
                    {
                        const serviceName = connectionId === 'elevenlabs' ? 'ElevenLabs' : 'BuzzSprout';
                        const width = 600;
                        const height = 700;
                        const left = window.screen.width / 2 - width / 2;
                        const top = window.screen.height / 2 - height / 2;
                        
                        // Show a popup that explains the setup process
                        const setupWindow = window.open(
                            'about:blank',
                            `${serviceName} Setup`,
                            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
                        );
                        
                        if (setupWindow) {
                            setupWindow.document.write(`
                                <html>
                                    <head><title>${serviceName} Setup</title></head>
                                    <body style="font-family: system-ui; padding: 40px; text-align: center; background: #f8fafc;">
                                        <h2 style="color: #1e293b; margin-bottom: 20px;">${serviceName} Connection</h2>
                                        <p style="color: #64748b; margin-bottom: 30px;">
                                            To connect ${serviceName}, please visit the Knowledge Vault connections section 
                                            where you can ${connectionId === 'elevenlabs' ? 'enter your API key' : 'set up your podcast connection'}.
                                        </p>
                                        <button onclick="window.close()" style="
                                            background: #3b82f6; 
                                            color: white; 
                                            border: none; 
                                            padding: 12px 24px; 
                                            border-radius: 8px; 
                                            cursor: pointer;
                                            font-size: 14px;
                                        ">Close</button>
                                    </body>
                                </html>
                            `);
                        }
                        
                        // Auto-close after 3 seconds
                        setTimeout(() => {
                            if (setupWindow && !setupWindow.closed) {
                                setupWindow.close();
                            }
                            setConnectionsState(prev => prev.map(conn => 
                                conn.id === connectionId ? { ...conn, isLoading: false } : conn
                            ));
                        }, 3000);
                    }
                    break;
                    
                case 'google-docs':
                case 'google-sheets':
                case 'airtable':
                case 'google-calendar':
                case 'calendly':
                case 'mailchimp':
                case 'hubspot':
                    // Coming Soon services - show OAuth-style popup
                    {
                        const serviceName = connectionId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const width = 600;
                        const height = 700;
                        const left = window.screen.width / 2 - width / 2;
                        const top = window.screen.height / 2 - height / 2;
                        
                        const authWindow = window.open(
                            'about:blank',
                            `${serviceName} Authorization`,
                            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
                        );
                        
                        if (authWindow) {
                            authWindow.document.write(`
                                <html>
                                    <head><title>${serviceName} Authorization</title></head>
                                    <body style="font-family: system-ui; padding: 40px; text-align: center; background: #f8fafc;">
                                        <div style="margin-bottom: 30px;">
                                            <div style="width: 60px; height: 60px; background: #e2e8f0; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                                <span style="font-size: 24px;">🔗</span>
                                            </div>
                                            <h2 style="color: #1e293b; margin-bottom: 10px;">Connect to ${serviceName}</h2>
                                            <p style="color: #64748b; margin-bottom: 20px;">
                                                ${serviceName} integration is coming soon! 
                                            </p>
                                            <p style="color: #64748b; font-size: 14px;">
                                                We're working hard to bring you this integration. Stay tuned!
                                            </p>
                                        </div>
                                        <button onclick="window.close()" style="
                                            background: #6b7280; 
                                            color: white; 
                                            border: none; 
                                            padding: 12px 24px; 
                                            border-radius: 8px; 
                                            cursor: pointer;
                                            font-size: 14px;
                                        ">Close</button>
                                    </body>
                                </html>
                            `);
                        }
                        
                        // Auto-close after 3 seconds
                        setTimeout(() => {
                            if (authWindow && !authWindow.closed) {
                                authWindow.close();
                            }
                            setConnectionsState(prev => prev.map(conn => 
                                conn.id === connectionId ? { ...conn, isLoading: false } : conn
                            ));
                        }, 3000);
                    }
                    break;
                    
                default:
                    toast({
                        title: "Coming Soon",
                        description: `${connectionId} integration is coming soon!`,
                        variant: "default"
                    });
                    setConnectionsState(prev => prev.map(conn => 
                        conn.id === connectionId ? { ...conn, isLoading: false } : conn
                    ));
                    return;
            }
        } catch (error) {
            console.error(`Error connecting to ${connectionId}:`, error);
            toast({
                title: "Connection Error",
                description: `Failed to connect to ${connectionId}. Please try again.`,
                variant: "destructive"
            });
            setConnectionsState(prev => prev.map(conn => 
                conn.id === connectionId ? { ...conn, isLoading: false } : conn
            ));
        }
    };

    // Handle disconnecting a service
    const handleDisconnect = async (connectionId: string) => {
        if (!user?.organization_id) return;

        // Set loading state
        setConnectionsState(prev => prev.map(conn => 
            conn.id === connectionId ? { ...conn, isLoading: true } : conn
        ));

        try {
            const supabase = getSupabaseClient();
            
            switch (connectionId) {
                case 'twitter':
                case 'linkedin':
                case 'buzzsprout':
                    // Delete OAuth token
                    {
                        const { error } = await supabase
                            .from('oauth_tokens')
                            .delete()
                            .eq('organization_id', user.organization_id)
                            .eq('provider', connectionId);
                            
                        if (error) {
                            console.error(`Error disconnecting ${connectionId}:`, error);
                            toast({
                                title: "Disconnection Failed",
                                description: `Failed to disconnect ${connectionId}. Please try again.`,
                                variant: "destructive"
                            });
                        } else {
                            toast({
                                title: `${connectionId} Disconnected`,
                                description: `Your ${connectionId} account has been disconnected.`,
                                variant: "default"
                            });
                            setConnectionsState(prev => prev.map(conn => 
                                conn.id === connectionId ? { ...conn, isConnected: false } : conn
                            ));
                        }
                    }
                    break;
                    
                case 'elevenlabs':
                    // Remove API key from organization_settings
                    {
                        const { error } = await supabase
                            .from('organization_settings')
                            .update({ elevenlabs_api_key: null })
                            .eq('organization_id', user.organization_id);
                            
                        if (error) {
                            console.error(`Error disconnecting ElevenLabs:`, error);
                            toast({
                                title: "Disconnection Failed",
                                description: "Failed to disconnect ElevenLabs. Please try again.",
                                variant: "destructive"
                            });
                        } else {
                            toast({
                                title: "ElevenLabs Disconnected",
                                description: "Your ElevenLabs API key has been removed.",
                                variant: "default"
                            });
                            setConnectionsState(prev => prev.map(conn => 
                                conn.id === connectionId ? { ...conn, isConnected: false } : conn
                            ));
                        }
                    }
                    break;
                    
                default:
                    toast({
                        title: "Error",
                        description: `Unknown connection type: ${connectionId}`,
                        variant: "destructive"
                    });
            }
        } catch (err) {
            console.error(`Exception disconnecting ${connectionId}:`, err);
            toast({
                title: "Disconnection Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive"
            });
        } finally {
            setConnectionsState(prev => prev.map(conn => 
                conn.id === connectionId ? { ...conn, isLoading: false } : conn
            ));
        }
    };

    // Toggle connection (connect if disconnected, disconnect if connected)
    const toggleConnection = (connectionId: string) => {
        const connection = connectionsState.find(conn => conn.id === connectionId);
        if (!connection || connection.isLoading) return;

        if (connection.isConnected) {
            handleDisconnect(connectionId);
        } else {
            handleConnect(connectionId);
        }
    };

    // Listen for OAuth completion messages
    useEffect(() => {
        const handleAuthComplete = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data?.type === 'TWITTER_AUTH_COMPLETE' || event.data?.type === 'LINKEDIN_AUTH_COMPLETE') {
                const success = event.data.status;
                const provider = event.data.type === 'TWITTER_AUTH_COMPLETE' ? 'twitter' : 'linkedin';
                
                if (success) {
                    setConnectionsState(prev => prev.map(conn => 
                        conn.id === provider ? { ...conn, isConnected: true, isLoading: false } : conn
                    ));
                    
                    toast({
                        title: `${provider} Connected`,
                        description: `Your ${provider} account has been connected successfully.`,
                        variant: "default"
                    });
                } else {
                    toast({
                        title: `${provider} Connection Failed`,
                        description: `Failed to connect to ${provider}. Please try again.`,
                        variant: "destructive"
                    });
                }
                
                setConnectionsState(prev => prev.map(conn => 
                    conn.id === provider ? { ...conn, isLoading: false } : conn
                ));
                
                // Refresh connection status
                setTimeout(() => {
                    checkConnectionStatuses();
                }, 1000);
            }
        };
        
        window.addEventListener('message', handleAuthComplete);
        return () => {
            window.removeEventListener('message', handleAuthComplete);
        };
    }, [checkConnectionStatuses, toast]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!prompt.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: prompt,
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setPrompt('');
        setIsLoading(true);

        try {
            // Simulate AI response
            setTimeout(() => {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: `I received your message: "${userMessage.content}". This is a placeholder response. In the real implementation, this would connect to your AI assistant.`,
                    isUser: false,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Error sending message:', error);
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const copyToClipboard = async (text: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            toast({
                title: "Copied to clipboard",
                duration: 2000,
            });
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 md:p-6 overflow-x-hidden flex flex-col">
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Header */}
            <div className="relative mb-4 md:mb-6 flex-shrink-0">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/50 p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight">
                                    AI Tools
                                </h1>
                                <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                                    Connect your tools and chat with AI
                                </p>
                            </div>
                        </div>
                        
                        {/* Mobile Connections Toggle */}
                        <div className="md:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsConnectionsSidebarOpen(!isConnectionsSidebarOpen)}
                                className="p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg"
                            >
                                {isConnectionsSidebarOpen ? (
                                    <X className="h-4 w-4" />
                                ) : (
                                    <Menu className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 relative">
                {/* Chat Area */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col min-h-[400px] md:min-h-[500px]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scrollbar-hide">
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center max-w-md px-4">
                                    <div className="mx-auto rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-4 sm:mb-6">
                                        <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Start a conversation</h3>
                                    <p className="text-gray-600 text-sm sm:text-base">Ask me anything or connect your tools to get started.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-6">
                                {messages.map((message) => (
                                    <div key={message.id} className={cn(
                                        "flex gap-2 sm:gap-3 md:gap-4",
                                        message.isUser ? "flex-row-reverse" : ""
                                    )}>
                                        <div className={cn(
                                            "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0",
                                            message.isUser 
                                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
                                                : "bg-gray-100 text-gray-700"
                                        )}>
                                            {message.isUser ? "U" : "AI"}
                                        </div>
                                        <div className={cn(
                                            "max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-xl px-3 sm:px-4 py-2 sm:py-3 relative group",
                                            message.isUser 
                                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
                                                : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                                        )}>
                                            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
                                            {!message.isUser && (
                                                <button
                                                    onClick={() => copyToClipboard(message.content, message.id)}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded touch-manipulation"
                                                >
                                                    {copiedMessageId === message.id ? (
                                                        <Check className="h-3 w-3 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-3 w-3 text-gray-500" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-2 sm:gap-3 md:gap-4">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0">
                                            AI
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                                <span className="text-gray-500 text-sm sm:text-base">Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="flex-shrink-0 border-t border-gray-200/50 bg-white/50 p-3 sm:p-4">
                        <div className="flex gap-2 sm:gap-3">
                            <Textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything..."
                                className="flex-1 min-h-[44px] max-h-32 resize-none bg-white/50 border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-sm sm:text-base touch-manipulation"
                                rows={1}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!prompt.trim() || isLoading}
                                className="flex items-center justify-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-11 sm:h-12 min-w-[44px] touch-manipulation"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Connections Sidebar - Mobile Overlay / Desktop Sidebar */}
                <div className={cn(
                    "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 flex flex-col transition-all duration-300",
                    // Mobile: Full screen overlay
                    isMobile ? cn(
                        "fixed inset-0 z-50 m-4",
                        isConnectionsSidebarOpen ? "translate-x-0" : "translate-x-full"
                    ) : cn(
                        // Desktop: Sidebar
                        "min-h-[500px]",
                        isConnectionsSidebarOpen ? "w-64" : "w-16"
                    )
                )}>
                    {/* Sidebar Header */}
                    <div className="flex-shrink-0 p-3 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
                        {isConnectionsSidebarOpen && (
                            <h2 className="font-semibold text-gray-900 text-sm truncate mr-2 min-w-0">Connections</h2>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsConnectionsSidebarOpen(!isConnectionsSidebarOpen)}
                            className={cn(
                                "p-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 rounded-lg touch-manipulation flex-shrink-0",
                                !isConnectionsSidebarOpen && "ml-auto"
                            )}
                        >
                            {isMobile ? (
                                <X className="h-4 w-4" />
                            ) : isConnectionsSidebarOpen ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Connections List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                        {connectionsState.map((connection) => {
                            const isComingSoon = ['google-docs', 'google-sheets', 'airtable', 'google-calendar', 'calendly', 'mailchimp', 'hubspot'].includes(connection.id);
                            
                            return (
                                <div key={connection.id} className={cn(
                                    "relative group touch-manipulation",
                                    (isConnectionsSidebarOpen || isMobile)
                                        ? cn(
                                            "border border-white/50 rounded-xl p-3 transition-all duration-300",
                                            isComingSoon 
                                                ? "bg-gray-50/80 backdrop-blur-sm hover:bg-gray-100/80" 
                                                : connection.isConnected 
                                                    ? "bg-green-50/80 backdrop-blur-sm hover:bg-green-100/80 border-green-200/50" 
                                                    : "bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-lg"
                                        )
                                        : "p-2 hover:bg-white/50 rounded-lg transition-all duration-300"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                                            <div className={cn(
                                                "flex-shrink-0 transition-all duration-300",
                                                isComingSoon ? "opacity-40 grayscale" : ""
                                            )}>
                                                {connection.icon}
                                            </div>
                                            
                                            {(isConnectionsSidebarOpen || isMobile) && (
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={cn(
                                                            "font-medium text-sm truncate",
                                                            isComingSoon 
                                                                ? "text-gray-500" 
                                                                : connection.isConnected 
                                                                    ? "text-green-700" 
                                                                    : "text-gray-900"
                                                        )}>
                                                            {connection.name}
                                                        </h4>
                                                        {isComingSoon && (
                                                            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-200/80 text-gray-600 border-0">
                                                                Soon
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className={cn(
                                                        "text-xs truncate mt-0.5",
                                                        isComingSoon 
                                                            ? "text-gray-400" 
                                                            : connection.isConnected 
                                                                ? "text-green-600" 
                                                                : "text-gray-500"
                                                    )}>
                                                        {connection.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {(isConnectionsSidebarOpen || isMobile) && (
                                            <div className="flex-shrink-0">
                                                {connection.isLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                ) : (
                                                    <Switch
                                                        checked={connection.isConnected}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                handleConnect(connection.id);
                                                            } else {
                                                                handleDisconnect(connection.id);
                                                            }
                                                        }}
                                                        disabled={connection.isLoading}
                                                        className={cn(
                                                            "transition-all duration-300 touch-manipulation",
                                                            isComingSoon ? "opacity-60" : ""
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Overlay Background */}
                {isMobile && isConnectionsSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setIsConnectionsSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
} 