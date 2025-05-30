'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Issuer = {
    id: string;
    issuer_name: string;
};

const INSTRUMENT_CATEGORIES = [
    'Equity',
    'Bond',
    'Fund',
    'Derivative',
    'Other'
];

const INSTRUMENT_SUB_CATEGORIES = {
    Equity: ['Ordinary Shares', 'Preference Shares', 'Depositary Receipts'],
    Bond: ['Corporate Bond', 'Government Bond', 'Convertible Bond'],
    Fund: ['ETF', 'Mutual Fund', 'Investment Trust'],
    Derivative: ['Option', 'Future', 'Warrant'],
    Other: ['Other']
};

const EXCHANGES = [
    'MERJ Exchange',
    'LSE',
    'ASMX'
];

const MARKETPLACES = {
    'MERJ Exchange': ['Equity Market', 'Bond Market', 'Fund Market'],
    'LSE': ['Main Market', 'AIM'],
    'ASMX': ['Primary Market', 'Secondary Market']
};

export default function NewListingClient() {
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;

    const [isLoading, setIsLoading] = useState(true);
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [formData, setFormData] = useState({
        issuer_id: '',
        instrument_category: '',
        instrument_sub_category: '',
        instrument_name: '',
        instrument_ticker: '',
        exchange: '',
        exchange_marketplace: ''
    });

    useEffect(() => {
        const fetchIssuers = async () => {
            try {
                const { data, error } = await supabase
                    .from('issuers')
                    .select('id, issuer_name')
                    .order('issuer_name');

                if (error) throw error;
                setIssuers(data || []);
            } catch (error) {
                console.error('Error fetching issuers:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchIssuers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            // Reset dependent fields when parent field changes
            if (name === 'instrument_category') {
                newData.instrument_sub_category = '';
            }
            if (name === 'exchange') {
                newData.exchange_marketplace = '';
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('listing')
                .insert([
                    {
                        instrument_issuer_id: formData.issuer_id,
                        instrument_category: formData.instrument_category,
                        instrument_sub_category: formData.instrument_sub_category,
                        instrument_name: formData.instrument_name,
                        instrument_ticker: formData.instrument_ticker,
                        exchange: formData.exchange,
                        exchange_marketplace: formData.exchange_marketplace,
                        status: 'draft'
                    }
                ]);

            if (error) throw error;

            // Redirect to the token creation page
            router.push(`/dashboard/sponsor/${orgId}/token-creation`);
        } catch (error) {
            console.error('Error creating listing:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link
                    href={`/dashboard/sponsor/${orgId}/listings`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Listings
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Start a New Listing</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Enter basic details to determine the required fields for your listing. 
                    Data will be pre-filled where available but can be updated.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="issuer_id" className="block text-sm font-medium text-gray-700">
                            Select Issuer
                        </label>
                        <select
                            id="issuer_id"
                            name="issuer_id"
                            value={formData.issuer_id}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">Select an issuer</option>
                            {issuers.map(issuer => (
                                <option key={issuer.id} value={issuer.id}>
                                    {issuer.issuer_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="instrument_category" className="block text-sm font-medium text-gray-700">
                            Instrument Category
                        </label>
                        <select
                            id="instrument_category"
                            name="instrument_category"
                            value={formData.instrument_category}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">Select a category</option>
                            {INSTRUMENT_CATEGORIES.map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    {formData.instrument_category && (
                        <div>
                            <label htmlFor="instrument_sub_category" className="block text-sm font-medium text-gray-700">
                                Instrument Sub-Category
                            </label>
                            <select
                                id="instrument_sub_category"
                                name="instrument_sub_category"
                                value={formData.instrument_sub_category}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="">Select a sub-category</option>
                                {INSTRUMENT_SUB_CATEGORIES[formData.instrument_category as keyof typeof INSTRUMENT_SUB_CATEGORIES].map(subCategory => (
                                    <option key={subCategory} value={subCategory}>
                                        {subCategory}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="instrument_name" className="block text-sm font-medium text-gray-700">
                            Instrument Name
                        </label>
                        <input
                            type="text"
                            id="instrument_name"
                            name="instrument_name"
                            value={formData.instrument_name}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="instrument_ticker" className="block text-sm font-medium text-gray-700">
                            Ticker Symbol
                        </label>
                        <input
                            type="text"
                            id="instrument_ticker"
                            name="instrument_ticker"
                            value={formData.instrument_ticker}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="exchange" className="block text-sm font-medium text-gray-700">
                            Exchange
                        </label>
                        <select
                            id="exchange"
                            name="exchange"
                            value={formData.exchange}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">Select an exchange</option>
                            {EXCHANGES.map(exchange => (
                                <option key={exchange} value={exchange}>
                                    {exchange}
                                </option>
                            ))}
                        </select>
                    </div>

                    {formData.exchange && (
                        <div>
                            <label htmlFor="exchange_marketplace" className="block text-sm font-medium text-gray-700">
                                Exchange Marketplace
                            </label>
                            <select
                                id="exchange_marketplace"
                                name="exchange_marketplace"
                                value={formData.exchange_marketplace}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="">Select a marketplace</option>
                                {MARKETPLACES[formData.exchange as keyof typeof MARKETPLACES].map(marketplace => (
                                    <option key={marketplace} value={marketplace}>
                                        {marketplace}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex justify-between pt-6">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/listings`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
} 