'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ExchangeSponsor } from '@/lib/supabase-types';
import SponsorForm from '@/components/sponsors/SponsorForm';

export default function SponsorsPage() {
    const [sponsors, setSponsors] = useState<ExchangeSponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedSponsor, setSelectedSponsor] = useState<ExchangeSponsor | undefined>();

    const loadSponsors = async () => {
        try {
            const { data, error } = await supabase
                .from('exchange_sponsor')
                .select('*')
                .order('sponsor_name');

            if (error) throw error;
            setSponsors(data || []);
        } catch (error) {
            console.error('Error loading sponsors:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSponsors();
    }, []);

    const handleEdit = (sponsor: ExchangeSponsor) => {
        setSelectedSponsor(sponsor);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setSelectedSponsor(undefined);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Sponsors Management</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    Add New Sponsor
                </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Active Sponsors</h2>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Add New Sponsor
                        </button>
                    </div>
                    <div className="border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sponsor Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Regulator
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : sponsors.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center">
                                            No sponsors found
                                        </td>
                                    </tr>
                                ) : (
                                    sponsors.map((sponsor) => (
                                        <tr key={sponsor.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {sponsor.sponsor_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {sponsor.website}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {sponsor.contact_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {sponsor.sponsor_email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {sponsor.regulator}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {sponsor.regulated_no}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button className="text-indigo-600 hover:text-indigo-900">
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <SponsorForm
                    sponsor={selectedSponsor}
                    onClose={handleCloseForm}
                    onSuccess={loadSponsors}
                />
            )}
        </div>
    );
} 
