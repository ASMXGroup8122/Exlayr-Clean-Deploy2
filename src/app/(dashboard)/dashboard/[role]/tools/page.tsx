'use client';

import { use } from 'react';
import { 
    Newspaper, 
    Megaphone, 
    BarChart3, 
    Mail, 
    FileText, 
    Globe2, 
    Sparkles,
    ArrowRight,
    Share2,
    Mic2,
    Target,
    PieChart,
    Users
} from 'lucide-react';

// Tool types and data
interface Tool {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    hasAI?: boolean;
    href: string;
}

const toolsByRole: Record<string, Tool[]> = {
    admin: [
        {
            id: 'rns',
            title: 'RNS Manager',
            description: 'Manage and approve regulatory news submissions',
            icon: <Newspaper className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/admin/tools/rns'
        },
        {
            id: 'compliance',
            title: 'Compliance Monitor',
            description: 'Track and enforce listing compliance',
            icon: <BarChart3 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/admin/tools/compliance'
        },
        {
            id: 'announcements',
            title: 'Market Announcements',
            description: 'Publish market-wide announcements',
            icon: <Megaphone className="w-6 h-6" />,
            href: '/dashboard/admin/tools/announcements'
        },
        {
            id: 'analytics',
            title: 'Marketing Analytics',
            description: 'Track and analyze all marketing campaigns',
            icon: <PieChart className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/admin/tools/analytics'
        }
    ],
    sponsors: [
        {
            id: 'rns',
            title: 'RNS Submission',
            description: 'Submit regulatory news for your listings',
            icon: <Newspaper className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/sponsors/tools/rns'
        },
        {
            id: 'press',
            title: 'Press Release Manager',
            description: 'Create and distribute press releases',
            icon: <FileText className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/sponsors/tools/press'
        },
        {
            id: 'campaign',
            title: 'Campaign Manager',
            description: 'Create and manage powerful fundraising campaigns',
            icon: <Target className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/sponsors/tools/campaign'
        },
        {
            id: 'social',
            title: 'Social Media Hub',
            description: 'Manage all social media channels and content',
            icon: <Share2 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/sponsors/tools/social'
        },
        {
            id: 'podcast',
            title: 'Podcast Studio',
            description: 'Create and manage investor podcasts and audio content',
            icon: <Mic2 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/sponsors/tools/podcast'
        },
        {
            id: 'audience',
            title: 'Audience Manager',
            description: 'Target and manage investor audiences',
            icon: <Users className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/sponsors/tools/audience'
        }
    ],
    exchange: [
        {
            id: 'market',
            title: 'Market Monitor',
            description: 'Real-time market surveillance tools',
            icon: <BarChart3 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/exchange/tools/market'
        },
        {
            id: 'announcements',
            title: 'Exchange Announcements',
            description: 'Manage exchange communications',
            icon: <Globe2 className="w-6 h-6" />,
            href: '/dashboard/exchange/tools/announcements'
        },
        {
            id: 'compliance',
            title: 'Compliance Tools',
            description: 'Monitor listing compliance',
            icon: <FileText className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/exchange/tools/compliance'
        },
        {
            id: 'social',
            title: 'Social Media Monitor',
            description: 'Monitor market-related social media activity',
            icon: <Share2 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/exchange/tools/social'
        }
    ],
    issuer: [
        {
            id: 'rns',
            title: 'RNS Draft',
            description: 'Draft and submit regulatory news',
            icon: <Newspaper className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/issuer/tools/rns'
        },
        {
            id: 'press',
            title: 'Press Releases',
            description: 'Manage company announcements',
            icon: <FileText className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/issuer/tools/press'
        },
        {
            id: 'investor',
            title: 'Investor Relations',
            description: 'Manage investor communications',
            icon: <Mail className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/issuer/tools/investor'
        },
        {
            id: 'campaign',
            title: 'Campaign Manager',
            description: 'Boost your fund raise by creating a campaign',
            icon: <Target className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/issuer/tools/campaign'
        },
        {
            id: 'social',
            title: 'Social Media',
            description: 'Manage company social media presence',
            icon: <Share2 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/issuer/tools/social'
        },
        {
            id: 'podcast',
            title: 'Podcast & Media',
            description: 'Create investor-focused audio content',
            icon: <Mic2 className="w-6 h-6" />,
            hasAI: true,
            href: '/dashboard/issuer/tools/podcast'
        }
    ]
};

export default function ToolsPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = use(params);
    const tools = toolsByRole[role] || [];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Tools & Resources</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                    <div 
                        key={tool.id}
                        className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="text-blue-600">
                                {tool.icon}
                            </div>
                            {tool.hasAI && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                </span>
                            )}
                        </div>
                        <h3 className="mt-4 text-lg font-medium">{tool.title}</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            {tool.description}
                        </p>
                        <div className="mt-4">
                            <a
                                href={tool.href}
                                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                                Go! 
                                <ArrowRight className="ml-1 w-4 h-4" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 