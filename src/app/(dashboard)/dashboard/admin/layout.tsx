'use client';

import { ApprovalProvider } from '@/contexts/ApprovalContext';
import { Toaster } from "@/components/ui/toaster";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ApprovalProvider>
            {children}
            <Toaster />
        </ApprovalProvider>
    );
} 
