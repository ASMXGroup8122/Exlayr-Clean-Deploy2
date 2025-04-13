'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    BarChart3,
    Calendar,
    Users,
    Brain,
    PlusCircle,
    DollarSign,
    ArrowRight,
    Bell,
    Building2,
    Clock,
    FileText,
    Plus
} from 'lucide-react';

// Mock data
const recentListings = [
    {
        companyName: 'TechCorp Solutions',
        status: 'Draft',
        exchange: 'NYSE',
        nextKeyDate: '2024-02-15',
        keyDateDescription: 'Financial Statement Due'
    },
    {
        companyName: 'Green Energy Ltd',
        status: 'Pending',
        exchange: 'LSE',
        nextKeyDate: '2024-02-20',
        keyDateDescription: 'Board Meeting'
    },
    {
        companyName: 'Digital Innovations Inc',
        status: 'Live',
        exchange: 'NASDAQ',
        nextKeyDate: '2024-03-01',
        keyDateDescription: 'Annual Report'
    }
];

const getStatusColor = (status: string) => {
    const colors = {
        Draft: 'bg-gray-100 text-gray-800',
        Pending: 'bg-yellow-100 text-yellow-800',
        Live: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || colors.Draft;
};

const portalCards = [
    {
        title: 'Reminders & Key Dates',
        description: '3 upcoming deadlines this week',
        href: '/calendar',
        icon: Calendar,
        bgColor: 'bg-blue-50'
    },
    {
        title: 'Volume / Analytics',
        description: 'Monthly volume up 15%',
        href: '/analytics',
        icon: BarChart3,
        bgColor: 'bg-green-50'
    },
    {
        title: 'User Management',
        description: 'Manage team members and permissions',
        href: '/users',
        icon: Users,
        bgColor: 'bg-purple-50'
    },
    {
        title: 'AI Knowledge Vault',
        description: 'New regulatory guidelines available',
        href: '/knowledge-vault',
        icon: Brain,
        bgColor: 'bg-yellow-50'
    },
    {
        title: 'New Issuer Listing',
        description: 'Start a new listing application',
        href: '/new-listing',
        icon: Plus,
        bgColor: 'bg-indigo-50'
    },
    {
        title: 'Personnel Due Diligence',
        description: 'AI-powered background checks and analysis',
        href: '/personnel-due-diligence',
        icon: Users,
        bgColor: 'bg-pink-50'
    }
];

// Import NEW AI components
import AiActionCards from '@/components/ai/AiActionCards';
import AiChatInputBar from '@/components/ai/AiChatInputBar';

export default function SponsorDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;

    useEffect(() => {
        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
        }
    }, [user, router]);

    // State for the AI interface
    const [intent, setIntent] = useState<string | null>(null);

    // Log intent whenever it changes
    useEffect(() => {
        console.log(`[SponsorDashboardPage] Intent state changed to: ${intent}`);
    }, [intent]);

    // Original welcome message (can keep or remove)
    const userName = "David"; // Replace with dynamic user name if available

    return (
        <div className="flex flex-col h-full">
            {/* === NEW AI Interface Area === */}
            {/* Container grows and uses flex to push content down */}
            <div className="flex-1 flex flex-col items-center p-6">

                {/* Spacer div takes up available space above the content */}
                <div className="flex-grow" />

                {/* Action Cards Area */}
                <div className="w-full max-w-3xl mb-6">
                    <AiActionCards intent={intent} orgId={orgId} />
                </div>

                {/* Input Bar Area */}
                <AiChatInputBar onIntentChange={setIntent} />

                {/* Optional padding below input bar */}
                <div className="h-6 md:h-10" />
            </div>
        </div>
    );
} 