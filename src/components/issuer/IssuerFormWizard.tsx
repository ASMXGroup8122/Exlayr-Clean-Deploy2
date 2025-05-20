'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { LogoUpload } from '@/components/LogoUpload';

const FORM_STEPS = [
    'Company Information',
    'Management Details',
    'Capital Structure',
    'Legal & Advisors',
    'Business Overview',
    'Regulatory Information',
    'Documents & Compliance'
];

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
    'Andorra', 'Australia', 'Austria', 'Bahamas', 'Bahrain', 'Belgium', 'Bermuda', 'British Virgin Islands', 'Brunei',
    'Canada', 'Cayman Islands', 'China', 'Cyprus', 'Denmark', 'Dubai', 'Finland', 'France', 'Germany', 'Gibraltar',
    'Greece', 'Guernsey', 'Hong Kong', 'Iceland', 'India', 'Ireland', 'Isle of Man', 'Israel', 'Italy', 'Japan',
    'Jersey', 'Kuwait', 'Lebanon', 'Liechtenstein', 'Luxembourg', 'Macau', 'Malaysia', 'Malta', 'Mauritius',
    'Monaco', 'Netherlands', 'New Zealand', 'Norway', 'Oman', 'Portugal', 'Qatar', 'Saudi Arabia', 'Seychelles',
    'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan', 'United Arab Emirates',
    'United Kingdom', 'Other'
] as const;

const inputClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";
const textareaClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";
const selectClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";

interface IssuerFormData {
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
    is_already_listed?: boolean;
    which_exchange_is_you_company_listed_on_and_what_is_the_ticker: string | null;
    chief_executiveofficer: string;
    ceo_title: string;
    ceo_dob: string;
    ceo_nationality: string;
    ceo_shares_in_the_co: number | null;
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
    authorised_share_capital: number | null;
    shares_in_issue: number | null;
    a_class_shares_nominal_val: string | null;
    a_class_shares_in_issue: number | null;
    b_class_shares_nominal_val: string | null;
    b_class_shares_in_issue: number | null;
    c_class_shares_nominal_val: string | null;
    c_class_shares_in_issue: number | null;
    d_class_shares_nominal_val: string | null;
    d_class_shares_in_issue: number | null;
    additional_share_classes: string | null;
    warrants_options: string | null;
    legal_advisors_name: string | null;
    legal_advisors_address: string | null;
    auditors_name: string | null;
    auditors_address: string | null;
    company_secretary: string | null;
    co_sec_address: string | null;
    accountant_name: string | null;
    accountants_address: string | null;
    trustee_name: string | null;
    trustee_address: string | null;
    administrators_name: string | null;
    administrators_address: string | null;
    business_overview: string | null;
    company_prospects: string | null;
    has_investments?: boolean;
    details_of_investments: string | null;
    purpose_of_listing: string | null;
    is_raising_funds?: boolean;
    use_of_proceeds: string | null;
    has_litigation?: boolean;
    details_of_litigation: string | null;
    has_related_party_transactions?: boolean;
    details_of_rpt: string | null;
}

interface IssuerFormWizardProps {
  sponsorOrgId?: string;
  onSuccess?: () => void;
}

const IssuerFormWizard: React.FC<IssuerFormWizardProps> = ({ sponsorOrgId, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<IssuerFormData>({
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
    is_already_listed: false,
    which_exchange_is_you_company_listed_on_and_what_is_the_ticker: '',
    chief_executiveofficer: '',
    ceo_title: '',
    ceo_dob: '',
    ceo_nationality: '',
    ceo_shares_in_the_co: null,
    ceo_other_directorships: '',
    financial_director: '',
    fd_title: '',
    fd_dob: '',
    fd_nationality: '',
    fd_shares_in_the_co: null,
    fd_other_directorships: '',
    how_many_directors_total: null,
    director_3: '',
    d3_title: '',
    d3_dob: '',
    d3_nationality: '',
    d3_shares_in_the_co: null,
    d3_other_directorships: '',
    authorised_share_capital: null,
    shares_in_issue: null,
    a_class_shares_nominal_val: '',
    a_class_shares_in_issue: null,
    b_class_shares_nominal_val: '',
    b_class_shares_in_issue: null,
    c_class_shares_nominal_val: '',
    c_class_shares_in_issue: null,
    d_class_shares_nominal_val: '',
    d_class_shares_in_issue: null,
    additional_share_classes: '',
    warrants_options: '',
    legal_advisors_name: '',
    legal_advisors_address: '',
    auditors_name: '',
    auditors_address: '',
    company_secretary: '',
    co_sec_address: '',
    accountant_name: '',
    accountants_address: '',
    trustee_name: '',
    trustee_address: '',
    administrators_name: '',
    administrators_address: '',
    business_overview: '',
    company_prospects: '',
    has_investments: false,
    details_of_investments: '',
    purpose_of_listing: '',
    is_raising_funds: false,
    use_of_proceeds: '',
    has_litigation: false,
    details_of_litigation: '',
    has_related_party_transactions: false,
    details_of_rpt: '',
  });

  const renderCompanyInformation = () => (
    <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input type="text" required value={formData.issuer_name} onChange={e => setFormData({ ...formData, issuer_name: e.target.value })} className={inputClasses} placeholder="Enter company name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Registration Number</label>
            <input type="number" value={formData.company_registration_number || ''} onChange={e => setFormData({ ...formData, company_registration_number: e.target.value ? Number(e.target.value) : null })} className={inputClasses} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Legal Structure</label>
            <select required value={formData.legal_structure} onChange={e => setFormData({ ...formData, legal_structure: e.target.value })} className={selectClasses}>
              <option value="">Select Legal Structure</option>
              {LEGAL_STRUCTURES.map(structure => <option key={structure} value={structure}>{structure}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Incorporation Date</label>
            <input type="date" required value={formData.incorporation_date} onChange={e => setFormData({ ...formData, incorporation_date: e.target.value })} className={inputClasses} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <select required value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className={selectClasses}>
              <option value="">Select Country</option>
              {COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Main Contact</label>
            <input type="text" value={formData.main_contact || ''} onChange={e => setFormData({ ...formData, main_contact: e.target.value })} className={inputClasses} placeholder="Enter main contact name" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Email</label>
            <input type="email" required value={formData.business_email} onChange={e => setFormData({ ...formData, business_email: e.target.value })} className={inputClasses} placeholder="Enter business email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input type="tel" required value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className={inputClasses} placeholder="Enter phone number" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Registered Address</label>
          <textarea rows={3} required value={formData.registered_address} onChange={e => setFormData({ ...formData, registered_address: e.target.value })} className={textareaClasses} placeholder="Enter registered address" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input type="checkbox" id="is_already_listed" checked={formData.is_already_listed || false} onChange={e => setFormData({ ...formData, is_already_listed: e.target.checked, which_exchange_is_you_company_listed_on_and_what_is_the_ticker: e.target.checked ? formData.which_exchange_is_you_company_listed_on_and_what_is_the_ticker : '' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="is_already_listed" className="ml-2 block text-sm font-medium text-gray-700">Already Listed?</label>
          </div>
          {formData.is_already_listed && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Which Exchange and what is your ticker?</label>
              <input type="text" value={formData.which_exchange_is_you_company_listed_on_and_what_is_the_ticker || ''} onChange={e => setFormData({ ...formData, which_exchange_is_you_company_listed_on_and_what_is_the_ticker: e.target.value })} className={inputClasses} placeholder="e.g., NYSE: AAPL" />
            </div>
          )}
        </div>
        <div className="flex justify-end mt-8">
          <button type="button" onClick={() => setCurrentStep(2)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Next: Management Details</button>
        </div>
      </div>
    </div>
  );

  const renderManagementDetails = () => (
    <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
      <div className="space-y-8">
        {/* CEO Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Chief Executive Officer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" value={formData.chief_executiveofficer} onChange={e => setFormData({ ...formData, chief_executiveofficer: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" value={formData.ceo_title} onChange={e => setFormData({ ...formData, ceo_title: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input type="date" value={formData.ceo_dob} onChange={e => setFormData({ ...formData, ceo_dob: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <input type="text" value={formData.ceo_nationality} onChange={e => setFormData({ ...formData, ceo_nationality: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shares in the Company</label>
              <input type="number" value={formData.ceo_shares_in_the_co || ''} onChange={e => setFormData({ ...formData, ceo_shares_in_the_co: e.target.value ? Number(e.target.value) : null })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Other Directorships</label>
              <input type="text" value={formData.ceo_other_directorships} onChange={e => setFormData({ ...formData, ceo_other_directorships: e.target.value })} className={inputClasses} />
            </div>
          </div>
        </div>
        {/* Financial Director Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Financial Director</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" value={formData.financial_director} onChange={e => setFormData({ ...formData, financial_director: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" value={formData.fd_title} onChange={e => setFormData({ ...formData, fd_title: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input type="date" value={formData.fd_dob} onChange={e => setFormData({ ...formData, fd_dob: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <input type="text" value={formData.fd_nationality} onChange={e => setFormData({ ...formData, fd_nationality: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shares in the Company</label>
              <input type="number" value={formData.fd_shares_in_the_co || ''} onChange={e => setFormData({ ...formData, fd_shares_in_the_co: e.target.value ? Number(e.target.value) : null })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Other Directorships</label>
              <input type="text" value={formData.fd_other_directorships} onChange={e => setFormData({ ...formData, fd_other_directorships: e.target.value })} className={inputClasses} />
            </div>
          </div>
        </div>
        {/* Additional Directors Section */}
        {/* ... (conditional rendering for additional directors) ... */}
        <div className="flex justify-between mt-8">
          <button type="button" onClick={() => setCurrentStep(1)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Previous</button>
          <button type="button" onClick={() => setCurrentStep(3)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Next: Capital Structure</button>
        </div>
      </div>
    </div>
  );

  const renderCapitalStructure = () => (
    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Basic Share Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Authorised Share Capital</label>
              <input type="text" value={formData.authorised_share_capital ? formData.authorised_share_capital.toLocaleString() : ''} onChange={e => { const value = e.target.value.replace(/\D/g, ''); setFormData({ ...formData, authorised_share_capital: value ? Number(value) : null }); }} className={inputClasses} placeholder="Enter authorised share capital" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shares in Issue</label>
              <input type="text" value={formData.shares_in_issue ? formData.shares_in_issue.toLocaleString() : ''} onChange={e => { const value = e.target.value.replace(/\D/g, ''); setFormData({ ...formData, shares_in_issue: value ? Number(value) : null }); }} className={inputClasses} placeholder="Enter number of shares in issue" />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-4">Share Classes</h3>
          <div className="space-y-6">
            {/* Class A Shares */}
            <div>
              <h4 className="font-medium">Class A Shares</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nominal Value</label>
                  <input type="text" value={formData.a_class_shares_nominal_val || ''} onChange={e => { const value = e.target.value; if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) { setFormData({ ...formData, a_class_shares_nominal_val: value === '' ? null : value }); } }} className={inputClasses} placeholder="0.0001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shares in Issue</label>
                  <input type="number" value={formData.a_class_shares_in_issue || ''} onChange={e => setFormData({ ...formData, a_class_shares_in_issue: e.target.value ? Number(e.target.value) : null })} className={inputClasses} />
                </div>
              </div>
            </div>
            {/* Additional Share Classes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Share Classes</label>
              <select value={formData.additional_share_classes || ''} onChange={e => setFormData({ ...formData, additional_share_classes: e.target.value })} className={selectClasses}>
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
                    <label className="block text-sm font-medium text-gray-700">Nominal Value</label>
                    <input type="text" value={formData.b_class_shares_nominal_val || ''} onChange={e => { const value = e.target.value; if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) { setFormData({ ...formData, b_class_shares_nominal_val: value === '' ? null : value }); } }} className={inputClasses} placeholder="0.0001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shares in Issue</label>
                    <input type="number" value={formData.b_class_shares_in_issue || ''} onChange={e => setFormData({ ...formData, b_class_shares_in_issue: e.target.value ? parseInt(e.target.value) : null })} className={inputClasses} />
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
                    <label className="block text-sm font-medium text-gray-700">Nominal Value</label>
                    <input type="text" value={formData.c_class_shares_nominal_val || ''} onChange={e => { const value = e.target.value; if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) { setFormData({ ...formData, c_class_shares_nominal_val: value === '' ? null : value }); } }} className={inputClasses} placeholder="0.0001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shares in Issue</label>
                    <input type="number" value={formData.c_class_shares_in_issue || ''} onChange={e => setFormData({ ...formData, c_class_shares_in_issue: e.target.value ? parseInt(e.target.value) : null })} className={inputClasses} />
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
                    <label className="block text-sm font-medium text-gray-700">Nominal Value</label>
                    <input type="text" value={formData.d_class_shares_nominal_val || ''} onChange={e => { const value = e.target.value; if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) { setFormData({ ...formData, d_class_shares_nominal_val: value === '' ? null : value }); } }} className={inputClasses} placeholder="0.0001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shares in Issue</label>
                    <input type="number" value={formData.d_class_shares_in_issue || ''} onChange={e => setFormData({ ...formData, d_class_shares_in_issue: e.target.value ? parseInt(e.target.value) : null })} className={inputClasses} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Warrants and Options</label>
          <textarea value={formData.warrants_options || ''} onChange={e => setFormData({ ...formData, warrants_options: e.target.value })} className={textareaClasses} placeholder="Describe any warrants or options" />
        </div>
        <div className="flex justify-between mt-8">
          <button type="button" onClick={() => setCurrentStep(2)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Previous</button>
          <button type="button" onClick={() => setCurrentStep(4)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Next: Legal & Advisors</button>
        </div>
      </div>
    </div>
  );

  const renderLegalAndAdvisors = () => {
    const showTrusteeAdmin = ['Trust', 'Protected Cell Company (PCC)', 'Fund'].includes(formData.legal_structure);
    return (
      <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Legal Advisors */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Legal Advisors</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" value={formData.legal_advisors_name || ''} onChange={e => setFormData({ ...formData, legal_advisors_name: e.target.value })} className={inputClasses} placeholder="Enter legal advisor name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea value={formData.legal_advisors_address || ''} onChange={e => setFormData({ ...formData, legal_advisors_address: e.target.value })} rows={2} className={textareaClasses} placeholder="Enter address" />
            </div>
          </div>
          {/* Auditors */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Auditors</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" value={formData.auditors_name || ''} onChange={e => setFormData({ ...formData, auditors_name: e.target.value })} className={inputClasses} placeholder="Enter auditor name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea value={formData.auditors_address || ''} onChange={e => setFormData({ ...formData, auditors_address: e.target.value })} rows={2} className={textareaClasses} placeholder="Enter address" />
            </div>
          </div>
          {/* Company Secretary */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Company Secretary</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" value={formData.company_secretary || ''} onChange={e => setFormData({ ...formData, company_secretary: e.target.value })} className={inputClasses} placeholder="Enter company secretary name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea value={formData.co_sec_address || ''} onChange={e => setFormData({ ...formData, co_sec_address: e.target.value })} rows={2} className={textareaClasses} placeholder="Enter address" />
            </div>
          </div>
        </div>
        {/* Accountants */}
        <div className="mt-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Accountants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={formData.accountant_name || ''} onChange={e => setFormData({ ...formData, accountant_name: e.target.value })} className={inputClasses} placeholder="Enter accountant name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea value={formData.accountants_address || ''} onChange={e => setFormData({ ...formData, accountants_address: e.target.value })} rows={2} className={textareaClasses} placeholder="Enter address" />
              </div>
            </div>
          </div>
        </div>
        {/* Trustee & Administrator */}
        {showTrusteeAdmin && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Trustee</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={formData.trustee_name || ''} onChange={e => setFormData({ ...formData, trustee_name: e.target.value })} className={inputClasses} placeholder="Enter trustee name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea value={formData.trustee_address || ''} onChange={e => setFormData({ ...formData, trustee_address: e.target.value })} rows={2} className={textareaClasses} placeholder="Enter address" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Administrator</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={formData.administrators_name || ''} onChange={e => setFormData({ ...formData, administrators_name: e.target.value })} className={inputClasses} placeholder="Enter administrator name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea value={formData.administrators_address || ''} onChange={e => setFormData({ ...formData, administrators_address: e.target.value })} rows={2} className={textareaClasses} placeholder="Enter address" />
              </div>
            </div>
          </div>
        )}
        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button type="button" onClick={() => setCurrentStep(3)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Previous: Capital Structure</button>
          <button type="button" onClick={() => setCurrentStep(5)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Next: Business Overview</button>
        </div>
      </div>
    );
  };

  const renderBusinessOverview = () => (
    <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Column 1 */}
        <div className="space-y-6">
          {/* Business Overview */}
          <div>
            <h3 className="text-lg font-medium mb-4">Business Overview</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Overview and Operations</label>
              <textarea rows={4} value={formData.business_overview || ''} onChange={e => setFormData({ ...formData, business_overview: e.target.value })} className={textareaClasses} placeholder="Provide a comprehensive overview of your business operations" />
            </div>
          </div>
          {/* Company Prospects */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Prospects</label>
            <textarea rows={4} value={formData.company_prospects || ''} onChange={e => setFormData({ ...formData, company_prospects: e.target.value })} className={textareaClasses} placeholder="Describe the company's future prospects and growth potential" />
          </div>
          {/* Investments Checkbox and Details */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input type="checkbox" id="has_investments" checked={formData.has_investments || false} onChange={e => setFormData({ ...formData, has_investments: e.target.checked, details_of_investments: e.target.checked ? formData.details_of_investments : '' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="has_investments" className="ml-2 block text-sm font-medium text-gray-700">Any Current/Pending Investments?</label>
            </div>
            {formData.has_investments && (
              <div>
                <textarea rows={3} value={formData.details_of_investments || ''} onChange={e => setFormData({ ...formData, details_of_investments: e.target.value })} className={textareaClasses} placeholder="Provide details of current or pending investments" />
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
                <label className="block text-sm font-medium text-gray-700">Purpose of Listing</label>
                <textarea rows={3} value={formData.purpose_of_listing || ''} onChange={e => setFormData({ ...formData, purpose_of_listing: e.target.value })} className={textareaClasses} placeholder="Explain the main reasons for seeking a listing" />
              </div>
              {/* Raising Funds Section */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input type="checkbox" id="is_raising_funds" checked={formData.is_raising_funds || false} onChange={e => setFormData({ ...formData, is_raising_funds: e.target.checked, use_of_proceeds: e.target.checked ? formData.use_of_proceeds : '' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="is_raising_funds" className="ml-2 block text-sm font-medium text-gray-700">Looking to raise funds on the exchange?</label>
                </div>
                {formData.is_raising_funds && (
                  <textarea rows={3} value={formData.use_of_proceeds || ''} onChange={e => setFormData({ ...formData, use_of_proceeds: e.target.value })} className={textareaClasses} placeholder="Detail how the listing proceeds will be used" />
                )}
              </div>
              {/* Litigation Checkbox and Details */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input type="checkbox" id="has_litigation" checked={formData.has_litigation || false} onChange={e => setFormData({ ...formData, has_litigation: e.target.checked, details_of_litigation: e.target.checked ? formData.details_of_litigation : '' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="has_litigation" className="ml-2 block text-sm font-medium text-gray-700">Any Current Litigation?</label>
                </div>
                {formData.has_litigation && (
                  <textarea rows={3} value={formData.details_of_litigation || ''} onChange={e => setFormData({ ...formData, details_of_litigation: e.target.value })} className={textareaClasses} placeholder="Provide details of any current litigation" />
                )}
              </div>
              {/* Related Party Transactions Checkbox and Details */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input type="checkbox" id="has_rpt" checked={formData.has_related_party_transactions || false} onChange={e => setFormData({ ...formData, has_related_party_transactions: e.target.checked, details_of_rpt: e.target.checked ? formData.details_of_rpt : '' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="has_rpt" className="ml-2 block text-sm font-medium text-gray-700">Any Related Party Transactions?</label>
                </div>
                {formData.has_related_party_transactions && (
                  <textarea rows={3} value={formData.details_of_rpt || ''} onChange={e => setFormData({ ...formData, details_of_rpt: e.target.value })} className={textareaClasses} placeholder="Provide details of related party transactions" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button type="button" onClick={() => setCurrentStep(4)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Previous: Legal & Advisors</button>
        <button type="button" onClick={() => setCurrentStep(6)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Next: Regulatory Information</button>
      </div>
    </div>
  );

  return (
    <div>
      {currentStep === 1 && renderCompanyInformation()}
      {currentStep === 2 && renderManagementDetails()}
      {currentStep === 3 && renderCapitalStructure()}
      {currentStep === 4 && renderLegalAndAdvisors()}
      {currentStep === 5 && renderBusinessOverview()}
      {/* Additional steps will be rendered here in future edits */}
    </div>
  );
};

export default IssuerFormWizard; 