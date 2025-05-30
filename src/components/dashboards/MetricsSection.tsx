'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { StatisticsGrid } from './StatisticsGrid';
import { StatisticsCardProps } from './StatisticsCard';

interface MetricsSectionProps {
    title: string;
    description?: string;
    statistics: (StatisticsCardProps & { id: string })[];
    chart?: ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function MetricsSection({ 
    title, 
    description, 
    statistics, 
    chart, 
    action 
}: MetricsSectionProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {description && (
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                    )}
                </div>
                {action && (
                    <button
                        onClick={action.onClick}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                        {action.label}
                    </button>
                )}
            </div>

            <StatisticsGrid statistics={statistics} columns={4} />

            {chart && (
                <Card className="p-6">
                    <div className="h-[300px]">
                        {chart}
                    </div>
                </Card>
            )}
        </div>
    );
} 
