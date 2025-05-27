import { SectionContext, AssistantMode } from '../context/getSectionContext';

// Mode-specific prompt templates
const PROMPT_TEMPLATES = {
  document_completion: `You are completing a regulated financial listing document.
Only use the structured data and uploaded documents provided below. Do not invent content.

Field: {{field_key}} ({{section_label}})

Structured Data:
{{structured_data}}

Uploaded Document Matches:
{{upload_matches}}

Memory Context:
{{mem0_results}}

Source Trace: {{source_trace}}
Missing Data: {{missing_flags}}

CRITICAL INSTRUCTIONS:
1. Look for "POPULATED FIELDS" - use this data as your primary source
2. Look for "FIELDS NEEDING COMPLETION" - these contain only placeholders (*, #, etc.) and need real content
3. For any field marked "[PLACEHOLDER - needs completion]", state exactly what information is required
4. Generate complete, professional content using only the populated fields
5. Do not include placeholder symbols (*, #) in your final output
6. If insufficient data exists, specify exactly what additional data or documents are needed

Generate final-form content based on populated fields only. 
For fields needing completion, specify exactly what information is required.`,

  industry_research: `You are generating factual, well-cited content for a regulated listing document.
Use external data only if relevant citations are available.

Field: {{field_key}} ({{section_label}})

Context:
{{structured_data}}

Include:
- Key statistics, trends, and examples relevant to this issuer
- Formal citations for all non-internal content
- Only content that strengthens the issuer's disclosure

Do not use generalities. If data cannot be found, return a citation request or flag for upload.
Generate final-form content with proper citations.`,

  regulatory_guidance: `You are a compliance assistant completing a regulatory document.
Use only internal policies and rulebook text provided.

Field: {{field_key}} ({{section_label}})

Internal Rules and Structured Data:
{{structured_data}}

Uploaded Regulatory Documents:
{{upload_matches}}

Missing Data: {{missing_flags}}

CRITICAL INSTRUCTIONS:
1. If the field contains only formatting placeholders (*, #, etc.) or is empty, clearly state what specific regulatory information is missing
2. Use precise regulatory language and official terminology
3. Do not include placeholder symbols (*, #) in your final output
4. If regulatory templates or standard language exists, use it exactly
5. If information is insufficient for compliance, specify exactly what regulatory documents or approvals are needed

Write a precise and regulation-compliant section using correct language, terms, and tone.
Do not interpret — use official phrasing only.
Generate final-form content that meets regulatory requirements.`,

  agent_mode: `You are an autonomous assistant generating regulatory content.
Determine what combination of structured data, document matches, internal policies, and public sources is needed.

Field: {{field_key}} ({{section_label}})

Available Data:
{{section_context}}

Rules:
- If structured data exists, use it as primary source
- If document matches exist, cite them appropriately  
- If regulatory templates exist, copy official phrasing
- If none exist, state exactly what is missing and recommend an upload

Your output must be:
- Final-form content (no placeholders)
- Fully attributable to sources
- Regulatory compliant

Source Trace: {{source_trace}}
Missing Data: {{missing_flags}}`
};

export interface PromptComposition {
  prompt: string;
  mode: AssistantMode;
  context_summary: string;
  missing_data_notice?: string;
  upload_recommendation?: string;
}

/**
 * Generate mode-specific prompt based on section context
 */
export function composePrompt(
  userPrompt: string,
  sectionContext: SectionContext
): PromptComposition {
  const template = PROMPT_TEMPLATES[sectionContext.mode];
  
  // Replace template variables with actual context data
  let prompt = template
    .replace(/\{\{field_key\}\}/g, sectionContext.field_key)
    .replace(/\{\{section_label\}\}/g, sectionContext.section_label)
    .replace(/\{\{structured_data\}\}/g, formatStructuredData(sectionContext.structured_data))
    .replace(/\{\{upload_matches\}\}/g, formatUploadMatches(sectionContext.upload_matches))
    .replace(/\{\{mem0_results\}\}/g, formatMem0Results(sectionContext.mem0_results))
    .replace(/\{\{source_trace\}\}/g, sectionContext.source_trace.join(', '))
    .replace(/\{\{missing_flags\}\}/g, sectionContext.missing_flags.join(', '))
    .replace(/\{\{section_context\}\}/g, JSON.stringify(sectionContext, null, 2));

  // Add user prompt at the end
  prompt += `\n\nUser Request: "${userPrompt}"`;

  // Generate context summary
  const context_summary = generateContextSummary(sectionContext);
  
  // Generate missing data notice if applicable
  const missing_data_notice = sectionContext.missing_flags.length > 0 
    ? `Missing data detected: ${sectionContext.missing_flags.join(', ')}`
    : undefined;

  // Generate upload recommendation if needed
  const upload_recommendation = shouldRecommendUpload(sectionContext)
    ? generateUploadRecommendation(sectionContext)
    : undefined;

  return {
    prompt,
    mode: sectionContext.mode,
    context_summary,
    missing_data_notice,
    upload_recommendation
  };
}

/**
 * Format structured data for prompt inclusion
 */
function formatStructuredData(data: any): string {
  if (!data || Object.keys(data).length === 0) {
    return 'No structured data available.';
  }

  let result = '';

  // 1. Format BUSINESS DATA from issuer table (MOST IMPORTANT)
  if (data.issuer) {
    const businessData = formatBusinessData(data.issuer);
    if (businessData) {
      result += 'BUSINESS DATA (from issuer database):\n' + businessData;
    }
  }

  // 2. Format LISTING DATA from listing table
  if (data.listing) {
    const listingData = formatListingData(data.listing);
    if (listingData) {
      if (result) result += '\n\n';
      result += 'LISTING DATA (from listing database):\n' + listingData;
    }
  }

  // 3. Format DOCUMENT FIELDS (what's already been filled vs placeholders)
  if (data.document_fields) {
    const documentData = formatDocumentFields(data.document_fields);
    if (documentData) {
      if (result) result += '\n\n';
      result += documentData;
    }
  }

  return result || 'No relevant structured data found.';
}

/**
 * Format business data from issuer table
 */
function formatBusinessData(issuer: any): string {
  const businessFields: string[] = [];
  
  // Company basics
  if (issuer.issuer_name) businessFields.push(`Company Name: ${issuer.issuer_name}`);
  if (issuer.business_overview) businessFields.push(`Business Overview: ${formatFieldValue(issuer.business_overview)}`);
  if (issuer.registered_address) businessFields.push(`Registered Address: ${issuer.registered_address}`);
  if (issuer.incorporation_date) businessFields.push(`Incorporation Date: ${issuer.incorporation_date}`);
  if (issuer.country) businessFields.push(`Country: ${issuer.country}`);
  if (issuer.legal_structure) businessFields.push(`Legal Structure: ${issuer.legal_structure}`);
  
  // Directors
  if (issuer.chief_executiveofficer) businessFields.push(`CEO: ${issuer.chief_executiveofficer}`);
  if (issuer.ceo_title) businessFields.push(`CEO Title: ${issuer.ceo_title}`);
  if (issuer.ceo_nationality) businessFields.push(`CEO Nationality: ${issuer.ceo_nationality}`);
  if (issuer.financial_director) businessFields.push(`Financial Director: ${issuer.financial_director}`);
  if (issuer.how_many_directors_total) businessFields.push(`Total Directors: ${issuer.how_many_directors_total}`);
  
  // Business details
  if (issuer.company_prospects) businessFields.push(`Company Prospects: ${formatFieldValue(issuer.company_prospects)}`);
  if (issuer.purpose_of_listing) businessFields.push(`Purpose of Listing: ${formatFieldValue(issuer.purpose_of_listing)}`);
  if (issuer.plans_after_listing) businessFields.push(`Plans After Listing: ${formatFieldValue(issuer.plans_after_listing)}`);
  if (issuer.use_of_proceeds) businessFields.push(`Use of Proceeds: ${formatFieldValue(issuer.use_of_proceeds)}`);
  
  // Financial
  if (issuer.shares_in_issue) businessFields.push(`Shares in Issue: ${issuer.shares_in_issue}`);
  if (issuer.nominal_share_price) businessFields.push(`Nominal Share Price: ${issuer.nominal_share_price}`);
  if (issuer.recent_performance) businessFields.push(`Recent Performance: ${formatFieldValue(issuer.recent_performance)}`);
  
  // Advisors
  if (issuer.legal_advisors_name) businessFields.push(`Legal Advisors: ${issuer.legal_advisors_name}`);
  if (issuer.auditors_name) businessFields.push(`Auditors: ${issuer.auditors_name}`);
  
  return businessFields.join('\n');
}

/**
 * Format listing data from listing table
 */
function formatListingData(listing: any): string {
  const listingFields: string[] = [];
  
  if (listing.instrumentname) listingFields.push(`Instrument Name: ${listing.instrumentname}`);
  if (listing.instrumentticker) listingFields.push(`Ticker: ${listing.instrumentticker}`);
  if (listing.instrumentcategory) listingFields.push(`Category: ${listing.instrumentcategory}`);
  if (listing.instrumentsubcategory) listingFields.push(`Subcategory: ${listing.instrumentsubcategory}`);
  if (listing.instrumentexchange) listingFields.push(`Exchange: ${listing.instrumentexchange}`);
  if (listing.instrumentlistingdate) listingFields.push(`Listing Date: ${listing.instrumentlistingdate}`);
  if (listing.instrumentsponsor) listingFields.push(`Sponsor: ${listing.instrumentsponsor}`);
  
  return listingFields.join('\n');
}

/**
 * Format document fields (what's filled vs placeholders)
 */
function formatDocumentFields(documentFields: any): string {
  const populatedFields: string[] = [];
  const placeholderFields: string[] = [];
  
  Object.entries(documentFields)
    .filter(([key, value]) => {
      // Skip internal fields and listing reference
      return !key.includes('_status') && !key.includes('_id') && key !== 'listing' && key !== 'instrumentid';
    })
    .forEach(([key, value]) => {
      const fieldLabel = getFieldLabel(key);
      
      if (value && !isValueEmptyOrPlaceholder(value)) {
        // Field has real content
        const formattedValue = formatFieldValue(value);
        populatedFields.push(`${fieldLabel}: ${formattedValue}`);
      } else if (value && isValueEmptyOrPlaceholder(value)) {
        // Field exists but contains only placeholders
        placeholderFields.push(`${fieldLabel}: [PLACEHOLDER - needs completion]`);
      }
    });

  let result = '';
  
  if (populatedFields.length > 0) {
    result += 'DOCUMENT FIELDS (already completed):\n' + populatedFields.join('\n');
  }
  
  if (placeholderFields.length > 0) {
    if (result) result += '\n\n';
    result += 'DOCUMENT FIELDS (needing completion):\n' + placeholderFields.join('\n');
  }
  
  return result;
}

/**
 * Check if a value is empty or contains only formatting placeholders
 */
function isValueEmptyOrPlaceholder(value: any): boolean {
  if (!value) return true;
  
  const stringValue = String(value).trim();
  if (stringValue === '') return true;
  
  // Check if value contains only formatting placeholders
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
 * Format a field value for display, preserving important formatting
 */
function formatFieldValue(value: any): string {
  if (!value) return 'Not provided';
  
  const stringValue = String(value);
  
  // If it's a long text field, truncate for prompt efficiency
  if (stringValue.length > 500) {
    return stringValue.substring(0, 500) + '... [truncated]';
  }
  
  return stringValue;
}

/**
 * Get field label with fallback
 */
function getFieldLabel(fieldKey: string): string {
  // Import the field labels from getSectionContext
  const fieldLabels: Record<string, string> = {
    'sec1_issuer_name': 'Issuer Name',
    'sec1_boardofdirectors': 'Board of Directors',
    'sec1_corporateadvisors': 'Corporate Advisors',
    'sec1_generalinfo': 'General Information',
    'sec1_listingparticulars': 'Listing Particulars',
    'sec1_purposeoflisting': 'Purpose of Listing',
    'sec1_plansafterlisting': 'Plans After Listing',
    'sec1_salientpoints': 'Salient Points',
    'sec2_tableofcontents': 'Table of Contents',
    'sec2_importantdatestimes': 'Important Dates and Times',
    'sec2_generalrequirements': 'General Requirements',
    'sec2_responsibleperson': 'Responsible Person',
    'sec2_securitiesparticulars': 'Securities Particulars',
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
    'sec6_complianceapproved': 'Compliance Approved'
  };
  
  return fieldLabels[fieldKey] || fieldKey;
}

/**
 * Format uploaded document matches for prompt inclusion
 */
function formatUploadMatches(uploads: any[]): string {
  if (!uploads || uploads.length === 0) {
    return 'No uploaded documents found.';
  }

  return uploads
    .map(doc => `- ${doc.name} (${doc.type || 'Unknown type'}) - ${doc.description || 'No description'}`)
    .join('\n');
}

/**
 * Format Mem0 results for prompt inclusion
 */
function formatMem0Results(mem0Results: any[]): string {
  if (!mem0Results || mem0Results.length === 0) {
    return 'No memory context available.';
  }

  const sections: string[] = [];

  // Group memories by type
  const sectionMemories = mem0Results.filter(m => m.type === 'section_memory');
  const entityFacts = mem0Results.filter(m => m.type === 'entity_fact');
  const toneReferences = mem0Results.filter(m => m.type === 'tone_reference');

  // Format section memories
  if (sectionMemories.length > 0) {
    sections.push('**Prior Section Completions:**');
    sectionMemories.forEach((memory, index) => {
      sections.push(`${index + 1}. ${memory.memory} (Score: ${memory.score?.toFixed(2) || 'N/A'})`);
    });
  }

  // Format entity facts
  if (entityFacts.length > 0) {
    sections.push('\n**Entity Facts:**');
    entityFacts.forEach((memory, index) => {
      sections.push(`${index + 1}. ${memory.memory} (Score: ${memory.score?.toFixed(2) || 'N/A'})`);
    });
  }

  // Format tone references
  if (toneReferences.length > 0) {
    sections.push('\n**Tone References:**');
    toneReferences.forEach((memory, index) => {
      sections.push(`${index + 1}. ${memory.memory} (Score: ${memory.score?.toFixed(2) || 'N/A'})`);
    });
  }

  return sections.join('\n');
}

/**
 * Generate a human-readable context summary
 */
function generateContextSummary(context: SectionContext): string {
  const sources = context.source_trace.length > 0 
    ? `Sources: ${context.source_trace.join(', ')}`
    : 'No data sources available';
  
  const mode = `Mode: ${context.mode}`;
  const field = `Field: ${context.section_label}`;
  
  return `${field} | ${mode} | ${sources}`;
}

/**
 * Determine if upload should be recommended
 */
function shouldRecommendUpload(context: SectionContext): boolean {
  // Recommend upload if:
  // 1. Missing business data that could come from documents
  // 2. No uploaded documents found for fields that typically need them
  // 3. Document field is empty/placeholder and no business data exists
  
  const hasUploads = context.upload_matches.length > 0;
  const hasMissingData = context.missing_flags.length > 0;
  
  const docRequiredFields = [
    'sec1_boardofdirectors',
    'sec3_issuerprinpactivities',
    'sec3_financialstatements',
    'sec3_issuerfinanposition',
    'sec4_riskfactors1', 'sec4_riskfactors2', 'sec4_riskfactors3', 'sec4_riskfactors4'
  ];

  // Always recommend upload if field typically needs documents and none exist
  if (docRequiredFields.includes(context.field_key) && !hasUploads) {
    return true;
  }

  // Recommend upload if there's missing business data
  if (hasMissingData && !hasUploads) {
    return true;
  }

  return false;
}

/**
 * Generate upload recommendation message
 */
function generateUploadRecommendation(context: SectionContext): string {
  const fieldType = context.field_key.split('_')[0];
  const missingData = context.missing_flags;
  
  // Field-specific recommendations based on what's missing
  const fieldRecommendations: Record<string, string> = {
    sec1_boardofdirectors: 'Upload director CVs, board resolutions, or corporate governance documents.',
    sec1_generalinfo: 'Upload company registration documents, articles of incorporation, or company profiles.',
    sec3_issuerprinpactivities: 'Upload business plans, annual reports, or company overview documents.',
    sec3_financialstatements: 'Upload audited financial statements, management accounts, or financial reports.',
    sec3_issuerfinanposition: 'Upload recent financial statements, cash flow reports, or financial analysis.',
    sec4_riskfactors1: 'Upload risk assessments, audit reports, or regulatory compliance documents.',
    sec4_riskfactors2: 'Upload risk management policies, insurance documents, or regulatory filings.',
    sec4_riskfactors3: 'Upload operational risk assessments or business continuity plans.',
    sec4_riskfactors4: 'Upload market analysis, competitive assessments, or industry reports.',
    sec5_informaboutsecurts1: 'Upload securities documentation, share certificates, or instrument specifications.',
    sec6_sponsoradvisorfees: 'Upload advisor agreements, fee schedules, or professional service contracts.'
  };

  const specificRecommendation = fieldRecommendations[context.field_key];
  
  if (specificRecommendation) {
    let message = specificRecommendation;
    if (missingData.length > 0) {
      message += ` This will help provide the missing: ${missingData.join(', ')}.`;
    }
    return message;
  }

  // Fallback to section-based recommendations
  const sectionRecommendations: Record<string, string> = {
    sec1: 'Upload corporate documents, board resolutions, or company profiles.',
    sec3: 'Upload financial statements, business plans, or management reports.',
    sec4: 'Upload risk assessments, audit reports, or regulatory filings.',
    sec5: 'Upload securities documentation or instrument specifications.',
    sec6: 'Upload fee schedules, compliance certificates, or exchange documentation.'
  };

  const baseRecommendation = sectionRecommendations[fieldType] || 'Upload relevant supporting documents.';
  
  let message = baseRecommendation;
  if (missingData.length > 0) {
    message += ` This will help provide the missing: ${missingData.join(', ')}.`;
  }
  
  return message;
}

/**
 * Create a system message for the AI based on the mode
 */
export function createSystemMessage(mode: AssistantMode): string {
  const systemMessages = {
    document_completion: 'You are a regulatory document completion assistant. Generate final-form content based only on provided structured data and uploaded documents. Never hallucinate facts. If data contains only formatting placeholders (*, #) or is missing, clearly state what information is needed. Do not output placeholder symbols in final content.',
    
    industry_research: 'You are a research assistant for regulatory documents. Provide factual, well-cited content. All external facts must include proper citations. If insufficient data is available, specify exactly what research or documentation is needed.',
    
    regulatory_guidance: 'You are a compliance assistant. Use only official regulatory language and internal policies. Generate precise, regulation-compliant content. If regulatory information is missing or contains only placeholders, specify exactly what compliance documents or approvals are required.',
    
    agent_mode: 'You are an autonomous regulatory document assistant. Determine the best approach and generate final-form, compliant content. Be transparent about sources and limitations. If data is missing or contains only formatting placeholders, clearly identify what is needed and recommend appropriate action.'
  };

  return systemMessages[mode];
} 