'use client';

// ... keep all imports ...

export default function CreateSponsorPage() {
    // ... keep all state and handlers ...

    return (
        <div className="p-6">  {/* Adjusted padding to work within dashboard layout */}
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                    Create New Sponsor Organization
                </h2>
                <p className="text-sm text-gray-600">
                    Please provide your organization details for approval
                </p>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-lg shadow-sm">
                {/* ... keep rest of the form content the same ... */}
            </div>
        </div>
    );
} 
