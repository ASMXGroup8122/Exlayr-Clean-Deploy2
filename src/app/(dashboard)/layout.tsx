'use client';

import DashboardLayout from '@/app/layouts/DashboardLayout';
import type { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return <DashboardLayout>{children}</DashboardLayout>;
} 
