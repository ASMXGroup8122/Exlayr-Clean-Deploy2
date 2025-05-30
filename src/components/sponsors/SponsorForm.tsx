'use client';

import { useState } from 'react';
import { ExchangeSponsor } from '@/lib/supabase-types';
import { supabase } from '@/lib/supabase';

type SponsorFormProps = {
    sponsor?: ExchangeSponsor;
    onClose: () => void;
    onSuccess: () => void;
};

export default function SponsorForm({ sponsor, onClose, onSuccess }: SponsorFormProps) {
    const [formData, setFormData] = useState({
        sponsor_name: sponsor?.sponsor_name || '',
        phone_number: sponsor?.phone_number || '',
        sponsor_email: sponsor?.sponsor_email || '',
        sponsor_address: sponsor?.sponsor_address || '',
        contact_name: sponsor?.contact_name || '',
        regulated_no: sponsor?.regulated_no || '',
        regulator: sponsor?.regulator || '',
        specialities: sponsor?.specialities || [],
        website: sponsor?.website || '',
        linkedin: sponsor?.linkedin || '',
        instagram: sponsor?.instagram || '',
        x_twitter: sponsor?.x_twitter || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (sponsor) {
                // Update existing sponsor
                const { error } = await supabase
                    .from('exchange_sponsor')
                    .update(formData)
                    .eq('id', sponsor.id);
                if (error) throw error;
            } else {
                // Create new sponsor
                const { error } = await supabase
                    .from('exchange_sponsor')
                    .insert([formData]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving sponsor:', error);
            setError('Failed to save sponsor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">
                        {sponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
                    </h2>
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Sponsor Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.sponsor_name}
                                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Contact Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contact_name}
                                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.sponsor_email}
                                    onChange={(e) => setFormData({ ...formData, sponsor_email: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <textarea
                                    required
                                    value={formData.sponsor_address}
                                    onChange={(e) => setFormData({ ...formData, sponsor_address: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Regulator
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.regulator}
                                    onChange={(e) => setFormData({ ...formData, regulator: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Regulation Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.regulated_no}
                                    onChange={(e) => setFormData({ ...formData, regulated_no: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Sponsor'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 
