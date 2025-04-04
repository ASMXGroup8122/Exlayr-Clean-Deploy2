'use client';

export default function KnowledgeVaultLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    );
} 