'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

type Organization = {
    id: number;
    name: string;
    type: string;
    status: string;
};

type Role = 'EMPLOYEE' | 'ADVISOR' | 'ADMIN';

// Add a function to map UI roles to database roles
const mapRoleToDbRole = (role: Role): string => {
    switch (role) {
        case 'ADMIN':
            return 'org_admin';
        case 'EMPLOYEE':
        case 'ADVISOR':
            return 'org_member';
        default:
            return 'org_pending';
    }
};

export default function ApprovalRequestPage() {
    const router = useRouter();
    const { user, session } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role>();
    const [selectedOrg, setSelectedOrg] = useState<string>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accountType, setAccountType] = useState<string | null>(null);
    const supabase = getSupabaseClient();
    const [hydrated, setHydrated] = useState(false);

    // This effect runs once after hydration is complete
    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        // Try to get account type from URL query parameter first
        const params = new URLSearchParams(window.location.search);
        const typeFromQuery = params.get('type');
        const orgFromQuery = params.get('org');
        const roleFromQuery = params.get('role');
        const skipSelectionFromQuery = params.get('skip_selection');
        
        console.log('URL parameters:', { 
            type: typeFromQuery, 
            org: orgFromQuery, 
            role: roleFromQuery,
            skipSelection: skipSelectionFromQuery
        });
        
        if (typeFromQuery) {
            console.log('Found account type in URL query:', typeFromQuery);
            setAccountType(typeFromQuery);
            // Also store in localStorage as fallback
            localStorage.setItem('accountType', typeFromQuery);
        } else {
            // Fallback to localStorage
            const storedAccountType = localStorage.getItem('accountType');
            console.log('Using account type from localStorage:', storedAccountType);
            setAccountType(storedAccountType);
        }
        
        // Set organization and role if provided in URL
        if (orgFromQuery) {
            setSelectedOrg(orgFromQuery);
        }
        
        if (roleFromQuery) {
            setSelectedRole(roleFromQuery.toUpperCase() as Role);
        }
        
        // Also check cookies as another source
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };
        
        const cookieType = getCookie('account_type');
        if (cookieType && !typeFromQuery) {
            console.log('Found account type in cookie:', cookieType);
            setAccountType(cookieType);
        }
        
        const cookieOrg = getCookie('organization_id');
        if (cookieOrg && !orgFromQuery) {
            console.log('Found organization ID in cookie:', cookieOrg);
            setSelectedOrg(cookieOrg);
        }
        
        const cookieRole = getCookie('user_role');
        if (cookieRole && !roleFromQuery) {
            console.log('Found user role in cookie:', cookieRole);
            setSelectedRole(cookieRole.toUpperCase() as Role);
        }
        
        // If we have all the required data and skip_selection is true, auto-submit the form
        if (skipSelectionFromQuery === 'true' && typeFromQuery && orgFromQuery && roleFromQuery) {
            console.log('Auto-submitting form with data from URL parameters');
            setTimeout(() => {
                const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                if (submitButton) {
                    submitButton.click();
                }
            }, 1000); // Give a short delay to ensure the form is ready
        }
    }, []);

    useEffect(() => {
        const fetchOrganizations = async () => {
            if (!accountType || !supabase) {
                console.log('⚠️ Missing required data:', { 
                    hasAccountType: !!accountType, 
                    hasSupabase: !!supabase 
                });
                setLoading(false);
                return;
            }

            // If we already have a selected organization, we might not need to fetch all organizations
            if (selectedOrg) {
                console.log('🔍 Already have selected organization:', selectedOrg);
                // We could optionally fetch just this organization's details if needed
                setLoading(false);
                return;
            }

            try {
                console.log('🔄 Fetching organizations for type:', accountType);
                let query;

                // Select the correct table and column based on account type
                switch (accountType) {
                    case 'sponsor':
                    case 'exchange_sponsor':
                        query = supabase
                            .from('exchange_sponsor')
                            .select('id, sponsor_name');
                        break;
                    case 'issuer':
                        query = supabase
                            .from('issuers')
                            .select('id, issuer_name');
                        break;
                    case 'exchange':
                        query = supabase
                            .from('exchanges')
                            .select('id, exchange_name');
                        break;
                    default:
                        throw new Error(`Invalid account type: ${accountType}`);
                }

                const { data, error: queryError } = await query;
                
                if (queryError) throw queryError;

                console.log('✅ Organizations fetched:', data);

                const formattedData = (data || []).map((org: any) => ({
                    id: org.id,
                    name: org.sponsor_name || org.issuer_name || org.exchange_name,
                    type: accountType,
                    status: org.status || 'unknown'
                }));

                setOrganizations(formattedData);
            } catch (err) {
                console.error('❌ Error fetching organizations:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, [supabase, accountType, selectedOrg]);

    // If not hydrated yet, render a simple loading state
    if (!hydrated) {
        return (
            <div className="min-h-[600px] flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Show loading state while checking account type
    if (loading) {
        return (
            <div className="min-h-[600px] flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Show error if no account type
    if (!accountType) {
        return (
            <div className="min-h-[600px] flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
                    <p className="text-red-600 mb-4">No account type selected</p>
                    <button
                        onClick={() => router.push('/sign-up')}
                        className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Return to Sign Up
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🚀 Starting approval request submission...');
        console.log('📝 Form data:', {
            selectedRole,
            selectedOrg,
            accountType
        });

        if (!user || !selectedOrg || !selectedRole || !accountType) {
            console.error('❌ Missing required data:', {
                hasUser: !!user,
                hasOrg: !!selectedOrg,
                hasRole: !!selectedRole,
                hasAccountType: !!accountType
            });
            setError('Please fill in all fields');
            return;
        }

        try {
            const dbRole = mapRoleToDbRole(selectedRole);
            console.log('🔄 Mapped role:', { original: selectedRole, mapped: dbRole });

            // Get the name from user object
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';

            const submissionData = {
                user_id: user.id,
                organization_id: parseInt(selectedOrg),
                organization_type: accountType === 'sponsor' ? 'exchange_sponsor' : accountType,
                role: dbRole,
                requested_role: selectedRole,
                status: 'pending',
                user_email: user.email,
                first_name: firstName,
                last_name: lastName
            };

            console.log('📤 Submitting request with data:', submissionData);

            const { data, error } = await supabase
                .from('organization_members')
                .insert(submissionData)
                .select()
                .single();

            if (error) {
                console.error('❌ Submission error:', error);
                throw error;
            }

            console.log('✅ Request submitted successfully:', data);

            // Redirect based on account type
            const redirectPath = accountType === 'sponsor' || accountType === 'exchange_sponsor' 
                ? '/approval-pending-sponsor'
                : accountType === 'issuer' 
                    ? '/approval-pending-issuer' 
                    : '/approval-pending-exchange';

            console.log('🎯 Redirecting to:', redirectPath);
            router.push(redirectPath);

        } catch (error: any) {
            console.error('❌ Detailed error:', error);
            setError(error.message || 'Failed to submit request');
        }
    };

    const handleCreateNew = () => {
        if (accountType === 'exchange_sponsor') {
            router.push('/dashboard/admin/sponsors/new');
        } else if (accountType === 'issuer') {
            router.push('/dashboard/admin/issuers/new');
        }
    };

    return (
        <div className="min-h-[600px] flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-blue-700 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                    Join an Organization
                </h2>
                <p className="text-white text-center mb-8">
                    Select your role and organization
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Your Role
                        </label>
                        <select
                            className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as Role)}
                            required
                            suppressHydrationWarning
                        >
                            <option value="">Select a role</option>
                            <option value="EMPLOYEE">Employee</option>
                            <option value="ADVISOR">Advisor</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Organization
                        </label>
                        <select
                            className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={selectedOrg}
                            onChange={(e) => setSelectedOrg(e.target.value)}
                            required
                            suppressHydrationWarning
                        >
                            <option value="">Select an organization</option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-white text-blue-700 px-4 py-2 rounded hover:bg-gray-100"
                        suppressHydrationWarning
                    >
                        Submit Request
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/30"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 text-white bg-blue-700">or</span>
                        </div>
                    </div>

                    {(accountType === 'exchange_sponsor' || accountType === 'issuer') && (
                        <button
                            type="button"
                            onClick={handleCreateNew}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-white text-sm font-medium rounded-md text-white hover:bg-blue-600"
                            suppressHydrationWarning
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Organization
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
} 
