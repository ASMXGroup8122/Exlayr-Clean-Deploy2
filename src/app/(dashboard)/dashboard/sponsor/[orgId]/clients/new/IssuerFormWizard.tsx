import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Modify IssuerFormData interface to match the Supabase schema
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
  
  // CEO
  chief_executiveofficer: string;
  ceo_title: string;
  ceo_dob: string;
  ceo_nationality: string;
  ceo_shares_in_the_co: number | null;
  ceo_other_directorships: string;
  
  // Financial Director
  financial_director: string;
  fd_title: string;
  fd_dob: string;
  fd_nationality: string;
  fd_shares_in_the_co: number | null;
  fd_other_directorships: string;
  
  // Total directors counter
  how_many_directors_total: number | null;
  
  // Director 3
  director_3: string;
  d3_title: string;
  d3_dob: string;
  d3_nationality: string;
  d3_shares_in_the_co: number | null;
  d3_other_directorships: string;
  
  // Director 4
  director_4: string;
  d4_title: string;
  d4_dob: string;
  d4_nationality: string;
  d4_shares_in_the_co: number | null;
  d4_other_directorships: string;
  
  // Director 5
  director_5: string;
  d5_title: string;
  d5_dob: string;
  d5_nationality: string;
  d5_shares_in_the_co: number | null;
  d5_other_directorships: string;
  
  // Capital Structure
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
  additional_capital_of_issuer: string | null;
  warrants_options: string | null;
  
  // Legal & Advisors
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
  
  // Business Overview
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
  
  // Regulatory information
  does_the_company_have_regulators: string;
  regulator_1: string | null;
  regulator_2: string | null;
  regulator_3: string | null;
  regulator_4: string | null;

  // Documents - these will be handled separately for storage
  documents?: {
    certificate_of_incorporation?: File | null;
    memorandum_and_articles?: File | null;
    regulatory_approvals?: File | null;
    other_documents?: File | null;
  };
  
  // Document URLs (to be saved in database)
  memorandum_articles: string | null;
  accounts: string | null;
  directors_contracts: string | null;
  directors_cvs: string | null; 
  business_plans: string | null;
  news_articles: string | null;
  
  // Status fields
  status: string;
  created_by: string | null;
}

// Place inputClasses after imports
const inputClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";
const textareaClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";
const selectClasses = "mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3";

// Add LEGAL_STRUCTURES and COUNTRIES as in the original
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

// Ensure IssuerFormWizardProps is defined
interface IssuerFormWizardProps {
  sponsorOrgId?: string;
  onSuccess?: () => void;
}

const IssuerFormWizard: React.FC<IssuerFormWizardProps> = ({ sponsorOrgId, onSuccess }) => {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add a console log when currentStep changes
  React.useEffect(() => {
    console.log('Current step changed to:', currentStep);
  }, [currentStep]);
  
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
    which_exchange_is_you_company_listed_on_and_what_is_the_ticker: null,
    
    // CEO details
    chief_executiveofficer: '',
    ceo_title: '',
    ceo_dob: '',
    ceo_nationality: '',
    ceo_shares_in_the_co: null,
    ceo_other_directorships: '',
    
    // Financial director details
    financial_director: '',
    fd_title: '',
    fd_dob: '',
    fd_nationality: '',
    fd_shares_in_the_co: null,
    fd_other_directorships: '',
    
    // Director count
    how_many_directors_total: 2,
    
    // Director 3
    director_3: '',
    d3_title: '',
    d3_dob: '',
    d3_nationality: '',
    d3_shares_in_the_co: null,
    d3_other_directorships: '',
    
    // Director 4
    director_4: '',
    d4_title: '',
    d4_dob: '',
    d4_nationality: '',
    d4_shares_in_the_co: null,
    d4_other_directorships: '',
    
    // Director 5
    director_5: '',
    d5_title: '',
    d5_dob: '',
    d5_nationality: '',
    d5_shares_in_the_co: null,
    d5_other_directorships: '',
    
    // Capital Structure
    authorised_share_capital: null,
    shares_in_issue: null,
    a_class_shares_nominal_val: null,
    a_class_shares_in_issue: null,
    b_class_shares_nominal_val: null,
    b_class_shares_in_issue: null,
    c_class_shares_nominal_val: null,
    c_class_shares_in_issue: null,
    d_class_shares_nominal_val: null,
    d_class_shares_in_issue: null,
    additional_capital_of_issuer: null,
    warrants_options: null,
    
    // Legal & Advisors
    legal_advisors_name: null,
    legal_advisors_address: null,
    auditors_name: null,
    auditors_address: null,
    company_secretary: null,
    co_sec_address: null,
    accountant_name: null,
    accountants_address: null,
    trustee_name: null,
    trustee_address: null,
    administrators_name: null,
    administrators_address: null,
    
    // Business Overview
    business_overview: null,
    company_prospects: null,
    has_investments: false,
    details_of_investments: null,
    purpose_of_listing: null,
    is_raising_funds: false,
    use_of_proceeds: null,
    has_litigation: false,
    details_of_litigation: null,
    has_related_party_transactions: false,
    details_of_rpt: null,
    
    // Regulatory information
    does_the_company_have_regulators: 'no',
    regulator_1: null,
    regulator_2: null,
    regulator_3: null,
    regulator_4: null,
    
    // Document URLs
    memorandum_articles: null,
    accounts: null,
    directors_contracts: null,
    directors_cvs: null,
    business_plans: null,
    news_articles: null,
    
    // Status
    status: 'pending',
    created_by: null,
    
    // Document uploads (temporary frontend state)
    documents: {
      certificate_of_incorporation: null,
      memorandum_and_articles: null,
      regulatory_approvals: null,
      other_documents: null,
    },
  });

  // Function to handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // First, prepare the data for submission (remove UI-only fields)
      const submissionData = { ...formData };
      delete (submissionData as any).documents;
      delete (submissionData as any).is_already_listed;
      delete (submissionData as any).has_investments;
      delete (submissionData as any).is_raising_funds;
      delete (submissionData as any).has_litigation;
      delete (submissionData as any).has_related_party_transactions;
      
      // Add created_by field
      submissionData.created_by = user.id;
      
      // Add exchange_sponsor if available
      if (sponsorOrgId) {
        (submissionData as any).exchange_sponsor = sponsorOrgId;
      }
      
      // Insert issuer data into Supabase
      const { data, error: insertError } = await supabase
        .from('issuers')
        .insert(submissionData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create issuer: ${insertError.message}`);
      }
      
      const issuerId = data.id;
      
      // Handle file uploads - would need to implement if needed
      // This would upload files to Supabase storage and then update the issuer record
      // with file URLs
      
      // Success - navigate or call onSuccess
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/sponsor/${sponsorOrgId}/clients`);
      }
    } catch (err: any) {
      console.error('Error creating issuer:', err);
      setError(err.message || 'Failed to create issuer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refactored Regulatory Information to use flat structure
  const renderRegulatoryInformation = () => (
    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
      <h3 className="text-lg font-medium mb-4">Regulatory Information</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Does the company have regulators?</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="does_the_company_have_regulators"
                value="yes"
                checked={formData.does_the_company_have_regulators === 'yes'}
                onChange={() => setFormData({
                  ...formData,
                  does_the_company_have_regulators: 'yes'
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2">Yes</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="does_the_company_have_regulators"
                value="no"
                checked={formData.does_the_company_have_regulators === 'no'}
                onChange={() => setFormData({
                  ...formData,
                  does_the_company_have_regulators: 'no',
                  regulator_1: null,
                  regulator_2: null, 
                  regulator_3: null,
                  regulator_4: null
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2">No</span>
            </label>
          </div>
        </div>
        
        {formData.does_the_company_have_regulators === 'yes' && (
          <div className="space-y-6">
            {/* Regulator 1 */}
            <div className="border p-4 rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Regulator 1</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Regulator Name & Details</label>
                <input
                  type="text"
                  value={formData.regulator_1 || ''}
                  onChange={e => setFormData({ ...formData, regulator_1: e.target.value })}
                  className={inputClasses}
                  placeholder="Regulator name, jurisdiction, and regulation number"
                />
              </div>
            </div>
            
            {/* Regulator 2 */}
            <div className="border p-4 rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Regulator 2 (Optional)</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Regulator Name & Details</label>
                <input
                  type="text"
                  value={formData.regulator_2 || ''}
                  onChange={e => setFormData({ ...formData, regulator_2: e.target.value })}
                  className={inputClasses}
                  placeholder="Regulator name, jurisdiction, and regulation number"
                />
              </div>
            </div>
            
            {/* Regulator 3 */}
            <div className="border p-4 rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Regulator 3 (Optional)</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Regulator Name & Details</label>
                <input
                  type="text"
                  value={formData.regulator_3 || ''}
                  onChange={e => setFormData({ ...formData, regulator_3: e.target.value })}
                  className={inputClasses}
                  placeholder="Regulator name, jurisdiction, and regulation number"
                />
              </div>
            </div>
            
            {/* Regulator 4 */}
            <div className="border p-4 rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Regulator 4 (Optional)</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Regulator Name & Details</label>
                <input
                  type="text"
                  value={formData.regulator_4 || ''}
                  onChange={e => setFormData({ ...formData, regulator_4: e.target.value })}
                  className={inputClasses}
                  placeholder="Regulator name, jurisdiction, and regulation number"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between mt-8">
        <button 
          type="button" 
          onClick={() => setCurrentStep(5)} 
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Previous: Business Overview
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
  );

  // Insert the render step functions from the original
  const renderCompanyInformation = () => (
    <div className={`bg-white p-8 rounded-lg shadow-md border border-gray-100`}>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input type="text" required value={formData.issuer_name} onChange={e => setFormData({ ...formData, issuer_name: e.target.value })} className={inputClasses} placeholder="Enter company name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Provisional Ticker</label>
            <input type="text" value={formData.provisional_ticker || ''} onChange={e => setFormData({ ...formData, provisional_ticker: e.target.value })} className={inputClasses} placeholder="Enter provisional ticker" />
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
        {/* How many directors total */}
        <div>
          <label className="block text-sm font-medium text-gray-700">How many directors total?</label>
          <input
            type="number"
            min={2}
            value={formData.how_many_directors_total || 2}
            onChange={e => {
              const val = Math.max(2, Number(e.target.value));
              setFormData({ ...formData, how_many_directors_total: val });
            }}
            className={inputClasses}
          />
        </div>
        {/* Additional Directors Section */}
        {formData.how_many_directors_total && formData.how_many_directors_total > 2 && (
          <div className="space-y-8">
            {Array.from({ length: formData.how_many_directors_total - 2 }).map((_, idx) => {
              const directorNum = idx + 3;
              const nameKey = `director_${directorNum}`;
              const titleKey = `d${directorNum}_title`;
              const dobKey = `d${directorNum}_dob`;
              const nationalityKey = `d${directorNum}_nationality`;
              const sharesKey = `d${directorNum}_shares_in_the_co`;
              const otherDirKey = `d${directorNum}_other_directorships`;
              return (
                <div key={directorNum} className="border p-4 rounded-md bg-gray-50">
                  <h4 className="font-medium mb-2">Director {directorNum}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={(formData as any)[nameKey] || ''}
                        onChange={e => setFormData({ ...formData, [nameKey]: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={(formData as any)[titleKey] || ''}
                        onChange={e => setFormData({ ...formData, [titleKey]: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                      <input
                        type="date"
                        value={(formData as any)[dobKey] || ''}
                        onChange={e => setFormData({ ...formData, [dobKey]: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nationality</label>
                      <input
                        type="text"
                        value={(formData as any)[nationalityKey] || ''}
                        onChange={e => setFormData({ ...formData, [nationalityKey]: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Shares in the Company</label>
                      <input
                        type="number"
                        value={(formData as any)[sharesKey] || ''}
                        onChange={e => setFormData({ ...formData, [sharesKey]: e.target.value ? Number(e.target.value) : null })}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Other Directorships</label>
                      <input
                        type="text"
                        value={(formData as any)[otherDirKey] || ''}
                        onChange={e => setFormData({ ...formData, [otherDirKey]: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              <select value={formData.additional_capital_of_issuer || ''} onChange={e => setFormData({ ...formData, additional_capital_of_issuer: e.target.value })} className={selectClasses}>
                <option value="">No additional classes</option>
                <option value="B">Class B</option>
                <option value="C">Class C</option>
                <option value="D">Class D</option>
              </select>
            </div>
            {/* Conditional rendering for Class B */}
            {formData.additional_capital_of_issuer === 'B' && (
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
            {formData.additional_capital_of_issuer === 'C' && (
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
            {formData.additional_capital_of_issuer === 'D' && (
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

  // Correct renderLegalAndAdvisors
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

  // Correct renderBusinessOverview
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

  // Update Documents & Compliance to handle submission
  const renderDocumentsAndCompliance = () => (
    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
      <h3 className="text-2xl font-bold mb-8 text-center">Documents & Compliance</h3>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Certificate of Incorporation */}
        <div className="bg-gray-50 rounded-lg p-6 shadow flex flex-col items-start">
          <label className="font-semibold text-gray-800 mb-2">Certificate of Incorporation</label>
          <span className="text-xs text-gray-500 mb-2">PDF or image, official company registration document.</span>
          <label className="inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition mb-2">
            {formData.documents?.certificate_of_incorporation ? 'Replace File' : 'Upload File'}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={e => setFormData({
                ...formData,
                documents: {
                  ...formData.documents,
                  certificate_of_incorporation: e.target.files?.[0] || null,
                },
              })}
            />
          </label>
          {formData.documents?.certificate_of_incorporation && (
            <div className="flex items-center text-green-700 mt-1">
              <svg className="w-5 h-5 mr-1 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-sm">{formData.documents.certificate_of_incorporation.name}</span>
            </div>
          )}
        </div>
        {/* Memorandum & Articles */}
        <div className="bg-gray-50 rounded-lg p-6 shadow flex flex-col items-start">
          <label className="font-semibold text-gray-800 mb-2">Memorandum & Articles</label>
          <span className="text-xs text-gray-500 mb-2">PDF or image, company constitution documents.</span>
          <label className="inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition mb-2">
            {formData.documents?.memorandum_and_articles ? 'Replace File' : 'Upload File'}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={e => setFormData({
                ...formData,
                documents: {
                  ...formData.documents,
                  memorandum_and_articles: e.target.files?.[0] || null,
                },
              })}
            />
          </label>
          {formData.documents?.memorandum_and_articles && (
            <div className="flex items-center text-green-700 mt-1">
              <svg className="w-5 h-5 mr-1 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-sm">{formData.documents.memorandum_and_articles.name}</span>
            </div>
          )}
        </div>
        {/* Regulatory Approvals */}
        <div className="bg-gray-50 rounded-lg p-6 shadow flex flex-col items-start">
          <label className="font-semibold text-gray-800 mb-2">Regulatory Approvals</label>
          <span className="text-xs text-gray-500 mb-2">PDF or image, any required regulatory approval documents.</span>
          <label className="inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition mb-2">
            {formData.documents?.regulatory_approvals ? 'Replace File' : 'Upload File'}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={e => setFormData({
                ...formData,
                documents: {
                  ...formData.documents,
                  regulatory_approvals: e.target.files?.[0] || null,
                },
              })}
            />
          </label>
          {formData.documents?.regulatory_approvals && (
            <div className="flex items-center text-green-700 mt-1">
              <svg className="w-5 h-5 mr-1 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-sm">{formData.documents.regulatory_approvals.name}</span>
            </div>
          )}
        </div>
        {/* Other Documents */}
        <div className="bg-gray-50 rounded-lg p-6 shadow flex flex-col items-start">
          <label className="font-semibold text-gray-800 mb-2">Other Documents</label>
          <span className="text-xs text-gray-500 mb-2">PDF or image, any other supporting documents.</span>
          <label className="inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition mb-2">
            {formData.documents?.other_documents ? 'Replace File' : 'Upload File'}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={e => setFormData({
                ...formData,
                documents: {
                  ...formData.documents,
                  other_documents: e.target.files?.[0] || null,
                },
              })}
            />
          </label>
          {formData.documents?.other_documents && (
            <div className="flex items-center text-green-700 mt-1">
              <svg className="w-5 h-5 mr-1 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-sm">{formData.documents.other_documents.name}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-12">
        <button 
          type="button" 
          onClick={() => setCurrentStep(6)} 
          className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Previous: Regulatory Information
        </button>
        <button 
          type="button" 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Debug info */}
      <div className="bg-blue-50 p-2 text-xs text-blue-800 mb-4">
        Current step: {currentStep}
      </div>
      
      {currentStep === 1 && renderCompanyInformation()}
      {currentStep === 2 && renderManagementDetails()}
      {currentStep === 3 && renderCapitalStructure()}
      {currentStep === 4 && renderLegalAndAdvisors()}
      {currentStep === 5 && renderBusinessOverview()}
      {currentStep === 6 && renderRegulatoryInformation()}
      {currentStep === 7 && renderDocumentsAndCompliance()}
    </div>
  );
};

export default IssuerFormWizard; 