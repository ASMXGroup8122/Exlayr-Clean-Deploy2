'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/sign-in');
    }, [router]);
    
    return null;
}
