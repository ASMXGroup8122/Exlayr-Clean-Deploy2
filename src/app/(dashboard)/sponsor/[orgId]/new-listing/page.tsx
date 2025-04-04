'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Issuer = {
    id: string;
    issuer_name: string;
};

type Exchange = {
    id: string;
    exchange_name: string;
    status: 'active' | 'pending' | 'suspended';
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

export default function NewListingPage() {
    const router = useRouter();
    const params = useParams<{ orgId: string }>();
    const { user, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [currentStep, setCurrentStep] = useState(1);
    const supabase = createClientComponentClient<Database>();
    
    const [formData, setFormData] = useState({
        issuer_id: '',
        instrument_category: '',
        instrument_sub_category: '',
        instrument_name: '',
        instrument_ticker: '',
        exchange: '',
        exchange_marketplace: '',
        
        trading_currency: '',
        lot_size: null as number | null,
        settlement_cycle: '',
        trading_hours: '',
        issue_size: null as number | null,
        face_value: null as number | null,
        issue_price: null as number | null,
        maturity_date: '',
        interest_rate: null as number | null,
        dividend_policy: '',
        listing_rules_compliance: '',
        risk_disclosures: [] as string[],
        regulatory_approvals: [] as string[],
        required_documents: [] as File[]
    });

    useEffect(() => {
        let isSubscribed = true;

        async function loadData() {
            try {
                if (!loading) {
                    if (!user) {
                        router.replace('/sign-in');
                        return;
                    }

                    if (user?.account_type !== 'exchange_sponsor') {
                        router.replace('/dashboard');
                        return;
                    }

                    // Verify organization access
                    const { data: orgData, error: orgError } = await supabase
                        .from('organizations')
                        .select('id, status')
                        .eq('id', params.orgId)
                        .eq('status', 'active')
                        .single();

                    if (orgError || !orgData) {
                        if (isSubscribed) {
                            setError('Organization not found or inactive');
                            router.replace('/dashboard');
                        }
                        return;
                    }

                    // Load issuers
                    const { data: issuersData, error: issuersError } = await supabase
                        .from('issuers')
                        .select('id, issuer_name')
                        .order('issuer_name');

                    if (issuersError) throw issuersError;

                    // Load exchanges
                    const { data: exchangesData, error: exchangesError } = await supabase
                        .from('exchange')
                        .select('id, exchange_name')
                        .eq('status', 'active')
                        .order('exchange_name');

                    if (exchangesError) throw exchangesError;
                    
                    if (isSubscribed) {
                        setIssuers(issuersData || []);
                        setExchanges(exchangesData || []);
                        setIsLoading(false);
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
                if (isSubscribed) {
                    setError('Failed to load data');
                    setIsLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isSubscribed = false;
        };
    }, [loading, user, router, params.orgId, supabase]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
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
        
        if (currentStep < 4) {
            // Move to next step if not on final step
            setCurrentStep(currentStep + 1);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('listing')
                .insert([
                    {
                        issuer_id: formData.issuer_id,
                        instrument_category: formData.instrument_category,
                        instrument_sub_category: formData.instrument_sub_category,
                        instrument_name: formData.instrument_name,
                        instrument_ticker: formData.instrument_ticker,
                        exchange: formData.exchange,
                        exchange_marketplace: formData.exchange_marketplace,
                        
                        trading_currency: formData.trading_currency,
                        lot_size: formData.lot_size,
                        settlement_cycle: formData.settlement_cycle,
                        trading_hours: formData.trading_hours,
                        issue_size: formData.issue_size,
                        face_value: formData.face_value,
                        issue_price: formData.issue_price,
                        maturity_date: formData.maturity_date,
                        interest_rate: formData.interest_rate,
                        dividend_policy: formData.dividend_policy,
                        listing_rules_compliance: formData.listing_rules_compliance,
                        risk_disclosures: formData.risk_disclosures,
                        regulatory_approvals: formData.regulatory_approvals,
                        status: 'draft',
                        created_by: user?.id
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            router.push(`/sponsor/${params.orgId}/listings/${data.id}/success`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create listing');
        }
    };

    const renderBasicInfo = () => {
        return (
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
                        {exchanges.map(exchange => (
                            <option key={exchange.id} value={exchange.exchange_name}>
                                {exchange.exchange_name}
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
        );
    };

    const renderMarketDetails = () => {
        return (
            <div className="space-y-4">
                <div>
                    <label htmlFor="trading_currency" className="block text-sm font-medium text-gray-700">
                        Trading Currency
                    </label>
                    <select
                        id="trading_currency"
                        name="trading_currency"
                        value={formData.trading_currency}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="">Select currency</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="lot_size" className="block text-sm font-medium text-gray-700">
                        Lot Size
                    </label>
                    <input
                        type="number"
                        id="lot_size"
                        name="lot_size"
                        value={formData.lot_size || ''}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="settlement_cycle" className="block text-sm font-medium text-gray-700">
                        Settlement Cycle
                    </label>
                    <select
                        id="settlement_cycle"
                        name="settlement_cycle"
                        value={formData.settlement_cycle}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="">Select cycle</option>
                        <option value="T+1">T+1</option>
                        <option value="T+2">T+2</option>
                        <option value="T+3">T+3</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="trading_hours" className="block text-sm font-medium text-gray-700">
                        Trading Hours
                    </label>
                    <input
                        type="text"
                        id="trading_hours"
                        name="trading_hours"
                        value={formData.trading_hours}
                        onChange={handleChange}
                        placeholder="e.g., 09:00-17:00 GMT"
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>
        );
    };

    const renderSecurityDetails = () => {
        return (
            <div className="space-y-4">
                <div>
                    <label htmlFor="issue_size" className="block text-sm font-medium text-gray-700">
                        Issue Size
                    </label>
                    <input
                        type="number"
                        id="issue_size"
                        name="issue_size"
                        value={formData.issue_size || ''}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="face_value" className="block text-sm font-medium text-gray-700">
                        Face Value
                    </label>
                    <input
                        type="number"
                        id="face_value"
                        name="face_value"
                        value={formData.face_value || ''}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="issue_price" className="block text-sm font-medium text-gray-700">
                        Issue Price
                    </label>
                    <input
                        type="number"
                        id="issue_price"
                        name="issue_price"
                        value={formData.issue_price || ''}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                {formData.instrument_category === 'Bond' && (
                    <>
                        <div>
                            <label htmlFor="maturity_date" className="block text-sm font-medium text-gray-700">
                                Maturity Date
                            </label>
                            <input
                                type="date"
                                id="maturity_date"
                                name="maturity_date"
                                value={formData.maturity_date}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label htmlFor="interest_rate" className="block text-sm font-medium text-gray-700">
                                Interest Rate (%)
                            </label>
                            <input
                                type="number"
                                id="interest_rate"
                                name="interest_rate"
                                value={formData.interest_rate || ''}
                                onChange={handleChange}
                                step="0.01"
                                required
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </>
                )}

                {formData.instrument_category === 'Equity' && (
                    <div>
                        <label htmlFor="dividend_policy" className="block text-sm font-medium text-gray-700">
                            Dividend Policy
                        </label>
                        <textarea
                            id="dividend_policy"
                            name="dividend_policy"
                            value={formData.dividend_policy}
                            onChange={handleChange}
                            required
                            rows={3}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderComplianceAndDocs = () => {
        return (
            <div className="space-y-4">
                <div>
                    <label htmlFor="listing_rules_compliance" className="block text-sm font-medium text-gray-700">
                        Listing Rules Compliance
                    </label>
                    <textarea
                        id="listing_rules_compliance"
                        name="listing_rules_compliance"
                        value={formData.listing_rules_compliance}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Risk Disclosures
                    </label>
                    <div className="mt-2 space-y-2">
                        {formData.risk_disclosures.map((risk, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={risk}
                                    onChange={(e) => {
                                        const newRisks = [...formData.risk_disclosures];
                                        newRisks[index] = e.target.value;
                                        setFormData({ ...formData, risk_disclosures: newRisks });
                                    }}
                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newRisks = formData.risk_disclosures.filter((_, i) => i !== index);
                                        setFormData({ ...formData, risk_disclosures: newRisks });
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setFormData({ 
                                ...formData, 
                                risk_disclosures: [...formData.risk_disclosures, ''] 
                            })}
                            className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Risk Disclosure
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Regulatory Approvals
                    </label>
                    <div className="mt-2 space-y-2">
                        {formData.regulatory_approvals.map((approval, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={approval}
                                    onChange={(e) => {
                                        const newApprovals = [...formData.regulatory_approvals];
                                        newApprovals[index] = e.target.value;
                                        setFormData({ ...formData, regulatory_approvals: newApprovals });
                                    }}
                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newApprovals = formData.regulatory_approvals.filter((_, i) => i !== index);
                                        setFormData({ ...formData, regulatory_approvals: newApprovals });
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setFormData({ 
                                ...formData, 
                                regulatory_approvals: [...formData.regulatory_approvals, ''] 
                            })}
                            className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Regulatory Approval
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Required Documents
                    </label>
                    <input
                        type="file"
                        multiple
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setFormData({ ...formData, required_documents: files });
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>
            </div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderBasicInfo();
            case 2:
                return renderMarketDetails();
            case 3:
                return renderSecurityDetails();
            case 4:
                return renderComplianceAndDocs();
            default:
                return null;
        }
    };

    const renderProgress = () => (
        <div className="mb-8">
            <div className="flex justify-between relative">
                <div className="w-full absolute top-1/2 h-0.5 bg-gray-200" />
                <div className="relative flex justify-between w-full">
                    {['Basic Info', 'Market Details', 'Security Details', 'Compliance & Docs'].map((step, index) => (
                        <div 
                            key={step}
                            className={`w-10 h-10 rounded-full flex items-center justify-center relative bg-white border-2 ${
                                currentStep > index + 1 ? 'border-green-500 text-green-500' :
                                currentStep === index + 1 ? 'border-blue-600 text-blue-600' :
                                'border-gray-300 text-gray-500'
                            }`}
                        >
                            {index + 1}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-between mt-2">
                {['Basic Info', 'Market Details', 'Security Details', 'Compliance & Docs'].map((step, index) => (
                    <div 
                        key={step}
                        className={`text-xs ${
                            currentStep === index + 1 ? 'text-blue-600 font-medium' : 'text-gray-500'
                        }`}
                        style={{ width: '25%', textAlign: 'center' }}
                    >
                        {step}
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link 
                    href={`/sponsor/${params.orgId}/listings`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Listings
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Start a New Listing</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Enter basic details to determine the required fields for your listing. 
                    Data will be pre-filled where available but can be updated.
                </p>
            </div>

            {renderProgress()}

            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}

                {renderStepContent()}

                <div className="flex justify-between pt-6">
                    <button
                        type="button"
                        onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            currentStep === 1 ? 'invisible' : ''
                        }`}
                    >
                        Previous
                    </button>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {currentStep < 4 ? 'Next' : 'Submit'}
                        {currentStep < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
} 