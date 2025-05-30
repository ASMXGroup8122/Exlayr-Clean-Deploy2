'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface SearchParamsProviderProps {
    children: (searchParams: ReturnType<typeof useSearchParams>) => React.ReactNode;
}

function SearchParamsContent({ children }: SearchParamsProviderProps) {
    const searchParams = useSearchParams();
    return <>{children(searchParams)}</>;
}

export default function SearchParamsProvider({ children }: SearchParamsProviderProps) {
    return (
        <Suspense fallback={null}>
            <SearchParamsContent>{children}</SearchParamsContent>
        </Suspense>
    );
} 
