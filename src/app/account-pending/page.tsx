'use client';

export const dynamic = 'force-dynamic';

export default function AccountPending() {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Account Pending</h1>
                <p className="text-gray-600 mb-4">
                    Your account is currently pending approval. Please check back later or contact support for more information.
                </p>
                <a
                    href="/"
                    className="inline-block px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                    Return to Home
                </a>
            </div>
        </div>
    );
} 
