'use client';

import { useState } from 'react';
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
    User,
    X,
    Menu
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const accountType = user?.account_type || 'user';
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={toggleMobileMenu}
                className="fixed top-4 left-4 z-50 lg:hidden bg-[#1E3A8A] p-2 rounded-md"
            >
                <Menu className="h-6 w-6 text-white" />
            </button>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-[#1E3A8A] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo */}
                <div className="relative mb-8 pt-4">
                    <div className="flex justify-center">
                        <Image
                            src="https://ulvnzvdpbblxsyjynufh.supabase.co/storage/v1/object/public/logos//exlayr_logo3.png"
                            alt="Exlayr Logo"
                            width={320}
                            height={100}
                            className="max-h-24 w-auto"
                        />
                    </div>
                    <button 
                        onClick={closeMobileMenu}
                        className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-4">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={closeMobileMenu}
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
        </>
    );
}; 