'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
    Building2, 
    Mail, 
    Phone, 
    MapPin, 
    Globe, 
    FileText,
    AlertCircle,
    Landmark,
    BadgeCheck,
    Scale,
    ClipboardList,
    CircleDot
} from 'lucide-react';

type ExchangeFormData = {
    exchange_name: string;
    contact_emails: string;
    phone_number: string;
    exchange_address: string;
    website: string;
    jurisdiction: string;
    custody: string;
    clearing: string;
    listing_rules: string;
    other_listing_docs: string;
    regulator: string;
    approved: string;
    linkedin: string;
    instagram: string;
    instagram_copy: string;
};

export default function AddExchangePage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ExchangeFormData>({
        exchange_name: '',
        contact_emails: '',
        phone_number: '',
        exchange_address: '',
        website: '',
        jurisdiction: '',
        custody: '',
        clearing: '',
        listing_rules: '',
        other_listing_docs: '',
        regulator: '',
        approved: 'pending',
        linkedin: '',
        instagram: '',
        instagram_copy: ''
    });

    const validateForm = (data: ExchangeFormData) => {
        if (!data.exchange_name.trim()) return "Exchange name is required";
        if (!data.contact_emails.trim()) return "Email is required";
        if (!data.phone_number.trim()) return "Phone number is required";
        if (!data.exchange_address.trim()) return "Address is required";
        if (!data.website.trim()) return "Website is required";
        if (!data.jurisdiction.trim()) return "Jurisdiction is required";
        if (!data.custody.trim()) return "Custody is required";
        if (!data.clearing.trim()) return "Clearing is required";
        if (!data.listing_rules.trim()) return "Listing rules is required";
        if (!data.other_listing_docs.trim()) return "Other listing docs is required";
        if (!data.regulator.trim()) return "Regulator is required";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            console.log('Form data being submitted:', formData);

            const exchangeData = {
                ...formData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Log the request we're about to make
            console.log('Making request to table: exchange');
            console.log('Data to insert:', exchangeData);

            const { data, error: insertError } = await supabase
                .from('exchange')  // Make sure this is 'exchange'
                .insert([exchangeData])
                .select('*')  // Be explicit about what we're selecting
                .single();

            console.log('Supabase response:', { data, error: insertError });

            if (insertError) {
                console.error('Insert error details:', insertError);
                throw insertError;
            }

            if (data) {
                console.log('Successfully created exchange:', data);
                alert('Exchange created successfully!');
                router.push('/dashboard/admin/exchanges'); // This URL can stay as 'exchanges' since it's a frontend route
            }

        } catch (error: any) {
            console.error('Full error object:', error);
            setError(error.message || 'Failed to create exchange');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow-lg rounded-lg">
                <div className="px-8 py-8 sm:p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center">
                            <Landmark className="h-8 w-8 text-blue-600 mr-3" />
                            <h1 className="text-3xl font-semibold text-gray-900">
                                Add New Exchange
                            </h1>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            ← Back
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex">
                                <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Exchange Name
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Landmark className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.exchange_name}
                                            onChange={(e) => setFormData({ ...formData, exchange_name: e.target.value })}
                                            placeholder="Enter exchange name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Website
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Globe className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="url"
                                            required
                                            placeholder="https://www.exchange.com"
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Email
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.contact_emails}
                                            onChange={(e) => setFormData({ ...formData, contact_emails: e.target.value })}
                                            placeholder="contact@exchange.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Address
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                                            <MapPin className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <textarea
                                            required
                                            rows={3}
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.exchange_address}
                                            onChange={(e) => setFormData({ ...formData, exchange_address: e.target.value })}
                                            placeholder="Enter complete address"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <CircleDot className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <select
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.approved}
                                            onChange={(e) => setFormData({ ...formData, approved: e.target.value as 'active' | 'pending' | 'inactive' })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Registration Number
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <BadgeCheck className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.jurisdiction}
                                            onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                                            placeholder="Enter registration number"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Regulator
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Scale className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.regulator}
                                            onChange={(e) => setFormData({ ...formData, regulator: e.target.value })}
                                            placeholder="Enter regulator name"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <div className="relative">
                                    <div className="absolute top-3 left-4">
                                        <ClipboardList className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <textarea
                                        rows={6}
                                        className="pl-11 pr-4 py-3 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.other_listing_docs}
                                        onChange={(e) => setFormData({ ...formData, other_listing_docs: e.target.value })}
                                        placeholder="Provide a brief description of the exchange..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
                            >
                                {loading ? 'Adding...' : 'Add Exchange'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 
