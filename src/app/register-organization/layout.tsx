'use client';

import { RegisterOrgProvider } from '@/contexts/AuthRegisterOrg';

export default function RegisterOrganizationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RegisterOrgProvider>
            {children}
        </RegisterOrgProvider>
    );
} 