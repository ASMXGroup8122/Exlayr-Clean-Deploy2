'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatisticsCard } from '@/components/dashboards/StatisticsCard';

export interface MetricsSectionProps {
    title: string;
    description?: string;
    statistics: Array<{
        id: string;
        label: string;
        value: string;
        trend?: {
            value: number;
            timeframe: string;
            isPositive: boolean;
        };
    }>;
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">{title}</h2>
                    {description && (
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                    )}
                </div>
                {action && (
                    <Button onClick={action.onClick}>{action.label}</Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statistics.map((stat) => (
                    <StatisticsCard
                        key={stat.id}
                        label={stat.label}
                        value={stat.value}
                        trend={stat.trend}
                    />
                ))}
            </div>

            {chart && (
                <Card className="p-6">
                    {chart}
                </Card>
            )}
        </div>
    );
} 