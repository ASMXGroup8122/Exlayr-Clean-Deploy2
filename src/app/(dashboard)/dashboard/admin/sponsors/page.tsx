import { Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

type Sponsor = {
    id: string;
    sponsor_name: string;
    phone_number: string;
    sponsor_email: string;
    sponsor_address: string;
    contact_name: string;
    regulated_no: string;
    regulator: string;
    specialities: string[];
    website: string;
    issuers: any;
    linkedin: string;
    instagram: string;
    created_at: string;
    status: 'pending' | 'active' | 'suspended';
};

const getStatusColor = (status: string) => {
    const colors = {
        active: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        suspended: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
};

export default async function SponsorsPage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
        cookies: () => cookieStore
    });

    try {
        const { data: sponsors, error } = await supabase
            .from('exchange_sponsor')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-blue-600" />
                            Sponsors Management
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage and monitor sponsor organizations
                        </p>
                    </div>
                    <Link 
                        href="/dashboard/admin/sponsors/add"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Sponsor
                    </Link>
                </div>

                <div className="bg-white shadow rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Organization
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Joined Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sponsors?.map((sponsor: Sponsor) => (
                                    <tr key={sponsor.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {sponsor.sponsor_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {sponsor.regulator}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {sponsor.contact_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {sponsor.sponsor_email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sponsor.status)}`}>
                                                {sponsor.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sponsor.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <Link
                                                href={`/dashboard/admin/sponsors/${sponsor.id}`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error in SponsorsPage:', error);
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    Error loading sponsors. Please try refreshing the page.
                </div>
            </div>
        );
    }
} 