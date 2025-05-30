'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Building2, User, Plus } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
}

export default function SelectOrganizationPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'employee' | 'advisor'>('employee');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { session, completeSignUp, fetchOrganizations } = useAuth();
    const router = useRouter();
    const [hydrated, setHydrated] = useState(false);
    const [accountType, setAccountType] = useState<string | null>(null);

    // This effect runs once after hydration is complete
    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!session?.user?.user_metadata?.account_type) {
            router.push('/auth/error?message=missing-account-type');
            return;
        }

        // Set account type for later use
        const accountTypeFromMetadata = session.user.user_metadata.account_type;
        console.log('Account type from metadata:', accountTypeFromMetadata);
        
        // Normalize account type to handle different formats
        let normalizedAccountType = accountTypeFromMetadata.toLowerCase();
        
        // Check if it contains the expected values
        if (normalizedAccountType.includes('exchange_sponsor')) {
            normalizedAccountType = 'exchange_sponsor';
        } else if (normalizedAccountType.includes('issuer')) {
            normalizedAccountType = 'issuer';
        } else if (normalizedAccountType.includes('exchange')) {
            normalizedAccountType = 'exchange';
        }
        
        console.log('Normalized account type:', normalizedAccountType);
        setAccountType(normalizedAccountType);

        const loadOrganizations = async () => {
            try {
                const orgs = await fetchOrganizations(accountTypeFromMetadata);
                setOrganizations(orgs);
            } catch (error) {
                setError('Failed to load organizations. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadOrganizations();
    }, [session, fetchOrganizations, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrg) {
            setError('Please select an organization');
            return;
        }

        setLoading(true);
        try {
            await completeSignUp({
                account_type: session!.user!.user_metadata.account_type,
                organization_id: selectedOrg,
                user_role: userRole
            });
            // Redirect will be handled by completeSignUp
        } catch (error) {
            setError('Failed to complete registration. Please try again.');
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        console.log('handleCreateNew called with accountType:', accountType);
        
        if (accountType === 'exchange_sponsor') {
            console.log('Redirecting to sponsors/new');
            router.push('/dashboard/admin/sponsors/new');
        } else if (accountType === 'issuer') {
            console.log('Redirecting to issuers/new');
            router.push('/dashboard/admin/issuers/new');
        } else {
            console.log('Account type not recognized for creating new organization:', accountType);
        }
    };

    // If not hydrated yet, render a simple loading state
    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 m-4 bg-blue-700 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-white text-center mb-2" suppressHydrationWarning>
                    Select Your Organization
                </h1>
                <p className="text-white text-center mb-8" suppressHydrationWarning>
                    Choose your organization and role to complete registration
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 text-sm" suppressHydrationWarning>
                            {error}
                        </div>
                    )}

                    {/* Debug info */}
                    <div className="bg-blue-600 text-white p-2 rounded text-xs mb-2">
                        Account Type: {accountType || 'Not set'} (Raw: {session?.user?.user_metadata?.account_type || 'None'})
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2" suppressHydrationWarning>
                            Organization
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                                required
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={selectedOrg || ''}
                                onChange={(e) => setSelectedOrg(e.target.value)}
                                suppressHydrationWarning
                            >
                                <option value="">Select Organization</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id} suppressHydrationWarning>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2" suppressHydrationWarning>
                            Your Role
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                                required
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={userRole}
                                onChange={(e) => setUserRole(e.target.value as 'employee' | 'advisor')}
                                suppressHydrationWarning
                            >
                                <option value="employee">Employee</option>
                                <option value="advisor">Advisor</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-blue-700 px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
                        suppressHydrationWarning
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                                <span className="ml-2">Completing Registration...</span>
                            </div>
                        ) : (
                            'Complete Registration'
                        )}
                    </button>

                    {(accountType === 'exchange_sponsor' || accountType === 'issuer') && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/30"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 text-white bg-blue-700">or</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCreateNew}
                                className="w-full inline-flex items-center justify-center px-4 py-2 border border-white text-sm font-medium rounded-md text-white hover:bg-blue-600"
                                suppressHydrationWarning
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Organization
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
} 
