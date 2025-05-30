'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-red-600 text-xl font-bold mb-4">
                    Something went wrong!
                </h2>
                <pre className="bg-red-50 p-4 rounded text-sm overflow-auto">
                    {error.message}
                </pre>
                <button
                    onClick={() => {
                        console.log('Attempting reset...');
                        reset();
                    }}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Try again
                </button>
            </div>
        </div>
    );
} 
