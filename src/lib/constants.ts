import { Brain, Calendar, BarChart3, Users, PlusCircle, DollarSign, LucideIcon } from 'lucide-react';

export const ACCOUNT_TYPES = {
    ADMIN: 'admin',
    EXCHANGE_SPONSOR: 'exchange_sponsor',
    EXCHANGE: 'exchange',
    ISSUER: 'issuer'
} as const;

export const DASHBOARD_ROUTES = {
    [ACCOUNT_TYPES.ADMIN]: '/dashboard/admin',
    [ACCOUNT_TYPES.EXCHANGE_SPONSOR]: '/dashboard/sponsor',
    [ACCOUNT_TYPES.EXCHANGE]: '/dashboard/exchange',
    [ACCOUNT_TYPES.ISSUER]: '/dashboard/issuer'
} as const;

interface PortalCard {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    bgColor: string;
}

export const portalCards: PortalCard[] = [
    {
        title: 'Reminders & Key Dates',
        description: '3 upcoming deadlines this week',
        icon: Calendar,
        href: '/calendar',
        bgColor: 'bg-blue-50'
    },
    {
        title: 'Volume / Analytics',
        description: 'Monthly volume up 15%',
        icon: BarChart3,
        href: '/analytics',
        bgColor: 'bg-green-50'
    },
    {
        title: 'User Management',
        description: 'Manage team members and permissions',
        icon: Users,
        href: '/users',
        bgColor: 'bg-purple-50'
    },
    {
        title: 'AI Knowledge Vault',
        description: 'New regulatory guidelines available',
        icon: Brain,
        href: '/knowledge',
        bgColor: 'bg-yellow-50'
    },
    {
        title: 'New Issuer Listing',
        description: 'Start a new listing application',
        icon: PlusCircle,
        href: '/new-listing',
        bgColor: 'bg-indigo-50'
    },
    {
        title: 'Primary Market Issuance',
        description: 'Launch new share issuance',
        icon: DollarSign,
        href: '/issuance',
        bgColor: 'bg-pink-50'
    }
]; 