'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DashboardCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    href: string;
    bgColor?: string;
    hasAI?: boolean;
    disabled?: boolean;
}

export function DashboardCard({ 
    title, 
    description, 
    icon, 
    href, 
    bgColor = 'bg-white',
    hasAI,
    disabled
}: DashboardCardProps) {
    const cardContent = (
        <Card className={cn(
            'p-6 shadow-sm hover:shadow-md transition-shadow',
            bgColor,
            disabled && 'opacity-50 cursor-not-allowed'
        )}>
            <CardHeader className="p-0 space-y-2">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        {icon}
                    </div>
                    <div className="ml-4">
                        <CardTitle className="text-lg font-medium text-gray-900">
                            {title}
                            {hasAI && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    AI
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm text-gray-500">
                            {description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    if (disabled) {
        return cardContent;
    }

    return (
        <Link href={href} className="block">
            {cardContent}
        </Link>
    );
} 