'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export interface StatisticsCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    trend?: {
        value: number;
        timeframe: string;
        isPositive: boolean;
    };
}

export function StatisticsCard({ label, value, icon, trend }: StatisticsCardProps) {
    return (
        <Card className="bg-white overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between">
                    {icon && (
                        <div className="p-2 rounded-full bg-gray-50">
                            {icon}
                        </div>
                    )}
                    {trend && (
                        <div className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            <span className="text-gray-500 ml-1">vs {trend.timeframe}</span>
                        </div>
                    )}
                </div>
                <dt className="text-sm font-medium text-gray-500 truncate mt-4">
                    {label}
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {value}
                </dd>
            </div>
        </Card>
    );
} 