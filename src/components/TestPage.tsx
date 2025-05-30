'use client';

// DISABLED - This component was causing infinite loops
export default function TestPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 text-red-600">TestPage - DISABLED</h1>
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <p><strong>This component has been disabled to prevent infinite loops.</strong></p>
                <p>It was using useAsyncOperation in an auto-executing pattern that caused issues.</p>
                <p>The component had useEffect with execute() calls that created circular dependencies.</p>
            </div>
        </div>
    );
} 
