import { createClient } from '@supabase/supabase-js';
import { 
  searchSectionMemories, 
  searchEntityFacts, 
  getToneReferences,
  isMem0Configured 
} from '../memory/mem0Client';

// Types for the context system
export interface SectionContext {
  field_key: string;
  section_label: string;
  structured_data: any;
  upload_matches: any[];
  mem0_results: any[]; // Will be populated when Mem0 is integrated
  mode: AssistantMode;
  source_trace: string[];
  missing_flags: string[];
  conflicts: ConflictData[];
}

export type AssistantMode = 
  | 'document_completion'
  | 'industry_research' 
  | 'regulatory_guidance'
  | 'agent_mode';

export interface ConflictData {
  field: string;
  supabase_value: any;
  upload_value: any;
  source: string;
}

// Field-to-mode mapping based on database analysis
const FIELD_MODE_MAP: Record<string, AssistantMode> = {
  // Section 1 - Document completion for structured content
  'sec1_issuer_name': 'document_completion',
  'sec1_boardofdirectors': 'document_completion',
  'sec1_corporateadvisors': 'document_completion',
  'sec1_generalinfo': 'document_completion',
  'sec1_listingparticulars': 'document_completion',
  'sec1_purposeoflisting': 'document_completion',
  'sec1_plansafterlisting': 'document_completion',
  'sec1_salientpoints': 'document_completion',
  
  // Section 2 - Mixed modes for document structure
  'sec2_tableofcontents': 'document_completion',
  'sec2_importantdatestimes': 'document_completion',
  'sec2_generalrequirements': 'regulatory_guidance',
  'sec2_responsibleperson': 'document_completion',
  'sec2_securitiesparticulars': 'document_completion',
  
  // Section 3 - Mixed modes for issuer information
  'sec3_generalinfoissuer': 'document_completion',
  'sec3_issuerprinpactivities': 'industry_research',
  'sec3_issuerfinanposition': 'document_completion',
  'sec3_issuersadministration_and_man': 'document_completion',
  'sec3_recentdevelopments': 'industry_research',
  'sec3_financialstatements': 'document_completion',
  
  // Section 4 - Regulatory guidance for all risk factors
  'sec4_riskfactors1': 'regulatory_guidance',
  'sec4_riskfactors2': 'regulatory_guidance',
  'sec4_riskfactors3': 'regulatory_guidance',
  'sec4_riskfactors4': 'regulatory_guidance',
  'sec4_risks5': 'regulatory_guidance',
  'sec4_risks6': 'regulatory_guidance',
  'sec4_risks7': 'regulatory_guidance',
  'sec4_risks8': 'regulatory_guidance',
  'sec4_risks9': 'regulatory_guidance',
  'sec4_risks10': 'regulatory_guidance',
  'sec4_risks11': 'regulatory_guidance',
  'sec4_risks12': 'regulatory_guidance',
  'sec4_risks13': 'regulatory_guidance',
  'sec4_risks14': 'regulatory_guidance',
  'sec4_risks15': 'regulatory_guidance',
  'sec4_risks16': 'regulatory_guidance',
  
  // Section 5 - Document completion for securities
  'sec5_informaboutsecurts1': 'document_completion',
  'sec5_informaboutsecurts2': 'document_completion',
  'sec5_informaboutsecurts3': 'document_completion',
  'sec5_informaboutsecurts4': 'document_completion',
  'sec5_informaboutsecurts5': 'document_completion',
  'sec5_informaboutsecurts6': 'document_completion',
  'sec5_costs': 'document_completion',
  
  // Section 6 - Mixed for fees and compliance
  'sec6_exchange': 'document_completion',
  'sec6_sponsoradvisorfees': 'document_completion',
  'sec6_accountingandlegalfees': 'document_completion',
  'sec6_merjlistingapplication1styearfees': 'document_completion',
  'sec6_marketingcosts': 'document_completion',
  'sec6_annualfees': 'document_completion',
  'sec6_commissionforsubscription': 'document_completion',
  'sec6_payingagent': 'document_completion',
  'sec6_listingdocuments': 'document_completion',
  'sec6_complianceapproved': 'regulatory_guidance',
  
  // Special cases
  'general_inquiry': 'agent_mode', // When no specific field is selected
};

// Field labels for better UX
const FIELD_LABELS: Record<string, string> = {
  'sec1_issuer_name': 'Issuer Name',
  'sec1_boardofdirectors': 'Board of Directors',
  'sec1_corporateadvisors': 'Corporate Advisors',
  'sec1_generalinfo': 'General Information',
  'sec1_listingparticulars': 'Listing Particulars',
  'sec1_purposeoflisting': 'Purpose of Listing',
  'sec1_plansafterlisting': 'Plans After Listing',
  'sec1_salientpoints': 'Salient Points',
  'sec1_warning': 'Warning Statement',
  'sec1_forwardlooking_statements': 'Forward Looking Statements',
  'sec1_documentname': 'Document Name',
  
  'sec2_tableofcontents': 'Table of Contents',
  'sec2_importantdatestimes': 'Important Dates and Times',
  'sec2_generalrequirements': 'General Requirements',
  'sec2_responsibleperson': 'Responsible Person',
  'sec2_securitiesparticulars': 'Securities Particulars',
  'sec2_securitiestowhichthisrelates': 'Securities to Which This Relates',
  
  'sec3_generalinfoissuer': 'General Information about Issuer',
  'sec3_issuerprinpactivities': 'Issuer Principal Activities',
  'sec3_issuerfinanposition': 'Issuer Financial Position',
  'sec3_issuersadministration_and_man': 'Issuer Administration and Management',
  'sec3_recentdevelopments': 'Recent Developments',
  'sec3_financialstatements': 'Financial Statements',
  
  'sec4_riskfactors1': 'Risk Factor 1',
  'sec4_riskfactors2': 'Risk Factor 2',
  'sec4_riskfactors3': 'Risk Factor 3',
  'sec4_riskfactors4': 'Risk Factor 4',
  'sec4_risks5': 'Risk Factor 5',
  'sec4_risks6': 'Risk Factor 6',
  'sec4_risks7': 'Risk Factor 7',
  'sec4_risks8': 'Risk Factor 8',
  'sec4_risks9': 'Risk Factor 9',
  'sec4_risks10': 'Risk Factor 10',
  'sec4_risks11': 'Risk Factor 11',
  'sec4_risks12': 'Risk Factor 12',
  'sec4_risks13': 'Risk Factor 13',
  'sec4_risks14': 'Risk Factor 14',
  'sec4_risks15': 'Risk Factor 15',
  'sec4_risks16': 'Risk Factor 16',
  
  'sec5_informaboutsecurts1': 'Securities Information 1',
  'sec5_informaboutsecurts2': 'Securities Information 2',
  'sec5_informaboutsecurts3': 'Securities Information 3',
  'sec5_informaboutsecurts4': 'Securities Information 4',
  'sec5_informaboutsecurts5': 'Securities Information 5',
  'sec5_informaboutsecurts6': 'Securities Information 6',
  'sec5_costs': 'Costs',
  
  'sec6_exchange': 'Exchange',
  'sec6_sponsoradvisorfees': 'Sponsor/Advisor Fees',
  'sec6_accountingandlegalfees': 'Accounting and Legal Fees',
  'sec6_merjlistingapplication1styearfees': 'MERJ Listing Application 1st Year Fees',
  'sec6_marketingcosts': 'Marketing Costs',
  'sec6_annualfees': 'Annual Fees',
  'sec6_commissionforsubscription': 'Commission for Subscription',
  'sec6_payingagent': 'Paying Agent',
  'sec6_listingdocuments': 'Listing Documents',
  'sec6_complianceapproved': 'Compliance Approved',
  
  // Special cases
  'general_inquiry': 'General Document Inquiry',
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Core context extraction engine
 * Orchestrates data gathering from multiple sources with strict prioritization
 */
export async function getSectionContext(
  userPrompt: string,
  listingId: string,
  currentFieldKey?: string
): Promise<SectionContext> {
  const context: SectionContext = {
    field_key: '',
    section_label: '',
    structured_data: {},
    upload_matches: [],
    mem0_results: [], // Will be populated when Mem0 is integrated
    mode: 'document_completion',
    source_trace: [],
    missing_flags: [],
    conflicts: []
  };

  try {
    // 1. Parse prompt → infer field_key
    const field_key = currentFieldKey || inferFieldFromPrompt(userPrompt);
    context.field_key = field_key;
    context.section_label = FIELD_LABELS[field_key] || field_key;

    // 2. Query Supabase for REAL business data (HIGHEST PRIORITY)
    // First get the listing document to see what's already filled
    const { data: documentData, error: docError } = await supabase
      .from('listingdocumentdirectlisting')
      .select(`
        *,
        listing:instrumentid (
          instrumentname,
          instrumentissuerid,
          instrumentissuername,
          instrumentcategory,
          instrumentsubcategory,
          instrumentexchange,
          instrumentcurrency,
          instrumentsponsorid
        )
      `)
      .eq('instrumentid', listingId)
      .single();

    // Now get ACTUAL business data from issuers table
    let issuerData = null;
    if (documentData?.listing?.instrumentissuerid) {
      const { data: issuer, error: issuerError } = await supabase
        .from('issuers')
        .select('*')
        .eq('id', documentData.listing.instrumentissuerid)
        .single();
      
      if (issuer && !issuerError) {
        issuerData = issuer;
        context.source_trace.push('Issuer Database');
      }
    }

    // Get additional listing details
    let listingData = null;
    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select('*')
      .eq('instrumentid', listingId)
      .single();
    
    if (listing && !listingError) {
      listingData = listing;
      context.source_trace.push('Listing Database');
    }

    // Combine all data sources
    context.structured_data = {
      document_fields: documentData || {},
      issuer: issuerData,
      listing: listingData,
      // Keep the original listing reference for backward compatibility
      listing_ref: documentData?.listing
    };

    if (context.source_trace.length === 0) {
      context.source_trace.push('No Data Sources');
    }

    // 3. Search knowledge_vault_documents for uploads (SECONDARY PRIORITY)
    const { data: uploadMatches, error: uploadError } = await supabase
      .from('knowledge_vault_documents')
      .select('*')
      .eq('organization_id', context.structured_data?.listing?.instrumentsponsorid)
      .order('created_at', { ascending: false });

    if (uploadMatches && !uploadError && uploadMatches.length > 0) {
      // Filter by section relevance if possible
      context.upload_matches = uploadMatches.filter(doc => 
        !doc.category || 
        doc.category.toLowerCase().includes(field_key.split('_')[0]) ||
        doc.name.toLowerCase().includes(field_key.split('_')[1] || '')
      );
      
      if (context.upload_matches.length > 0) {
        context.source_trace.push('Uploaded Documents');
      }
    }

    // 4. Query Mem0 for prior completions and summaries
    if (isMem0Configured() && issuerData?.id) {
      try {
        console.log('🧠 Mem0: Searching for relevant memories...');
        
        // Search for section-specific memories
        const sectionMemories = await searchSectionMemories(
          issuerData.id,
          field_key,
          userPrompt || context.section_label,
          'system'
        );

        // Search for entity facts about the issuer
        const entityFacts = await searchEntityFacts(
          issuerData.id,
          userPrompt || context.section_label,
          'system'
        );

        // Get tone references for consistency
        const toneReferences = await getToneReferences(
          issuerData.id,
          'system'
        );

        // Combine all memory results
        context.mem0_results = [
          ...sectionMemories.map(m => ({ ...m, type: 'section_memory' })),
          ...entityFacts.map(m => ({ ...m, type: 'entity_fact' })),
          ...toneReferences.map(m => ({ ...m, type: 'tone_reference' }))
        ];

        if (context.mem0_results.length > 0) {
          context.source_trace.push('Mem0');
          console.log(`🧠 Mem0: Found ${context.mem0_results.length} relevant memories`);
        } else {
          console.log('🧠 Mem0: No relevant memories found');
        }
      } catch (error) {
        console.error('❌ Mem0: Error querying memories:', error);
        context.mem0_results = [];
      }
    } else {
      console.log('⚠️ Mem0: Not configured or no issuer ID available');
      context.mem0_results = [];
    }

    // 5. Determine mode based on field mapping
    context.mode = FIELD_MODE_MAP[field_key] || 'agent_mode';

    // 6. Detect missing data and conflicts
    context.missing_flags = detectMissingData(context, field_key);
    context.conflicts = detectSourceConflicts(context);

    return context;

  } catch (error) {
    console.error('Error in getSectionContext:', error);
    throw new Error(`Failed to extract section context: ${error}`);
  }
}

/**
 * Infer field key from user prompt using keyword matching
 */
function inferFieldFromPrompt(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  // Risk-related keywords
  if (promptLower.includes('risk') || promptLower.includes('factor')) {
    return 'sec4_riskfactors1'; // Default to first risk factor
  }
  
  // Director/board keywords
  if (promptLower.includes('director') || promptLower.includes('board')) {
    return 'sec1_boardofdirectors';
  }
  
  // Financial keywords
  if (promptLower.includes('financial') || promptLower.includes('finance')) {
    return 'sec3_issuerfinanposition';
  }
  
  // Securities keywords
  if (promptLower.includes('securities') || promptLower.includes('instrument')) {
    return 'sec5_informaboutsecurts1';
  }
  
  // Fees/costs keywords
  if (promptLower.includes('fee') || promptLower.includes('cost')) {
    return 'sec6_sponsoradvisorfees';
  }
  
  // Default fallback
  return 'sec3_generalinfoissuer';
}

/**
 * Detect missing data that would prevent completion
 */
function detectMissingData(context: SectionContext, field_key: string): string[] {
  const missing: string[] = [];
  
  // Check if document field has real content (not just placeholders)
  const documentFieldValue = context.structured_data?.document_fields?.[field_key];
  const isDocumentFieldEmpty = isFieldValueEmpty(documentFieldValue);
  
  // Check for actual business data based on field type
  const businessDataMissing = checkBusinessDataForField(context, field_key);
  
  if (isDocumentFieldEmpty && businessDataMissing.length > 0) {
    missing.push(`${FIELD_LABELS[field_key] || field_key} requires: ${businessDataMissing.join(', ')}`);
  } else if (isDocumentFieldEmpty) {
    missing.push(`${FIELD_LABELS[field_key] || field_key} not populated in document`);
  }
  
  // Check for uploads if this is a field that typically needs supporting docs
  const docRequiredFields = [
    'sec1_boardofdirectors',
    'sec3_issuerprinpactivities', 
    'sec3_financialstatements',
    'sec4_riskfactors1', 'sec4_riskfactors2', 'sec4_riskfactors3', 'sec4_riskfactors4'
  ];
  
  if (docRequiredFields.includes(field_key) && context.upload_matches.length === 0) {
    missing.push('No supporting documents uploaded');
  }
  
  return missing;
}

/**
 * Check what business data is missing for a specific field
 */
function checkBusinessDataForField(context: SectionContext, field_key: string): string[] {
  const missing: string[] = [];
  const issuer = context.structured_data?.issuer;
  const listing = context.structured_data?.listing;
  
  // Field-specific business data requirements
  switch (field_key) {
    case 'sec1_boardofdirectors':
      if (!issuer?.chief_executiveofficer) missing.push('CEO information');
      if (!issuer?.financial_director) missing.push('Financial Director information');
      if (!issuer?.how_many_directors_total) missing.push('Total number of directors');
      break;
      
    case 'sec1_generalinfo':
    case 'sec3_generalinfoissuer':
      if (!issuer?.issuer_name) missing.push('Company name');
      if (!issuer?.business_overview) missing.push('Business overview');
      if (!issuer?.registered_address) missing.push('Registered address');
      if (!issuer?.incorporation_date) missing.push('Incorporation date');
      break;
      
    case 'sec1_purposeoflisting':
      if (!issuer?.purpose_of_listing) missing.push('Purpose of listing');
      if (!issuer?.use_of_proceeds) missing.push('Use of proceeds');
      break;
      
    case 'sec1_plansafterlisting':
      if (!issuer?.plans_after_listing) missing.push('Plans after listing');
      break;
      
    case 'sec3_issuerprinpactivities':
      if (!issuer?.business_overview) missing.push('Business overview');
      if (!issuer?.company_prospects) missing.push('Company prospects');
      break;
      
    case 'sec3_issuerfinanposition':
      if (!issuer?.recent_performance) missing.push('Recent financial performance');
      if (!issuer?.accounts) missing.push('Financial accounts');
      break;
      
    case 'sec5_informaboutsecurts1':
    case 'sec5_informaboutsecurts2':
      if (!listing?.instrumentname) missing.push('Instrument name');
      if (!listing?.instrumentcategory) missing.push('Instrument category');
      if (!issuer?.shares_in_issue) missing.push('Shares in issue');
      if (!issuer?.nominal_share_price) missing.push('Nominal share price');
      break;
      
    case 'sec6_sponsoradvisorfees':
      if (!issuer?.sponsor_advisors) missing.push('Sponsor/advisor information');
      if (!issuer?.legal_advisors_name) missing.push('Legal advisors');
      break;
  }
  
  return missing;
}

/**
 * Check if a field value is empty or contains only formatting placeholders
 */
function isFieldValueEmpty(value: any): boolean {
  if (!value) return true;
  
  const stringValue = String(value).trim();
  if (stringValue === '') return true;
  
  // Check if value contains only formatting placeholders (stars, hashes, dashes, etc.)
  const formattingOnlyRegex = /^[\s\*#\-_\.]*$/;
  if (formattingOnlyRegex.test(stringValue)) return true;
  
  // Check for common placeholder patterns
  const placeholderPatterns = [
    /^\*+$/,           // Only stars
    /^#+$/,            // Only hashes  
    /^\*\s*\*$/,       // Star space star
    /^#\s*#$/,         // Hash space hash
    /^[\*#\s\-_\.]+$/, // Mix of formatting characters
    /^(TBD|TBC|TODO|N\/A|null|undefined)$/i, // Common placeholders
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(stringValue));
}

/**
 * Detect conflicts between different data sources
 */
function detectSourceConflicts(context: SectionContext): ConflictData[] {
  const conflicts: ConflictData[] = [];
  
  // For now, return empty array - will implement conflict detection
  // when we have multiple sources providing overlapping data
  
  return conflicts;
}

/**
 * Get the assistant mode for a specific field
 */
export function getFieldMode(field_key: string): AssistantMode {
  return FIELD_MODE_MAP[field_key] || 'agent_mode';
}

/**
 * Get the human-readable label for a field
 */
export function getFieldLabel(field_key: string): string {
  return FIELD_LABELS[field_key] || field_key;
} 