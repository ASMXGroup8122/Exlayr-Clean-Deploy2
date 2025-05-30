'use client';

import { useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function RequestPendingPage() {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = 'https://www.exlayr.ai';
        }, 5000); // 5 seconds

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 m-4 bg-blue-700 rounded-lg shadow-lg">
                <div className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-white mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Request Submitted
                    </h1>
                    <p className="text-white mb-8">
                        Your request to join the organization has been submitted. 
                        The organization administrators will review your request and respond shortly.
                    </p>
                    <p className="text-sm text-white/80 mb-8">
                        You will receive an email notification when your request is approved.
                    </p>
                    <a 
                        href="https://www.exlayr.ai"
                        className="text-sm text-white hover:text-blue-200 underline"
                    >
                        Back to Exlayr
                    </a>
                </div>
            </div>
        </div>
    );
} 
