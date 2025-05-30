'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Building2, Shield, FileText } from 'lucide-react';
import { LogoUpload } from '@/components/LogoUpload';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const FORM_STEPS = [
    'Company Information',
    'Management Details',
    'Capital Structure',
    'Legal & Advisors',
    'Business Overview',
    'Regulatory Information',
    'Documents & Compliance'
];

interface IssuerFormData {
    id?: number;
    issuer_name: string;
    incorporation_date: string;
    provisional_ticker: string;
    company_registration_number: number | null;
    registered_address: string;
    phone_number: string;
    country: string;
    business_website: string;
    legal_structure: string;
    legislation_formed_under: string;
    business_email: string;
    main_contact: string;
    created_at?: string;
    updated_at?: string;
    chief_executiveofficer: string;
    ceo_shares_in_the_co: number | null;
    ceo_title: string;
    ceo_dob: string;
    ceo_nationality: string;
    ceo_other_directorships: string;
    financial_director: string;
    fd_title: string;
    fd_dob: string;
    fd_nationality: string;
    fd_shares_in_the_co: number | null;
    fd_other_directorships: string;
    how_many_directors_total: number | null;
    director_3: string;
    d3_title: string;
    d3_dob: string;
    d3_nationality: string;
    d3_shares_in_the_co: number | null;
    d3_other_directorships: string;
    director_4: string;
    d4_title: string;
    d4_dob: string;
    d4_nationality: string;
    d4_shares_in_the_co_copy: number | null;
    d4_other_directorships: string;
    director_5: string;
    d5_title: string;
    d5_dob: string;
    d5_nationality: string;
    d5_shares_in_the_co: number | null;
    d5_other_directorships: string;
    nominal_share_price: string | null;
    authorised_share_capital: string | null;
    shares_in_issue: number | null;
    preemption_rights: string | null;
    dividend_policy: string | null;
    dividend_date_1: string | null;
    legal_advisors_name: string | null;
    legal_advisors_address: string | null;
    auditors_name: string | null;
    auditors_address: string | null;
    trustee_name: string | null;
    trustee_address: string | null;
    accountant_name: string | null;
    accountants_address: string | null;
    administrators_name: string | null;
    administrators_address: string | null;
    exchange_sponsor: string | null;
    company_secretary: string | null;
    co_sec_address: string | null;
    is_already_listed?: boolean;
    which_exchange_is_you_company_listed_on_and_what_is_the_ticker: string | null;
    business_overview: string | null;
    company_prospects: string | null;
    material_contracts: string | null;
    purpose_of_listing: string | null;
    plans_after_listing: string | null;
    use_of_proceeds: string | null;
    details_of_investments: string | null;
    details_of_litigation: string | null;
    recent_performance: string | null;
    related_party_transactions: string | null;
    details_of_rpt: string | null;
    is_raising_funds?: boolean;
    has_litigation?: boolean;
    has_related_party_transactions?: boolean;
    has_investments?: boolean;
    does_the_company_have_regulators: boolean | null;
    number_of_regulators?: number | null;
    regulator_1: string | null;
    regulator_2: string | null;
    regulator_3: string | null;
    regulator_4: string | null;
    accounts: string | null;
    directors_contracts: string | null;
    directors_cvs: string | null;
    memorandum_articles: string | null;
    business_plans: string | null;
    news_articles: string | null;
    summary_of_articles: string | null;
    compliance_approved: string | null;
    listing_docs: string | null;
    a_class_shares_nominal_val: number | null;
    a_class_shares_in_issue: number | null;
    b_class_shares_nominal_val: number | null;
    b_class_shares_in_issue: number | null;
    c_class_shares_nominal_val: number | null;
    c_class_shares_in_issue: number | null;
    d_class_shares_nominal_val: number | null;
    d_class_shares_in_issue: number | null;
    ultimate_beneficial_holder: string | null;
    ubo_shares: number | null;
    ubo_shareholding: number | null;
    additional_share_classes: string | null;
}

const LEGAL_STRUCTURES = [
    'Limited Company',
    'Public Limited Company',
    'Limited Liability Partnership',
    'Partnership',
    'Trust',
    'Protected Cell Company (PCC)',
    'Fund',
    'Other'
] as const;

const COUNTRIES = [
    'Andorra',
    'Australia',
    'Austria',
    'Bahamas',
    'Bahrain',
    'Belgium',
    'Bermuda',
    'British Virgin Islands',
    'Brunei',
    'Canada',
    'Cayman Islands',
    'China',
    'Cyprus',
    'Denmark',
    'Dubai',
    'Finland',
    'France',
    'Germany',
    'Gibraltar',
    'Greece',
    'Guernsey',
    'Hong Kong',
    'Iceland',
    'India',
    'Ireland',
    'Isle of Man',
    'Israel',
    'Italy',
    'Japan',
    'Jersey',
    'Kuwait',
    'Lebanon',
    'Liechtenstein',
    'Luxembourg',
    'Macau',
    'Malaysia',
    'Malta',
    'Mauritius',
    'Monaco',
    'Netherlands',
    'New Zealand',
    'Norway',
    'Oman',
    'Portugal',
    'Qatar',
    'Saudi Arabia',
    'Seychelles',
    'Singapore',
    'South Africa',
    'South Korea',
    'Spain',
    'Sweden',
    'Switzerland',
    'Taiwan',
    'United Arab Emirates',
    'United Kingdom',
    'Other'
] as const;

const inputClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";
const textareaClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";
const selectClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";

// First, define the document categories type based on the enum in the database
type DocumentCategory = 
    | 'memorandum_articles'
    | 'director_cvs'
    | 'director_contracts'
    | 'material_contracts'
    | 'business_plan'
    | 'investment_deck'
    | 'accounts'
    | 'press_releases'
    | 'other';

export default function CreateIssuerPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<IssuerFormData>({
        // Company Information
        issuer_name: '',
        incorporation_date: '',
        provisional_ticker: '',
        company_registration_number: null,
        registered_address: '',
        phone_number: '',
        country: '',
        business_website: '',
        legal_structure: '',
        legislation_formed_under: '',
        business_email: '',
        main_contact: '',

        // Management Details
        chief_executiveofficer: '',
        ceo_shares_in_the_co: null,
        ceo_title: '',
        ceo_dob: '',
        ceo_nationality: '',
        ceo_other_directorships: '',

        financial_director: '',
        fd_title: '',
        fd_dob: '',
        fd_nationality: '',
        fd_shares_in_the_co: null,
        fd_other_directorships: '',

        how_many_directors_total: null,

        // Additional Directors
        director_3: '',
        d3_title: '',
        d3_dob: '',
        d3_nationality: '',
        d3_shares_in_the_co: null,
        d3_other_directorships: '',

        director_4: '',
        d4_title: '',
        d4_dob: '',
        d4_nationality: '',
        d4_shares_in_the_co_copy: null,
        d4_other_directorships: '',

        director_5: '',
        d5_title: '',
        d5_dob: '',
        d5_nationality: '',
        d5_shares_in_the_co: null,
        d5_other_directorships: '',

        // Make sure all fields have initial values
        does_the_company_have_regulators: false,
        number_of_regulators: null,
        regulator_1: '',
        regulator_2: '',
        regulator_3: '',
        regulator_4: '',
    });

    const router = useRouter();
    const supabase = getSupabaseClient();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push('/sign-in');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError(null);

            // Handle document uploads first
            const documentUploads = Object.entries(stagedFiles).flatMap(([category, files]) =>
                files.map(async file => {
                    const filePath = `${formData.issuer_name}/${category}/${file.name}`;
                    
                    const { data: storageData, error: storageError } = await supabase.storage
                        .from('issuer_documents')
                        .upload(filePath, file);
                    
                    if (storageError) throw storageError;
                    
                    const { data: docData, error: docError } = await supabase
                        .from('issuer_documents')
                        .insert({
                            category,
                            file_path: filePath,
                            file_name: file.name,
                            file_type: file.type,
                            file_size: file.size,
                            created_by: user?.id
                        })
                        .select()
                        .single();
                    
                    if (docError) throw docError;
                    return docData.id;
                })
            );

            const documentIds = await Promise.all(documentUploads);

            // Create issuer record
            const { data: issuer, error: issuerError } = await supabase
                .from('issuers')
                .insert({
                    // Basic Information
                    issuer_name: formData.issuer_name,
                    incorporation_date: formData.incorporation_date,
                    provisional_ticker: formData.provisional_ticker,
                    company_registration_number: formData.company_registration_number,
                    registered_address: formData.registered_address,
                    phone_number: formData.phone_number,
                    country: formData.country,
                    business_website: formData.business_website,
                    legal_structure: formData.legal_structure,
                    legislation_formed_under: formData.legislation_formed_under,
                    business_email: formData.business_email,
                    main_contact: formData.main_contact,

                    // Management Details
                    chief_executiveofficer: formData.chief_executiveofficer,
                    ceo_shares_in_the_co: formData.ceo_shares_in_the_co,
                    ceo_title: formData.ceo_title,
                    ceo_dob: formData.ceo_dob,
                    ceo_nationality: formData.ceo_nationality,
                    ceo_other_directorships: formData.ceo_other_directorships,
                    
                    financial_director: formData.financial_director,
                    fd_title: formData.fd_title,
                    fd_dob: formData.fd_dob,
                    fd_nationality: formData.fd_nationality,
                    fd_shares_in_the_co: formData.fd_shares_in_the_co,
                    fd_other_directorships: formData.fd_other_directorships,
                    
                    how_many_directors_total: formData.how_many_directors_total,
                    
                    director_3: formData.director_3,
                    d3_title: formData.d3_title,
                    d3_dob: formData.d3_dob,
                    d3_nationality: formData.d3_nationality,
                    d3_shares_in_the_co: formData.d3_shares_in_the_co,
                    d3_other_directorships: formData.d3_other_directorships,
                    
                    director_4: formData.director_4,
                    d4_title: formData.d4_title,
                    d4_dob: formData.d4_dob,
                    d4_nationality: formData.d4_nationality,
                    d4_shares_in_the_co_copy: formData.d4_shares_in_the_co_copy,
                    d4_other_directorships: formData.d4_other_directorships,
                    
                    director_5: formData.director_5,
                    d5_title: formData.d5_title,
                    d5_dob: formData.d5_dob,
                    d5_nationality: formData.d5_nationality,
                    d5_shares_in_the_co: formData.d5_shares_in_the_co,
                    d5_other_directorships: formData.d5_other_directorships,

                    // Share Structure
                    ultimate_beneficial_holder: formData.ultimate_beneficial_holder,
                    ubo_shares: formData.ubo_shares,
                    ubo_shareholding: formData.ubo_shareholding,
                    nominal_share_price: formData.nominal_share_price,
                    authorised_share_capital: formData.authorised_share_capital,
                    shares_in_issue: formData.shares_in_issue,
                    preemption_rights: formData.preemption_rights,
                    dividend_policy: formData.dividend_policy,
                    dividend_date_1: formData.dividend_date_1,
                    
                    // Share Classes
                    a_class_shares_nominal_val: formData.a_class_shares_nominal_val,
                    a_class_shares_in_issue: formData.a_class_shares_in_issue,
                    b_class_shares_nominal_val: formData.b_class_shares_nominal_val,
                    b_class_shares_in_issue: formData.b_class_shares_in_issue,
                    c_class_shares_nominal_val: formData.c_class_shares_nominal_val,
                    c_class_shares_in_issue: formData.c_class_shares_in_issue,
                    d_class_shares_nominal_val: formData.d_class_shares_nominal_val,
                    d_class_shares_in_issue: formData.d_class_shares_in_issue,

                    // Legal & Advisors
                    company_secretary: formData.company_secretary,
                    co_sec_address: formData.co_sec_address,
                    legal_advisors_name: formData.legal_advisors_name,
                    legal_advisors_address: formData.legal_advisors_address,
                    auditors_name: formData.auditors_name,
                    auditors_address: formData.auditors_address,
                    trustee_name: formData.trustee_name,
                    trustee_address: formData.trustee_address,
                    accountant_name: formData.accountant_name,
                    accountants_address: formData.accountants_address,
                    administrators_name: formData.administrators_name,
                    administrators_address: formData.administrators_address,
                    exchange_sponsor: formData.exchange_sponsor,

                    // Business Overview
                    business_overview: formData.business_overview,
                    company_prospects: formData.company_prospects,
                    material_contracts: formData.material_contracts,
                    purpose_of_listing: formData.purpose_of_listing,
                    plans_after_listing: formData.plans_after_listing,
                    use_of_proceeds: formData.use_of_proceeds,
                    details_of_investments: formData.details_of_investments,
                    details_of_litigation: formData.details_of_litigation,
                    recent_performance: formData.recent_performance,
                    related_party_transactions: formData.related_party_transactions,
                    details_of_rpt: formData.details_of_rpt,

                    // Documents
                    accounts: formData.accounts,
                    directors_contracts: formData.directors_contracts,
                    directors_cvs: formData.directors_cvs,
                    memorandum_articles: formData.memorandum_articles,
                    business_plans: formData.business_plans,
                    news_articles: formData.news_articles,
                    summary_of_articles: formData.summary_of_articles,
                    listing_docs: formData.listing_docs,

                    // Regulatory
                    does_the_company_have_regulators: formData.does_the_company_have_regulators,
                    regulator_1: formData.regulator_1,
                    regulator_2: formData.regulator_2,
                    regulator_3: formData.regulator_3,
                    regulator_4: formData.regulator_4,

                    // JSON fields
                    sponsor_advisors: formData.sponsor_advisors,
                    ticker_symbol: formData.ticker_symbol,
                    listing_fees: formData.listing_fees,
                    shares_class: formData.shares_class,

                    // Metadata
                    created_by: user?.id,
                    status: 'pending',
                    logo_url: formData.logo_url,
                })
                .select()
                .single();

            if (issuerError) throw issuerError;

            // Redirect to approval pending page
            router.push('/registration-pending');

        } catch (error) {
            console.error('Error submitting issuer:', error);
            setError('Failed to submit application. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderCompanyInformation = () => {
        return (
            <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
                <div className="space-y-8">
                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Company Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.issuer_name}
                                onChange={(e) => setFormData({ ...formData, issuer_name: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter company name"
                            />
                        </div>

                        {/* Company Registration Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Company Registration Number
                            </label>
                            <input
                                type="number"
                                value={formData.company_registration_number || ''}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    company_registration_number: e.target.value ? Number(e.target.value) : null 
                                })}
                                className={inputClasses}
                            />
                        </div>

                        {/* Legal Structure - Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Legal Structure
                            </label>
                            <select
                                required
                                value={formData.legal_structure}
                                onChange={(e) => setFormData({ ...formData, legal_structure: e.target.value })}
                                className={selectClasses}
                            >
                                <option value="">Select Legal Structure</option>
                                {LEGAL_STRUCTURES.map((structure) => (
                                    <option key={structure} value={structure}>
                                        {structure}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Incorporation Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Incorporation Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.incorporation_date}
                                onChange={(e) => setFormData({ ...formData, incorporation_date: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        {/* Country - Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Country
                            </label>
                            <select
                                required
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className={selectClasses}
                            >
                                <option value="">Select Country</option>
                                {COUNTRIES.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Main Contact */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Main Contact
                            </label>
                            <input
                                type="text"
                                value={formData.main_contact || ''}
                                onChange={(e) => setFormData({ ...formData, main_contact: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter main contact name"
                            />
                        </div>
                    </div>

                    {/* Contact Information Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Business Email
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.business_email}
                                onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter business email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                required
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>

                    {/* Address Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Registered Address
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={formData.registered_address}
                            onChange={(e) => setFormData({ ...formData, registered_address: e.target.value })}
                            className={textareaClasses}
                            placeholder="Enter registered address"
                        />
                    </div>

                    {/* Already Listed Checkbox */}
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_already_listed"
                                checked={formData.is_already_listed || false}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    is_already_listed: e.target.checked,
                                    // Clear the exchange/ticker field if unchecked
                                    which_exchange_is_you_company_listed_on_and_what_is_the_ticker: e.target.checked ? 
                                        formData.which_exchange_is_you_company_listed_on_and_what_is_the_ticker : null
                                })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_already_listed" className="ml-2 block text-sm font-medium text-gray-700">
                                Already Listed?
                            </label>
                        </div>

                        {/* Conditional Exchange and Ticker Field */}
                        {formData.is_already_listed && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Which Exchange and what is your ticker?
                                </label>
                                <input
                                    type="text"
                                    value={formData.which_exchange_is_you_company_listed_on_and_what_is_the_ticker || ''}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        which_exchange_is_you_company_listed_on_and_what_is_the_ticker: e.target.value 
                                    })}
                                    className={inputClasses}
                                    placeholder="e.g., NYSE: AAPL"
                                />
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Next: Management Details
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderManagementDetails = () => {
        return (
            <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
                <div className="space-y-8">
                    {/* CEO Section */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Chief Executive Officer</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    CEO Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.chief_executiveofficer}
                                    onChange={(e) => setFormData({ ...formData, chief_executiveofficer: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter CEO name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.ceo_title}
                                    onChange={(e) => setFormData({ ...formData, ceo_title: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter CEO title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={formData.ceo_dob}
                                    onChange={(e) => setFormData({ ...formData, ceo_dob: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Nationality
                                </label>
                                <input
                                    type="text"
                                    value={formData.ceo_nationality}
                                    onChange={(e) => setFormData({ ...formData, ceo_nationality: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter CEO nationality"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Shares in Company
                                </label>
                                <input
                                    type="number"
                                    value={formData.ceo_shares_in_the_co || ''}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        ceo_shares_in_the_co: e.target.value ? Number(e.target.value) : null 
                                    })}
                                    className={inputClasses}
                                    placeholder="Enter number of shares"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Other Directorships
                                </label>
                                <textarea
                                    value={formData.ceo_other_directorships}
                                    onChange={(e) => setFormData({ ...formData, ceo_other_directorships: e.target.value })}
                                    className={textareaClasses}
                                    placeholder="List other directorships"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Director Section */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Financial Director</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Financial Director Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.financial_director}
                                    onChange={(e) => setFormData({ ...formData, financial_director: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter Financial Director name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.fd_title}
                                    onChange={(e) => setFormData({ ...formData, fd_title: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter Financial Director title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={formData.fd_dob}
                                    onChange={(e) => setFormData({ ...formData, fd_dob: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Nationality
                                </label>
                                <input
                                    type="text"
                                    value={formData.fd_nationality}
                                    onChange={(e) => setFormData({ ...formData, fd_nationality: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter Financial Director nationality"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Shares in Company
                                </label>
                                <input
                                    type="number"
                                    value={formData.fd_shares_in_the_co || ''}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        fd_shares_in_the_co: e.target.value ? Number(e.target.value) : null 
                                    })}
                                    className={inputClasses}
                                    placeholder="Enter number of shares"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Other Directorships
                                </label>
                                <textarea
                                    value={formData.fd_other_directorships}
                                    onChange={(e) => setFormData({ ...formData, fd_other_directorships: e.target.value })}
                                    className={textareaClasses}
                                    placeholder="List other directorships"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Number of Additional Directors Selection */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Additional Directors</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700">
                                How many additional directors?
                            </label>
                            <select
                                value={formData.how_many_directors_total || ''}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    how_many_directors_total: e.target.value ? Number(e.target.value) : null 
                                })}
                                className={selectClasses}
                            >
                                <option value="">Select number of directors</option>
                                <option value="1">1 Additional Director</option>
                                <option value="2">2 Additional Directors</option>
                                <option value="3">3 Additional Directors</option>
                            </select>
                        </div>

                        {/* Conditional rendering of director fields based on selection */}
                        {formData.how_many_directors_total && formData.how_many_directors_total >= 1 && (
                            <div className="mb-8">
                                <h4 className="text-md font-medium mb-4">Additional Director 1</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Director Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.director_3}
                                            onChange={(e) => setFormData({ ...formData, director_3: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter director name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.d3_title}
                                            onChange={(e) => setFormData({ ...formData, d3_title: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter director title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.d3_dob}
                                            onChange={(e) => setFormData({ ...formData, d3_dob: e.target.value })}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nationality
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.d3_nationality}
                                            onChange={(e) => setFormData({ ...formData, d3_nationality: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter nationality"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Shares in Company
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.d3_shares_in_the_co || ''}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                d3_shares_in_the_co: e.target.value ? Number(e.target.value) : null 
                                            })}
                                            className={inputClasses}
                                            placeholder="Enter number of shares"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Other Directorships
                                        </label>
                                        <textarea
                                            value={formData.d3_other_directorships}
                                            onChange={(e) => setFormData({ ...formData, d3_other_directorships: e.target.value })}
                                            className={textareaClasses}
                                            placeholder="List other directorships"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.how_many_directors_total && formData.how_many_directors_total >= 2 && (
                            <div className="mb-8">
                                <h4 className="text-md font-medium mb-4">Additional Director 2</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Director Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.director_4}
                                            onChange={(e) => setFormData({ ...formData, director_4: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter director name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.d4_title}
                                            onChange={(e) => setFormData({ ...formData, d4_title: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter director title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.d4_dob}
                                            onChange={(e) => setFormData({ ...formData, d4_dob: e.target.value })}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nationality
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.d4_nationality}
                                            onChange={(e) => setFormData({ ...formData, d4_nationality: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter nationality"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Shares in Company
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.d4_shares_in_the_co_copy || ''}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                d4_shares_in_the_co_copy: e.target.value ? Number(e.target.value) : null 
                                            })}
                                            className={inputClasses}
                                            placeholder="Enter number of shares"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Other Directorships
                                        </label>
                                        <textarea
                                            value={formData.d4_other_directorships}
                                            onChange={(e) => setFormData({ ...formData, d4_other_directorships: e.target.value })}
                                            className={textareaClasses}
                                            placeholder="List other directorships"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.how_many_directors_total && formData.how_many_directors_total >= 3 && (
                            <div className="mb-8">
                                <h4 className="text-md font-medium mb-4">Additional Director 3</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Director Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.director_5}
                                            onChange={(e) => setFormData({ ...formData, director_5: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter director name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.d5_title}
                                            onChange={(e) => setFormData({ ...formData, d5_title: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter director title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.d5_dob}
                                            onChange={(e) => setFormData({ ...formData, d5_dob: e.target.value })}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nationality
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.d5_nationality}
                                            onChange={(e) => setFormData({ ...formData, d5_nationality: e.target.value })}
                                            className={inputClasses}
                                            placeholder="Enter nationality"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Shares in Company
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.d5_shares_in_the_co || ''}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                d5_shares_in_the_co: e.target.value ? Number(e.target.value) : null 
                                            })}
                                            className={inputClasses}
                                            placeholder="Enter number of shares"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Other Directorships
                                        </label>
                                        <textarea
                                            value={formData.d5_other_directorships}
                                            onChange={(e) => setFormData({ ...formData, d5_other_directorships: e.target.value })}
                                            className={textareaClasses}
                                            placeholder="List other directorships"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Previous: Company Information
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Next: Capital Structure
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCapitalStructure = () => {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="space-y-8">
                    {/* Basic Share Information */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Basic Share Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Authorised Share Capital
                                </label>
                                <input
                                    type="text"
                                    value={formData.authorised_share_capital ? formData.authorised_share_capital.toLocaleString() : ''}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ 
                                            ...formData, 
                                            authorised_share_capital: value ? Number(value) : null 
                                        });
                                    }}
                                    className={inputClasses}
                                    placeholder="Enter authorised share capital"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Shares in Issue
                                </label>
                                <input
                                    type="text"
                                    value={formData.shares_in_issue ? formData.shares_in_issue.toLocaleString() : ''}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ 
                                            ...formData, 
                                            shares_in_issue: value ? Number(value) : null 
                                        });
                                    }}
                                    className={inputClasses}
                                    placeholder="Enter number of shares in issue"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Share Classes */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Share Classes</h3>
                        <div className="space-y-6">
                            {/* Class A Shares */}
                            <div>
                                <h4 className="font-medium">Class A Shares</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nominal Value
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.a_class_shares_nominal_val || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                    setFormData({
                                                        ...formData,
                                                        a_class_shares_nominal_val: value === '' ? null : value
                                                    });
                                                }
                                            }}
                                            className={inputClasses}
                                            placeholder="0.0001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Shares in Issue
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.a_class_shares_in_issue || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                a_class_shares_in_issue: e.target.value ? Number(e.target.value) : null
                                            })}
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Share Classes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Additional Share Classes
                                </label>
                                <select
                                    value={formData.additional_share_classes || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        additional_share_classes: e.target.value
                                    })}
                                    className={selectClasses}
                                >
                                    <option value="">No additional classes</option>
                                    <option value="B">Class B</option>
                                    <option value="C">Class C</option>
                                    <option value="D">Class D</option>
                                </select>
                            </div>

                            {/* Conditional rendering for Class B */}
                            {formData.additional_share_classes === 'B' && (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-600">Class B Shares</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Nominal Value
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.b_class_shares_nominal_val || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                        setFormData({
                                                            ...formData,
                                                            b_class_shares_nominal_val: value === '' ? null : value
                                                        });
                                                    }
                                                }}
                                                className={inputClasses}
                                                placeholder="0.0001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Shares in Issue
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.b_class_shares_in_issue || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    b_class_shares_in_issue: e.target.value ? parseInt(e.target.value) : null
                                                })}
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Conditional rendering for Class C */}
                            {formData.additional_share_classes === 'C' && (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-600">Class C Shares</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Nominal Value
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.c_class_shares_nominal_val || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                        setFormData({
                                                            ...formData,
                                                            c_class_shares_nominal_val: value === '' ? null : value
                                                        });
                                                    }
                                                }}
                                                className={inputClasses}
                                                placeholder="0.0001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Shares in Issue
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.c_class_shares_in_issue || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    c_class_shares_in_issue: e.target.value ? parseInt(e.target.value) : null
                                                })}
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Conditional rendering for Class D */}
                            {formData.additional_share_classes === 'D' && (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-600">Class D Shares</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Nominal Value
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.d_class_shares_nominal_val || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                        setFormData({
                                                            ...formData,
                                                            d_class_shares_nominal_val: value === '' ? null : value
                                                        });
                                                    }
                                                }}
                                                className={inputClasses}
                                                placeholder="0.0001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Shares in Issue
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.d_class_shares_in_issue || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    d_class_shares_in_issue: e.target.value ? parseInt(e.target.value) : null
                                                })}
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warrants and Options */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Warrants and Options
                        </label>
                        <textarea
                            value={formData.warrants_options || ''}
                            onChange={(e) => setFormData({ ...formData, warrants_options: e.target.value })}
                            className={textareaClasses}
                            placeholder="Please describe any outstanding warrant or option agreements"
                        />
                    </div>

                    {/* Preemption Rights */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Preemption Rights
                        </label>
                        <textarea
                            value={formData.preemption_rights || ''}
                            onChange={(e) => setFormData({ ...formData, preemption_rights: e.target.value })}
                            className={textareaClasses}
                            placeholder="Enter custom preemption rights details or just enter 'Standard'"
                        />
                    </div>

                    {/* Dividend Policy */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Dividend Policy
                        </label>
                        <textarea
                            value={formData.dividend_policy || ''}
                            onChange={(e) => setFormData({ ...formData, dividend_policy: e.target.value })}
                            className={textareaClasses}
                            placeholder="Enter custom dividend policy details or just enter 'Standard'"
                        />
                    </div>

                    {/* Dividend Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Dividend Date (If Appropriate)
                        </label>
                        <input
                            type="date"
                            value={formData.dividend_date_1 || ''}
                            onChange={(e) => setFormData({ ...formData, dividend_date_1: e.target.value })}
                            className={inputClasses}
                        />
                    </div>
                </div>
                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Previous: Management Details
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentStep(6)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Next: Legal & Advisors
                    </button>
                </div>
            </div>
        );
    };

    const renderLegalAndAdvisors = () => {
        const showTrusteeAdmin = ['Trust', 'Protected Cell Company (PCC)', 'Fund'].includes(formData.legal_structure);

        return (
            <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* First row of three columns */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Legal Advisors</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={formData.legal_advisors_name || ''}
                                onChange={(e) => setFormData({ ...formData, legal_advisors_name: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter legal advisor name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                value={formData.legal_advisors_address || ''}
                                onChange={(e) => setFormData({ ...formData, legal_advisors_address: e.target.value })}
                                rows={2}
                                className={textareaClasses}
                                placeholder="Enter address"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Auditors</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={formData.auditors_name || ''}
                                onChange={(e) => setFormData({ ...formData, auditors_name: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter auditor name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                value={formData.auditors_address || ''}
                                onChange={(e) => setFormData({ ...formData, auditors_address: e.target.value })}
                                rows={2}
                                className={textareaClasses}
                                placeholder="Enter address"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Company Secretary</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={formData.company_secretary || ''}
                                onChange={(e) => setFormData({ ...formData, company_secretary: e.target.value })}
                                className={inputClasses}
                                placeholder="Enter company secretary name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                value={formData.co_sec_address || ''}
                                onChange={(e) => setFormData({ ...formData, co_sec_address: e.target.value })}
                                rows={2}
                                className={textareaClasses}
                                placeholder="Enter address"
                            />
                        </div>
                    </div>
                </div>

                {/* Second row for Accountants */}
                <div className="mt-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Accountants</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.accountant_name || ''}
                                    onChange={(e) => setFormData({ ...formData, accountant_name: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter accountant name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    value={formData.accountants_address || ''}
                                    onChange={(e) => setFormData({ ...formData, accountants_address: e.target.value })}
                                    rows={2}
                                    className={textareaClasses}
                                    placeholder="Enter address"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trustee & Administrator section remains the same */}
                {showTrusteeAdmin && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Trustee</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.trustee_name || ''}
                                    onChange={(e) => setFormData({ ...formData, trustee_name: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter trustee name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    value={formData.trustee_address || ''}
                                    onChange={(e) => setFormData({ ...formData, trustee_address: e.target.value })}
                                    rows={2}
                                    className={textareaClasses}
                                    placeholder="Enter address"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Administrator</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.administrators_name || ''}
                                    onChange={(e) => setFormData({ ...formData, administrators_name: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Enter administrator name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    value={formData.administrators_address || ''}
                                    onChange={(e) => setFormData({ ...formData, administrators_address: e.target.value })}
                                    rows={2}
                                    className={textareaClasses}
                                    placeholder="Enter address"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Previous: Capital Structure
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentStep(5)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Next: Legal & Advisors
                    </button>
                </div>
            </div>
        );
    };

    const renderBusinessOverview = () => {
        return (
            <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1 */}
                    <div className="space-y-6">
                        {/* Business Overview */}
                        <div>
                            <h3 className="text-lg font-medium mb-4">Business Overview</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Business Overview and Operations
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.business_overview || ''}
                                    onChange={(e) => setFormData({ ...formData, business_overview: e.target.value })}
                                    className={textareaClasses}
                                    placeholder="Provide a comprehensive overview of your business operations"
                                />
                            </div>
                        </div>

                        {/* Company Prospects */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Company Prospects
                            </label>
                            <textarea
                                rows={4}
                                value={formData.company_prospects || ''}
                                onChange={(e) => setFormData({ ...formData, company_prospects: e.target.value })}
                                className={textareaClasses}
                                placeholder="Describe the company's future prospects and growth potential"
                            />
                        </div>

                        {/* Investments Checkbox and Details */}
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="has_investments"
                                    checked={formData.has_investments || false}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        has_investments: e.target.checked,
                                        details_of_investments: e.target.checked ? formData.details_of_investments : null 
                                    })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="has_investments" className="ml-2 block text-sm font-medium text-gray-700">
                                    Any Current/Pending Investments?
                                </label>
                            </div>
                            {formData.has_investments && (
                                <div>
                                    <textarea
                                        rows={3}
                                        value={formData.details_of_investments || ''}
                                        onChange={(e) => setFormData({ ...formData, details_of_investments: e.target.value })}
                                        className={textareaClasses}
                                        placeholder="Provide details of current or pending investments"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-6">
                        {/* Listing Information */}
                        <div>
                            <h3 className="text-lg font-medium mb-4">Listing Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Purpose of Listing
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.purpose_of_listing || ''}
                                        onChange={(e) => setFormData({ ...formData, purpose_of_listing: e.target.value })}
                                        className={textareaClasses}
                                        placeholder="Explain the main reasons for seeking a listing"
                                    />
                                </div>

                                {/* Raising Funds Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_raising_funds"
                                            checked={formData.is_raising_funds || false}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                is_raising_funds: e.target.checked,
                                                use_of_proceeds: e.target.checked ? formData.use_of_proceeds : null 
                                            })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_raising_funds" className="ml-2 block text-sm font-medium text-gray-700">
                                            Looking to raise funds on the exchange?
                                        </label>
                                    </div>
                                    {formData.is_raising_funds && (
                                        <textarea
                                            rows={3}
                                            value={formData.use_of_proceeds || ''}
                                            onChange={(e) => setFormData({ ...formData, use_of_proceeds: e.target.value })}
                                            className={textareaClasses}
                                            placeholder="Detail how the listing proceeds will be used"
                                        />
                                    )}
                                </div>

                                {/* Litigation Checkbox and Details */}
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="has_litigation"
                                            checked={formData.has_litigation || false}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                has_litigation: e.target.checked,
                                                details_of_litigation: e.target.checked ? formData.details_of_litigation : null 
                                            })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="has_litigation" className="ml-2 block text-sm font-medium text-gray-700">
                                            Any Current Litigation?
                                        </label>
                                    </div>
                                    {formData.has_litigation && (
                                        <textarea
                                            rows={3}
                                            value={formData.details_of_litigation || ''}
                                            onChange={(e) => setFormData({ ...formData, details_of_litigation: e.target.value })}
                                            className={textareaClasses}
                                            placeholder="Provide details of any current litigation"
                                        />
                                    )}
                                </div>

                                {/* Related Party Transactions Checkbox and Details */}
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="has_rpt"
                                            checked={formData.has_related_party_transactions || false}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                has_related_party_transactions: e.target.checked,
                                                details_of_rpt: e.target.checked ? formData.details_of_rpt : null 
                                            })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="has_rpt" className="ml-2 block text-sm font-medium text-gray-700">
                                            Any Related Party Transactions?
                                        </label>
                                    </div>
                                    {formData.has_related_party_transactions && (
                                        <textarea
                                            rows={3}
                                            value={formData.details_of_rpt || ''}
                                            onChange={(e) => setFormData({ ...formData, details_of_rpt: e.target.value })}
                                            className={textareaClasses}
                                            placeholder="Provide details of related party transactions"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Previous: Legal & Advisors
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentStep(6)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Next: Regulatory Information
                    </button>
                </div>
            </div>
        );
    };

    const renderRegulatoryInformation = () => {
        return (
            <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
                <div className="space-y-8">
                    {/* Regulatory Information */}
                    <div>
                        <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-gray-900">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Regulatory Information
                        </h3>
                        <div className="space-y-6">
                            {/* Are you subject to regulation? */}
                            <div>
                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        id="does_the_company_have_regulators"
                                        checked={formData.does_the_company_have_regulators || false}
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            does_the_company_have_regulators: e.target.checked,
                                            // Clear regulator fields if unchecked
                                            regulator_1: null,
                                            regulator_2: null,
                                            regulator_3: null,
                                            regulator_4: null
                                        })}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="does_the_company_have_regulators" className="ml-2 block text-sm font-medium text-gray-700">
                                        Are you subject to regulation?
                                    </label>
                                </div>

                                {/* Number of Regulators Selection */}
                                {formData.does_the_company_have_regulators && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                How many regulators do you interact with?
                                            </label>
                                            <select
                                                value={formData.number_of_regulators || ''}
                                                onChange={(e) => setFormData({ 
                                                    ...formData, 
                                                    number_of_regulators: e.target.value ? Number(e.target.value) : null 
                                                })}
                                                className={selectClasses}
                                            >
                                                <option value="">Select number of regulators</option>
                                                <option value="1">1 Regulator</option>
                                                <option value="2">2 Regulators</option>
                                                <option value="3">3 Regulators</option>
                                                <option value="4">4 Regulators</option>
                                            </select>
                                        </div>

                                        {/* Regulator Input Fields */}
                                        {formData.number_of_regulators && Array.from({ length: formData.number_of_regulators }).map((_, index) => (
                                            <div key={index}>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Regulator {index + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData[`regulator_${index + 1}`] || ''}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        [`regulator_${index + 1}`]: e.target.value 
                                                    })}
                                                    className={inputClasses}
                                                    placeholder={`Enter regulator ${index + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentStep(7)}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Next: Documents & Compliance
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDocumentsAndCompliance = () => {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="space-y-8">
                    {/* Corporate Documents */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Corporate Documents</h3>
                        <p className="text-sm text-gray-500 mb-4">Essential corporate documentation required for listing</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Memorandum & Articles</h4>
                                <p className="text-sm text-gray-500 mb-4">Certificate of incorporation and current memorandum and articles of association</p>
                                <DocumentUpload 
                                    category="memorandum_articles"
                                    label="Memorandum & Articles"
                                    description="Upload your memorandum and articles of association"
                                    multiple={true}
                                />
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Latest Accounts</h4>
                                <p className="text-sm text-gray-500 mb-4">Most recent annual accounts and interim statements if applicable</p>
                                <DocumentUpload 
                                    category="accounts"
                                    label="Accounts"
                                    description="Upload your latest company accounts"
                                    multiple={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Management Documents */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Management Documents</h3>
                        <p className="text-sm text-gray-500 mb-4">Documentation related to company directors and management</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Director CVs</h4>
                                <p className="text-sm text-gray-500 mb-4">Professional CVs for all current directors and senior management</p>
                                <DocumentUpload 
                                    category="director_cvs"
                                    label="Director CVs"
                                    description="Upload CVs for all directors"
                                />
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Director Contracts</h4>
                                <p className="text-sm text-gray-500 mb-4">Service agreements and contracts for all directors</p>
                                <DocumentUpload 
                                    category="director_contracts"
                                    label="Director Contracts"
                                    description="Upload contracts for all directors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Business Documents */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Business Documents</h3>
                        <p className="text-sm text-gray-500 mb-4">Key business and strategic documentation</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Business Plan</h4>
                                <p className="text-sm text-gray-500 mb-4">Detailed business plan including strategy and financial projections</p>
                                <DocumentUpload 
                                    category="business_plan"
                                    label="Business Plan"
                                    description="Upload your current business plan"
                                    disableTextInput
                                />
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Investment Presentation</h4>
                                <p className="text-sm text-gray-500 mb-4">Company presentation for potential investors</p>
                                <DocumentUpload 
                                    category="investment_deck"
                                    label="Investment Deck"
                                    description="Upload your investment presentation"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Documents */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Additional Documents</h3>
                        <p className="text-sm text-gray-500 mb-4">Supporting documentation and contracts</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Material Contracts</h4>
                                <p className="text-sm text-gray-500 mb-4">All significant contracts and agreements</p>
                                <DocumentUpload 
                                    category="material_contracts"
                                    label="Material Contracts"
                                    description="Upload any material contracts"
                                />
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-medium mb-2">Press Releases</h4>
                                <p className="text-sm text-gray-500 mb-4">Recent press releases and news articles</p>
                                <DocumentUpload 
                                    category="press_releases"
                                    label="Press Releases"
                                    description="Upload any relevant press releases"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(6)}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Previous: Regulatory Information
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Submit Application
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderProgress = () => (
        <div className="mb-8">
            <div className="flex justify-between relative">
                {/* Progress line */}
                <div className="w-full absolute top-1/2 h-0.5 bg-gray-200" />
                
                {/* Step circles */}
                <div className="relative flex justify-between w-full">
                    {FORM_STEPS.map((step, index) => (
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
            
            {/* Step labels */}
            <div className="flex justify-between mt-2">
                {FORM_STEPS.map((step, index) => (
                    <div 
                        key={step} 
                        className={`text-xs ${
                            currentStep === index + 1 ? 'text-blue-600 font-medium' : 'text-gray-500'
                        }`}
                        style={{ width: '14%', textAlign: 'center' }}
                    >
                        {step}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="absolute inset-0 bg-gray-100 overflow-auto">
            <div className="bg-white p-4 w-full shadow-sm">
                <div className="max-w-[1400px] mx-auto w-full px-4">
                    <header className="bg-white shadow">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Create New Issuer
                            </h1>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Logout
                            </button>
                        </div>
                    </header>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto w-full p-4">
                {renderProgress()}
                
                <form onSubmit={(e) => e.preventDefault()}>
                    {currentStep === 1 && renderCompanyInformation()}
                    {currentStep === 2 && renderManagementDetails()}
                    {currentStep === 3 && renderCapitalStructure()}
                    {currentStep === 4 && renderLegalAndAdvisors()}
                    {currentStep === 5 && renderBusinessOverview()}
                    {currentStep === 6 && renderRegulatoryInformation()}
                    {currentStep === 7 && renderDocumentsAndCompliance()}
                </form>
            </div>
        </div>
    );
} 
