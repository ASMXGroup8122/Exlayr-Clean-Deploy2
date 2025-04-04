'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useListing } from '@/contexts/ListingContext';

interface IndustryBackground {
    market_size: string;
    competitors: string[];
    regulatory_environment: string;
    growth_factors: string[];
}

export default function IndustryBackgroundPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { orgId, listingId } = params as { orgId: string; listingId: string };
    const { formData, updateDueDiligence } = useListing();

    const [industryData, setIndustryData] = useState<IndustryBackground>({
        market_size: '',
        competitors: [],
        regulatory_environment: '',
        growth_factors: []
    });
    const [newCompetitor, setNewCompetitor] = useState('');
    const [newGrowthFactor, setNewGrowthFactor] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
            return;
        }

        const fetchIndustryData = async () => {
            const { data, error } = await supabase
                .from('listing')
                .select('industry_background')
                .eq('id', listingId)
                .single();

            if (error) {
                console.error('Error fetching industry data:', error);
                return;
            }

            if (data?.industry_background) {
                setIndustryData(data.industry_background);
            }
            setIsLoading(false);
        };

        fetchIndustryData();
    }, [user, listingId, router]);

    const addCompetitor = () => {
        if (newCompetitor.trim()) {
            setIndustryData(prev => ({
                ...prev,
                competitors: [...prev.competitors, newCompetitor.trim()]
            }));
            setNewCompetitor('');
        }
    };

    const removeCompetitor = (index: number) => {
        setIndustryData(prev => ({
            ...prev,
            competitors: prev.competitors.filter((_, i) => i !== index)
        }));
    };

    const addGrowthFactor = () => {
        if (newGrowthFactor.trim()) {
            setIndustryData(prev => ({
                ...prev,
                growth_factors: [...prev.growth_factors, newGrowthFactor.trim()]
            }));
            setNewGrowthFactor('');
        }
    };

    const removeGrowthFactor = (index: number) => {
        setIndustryData(prev => ({
            ...prev,
            growth_factors: prev.growth_factors.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Update local context
            updateDueDiligence('industry', industryData);

            // Update database
            const { error } = await supabase
                .from('listing')
                .update({
                    industry_background: industryData
                })
                .eq('id', listingId);

            if (error) throw error;

            // Navigate to next section
            router.push(`/dashboard/sponsor/${orgId}/listings/${listingId}/due-diligence/company`);
        } catch (error) {
            console.error('Error saving industry background:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Industry Background</h1>
                    <p className="text-gray-500">
                        Provide information about the industry and market environment
                    </p>
                </div>
                <Link
                    href={`/dashboard/sponsor/${orgId}/listings`}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Listings
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                {/* Market Size */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Market Size and Potential
                    </label>
                    <textarea
                        value={industryData.market_size}
                        onChange={(e) => setIndustryData(prev => ({
                            ...prev,
                            market_size: e.target.value
                        }))}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* Competitors */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Key Competitors
                    </label>
                    <div className="mt-2 space-y-2">
                        {industryData.competitors.map((competitor, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <span className="flex-grow p-2 bg-gray-50 rounded-md">
                                    {competitor}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeCompetitor(index)}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newCompetitor}
                                onChange={(e) => setNewCompetitor(e.target.value)}
                                className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Add a competitor"
                            />
                            <button
                                type="button"
                                onClick={addCompetitor}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Regulatory Environment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Regulatory Environment
                    </label>
                    <textarea
                        value={industryData.regulatory_environment}
                        onChange={(e) => setIndustryData(prev => ({
                            ...prev,
                            regulatory_environment: e.target.value
                        }))}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* Growth Factors */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Growth Factors
                    </label>
                    <div className="mt-2 space-y-2">
                        {industryData.growth_factors.map((factor, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <span className="flex-grow p-2 bg-gray-50 rounded-md">
                                    {factor}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeGrowthFactor(index)}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newGrowthFactor}
                                onChange={(e) => setNewGrowthFactor(e.target.value)}
                                className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Add a growth factor"
                            />
                            <button
                                type="button"
                                onClick={addGrowthFactor}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/listings/${listingId}/due-diligence/director`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Previous
                    </Link>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
} 