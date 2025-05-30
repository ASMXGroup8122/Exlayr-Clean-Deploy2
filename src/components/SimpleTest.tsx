'use client';

// DISABLED - This component was causing infinite loops
export default function SimpleTest() {
    return (
        <div className="p-4 bg-orange-100 border border-orange-400 text-orange-700 rounded">
            <h2 className="text-xl font-bold mb-2">SimpleTest - DISABLED</h2>
            <p>This component has been disabled to prevent infinite loops.</p>
            <p>It was using useAsyncOperation with render tracking that could cause issues.</p>
        </div>
    );
} 
