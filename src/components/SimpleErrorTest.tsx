'use client';

// DISABLED - This component was causing infinite loops
export default function SimpleErrorTest() {
    return (
        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <h3 className="text-lg font-bold mb-2">SimpleErrorTest - DISABLED</h3>
            <p>This component has been temporarily disabled to prevent infinite loops.</p>
            <p>It was using useAsyncOperation in a problematic way.</p>
        </div>
    );
} 
