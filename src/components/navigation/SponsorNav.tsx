'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
    Building2, 
    Users, 
    BarChart3, 
    Settings, 
    Wrench,
    CreditCard,
    Brain,
    Home,
    UserCircle
} from 'lucide-react';

export default function SponsorNav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const orgId = user?.organization_id;

    const navigation = [
        {
            name: 'Dashboard',
            href: `/dashboard/sponsor/${orgId}`,
            icon: Home
        },
        {
            name: 'Listings',
            href: `/dashboard/sponsor/${orgId}/listings`,
            icon: Building2
        },
        {
            name: 'Personnel Due Diligence',
            href: `/dashboard/sponsor/${orgId}/personnel-due-diligence`,
            icon: Users
        },
        {
            name: 'Issuer Clients',
            href: `/dashboard/sponsor/${orgId}/clients`,
            icon: Users
        },
        {
            name: 'Tools',
            href: `/dashboard/sponsor/${orgId}/tools`,
            icon: Wrench
        },
        {
            name: 'Analytics',
            href: `/dashboard/sponsor/${orgId}/analytics`,
            icon: BarChart3
        },
        {
            name: 'Knowledge Vault',
            href: `/dashboard/sponsor/${orgId}/knowledge-vault`,
            icon: Brain
        },
        {
            name: 'Billing',
            href: `/dashboard/sponsor/${orgId}/billing`,
            icon: CreditCard
        },
        {
            name: 'Settings',
            href: `/dashboard/sponsor/${orgId}/settings`,
            icon: Settings
        },
        {
            name: 'Profile',
            href: `/dashboard/sponsor/${orgId}/profile`,
            icon: UserCircle
        }
    ];

    if (!orgId) return null;

    return (
        <nav className="space-y-1">
            {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`
                            flex items-center px-4 py-2 text-sm font-medium rounded-md
                            ${isActive 
                                ? 'bg-gray-100 text-blue-600' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                        `}
                    >
                        <item.icon 
                            className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} 
                        />
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
} 