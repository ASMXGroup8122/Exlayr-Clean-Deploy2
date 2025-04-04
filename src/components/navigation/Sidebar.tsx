'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Building2,
    ListChecks,
    Users,
    Globe,
    Settings,
    UserCog,
    BarChart,
    Brain,
    CreditCard,
    User
} from 'lucide-react';

export const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const accountType = user?.account_type || 'user';

    // Get base dashboard path based on account type
    const getDashboardPath = () => {
        switch (accountType) {
            case 'admin':
                return '/dashboard/admin';
            case 'exchange_sponsor':
                return '/dashboard/sponsor';
            case 'exchange':
                return '/dashboard/exchange';
            case 'issuer':
                return '/dashboard/issuer';
            default:
                return '/dashboard';
        }
    };

    const adminNavigation = [
        { name: 'Dashboard', href: getDashboardPath(), icon: LayoutDashboard },
        { name: 'Sponsors', href: '/dashboard/admin/sponsors', icon: Building2 },
        { name: 'Users', href: '/dashboard/admin/users', icon: Users },
        { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
        { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart },
        { name: 'Knowledge Vault', href: '/dashboard/admin/knowledge', icon: Brain },
        { name: 'Billing', href: '/dashboard/admin/billing', icon: CreditCard },
        { name: 'Global Settings', href: '/dashboard/admin/global', icon: Globe },
        { name: 'Profile', href: '/dashboard/admin/profile', icon: User }
    ];

    const sponsorNavigation = [
        { name: 'Dashboard', href: getDashboardPath(), icon: LayoutDashboard },
        { name: 'Exchanges', href: '/dashboard/sponsor/exchanges', icon: Globe },
        { name: 'Settings', href: '/dashboard/sponsor/settings', icon: Settings },
    ];

    const exchangeNavigation = [
        { name: 'Dashboard', href: getDashboardPath(), icon: LayoutDashboard },
        { name: 'Listings', href: '/dashboard/exchange/listings', icon: ListChecks },
        { name: 'Settings', href: '/dashboard/exchange/settings', icon: Settings },
    ];

    const issuerNavigation = [
        { name: 'Dashboard', href: getDashboardPath(), icon: LayoutDashboard },
        { name: 'Listings', href: '/dashboard/issuer/listings', icon: ListChecks },
        { name: 'Settings', href: '/dashboard/issuer/settings', icon: Settings },
    ];

    // Select navigation based on account type
    const getNavigation = () => {
        switch (accountType) {
            case 'admin':
                return adminNavigation;
            case 'exchange_sponsor':
                return sponsorNavigation;
            case 'exchange':
                return exchangeNavigation;
            case 'issuer':
                return issuerNavigation;
            default:
                return [];
        }
    };

    const navigation = getNavigation();

    const isActive = (path: string) => {
        return pathname.startsWith(path);
    };

    return (
        <div className="flex flex-col w-64 bg-[#1E3A8A] text-white">
            {/* Logo */}
            <div className="p-6">
                <h1 className="text-2xl font-bold">Exlayr</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-4">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                                isActive(item.href)
                                    ? 'bg-blue-700 text-white'
                                    : 'text-gray-300 hover:bg-blue-800 hover:text-white'
                            }`}
                        >
                            <Icon className="h-5 w-5 mr-3" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-blue-800">
                <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {user?.email}
                        </p>
                        <p className="text-xs text-gray-300 capitalize">
                            Role: {accountType}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 