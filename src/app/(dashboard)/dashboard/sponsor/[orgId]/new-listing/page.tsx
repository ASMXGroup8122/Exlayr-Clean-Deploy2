'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, Tag, BarChart4, Building, Globe, Sparkles, Calendar } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Issuer = {
    id: string;
    issuer_name: string;
};

type Exchange = {
    id: string;
    exchange_name: string;
    custody: string;
    clearing: string;
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
    Bond: ['Corporate', 'PCC'],
    Fund: ['ETF', 'Mutual Fund', 'Investment Trust'],
    Derivative: ['Option', 'Future', 'Warrant'],
    Other: ['Other']
};

const EXCHANGE_BOARDS = ['Main', 'SME', 'VCAP'];

const LISTING_TYPES = ['IPO', 'Direct Listing', 'Secondary Listing', 'Other'];

const FORM_STEPS = [
    { title: 'Basic Information', description: 'Instrument details and classification' },
    { title: 'Financial Details', description: 'Securities and pricing information' },
    { title: 'Rights & Terms', description: 'Legal rights and terms' },
    { title: 'Administrative', description: 'Administrative and management details' },
    { title: 'Additional Info', description: 'Additional listing requirements' }
];

export default function NewListingPage() {
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;
    const supabase = createClientComponentClient<Database>();

    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [sponsorOrg, setSponsorOrg] = useState<{ sponsor_name: string } | null>(null);
    const [formData, setFormData] = useState({
        // Basic Information
        instrumentname: '',
        instrumentticker: '',
        instrumentisin: '',
        instrumentmic: '',
        instrumentcficode: '',
        instrumentinvestorcategory: '',
        instrumentcategory: '',
        instrumentsubcategory: '',
        instrumentexchange: '',
        instrumentexchangeboard: '',
        instrumentlistingtype: '',
        instrumentlistingdate: '',
        instrumentapprovaldate: '',
        instrumentsecuritiesadmissionstatus: 'draft',

        // Financial Details
        instrumentsecuritiesissued: '',
        instrumentnosecuritiestobelisted: '',
        instrumentofferproceeds: '',
        instrumentuseofproceeds: '',
        instrumentofferminimum: '',
        instrumentlistingprice: '',
        instrumentequitynominalvalue: '',
        instrumentbondpccterm: '',
        instrumentbondsecurity: '',
        instrumentbondpcccoupon: '',
        instrumentcurrency: '',
        instrumentcurrencysymbol: '',
        instrumentcurrencyinwords: '',
        instrumentcurrencyofissuewords: '',
        instrumentunitofsecurity: '',
        instrumentpaymentofsecurities: '',

        // Rights & Terms
        instrumentdividendrights: '',
        instrumentdividendpayments: '',
        instrumentpreemptionrights: '',
        instrumentbondrights: '',
        instrumentbondpccredemptionrights: '',
        instrumentequityvotingrights: '',
        instrumenttransferability: '',
        instrumentisrestricted: false,

        // Administrative
        instrumentsponsor: '',
        instrumentsponsorname: '',
        instrumentcustodyagent: '',
        instrumentadministrator: '',
        instrumentissuerid: '',
        instrumentissuername: '',
        instrumentunderwriter1nameandaddress: '',
        instrumentunderwriter2nameandaddress: '',
        instrumentunderwriter3nameandaddress: '',
        instrumentunderwriter4nameandaddress: '',
        instrumentunderwriter5nameandaddress: '',

        // Additional Info
        instrumentpurposeoflisting: '',
        instrumentpurposeofthislisting: '',
        instrumentconnectedplatform: '',
        instrumentlistingparticulardate: '',
        instrumentdateofapprovaloflisting: '',
        instrumentofferperiodanddate: '',
        instrumentwhichboard: '',
        instrumentexchangesponsor: null,
        instrumentupdates: null,

        // Security Type Details
        instrumentsecuritytype: '',
        instrumentsharesclass: '',
        instrumentbondtype: '',
        instrumentwarrantstrikeprice: '',
        instrumentfundstrategy: '',
        instrumentsecuritytokentype: '',

        // UI Control Fields (not in schema but needed for form)
        hasUnderwriters: false,
        numberOfUnderwriters: '0'
    });

    useEffect(() => {
        let isSubscribed = true;

        const fetchUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (isSubscribed) {
                    setUser(user);
                }
            } catch (error) {
                if (isSubscribed) {
                    console.error('Error fetching user:', error);
                    setError(error instanceof Error ? error.message : 'Failed to fetch user');
                }
            }
        };

        fetchUser();

        return () => {
            isSubscribed = false;
        };
    }, []);

    useEffect(() => {
        let isSubscribed = true;

        const fetchData = async () => {
            try {
                // Fetch sponsor organization info
                const { data: sponsorData, error: sponsorError } = await supabase
                    .from('exchange_sponsor')
                    .select('sponsor_name')
                    .eq('id', orgId)
                    .single();

                if (sponsorError) throw sponsorError;

                if (isSubscribed) {
                    setSponsorOrg(sponsorData);
                    // Pre-fill the sponsor field in formData
                    setFormData(prev => ({
                        ...prev,
                        instrumentsponsor: sponsorData?.sponsor_name || ''
                    }));
                }

                // Debug: Log the queries being made
                console.log('Starting data fetch...');
                
                // Fetch exchanges from exchange table
                console.log('Executing exchange query with debug...');
                
                // Debug query 1: Get all records
                const { data: allExchanges, error: allError } = await supabase
                    .from('exchange')
                    .select('*');
                
                console.log('All exchanges (no filter):', {
                    data: allExchanges,
                    count: allExchanges?.length,
                    error: allError
                });

                // Debug query 2: Check specific record
                const { data: merj, error: merjError } = await supabase
                    .from('exchange')
                    .select('*')
                    .eq('exchange_name', 'MERJ Exchange');

                console.log('MERJ Exchange record:', {
                    data: merj,
                    error: merjError
                });

                // Original query
                const { data: exchangesData, error: exchangesError } = await supabase
                    .from('exchange')
                    .select('id, exchange_name, custody, clearing')
                    .eq('approved', 'active')
                    .order('exchange_name');

                // Debug: Log exchange response in detail
                console.log('Exchange Query Complete:', {
                    success: !exchangesError,
                    data: exchangesData,
                    error: exchangesError,
                    count: exchangesData?.length,
                    hasData: Boolean(exchangesData && exchangesData.length > 0)
                });

                if (exchangesError) {
                    console.error('Exchange fetch error details:', {
                        error: exchangesError,
                        message: exchangesError.message,
                        details: exchangesError.details,
                        hint: exchangesError.hint
                    });
                    throw exchangesError;
                }

                // Fetch issuers from issuers table
                console.log('Executing issuers query:', {
                    table: 'issuers',
                    fields: 'id, issuer_name',
                    condition: 'status = approved'
                });

                const { data: issuersData, error: issuersError } = await supabase
                    .from('issuers')
                    .select('id, issuer_name')
                    .eq('status', 'approved')
                    .order('issuer_name');

                // Debug: Log issuer response in detail
                console.log('Issuers Query Complete:', {
                    success: !issuersError,
                    data: issuersData,
                    error: issuersError,
                    count: issuersData?.length,
                    hasData: Boolean(issuersData && issuersData.length > 0)
                });

                if (issuersError) {
                    console.error('Issuer fetch error details:', {
                        error: issuersError,
                        message: issuersError.message,
                        details: issuersError.details,
                        hint: issuersError.hint
                    });
                    throw issuersError;
                }

                if (isSubscribed) {
                    console.log('Setting state with:', {
                        exchanges: exchangesData?.length || 0,
                        issuers: issuersData?.length || 0
                    });
                    setExchanges(exchangesData || []);
                    setIssuers(issuersData || []);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error details:', error);
                if (isSubscribed) {
                    setError(error instanceof Error ? error.message : 'Failed to fetch data');
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isSubscribed = false;
        };
    }, [orgId]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            // Reset dependent fields when parent field changes
            if (name === 'instrumentcategory') {
                newData.instrumentsubcategory = '';
            }
            if (name === 'instrumentexchange') {
                newData.instrumentexchangeboard = '';
                // Find the selected exchange and set its custody agent and clearing facility
                const selectedExchange = exchanges.find(ex => ex.exchange_name === value);
                if (selectedExchange) {
                    newData.instrumentcustodyagent = selectedExchange.custody || '';
                }
            }
            if (name === 'instrumentissuerid') {
                // Find the selected issuer and set its name
                const selectedIssuer = issuers.find(issuer => issuer.id === value);
                if (selectedIssuer) {
                    newData.instrumentissuername = selectedIssuer.issuer_name;
                }
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submission started');
        
        try {
            // Basic required fields based on database schema
            const requiredFields = [
                'instrumentname',
                'instrumentexchange',
                'instrumentexchangeboard',
                'instrumentissuerid'  // Added issuer as required field
            ];

            const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
            if (missingFields.length > 0) {
                alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
                return;
            }

            // Validate constrained fields
            if (formData.instrumentcategory && 
                !['Equity', 'Bond', 'Fund', 'Derivative', 'Other'].includes(formData.instrumentcategory)) {
                alert('Invalid instrument category');
                return;
            }

            if (formData.instrumentexchangeboard && 
                !['Main', 'SME', 'VCAP'].includes(formData.instrumentexchangeboard)) {
                alert('Invalid exchange board');
                return;
            }

            // Format numeric fields with null checks
            const numericFields = {
                instrumentsecuritiesissued: formData.instrumentsecuritiesissued ? 
                    parseInt(formData.instrumentsecuritiesissued.toString().replace(/,/g, '')) : null,
                instrumentnosecuritiestobelisted: formData.instrumentnosecuritiestobelisted ? 
                    parseInt(formData.instrumentnosecuritiestobelisted.toString().replace(/,/g, '')) : null,
                instrumentlistingprice: formData.instrumentlistingprice ? 
                    parseFloat(formData.instrumentlistingprice.toString().replace(/,/g, '')) : null,
                instrumentofferminimum: formData.instrumentofferminimum ? 
                    parseFloat(formData.instrumentofferminimum.toString().replace(/,/g, '')) : null,
                instrumentequitynominalvalue: formData.instrumentequitynominalvalue ? 
                    parseFloat(formData.instrumentequitynominalvalue.toString().replace(/,/g, '')) : null
            };

            // Format date fields with null checks
            const dateFields = {
                instrumentlistingdate: formData.instrumentlistingdate ? 
                    new Date(formData.instrumentlistingdate).toISOString() : null,
                instrumentapprovaldate: formData.instrumentapprovaldate ? 
                    new Date(formData.instrumentapprovaldate).toISOString() : null,
                instrumentofferperiodanddate: formData.instrumentofferperiodanddate ? 
                    new Date(formData.instrumentofferperiodanddate).toISOString() : null
            };

            // Create submission data object with proper types
            const submissionData = {
                instrumentname: formData.instrumentname,
                instrumentticker: formData.instrumentticker || null,
                instrumentisin: formData.instrumentisin || null,
                instrumentmic: formData.instrumentmic || null,
                instrumentcficode: formData.instrumentcficode || null,
                instrumentinvestorcategory: formData.instrumentinvestorcategory || null,
                instrumentcategory: formData.instrumentcategory || null,
                instrumentsubcategory: formData.instrumentsubcategory || null,
                instrumentexchange: formData.instrumentexchange,
                instrumentexchangeboard: formData.instrumentexchangeboard,
                instrumentlistingtype: formData.instrumentlistingtype || null,
                ...numericFields,
                ...dateFields,
                instrumentcurrency: formData.instrumentcurrency || null,
                instrumentcurrencysymbol: formData.instrumentcurrencysymbol || null,
                instrumentcurrencyinwords: formData.instrumentcurrencyinwords || null,
                instrumentcurrencyofissuewords: formData.instrumentcurrencyofissuewords || null,
                instrumentunitofsecurity: formData.instrumentunitofsecurity || null,
                instrumentissuerid: formData.instrumentissuerid || null,
                instrumentissuername: formData.instrumentissuername || null,
                instrumentsponsor: formData.instrumentsponsor || null,
                instrumentcustodyagent: formData.instrumentcustodyagent || null,
                instrumentadministrator: formData.instrumentadministrator || null,
                instrumentisrestricted: formData.instrumentisrestricted || false,
                instrumentcreatedby: user?.id,
                instrumentdividendrights: formData.instrumentdividendrights || null,
                instrumentdividendpayments: formData.instrumentdividendpayments || null,
                instrumentpreemptionrights: formData.instrumentpreemptionrights || null,
                instrumentbondrights: formData.instrumentbondrights || null,
                instrumentbondpccredemptionrights: formData.instrumentbondpccredemptionrights || null,
                instrumenttransferability: formData.instrumenttransferability || null,
                instrumentpurposeoflisting: formData.instrumentpurposeoflisting || null,
                instrumentconnectedplatform: formData.instrumentconnectedplatform || null,
                instrumentofferperiodanddate: formData.instrumentofferperiodanddate || null
            };

            console.log('Submitting data:', submissionData);

            const { data, error } = await supabase
                .from('listing')
                .insert([submissionData])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Submission successful:', data);
            
            // Navigate to success page
            router.push(`/dashboard/sponsor/${params.orgId}/new-listing/success?listingId=${data.instrumentid}`);
        } catch (err) {
            console.error('Error creating listing:', err);
            if (err instanceof Error) {
                console.error('Error stack:', err.stack);
            }
            setError(err instanceof Error ? err.message : 'Failed to create listing');
            alert('Failed to create listing. Please check the console for details.');
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Progress Bar */}
                <nav aria-label="Progress" className="mb-8">
                    <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
                        {FORM_STEPS.map((step, index) => (
                            <li key={step.title} className="md:flex-1">
                                <div className={`group pl-4 py-2 flex flex-col border-l-4 hover:border-gray-400 md:pl-0 md:pt-4 md:pb-0 md:border-l-0 md:border-t-4 ${
                                    index < currentStep ? 'border-blue-600' 
                                    : index === currentStep ? 'border-blue-600' 
                                    : 'border-gray-200'
                                }`}>
                                    <span className={`text-xs font-semibold tracking-wide uppercase ${
                                        index < currentStep ? 'text-blue-600'
                                        : index === currentStep ? 'text-blue-600'
                                        : 'text-gray-500'
                                    }`}>
                                        Step {index + 1}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {step.title}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </nav>

                {/* Header Section */}
                <div className="mb-8">
                    <Link 
                        href={`/dashboard/sponsor/${orgId}/listings`}
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Listings
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Start a New Listing</h1>
                            <p className="mt-2 text-base text-gray-600">
                                {FORM_STEPS[currentStep].description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-8">
                        <div className="grid grid-cols-1 gap-8">
                            {/* Step 0: Basic Information */}
                            {currentStep === 0 && (
                                <>
                                    {/* Issuer Selection */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Building2 className="h-5 w-5 text-blue-500" />
                                            Issuer Details
                                        </div>
                                        <div>
                                            <label htmlFor="instrumentissuerid" className="block text-sm font-medium text-gray-700">
                                                Select Issuer
                                            </label>
                                            <select
                                                id="instrumentissuerid"
                                                name="instrumentissuerid"
                                                value={formData.instrumentissuerid}
                                                onChange={handleChange}
                                                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                            >
                                                <option value="">Select an issuer</option>
                                                {issuers.map(issuer => (
                                                    <option key={issuer.id} value={issuer.id}>
                                                        {issuer.issuer_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Instrument Details */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <BarChart4 className="h-5 w-5 text-blue-500" />
                                            Instrument Information
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="instrumentcategory" className="block text-sm font-medium text-gray-700">
                                                    Category
                                                </label>
                                                <select
                                                    id="instrumentcategory"
                                                    name="instrumentcategory"
                                                    value={formData.instrumentcategory}
                                                    onChange={handleChange}
                                                    required
                                                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                >
                                                    <option value="">Select a category</option>
                                                    {INSTRUMENT_CATEGORIES.map(category => (
                                                        <option key={category} value={category}>
                                                            {category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {formData.instrumentcategory && (
                                                <div>
                                                    <label htmlFor="instrumentsubcategory" className="block text-sm font-medium text-gray-700">
                                                        Sub-Category
                                                    </label>
                                                    <select
                                                        id="instrumentsubcategory"
                                                        name="instrumentsubcategory"
                                                        value={formData.instrumentsubcategory}
                                                        onChange={handleChange}
                                                        required
                                                        className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                    >
                                                        <option value="">Select a sub-category</option>
                                                        {INSTRUMENT_SUB_CATEGORIES[formData.instrumentcategory as keyof typeof INSTRUMENT_SUB_CATEGORIES].map(subCategory => (
                                                            <option key={subCategory} value={subCategory}>
                                                                {subCategory}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div>
                                                <label htmlFor="instrumentname" className="block text-sm font-medium text-gray-700">
                                                    Instrument Name
                                                </label>
                                                <div className="mt-1 relative rounded-lg shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Tag className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        id="instrumentname"
                                                        name="instrumentname"
                                                        value={formData.instrumentname}
                                                        onChange={handleChange}
                                                        required
                                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                        placeholder="Enter instrument name"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentisin" className="block text-sm font-medium text-gray-700">
                                                    ISIN
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentisin"
                                                    name="instrumentisin"
                                                    value={formData.instrumentisin}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter ISIN"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentmic" className="block text-sm font-medium text-gray-700">
                                                    MIC Code
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentmic"
                                                    name="instrumentmic"
                                                    value={formData.instrumentmic}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter MIC code"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentcficode" className="block text-sm font-medium text-gray-700">
                                                    CFI Code
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentcficode"
                                                    name="instrumentcficode"
                                                    value={formData.instrumentcficode}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter CFI code"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentinvestorcategory" className="block text-sm font-medium text-gray-700">
                                                    Investor Category
                                                </label>
                                                <select
                                                    id="instrumentinvestorcategory"
                                                    name="instrumentinvestorcategory"
                                                    value={formData.instrumentinvestorcategory}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                >
                                                    <option value="">Select investor category</option>
                                                    <option value="retail">Retail</option>
                                                    <option value="professional">Professional</option>
                                                    <option value="qualified">Qualified</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentsecuritytype" className="block text-sm font-medium text-gray-700">
                                                    Security Type
                                                </label>
                                                <select
                                                    id="instrumentsecuritytype"
                                                    name="instrumentsecuritytype"
                                                    value={formData.instrumentsecuritytype}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                >
                                                    <option value="">Select security type</option>
                                                    <option value="traditional">Traditional</option>
                                                    <option value="security_token">Security Token</option>
                                                </select>
                                            </div>

                                                    {formData.instrumentcategory === 'Equity' && (
                                                        <div>
                                                            <label htmlFor="instrumentsharesclass" className="block text-sm font-medium text-gray-700">
                                                                Shares Class
                                                            </label>
                                                            <select
                                                                id="instrumentsharesclass"
                                                                name="instrumentsharesclass"
                                                                value={formData.instrumentsharesclass}
                                                                onChange={handleChange}
                                                                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                            >
                                                                <option value="">Select shares class</option>
                                                                <option value="ordinary">Ordinary</option>
                                                                <option value="preference">Preference</option>
                                                                <option value="deferred">Deferred</option>
                                                            </select>
                                                        </div>
                                                    )}
                                        </div>
                                    </div>

                                    {/* Exchange and Listing Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Globe className="h-5 w-5 text-blue-500" />
                                            Exchange Information
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="instrumentexchange" className="block text-sm font-medium text-gray-700">
                                                    Exchange
                                                </label>
                                                <select
                                                    id="instrumentexchange"
                                                    name="instrumentexchange"
                                                    value={formData.instrumentexchange}
                                                    onChange={handleChange}
                                                    required
                                                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                >
                                                    <option value="">Select an exchange</option>
                                                    {exchanges.map(exchange => (
                                                        <option key={exchange.id} value={exchange.exchange_name}>
                                                            {exchange.exchange_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                                    {formData.instrumentexchange && (
                                                        <div>
                                                            <label htmlFor="instrumentexchangeboard" className="block text-sm font-medium text-gray-700">
                                                                Which Board
                                                            </label>
                                                            <select
                                                                id="instrumentexchangeboard"
                                                                name="instrumentexchangeboard"
                                                                value={formData.instrumentexchangeboard}
                                                                onChange={handleChange}
                                                                required
                                                                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                            >
                                                                <option value="">Select a board</option>
                                                                {EXCHANGE_BOARDS.map(board => (
                                                                    <option key={board} value={board}>
                                                                        {board}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label htmlFor="instrumentlistingtype" className="block text-sm font-medium text-gray-700">
                                                            Listing Type
                                                        </label>
                                                        <select
                                                            id="instrumentlistingtype"
                                                            name="instrumentlistingtype"
                                                            value={formData.instrumentlistingtype}
                                                            onChange={handleChange}
                                                            required
                                                            className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                        >
                                                            <option value="">Select listing type</option>
                                                            {LISTING_TYPES.map(type => (
                                                                <option key={type} value={type.toLowerCase().replace(' ', '_')}>
                                                                    {type}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Step 1: Financial Details */}
                            {currentStep === 1 && (
                                <>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <BarChart4 className="h-5 w-5 text-blue-500" />
                                            Financial Details
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="instrumentsecuritiesissued" className="block text-sm font-medium text-gray-700">
                                                    Number of Securities Issued
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentsecuritiesissued"
                                                    name="instrumentsecuritiesissued"
                                                    value={formData.instrumentsecuritiesissued.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/,/g, '');
                                                        if (!value || /^\d+$/.test(value)) {
                                                            handleChange({
                                                                target: {
                                                                    name: e.target.name,
                                                                    value: value
                                                                }
                                                            } as React.ChangeEvent<HTMLInputElement>);
                                                        }
                                                    }}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter number of securities issued"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentnosecuritiestobelisted" className="block text-sm font-medium text-gray-700">
                                                    Number of Securities to be Listed
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentnosecuritiestobelisted"
                                                    name="instrumentnosecuritiestobelisted"
                                                    value={formData.instrumentnosecuritiestobelisted.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/,/g, '');
                                                        if (!value || /^\d+$/.test(value)) {
                                                            handleChange({
                                                                target: {
                                                                    name: e.target.name,
                                                                    value: value
                                                                }
                                                            } as React.ChangeEvent<HTMLInputElement>);
                                                        }
                                                    }}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter number of securities to be listed"
                                                />
                                            </div>

                                            {formData.instrumentlistingtype === 'ipo' && (
                                                <>
                                                    <div>
                                                        <label htmlFor="instrumentofferproceeds" className="block text-sm font-medium text-gray-700">
                                                            Offer Proceeds
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="instrumentofferproceeds"
                                                            name="instrumentofferproceeds"
                                                            value={formData.instrumentofferproceeds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(/,/g, '');
                                                                if (!value || /^\d+$/.test(value)) {
                                                                    handleChange({
                                                                        target: {
                                                                            name: e.target.name,
                                                                            value: value
                                                                        }
                                                                    } as React.ChangeEvent<HTMLInputElement>);
                                                                }
                                                            }}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Enter offer proceeds"
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label htmlFor="instrumentuseofproceeds" className="block text-sm font-medium text-gray-700">
                                                            Use of Proceeds
                                                        </label>
                                                        <textarea
                                                            id="instrumentuseofproceeds"
                                                            name="instrumentuseofproceeds"
                                                            value={formData.instrumentuseofproceeds}
                                                            onChange={handleChange}
                                                            rows={4}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Enter detailed use of proceeds"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="instrumentofferminimum" className="block text-sm font-medium text-gray-700">
                                                            Offer Minimum
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="instrumentofferminimum"
                                                            name="instrumentofferminimum"
                                                            value={formData.instrumentofferminimum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(/,/g, '');
                                                                if (!value || /^\d+$/.test(value)) {
                                                                    handleChange({
                                                                        target: {
                                                                            name: e.target.name,
                                                                            value: value
                                                                        }
                                                                    } as React.ChangeEvent<HTMLInputElement>);
                                                                }
                                                            }}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Enter offer minimum"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label htmlFor="instrumentlistingprice" className="block text-sm font-medium text-gray-700">
                                                    Listing Price
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentlistingprice"
                                                    name="instrumentlistingprice"
                                                    value={formData.instrumentlistingprice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/,/g, '');
                                                        if (!value || /^\d*\.?\d*$/.test(value)) {
                                                            handleChange({
                                                                target: {
                                                                    name: e.target.name,
                                                                    value: value
                                                                }
                                                            } as React.ChangeEvent<HTMLInputElement>);
                                                        }
                                                    }}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter listing price (e.g. 0.42)"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentcurrency" className="block text-sm font-medium text-gray-700">
                                                    Currency
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentcurrency"
                                                    name="instrumentcurrency"
                                                    value={formData.instrumentcurrency}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter currency"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentcurrencysymbol" className="block text-sm font-medium text-gray-700">
                                                    Currency Symbol
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentcurrencysymbol"
                                                    name="instrumentcurrencysymbol"
                                                    value={formData.instrumentcurrencysymbol}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter currency symbol"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentcurrencyinwords" className="block text-sm font-medium text-gray-700">
                                                    Currency in Words
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentcurrencyinwords"
                                                    name="instrumentcurrencyinwords"
                                                    value={formData.instrumentcurrencyinwords}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Enter currency in words"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Step 2: Rights & Terms */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    {/* Rights Information Tile */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Building className="h-5 w-5 text-blue-500" />
                                            Rights Information <span className="text-sm font-normal text-blue-600">(AI Assistant ✨)</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor="instrumentequityvotingrights" className="block text-sm font-medium text-gray-700">
                                                        Voting Rights
                                                    </label>
                                                    <span className="text-blue-600">✨</span>
                                                </div>
                                                <textarea
                                                    id="instrumentequityvotingrights"
                                                    name="instrumentequityvotingrights"
                                                    value={formData.instrumentequityvotingrights}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Describe voting rights"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor="instrumentdividendrights" className="block text-sm font-medium text-gray-700">
                                                        Dividend Rights
                                                    </label>
                                                    <span className="text-blue-600">✨</span>
                                                </div>
                                                <textarea
                                                    id="instrumentdividendrights"
                                                    name="instrumentdividendrights"
                                                    value={formData.instrumentdividendrights}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Describe dividend rights"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor="instrumentdividendpayments" className="block text-sm font-medium text-gray-700">
                                                        Dividend Payments
                                                    </label>
                                                    <span className="text-blue-600">✨</span>
                                                </div>
                                                <textarea
                                                    id="instrumentdividendpayments"
                                                    name="instrumentdividendpayments"
                                                    value={formData.instrumentdividendpayments}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Describe dividend payments"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor="instrumentpreemptionrights" className="block text-sm font-medium text-gray-700">
                                                        Pre-emption Rights
                                                    </label>
                                                    <span className="text-blue-600">✨</span>
                                                </div>
                                                <textarea
                                                    id="instrumentpreemptionrights"
                                                    name="instrumentpreemptionrights"
                                                    value={formData.instrumentpreemptionrights}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Describe pre-emption rights"
                                                />
                                            </div>

                                                    {formData.instrumentcategory === 'Bond' && (
                                                        <>
                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label htmlFor="instrumentbondrights" className="block text-sm font-medium text-gray-700">
                                                                        Bond Rights
                                                                    </label>
                                                                    <span className="text-blue-600">✨</span>
                                                                </div>
                                                                <textarea
                                                                    id="instrumentbondrights"
                                                                    name="instrumentbondrights"
                                                                    value={formData.instrumentbondrights}
                                                                    onChange={handleChange}
                                                                    rows={3}
                                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                                    placeholder="Describe bond rights"
                                                                />
                                                            </div>

                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label htmlFor="instrumentbondpccredemptionrights" className="block text-sm font-medium text-gray-700">
                                                                        PCC Redemption Rights
                                                                    </label>
                                                                    <span className="text-blue-600">✨</span>
                                                                </div>
                                                                <textarea
                                                                    id="instrumentbondpccredemptionrights"
                                                                    name="instrumentbondpccredemptionrights"
                                                                    value={formData.instrumentbondpccredemptionrights}
                                                                    onChange={handleChange}
                                                                    rows={3}
                                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                                    placeholder="Describe PCC redemption rights"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    <div>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <label htmlFor="instrumenttransferability" className="block text-sm font-medium text-gray-700">
                                                                Transferability
                                                            </label>
                                                            <span className="text-blue-600">✨</span>
                                                        </div>
                                                        <textarea
                                                            id="instrumenttransferability"
                                                            name="instrumenttransferability"
                                                            value={formData.instrumenttransferability}
                                                            onChange={handleChange}
                                                            rows={3}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Describe transferability"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="instrumentisrestricted" className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id="instrumentisrestricted"
                                                                name="instrumentisrestricted"
                                                                checked={formData.instrumentisrestricted}
                                                                onChange={(e) => handleChange({
                                                                    target: {
                                                                        name: e.target.name,
                                                                        value: e.target.checked
                                                                    }
                                                                } as any)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">Is Restricted</span>
                                                        </label>
                                                    </div>
                                        </div>
                                    </div>

                                    {/* Only show Instrument Specific Details if we have specific fields to show */}
                                    {(formData.instrumentsecuritytype === 'Security Token' || 
                                      formData.instrumentcategory === 'Warrant' || 
                                      formData.instrumentcategory === 'Fund') && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                <Tag className="h-5 w-5 text-blue-500" />
                                                Instrument Specific Details
                                            </div>
                                            <div className="grid grid-cols-1 gap-6">
                                                {formData.instrumentsecuritytype === 'Security Token' && (
                                                    <div>
                                                        <label htmlFor="instrumentsecuritytokentype" className="block text-sm font-medium text-gray-700">
                                                            Token Type
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="instrumentsecuritytokentype"
                                                            name="instrumentsecuritytokentype"
                                                            value={formData.instrumentsecuritytokentype}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Enter security token type"
                                                        />
                                                    </div>
                                                )}

                                                {formData.instrumentcategory === 'Warrant' && (
                                                    <div>
                                                        <label htmlFor="instrumentwarrantstrikeprice" className="block text-sm font-medium text-gray-700">
                                                            Strike Price
                                                        </label>
                                                        <input
                                                            type="number"
                                                            id="instrumentwarrantstrikeprice"
                                                            name="instrumentwarrantstrikeprice"
                                                            value={formData.instrumentwarrantstrikeprice}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Enter warrant strike price"
                                                        />
                                                    </div>
                                                )}

                                                {formData.instrumentcategory === 'Fund' && (
                                                    <div>
                                                        <label htmlFor="instrumentfundstrategy" className="block text-sm font-medium text-gray-700">
                                                            Fund Strategy
                                                        </label>
                                                        <textarea
                                                            id="instrumentfundstrategy"
                                                            name="instrumentfundstrategy"
                                                            value={formData.instrumentfundstrategy}
                                                            onChange={handleChange}
                                                            rows={3}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Describe fund strategy"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Administrative Details */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    {/* Key Parties Tile */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Building2 className="h-5 w-5 text-blue-500" />
                                            Key Parties
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label htmlFor="instrumentsponsor" className="block text-sm font-medium text-gray-700">
                                                    Sponsor
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentsponsor"
                                                    name="instrumentsponsor"
                                                    value={formData.instrumentsponsor}
                                                    disabled
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentcustodyagent" className="block text-sm font-medium text-gray-700">
                                                    Custody Agent
                                                </label>
                                                <input
                                                    type="text"
                                                    id="instrumentcustodyagent"
                                                    name="instrumentcustodyagent"
                                                    value={formData.instrumentcustodyagent}
                                                    disabled
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 sm:text-sm"
                                                />
                                            </div>

                                            {(formData.instrumentcategory === 'Bond' || formData.instrumentcategory === 'Fund') && (
                                                <>
                                                    <div>
                                                        <label htmlFor="instrumentadministrator" className="block text-sm font-medium text-gray-700">
                                                            Administrator
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="instrumentadministrator"
                                                            name="instrumentadministrator"
                                                            value={formData.instrumentadministrator}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder="Enter administrator"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Underwriters Tile */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Building className="h-5 w-5 text-blue-500" />
                                            Underwriters
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={formData.hasUnderwriters}
                                                        onChange={(e) => handleChange({
                                                            target: {
                                                                name: 'hasUnderwriters',
                                                                value: e.target.checked
                                                            }
                                                        } as any)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    <span className="ml-3 text-sm font-medium text-gray-700">Are there Underwriters?</span>
                                                </label>
                                            </div>

                                            {formData.hasUnderwriters && (
                                                <div>
                                                    <label htmlFor="numberOfUnderwriters" className="block text-sm font-medium text-gray-700">
                                                        Number of Underwriters
                                                    </label>
                                                    <select
                                                        id="numberOfUnderwriters"
                                                        name="numberOfUnderwriters"
                                                        value={formData.numberOfUnderwriters}
                                                        onChange={handleChange}
                                                        className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg transition-shadow"
                                                    >
                                                        <option value="0">Select number of underwriters</option>
                                                        {[1, 2, 3, 4, 5].map(num => (
                                                            <option key={num} value={num}>{num}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {formData.hasUnderwriters && parseInt(formData.numberOfUnderwriters) > 0 && (
                                                Array.from({ length: parseInt(formData.numberOfUnderwriters) }).map((_, idx) => (
                                                    <div key={idx}>
                                                        <label htmlFor={`instrumentunderwriter${idx + 1}nameandaddress`} className="block text-sm font-medium text-gray-700">
                                                            Underwriter {idx + 1} Name and Address
                                                        </label>
                                                        <textarea
                                                            id={`instrumentunderwriter${idx + 1}nameandaddress`}
                                                            name={`instrumentunderwriter${idx + 1}nameandaddress`}
                                                            value={formData[`instrumentunderwriter${idx + 1}nameandaddress` as keyof typeof formData] || ''}
                                                            onChange={handleChange}
                                                            rows={3}
                                                            className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                            placeholder={`Enter underwriter ${idx + 1} name and address`}
                                                        />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Connected Platform */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Globe className="h-5 w-5 text-blue-500" />
                                            Platform Information
                                        </div>
                                        <div>
                                            <label htmlFor="instrumentconnectedplatform" className="block text-sm font-medium text-gray-700">
                                                Connected Platform
                                            </label>
                                            <input
                                                type="text"
                                                id="instrumentconnectedplatform"
                                                name="instrumentconnectedplatform"
                                                value={formData.instrumentconnectedplatform}
                                                onChange={handleChange}
                                                className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                placeholder="Enter connected platform"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Additional Information */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    {/* Purpose of Listing */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Tag className="h-5 w-5 text-blue-500" />
                                            Purpose of Listing
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label htmlFor="instrumentpurposeoflisting" className="block text-sm font-medium text-gray-700">
                                                        Purpose of Listing
                                                    </label>
                                                    <span className="text-blue-600">✨</span>
                                                </div>
                                                <textarea
                                                    id="instrumentpurposeoflisting"
                                                    name="instrumentpurposeoflisting"
                                                    value={formData.instrumentpurposeoflisting}
                                                    onChange={handleChange}
                                                    rows={4}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                    placeholder="Describe the purpose of this listing in detail"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Important Dates */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Calendar className="h-5 w-5 text-blue-500" />
                                            Important Dates
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="instrumentlistingparticulardate" className="block text-sm font-medium text-gray-700">
                                                    Listing Particular Date
                                                </label>
                                                <input
                                                    type="date"
                                                    id="instrumentlistingparticulardate"
                                                    name="instrumentlistingparticulardate"
                                                    value={formData.instrumentlistingparticulardate}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentdateofapprovaloflisting" className="block text-sm font-medium text-gray-700">
                                                    Date of Approval
                                                </label>
                                                <input
                                                    type="date"
                                                    id="instrumentdateofapprovaloflisting"
                                                    name="instrumentdateofapprovaloflisting"
                                                    value={formData.instrumentdateofapprovaloflisting}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="instrumentofferperiodanddate" className="block text-sm font-medium text-gray-700">
                                                    Offer Period End Date
                                                </label>
                                                <input
                                                    type="date"
                                                    id="instrumentofferperiodanddate"
                                                    name="instrumentofferperiodanddate"
                                                    value={formData.instrumentofferperiodanddate}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        {currentStep > 0 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(current => current - 1)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Previous
                            </button>
                        ) : (
                            <Link
                                href={`/dashboard/sponsor/${orgId}/listings`}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Cancel
                            </Link>
                        )}
                        
                        {currentStep < FORM_STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentStep(current => current + 1);
                                }}
                                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Next Step
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Submit Listing
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}