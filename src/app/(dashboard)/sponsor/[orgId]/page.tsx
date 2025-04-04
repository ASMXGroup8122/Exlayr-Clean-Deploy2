'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface QuickAction {
    title: string;
    description: string;
    href: string;
}

export default function Page() {
    const params = useParams<{ orgId: string }>();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/dashboard');
        }
    }, [user, router]);

    const quickActions: QuickAction[] = [
        {
            title: 'Create New Listing',
            description: 'Create a new listing for your tokens',
            href: `/sponsor/${params.orgId}/new-listing`
        },
        {
            title: 'Create New Token',
            description: 'Create and deploy a new token',
            href: `/sponsor/${params.orgId}/token-creation`
        },
        {
            title: 'View Listings',
            description: 'Manage your active and pending listings',
            href: `/dashboard/sponsor/${params.orgId}/listings`
        },
        {
            title: 'Client Management',
            description: 'View and manage your clients',
            href: `/dashboard/sponsor/${params.orgId}/clients`
        },
        {
            title: 'Organization Settings',
            description: 'Manage organization settings and members',
            href: `/dashboard/sponsor/${params.orgId}/settings`
        }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Sponsor Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickActions.map((action, index) => (
                    <Card key={index} className="p-6">
                        <h3 className="text-xl font-semibold mb-2">{action.title}</h3>
                        <p className="text-gray-600 mb-4">{action.description}</p>
                        <Link href={action.href}>
                            <Button>View</Button>
                        </Link>
                    </Card>
                ))}
            </div>
        </div>
    );
} 