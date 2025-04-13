'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, 
    Settings, 
    BarChart, 
    Wrench,
    CreditCard,
    Users,
    Building2,
    Brain,
    Globe,
    LogOut,
    ChevronUp,
    UserCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    MessageSquare,
    X,
    Send,
    Command,
    FileText,
    BarChartHorizontal,
    Megaphone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type NavItem = {
    href: string;
    label: string;
    icon: React.ReactNode;
    category: string;
};

export default function Sidebar({ userRole }: { userRole: string }) {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const [issuerStatus, setIssuerStatus] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [recentPages, setRecentPages] = useState<NavItem[]>([]);
    const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
    const [aiMessage, setAiMessage] = useState('');
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const router = useRouter();

    // Use useMemo to prevent recalculation on every render
    const navItems = useMemo(() => {
        const orgId = user?.organization_id;
        
        const navigationByRole: Record<string, NavItem[]> = {
            admin: [
                { href: '/dashboard/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, category: 'Overview' },
                { href: '/dashboard/admin/sponsors', label: 'Sponsors', icon: <Building2 className="w-5 h-5" />, category: 'Management' },
                { href: '/dashboard/admin/users', label: 'Users', icon: <Users className="w-5 h-5" />, category: 'Management' },
                { href: '/dashboard/admin/issuers', label: 'Issuers', icon: <FileText className="w-5 h-5" />, category: 'Management' },
                { href: '/dashboard/admin/exchanges', label: 'Exchanges', icon: <BarChartHorizontal className="w-5 h-5" />, category: 'Management' },
                { href: '/dashboard/admin/tools', label: 'Tools', icon: <Wrench className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/admin/analytics', label: 'Analytics', icon: <BarChart className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/admin/knowledge', label: 'Knowledge Vault', icon: <Brain className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/admin/billing', label: 'Billing', icon: <CreditCard className="w-5 h-5" />, category: 'Settings' },
                { href: '/dashboard/admin/global', label: 'Global Settings', icon: <Globe className="w-5 h-5" />, category: 'Settings' },
                { href: '/dashboard/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, category: 'Settings' }
            ],
            exchange_sponsor: [
                { href: `/dashboard/sponsor/${orgId}`, label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, category: 'Overview' },
                { href: `/dashboard/sponsor/${orgId}/listings`, label: 'Listings', icon: <Building2 className="w-5 h-5" />, category: 'Management' },
                { href: `/dashboard/sponsor/${orgId}/clients`, label: 'Clients', icon: <Users className="w-5 h-5" />, category: 'Management' },
                { href: `/dashboard/sponsor/${orgId}/tools`, label: 'Tools', icon: <Wrench className="w-5 h-5" />, category: 'Tools' },
                { href: `/dashboard/sponsor/${orgId}/analytics`, label: 'Analytics', icon: <BarChart className="w-5 h-5" />, category: 'Tools' },
                { href: `/dashboard/sponsor/${orgId}/knowledge-vault`, label: 'Knowledge Vault', icon: <Brain className="w-5 h-5" />, category: 'Tools' },
                { href: `/dashboard/sponsor/${orgId}/tools/campaign-manager`, label: 'Campaign Manager', icon: <Megaphone className="w-5 h-5" />, category: 'Tools' },
                { href: `/dashboard/sponsor/${orgId}/billing`, label: 'Billing', icon: <CreditCard className="w-5 h-5" />, category: 'Settings' },
                { href: `/dashboard/sponsor/${orgId}/settings`, label: 'Settings', icon: <Settings className="w-5 h-5" />, category: 'Settings' }
            ],
            exchange: [
                { href: '/dashboard/exchange', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, category: 'Overview' },
                { href: '/dashboard/exchange/listings', label: 'Listings', icon: <Building2 className="w-5 h-5" />, category: 'Management' },
                { href: '/dashboard/exchange/tools', label: 'Tools', icon: <Wrench className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/exchange/analytics', label: 'Analytics', icon: <BarChart className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/exchange/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, category: 'Settings' },
            ],
            issuer: [
                { href: '/dashboard/issuer', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, category: 'Overview' },
                { href: '/dashboard/issuer/listings', label: 'Listings', icon: <Building2 className="w-5 h-5" />, category: 'Management' },
                { href: '/dashboard/issuer/tools', label: 'Tools', icon: <Wrench className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/issuer/knowledge-vault', label: 'Knowledge Vault', icon: <Brain className="w-5 h-5" />, category: 'Tools' },
                { href: '/dashboard/issuer/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, category: 'Settings' },
            ],
        };

        return navigationByRole[userRole] || [];
    }, [user?.organization_id, userRole]);

    // Track recent pages - fixed to prevent infinite loop
    useEffect(() => {
        if (pathname !== '/') {
            const currentPage = navItems.find(item => item.href === pathname);
            if (currentPage) {
                setRecentPages(prev => {
                    // Check if the page is already at the top of the list
                    if (prev.length > 0 && prev[0].href === currentPage.href) {
                        return prev; // No change needed
                    }
                    const filtered = prev.filter(p => p.href !== currentPage.href);
                    return [currentPage, ...filtered].slice(0, 3);
                });
            }
        }
    }, [pathname, userRole]); // Only depend on pathname and userRole

    useEffect(() => {
        if (userRole === 'issuer') {
            const fetchIssuerStatus = async () => {
                const { data } = await supabase
                    .from('issuers')
                    .select('status')
                    .single();
                
                if (data) {
                    setIssuerStatus(data.status);
                }
            };
            
            fetchIssuerStatus();
        }
    }, [userRole]);

    // Filter and group nav items - moved to useMemo to prevent recalculation
    const { filteredNavItems, groupedNavItems, sortedCategories } = useMemo(() => {
        const filtered = navItems.filter(item => {
        if (userRole === 'issuer' && item.label === 'Knowledge Vault') {
            return issuerStatus === 'approved';
        }
        return true;
    });

        // Group nav items by category
        const grouped = filtered.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, NavItem[]>);

        // Sort categories in a specific order
        const sorted = Object.keys(grouped).sort((a, b) => {
            const order = ['Overview', 'Management', 'Tools', 'Settings'];
            return order.indexOf(a) - order.indexOf(b);
        });

        return { filteredNavItems: filtered, groupedNavItems: grouped, sortedCategories: sorted };
    }, [navItems, userRole, issuerStatus]);

    // AI Assistant suggestions based on current page
    const aiSuggestions = useMemo(() => {
        // Generate contextual suggestions based on current path
        if (pathname.includes('/dashboard/admin/users')) {
            return [
                "Show me user growth trends",
                "Find inactive users",
                "Generate user activity report"
            ];
        } else if (pathname.includes('/dashboard/admin/sponsors')) {
            return [
                "List pending sponsor approvals",
                "Show sponsor performance metrics",
                "Generate sponsor report"
            ];
        } else if (pathname.includes('/exchange/listings')) {
            return [
                "Show recent listing activity",
                "Find listings pending approval",
                "Generate listing performance report"
            ];
        } else {
            return [
                "How can I use this dashboard?",
                "Show me recent activity",
                "Generate summary report"
            ];
        }
    }, [pathname]);

    const handleAiMessageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real implementation, you would send this to an AI service
        console.log("AI message submitted:", aiMessage);
        // Clear the input
        setAiMessage('');
    };

    // Add useEffect for keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
            if (e.key === 'Escape') {
                setCommandPaletteOpen(false);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <div 
                className={`fixed top-0 left-0 flex flex-col ${collapsed ? 'w-20' : 'w-64'} h-screen bg-[#F8F9FA] border-r border-[#DADCE0] z-20`}
            >
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top section with logo and collapse button - always visible */}
                    <div className="flex-shrink-0 px-4 py-5 border-b border-[#DADCE0]">
                        <div className="flex items-center justify-between">
                            {!collapsed && (
                                <span className="text-xl font-bold text-[#202124]">
                                    Exlayr
                                </span>
                            )}
                            <button 
                                onClick={() => setCollapsed(!collapsed)}
                                className="p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#E8EAED] transition-all duration-200"
                            >
                                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Scrollable navigation area */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin hover:scrollbar-thumb-[#BABDC2] scrollbar-thumb-[#DADCE0] scrollbar-track-transparent">
                        <div className="px-3 py-4">
                            {/* Recent Pages Section */}
                            {recentPages.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center mb-2 px-2">
                                        <Clock className="w-4 h-4 text-[#5f6368]" />
                                        <span className="ml-2 text-xs font-medium text-[#5f6368] uppercase tracking-wider">Recent</span>
                                    </div>
                                    <div className="space-y-1">
                                        {recentPages.map((item) => (
                                            <Link
                                                key={`recent-${item.href}`}
                                                href={item.href}
                                                className="flex items-center px-3 py-1.5 text-sm rounded-md text-[#202124] hover:bg-[#E8EAED] transition-colors duration-200"
                                            >
                                                <span className="text-[#5f6368] group-hover:text-[#202124]">
                                                    {item.icon}
                                                </span>
                                                <span className="ml-3 truncate">{item.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categorized Navigation */}
                            <nav className="space-y-6">
                                {sortedCategories.map(category => (
                                    <div key={category} className="space-y-1">
                                        {!collapsed && (
                                            <div className="flex items-center mb-2 px-2">
                                                <span className="text-xs font-medium text-[#5f6368] uppercase tracking-wider">{category}</span>
                                            </div>
                                        )}
                                        {groupedNavItems[category].map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                        isActive
                                                            ? 'bg-[#E8F0FE] text-[#1a73e8]'
                                                            : 'text-[#202124] hover:bg-[#E8EAED]'
                                                    }`}
                                                >
                                                    <div className={`flex items-center justify-center ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368] group-hover:text-[#202124]'} transition-colors duration-200`}>
                                                        {item.icon}
                                                    </div>
                                                    {!collapsed && <span className="ml-3 transition-opacity duration-200">{item.label}</span>}
                                                    {isActive && (
                                                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-2/3 bg-[#1a73e8] rounded-r-full" />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Bottom section - always visible */}
                    <div className="flex-shrink-0 border-t border-[#DADCE0]">
                        {/* AI Assistant Button */}
                        <div className="p-3">
                            <button 
                                onClick={() => setAiAssistantOpen(true)}
                                className="w-full flex items-center justify-center px-3 py-2 bg-[#1a73e8] hover:bg-[#1557B0] text-white rounded-lg transition-all duration-200"
                            >
                                <MessageSquare className="w-5 h-5" />
                                {!collapsed && <span className="ml-2">AI Assistant</span>}
                            </button>
                        </div>

                        {/* Command Palette Button */}
                        <div className="px-3 mb-2">
                            <button 
                                onClick={() => setCommandPaletteOpen(true)}
                                className="w-full flex items-center justify-center px-3 py-2 bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] rounded-lg transition-all duration-200 border border-[#DADCE0]"
                            >
                                <Command className="w-5 h-5" />
                                {!collapsed && <span className="ml-2">Command Palette (⌘K)</span>}
                            </button>
                        </div>

                        {/* Profile Section */}
                        <div className="p-3">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center w-full text-[#202124] hover:text-[#1a73e8] transition-colors duration-200"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-9 w-9 rounded-full bg-[#E8EAED] flex items-center justify-center">
                                        <UserCircle className="h-6 w-6 text-[#5f6368]" />
                                    </div>
                                </div>
                                {!collapsed && (
                                    <>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium truncate">{user?.email}</p>
                                            <p className="text-xs text-[#5f6368] truncate">{user?.account_type}</p>
                                        </div>
                                        <ChevronUp className={`ml-2 h-5 w-5 transform transition-transform duration-300 ${profileOpen ? '' : 'rotate-180'}`} />
                                    </>
                                )}
                            </button>

                            {profileOpen && (
                                <div className="mt-3 px-2 space-y-1 bg-[#F8F9FA] rounded-lg py-2 border border-[#DADCE0]">
                                    <Link
                                        href={`/dashboard/${userRole}/profile`}
                                        className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-[#202124] hover:text-[#1a73e8] hover:bg-[#E8EAED] transition-colors duration-200"
                                    >
                                        <UserCircle className="mr-3 h-5 w-5 text-[#5f6368]" />
                                        Profile
                                    </Link>
                                    <Link
                                        href={`/dashboard/${userRole}/settings`}
                                        className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-[#202124] hover:text-[#1a73e8] hover:bg-[#E8EAED] transition-colors duration-200"
                                    >
                                        <Settings className="mr-3 h-5 w-5 text-[#5f6368]" />
                                        Settings
                                    </Link>
                                    
                                    <div className="text-xs text-[#5f6368] mb-1">Theme</div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`px-2 py-1 text-xs rounded ${
                                                theme === 'light' ? 'bg-[#1a73e8] text-white' : 'text-[#202124] hover:bg-[#E8EAED]'
                                            }`}
                                        >
                                            Light
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`px-2 py-1 text-xs rounded ${
                                                theme === 'dark' ? 'bg-[#1a73e8] text-white' : 'text-[#202124] hover:bg-[#E8EAED]'
                                            }`}
                                        >
                                            Dark
                                        </button>
                                        <button
                                            onClick={() => setTheme('system')}
                                            className={`px-2 py-1 text-xs rounded ${
                                                theme === 'system' ? 'bg-[#1a73e8] text-white' : 'text-[#202124] hover:bg-[#E8EAED]'
                                            }`}
                                        >
                                            System
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Assistant Dialog */}
            {aiAssistantOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
                    onClick={() => setAiAssistantOpen(false)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden border border-[#DADCE0]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 border-b border-[#DADCE0] flex items-center justify-between">
                            <h3 className="text-lg font-medium text-[#202124]">AI Assistant</h3>
                            <button 
                                onClick={() => setAiAssistantOpen(false)}
                                className="p-1 rounded-full hover:bg-[#E8EAED] text-[#5f6368]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 h-80 overflow-y-auto bg-[#F8F9FA]">
                            {/* AI welcome message */}
                            <div className="flex mb-4">
                                <div className="w-8 h-8 rounded-full bg-[#E8F0FE] flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-4 h-4 text-[#1a73e8]" />
                                </div>
                                <div className="ml-3 bg-white p-3 rounded-lg border border-[#DADCE0] max-w-[80%]">
                                    <p className="text-sm text-[#202124]">
                                        Hello! I'm your AI assistant. How can I help you with Exlayr today?
                                    </p>
                                </div>
                            </div>
                            
                            {/* Suggestions */}
                            <div className="mb-4">
                                <p className="text-xs text-[#5f6368] mb-2">Try asking:</p>
                                <div className="space-y-2">
                                    {aiSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            className="block w-full text-left text-sm bg-white hover:bg-[#E8F0FE] p-2 rounded border border-[#DADCE0] transition-colors text-[#202124]"
                                            onClick={() => setAiMessage(suggestion)}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Input area */}
                        <div className="p-4 border-t border-[#DADCE0]">
                            <form onSubmit={handleAiMessageSubmit} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={aiMessage}
                                    onChange={(e) => setAiMessage(e.target.value)}
                                    placeholder="Ask me anything..."
                                    className="flex-1 px-3 py-2 border border-[#DADCE0] rounded-lg focus:outline-none focus:border-[#1a73e8] text-[#202124] placeholder-[#5f6368]"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557B0] text-white rounded-lg transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Command Palette Modal */}
            {commandPaletteOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
                    onClick={() => setCommandPaletteOpen(false)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden border border-[#DADCE0]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 border-b border-[#DADCE0] flex items-center justify-between">
                            <input
                                type="text"
                                placeholder="Search commands..."
                                className="w-full px-3 py-2 focus:outline-none text-[#202124] placeholder-[#5f6368]"
                                autoFocus
                            />
                            <button 
                                onClick={() => setCommandPaletteOpen(false)}
                                className="ml-2 p-1 rounded-full hover:bg-[#E8EAED] text-[#5f6368]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Navigation section */}
                        <div className="p-2">
                            <div className="text-xs text-[#5f6368] px-2 py-1">Navigation</div>
                            {navItems.map(item => (
                                <button
                                    key={item.href}
                                    className="flex items-center w-full px-2 py-2 text-sm text-[#202124] hover:bg-[#E8EAED] rounded"
                                    onClick={() => {
                                        window.location.href = item.href;
                                        setCommandPaletteOpen(false);
                                    }}
                                >
                                    <span className="mr-2 text-[#1a73e8]">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add a spacer div to prevent content from going under the sidebar */}
            <div className={`flex-shrink-0 ${collapsed ? 'w-20' : 'w-64'}`} />
        </>
    );
} 