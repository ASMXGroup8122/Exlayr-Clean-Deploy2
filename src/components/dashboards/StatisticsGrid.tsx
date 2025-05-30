'use client';

import { ReactNode } from 'react';
import { StatisticsCard, StatisticsCardProps } from './StatisticsCard';

interface StatisticsGridProps {
    statistics: (StatisticsCardProps & { id: string })[];
    columns?: 2 | 3 | 4;
}

export function StatisticsGrid({ statistics, columns = 4 }: StatisticsGridProps) {
    const columnClass = {
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-2 lg:grid-cols-3',
        4: 'sm:grid-cols-2 lg:grid-cols-4'
    }[columns];

    return (
        <div className={`grid grid-cols-1 gap-4 ${columnClass}`}>
            {statistics.map((stat) => (
                <StatisticsCard
                    key={stat.id}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    trend={stat.trend}
                />
            ))}
        </div>
    );
} 
