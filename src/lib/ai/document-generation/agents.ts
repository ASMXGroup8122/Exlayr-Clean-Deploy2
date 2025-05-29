import { createClient } from '@/utils/supabase/server';
import { resolvePlaceholders } from './field-mappings';
import { getOpenAI } from '@/lib/ai/config';

export interface GeneratedSection {
  promptname: string;
  title: string;
  content: string;
  ai_instructions?: string;
}

export interface GenerationParams {
  instrumentid: string;
  instrumentissuerid: string;
  sections: string[];  // ["sec1prompt", "sec2prompt", etc.]
  selectedDocuments?: string[];  // Knowledge base document IDs for RAG
}

export interface AgentOutput {
  instrumentid: string;
  instrumentissuerid: string;
  sections?: GeneratedSection[];
  subsections?: GeneratedSection[];
  skippedTemplates?: string[];
}

// Base Agent Class
export abstract class DocumentAgent {
  abstract name: string;
  abstract execute(input: any): Promise<AgentOutput>;
}

// Stage 1: Template Extraction Agent (replicates N8N Pinecone Vector Prompts tool)
export class PromptExtractionAgent extends DocumentAgent {
  name = "Template Extractor";

  async execute(params: GenerationParams): Promise<AgentOutput> {
    const supabase = await createClient();
    
    // Extract ALL templates from direct_listingprompts table
    const allTemplates: string[] = [];
    
    for (const sectionType of params.sections) {
      // Query for all templates matching the section (e.g., all sec1prompt_* for sec1prompt)
      const { data: sectionTemplates, error } = await supabase
        .from('direct_listingprompts')
        .select('promptname')
        .like('promptname', `${sectionType}%`)
        .order('promptname');
        
      if (error) {
        throw new Error(`Failed to fetch template names for ${sectionType}: ${error.message}`);
      }
      
      console.log(`[PromptExtraction] Found ${sectionTemplates?.length || 0} templates for ${sectionType}`);
      
      // Add all template names to the list
      sectionTemplates?.forEach((template: { promptname: string }) => {
        allTemplates.push(template.promptname);
      });
    }
    
    console.log(`[PromptExtraction] Total templates discovered: ${allTemplates.length}`);
    
    // Process ALL templates - let the output handler handle validation at save time
    const templates: GeneratedSection[] = [];
    
    for (const templateName of allTemplates) {
      // Get the actual template content
      const { data: templateData, error } = await supabase
        .from('direct_listingprompts')
        .select('promptname, prompt')
        .eq('promptname', templateName)
        .single();
        
      if (error || !templateData) {
        console.warn(`[PromptExtraction] Failed to fetch content for ${templateName}:`, error);
        continue;
      }
      
      // Parse the prompt content to extract title and content
      const promptContent = templateData.prompt || '';
      
      console.log(`[PromptExtraction] Processing template: ${templateData.promptname}`);
      console.log(`[PromptExtraction] Template content length: ${promptContent.length}`);
      
      // Extract title from the template name
      let title = this.extractTitle(templateData.promptname, promptContent);
      
      // Extract AI instructions if present (like N8N workflow)
      const aiInstructionsMatch = promptContent.match(/"ai_instructions":\s*"([^"]+)"/);
      const ai_instructions = aiInstructionsMatch ? aiInstructionsMatch[1] : undefined;
      
      // Use the actual template content as the base content
      let content = this.extractContentFromTemplate(promptContent);
      
      // If template is too short or empty, provide a structured placeholder
      if (!content || content.trim().length < 10) {
        content = this.generateStructuredPlaceholder(templateData.promptname, title);
      }
      
      templates.push({
        promptname: templateData.promptname,
        title: title,
        content: content,
        ai_instructions: ai_instructions
      });
      
      console.log(`[PromptExtraction] Added template: ${templateData.promptname} with content length: ${content.length}`);
    }
    
    console.log(`[PromptExtraction] Total templates extracted: ${templates.length}`);
    
    return {
      instrumentid: params.instrumentid,
      instrumentissuerid: params.instrumentissuerid,
      sections: templates
    };
  }
  
  private extractTitle(promptname: string, promptContent: string): string {
    // Try to extract title from prompt content first
    const titleMatches = [
      // Look for title in quotes
      promptContent.match(/"title":\s*"([^"]+)"/i),
      // Look for title after colon
      promptContent.match(/title:\s*([^\n]+)/i),
      // Look for first line that looks like a title
      promptContent.match(/^([A-Z][^:\n]{10,60})/m)
    ];
    
    for (const match of titleMatches) {
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    // Fall back to formatting the prompt name
    return promptname
      .replace(/^sec\d+prompt_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
  
  private extractContentFromTemplate(promptContent: string): string {
    if (!promptContent || promptContent.trim().length === 0) {
      return '';
    }
    
    // Clean up the template content
    let content = promptContent;
    
    // Remove JSON-style metadata if present
    content = content.replace(/"(title|ai_instructions)":\s*"[^"]*"/g, '').trim();
    content = content.replace(/^[{}\s,]+|[{}\s,]+$/g, '').trim();
    
    // Remove leading/trailing quotes if the whole content is quoted
    if (content.startsWith('"') && content.endsWith('"')) {
      content = content.slice(1, -1);
    }
    
    // Unescape common escape sequences
    content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    // If we still have substantial content, return it
    if (content.trim().length > 20) {
      return content.trim();
    }
    
    return '';
  }
  
  private generateStructuredPlaceholder(promptname: string, title: string): string {
    // Generate a structured template with placeholders that will be filled by the DataCompletionAgent
    const sectionTemplates = {
      'warning': `IMPORTANT NOTICE TO INVESTORS

This investment document contains forward-looking statements and important risk disclosures. Potential investors should carefully review all information before making investment decisions.

RISK WARNINGS:
• Past performance does not guarantee future results
• Investment values may fluctuate and can go down as well as up
• Investors may not get back the original amount invested
• This investment may not be suitable for all investors

Prospective investors should seek independent financial and legal advice before investing.`,

      'listingparticulars': `LISTING PARTICULARS

Company: {{public.issuers.organization_name}}
Instrument: {{public.listing.instrumentname}}
Type: {{public.listing.instrumenttype}}
Exchange: {{public.listing.instrumentexchange}}
ISIN: {{public.listing.isin}}
Currency: {{public.listing.instrumentcurrency}}

Number of Securities: {{public.listing.instrumentsecuritiesissued}}
Nominal Value: {{public.listing.nominalvalue}}
Listing Date: {{public.listing.instrumentlistingdate}}

The securities will rank pari passu with existing securities of the same class.`,

      'generalinfo': `GENERAL INFORMATION

{{public.issuers.organization_name}} is a {{public.issuers.legal_structure}} incorporated in {{public.issuers.country}} on {{public.issuers.incorporation_date}} with company registration number {{public.issuers.company_registration_number}}.

The Company's registered address is:
{{public.issuers.registered_address}}

Business Overview:
{{public.issuers.business_overview}}

Website: {{public.issuers.business_website}}
Contact: {{public.issuers.business_email}}

The Company operates in the {{public.issuers.industry}} sector and has established itself as a key player in its market segment.`,

      'corporateadvisors': `CORPORATE ADVISORS

Legal Advisors:
{{public.issuers.legal_advisors_name}}
{{public.issuers.legal_advisors_address}}

Auditors:
{{public.issuers.auditors_name}}
{{public.issuers.auditors_address}}

Sponsor:
{{public.listing.instrumentsponsorname}}

These professional advisors have been appointed by the Company to assist with the listing process and ongoing compliance requirements.`,

      'boardofdirectors': `BOARD OF DIRECTORS

The Company is governed by a board of {{public.issuers.how_many_directors_total}} directors.

Chief Executive Officer:
{{public.issuers.chief_executiveofficer}}
Title: {{public.issuers.ceo_title}}
Nationality: {{public.issuers.ceo_nationality}}

Financial Director:
{{public.issuers.financial_director}}
Title: {{public.issuers.fd_title}}

The board brings extensive experience and expertise to guide the Company's strategic direction and operations.`,

      'purposeoflisting': `PURPOSE OF LISTING

{{public.issuers.purpose_of_listing}}

The listing on {{public.listing.instrumentexchange}} will provide the Company with:
• Access to capital markets for growth financing
• Enhanced corporate profile and credibility
• Improved liquidity for shareholders
• Platform for future strategic initiatives

Use of Proceeds:
{{public.issuers.use_of_proceeds}}`,

      'plansafterlisting': `PLANS FOLLOWING LISTING

Following successful completion of the listing, {{public.issuers.organization_name}} intends to pursue the following strategic initiatives:

{{public.issuers.plans_after_listing}}

SHORT-TERM OBJECTIVES (0-12 months):
• Complete integration of listing proceeds into business operations
• Implement enhanced corporate governance structures
• Execute immediate growth initiatives
• Strengthen operational capabilities

MEDIUM-TERM STRATEGY (1-3 years):
• Expand market presence in core segments
• Pursue strategic acquisitions where appropriate
• Invest in technology and infrastructure upgrades
• Develop new products and services

LONG-TERM VISION (3-5 years):
• Establish market leadership position in key segments
• Achieve sustainable competitive advantages
• Build scalable business platform
• Create long-term value for shareholders

The Company is committed to executing these plans while maintaining focus on operational excellence and shareholder value creation.`,

      'salientpoints': `SALIENT POINTS

Key highlights of {{public.issuers.organization_name}} include:

• Company Name: {{public.issuers.organization_name}}
• Incorporation: {{public.issuers.country}}, {{public.issuers.incorporation_date}}
• Legal Structure: {{public.issuers.legal_structure}}
• Industry: {{public.issuers.industry}}
• Listing Exchange: {{public.listing.instrumentexchange}}
• Instrument Type: {{public.listing.instrumenttype}}

Financial Highlights:
• Authorized Share Capital: {{public.issuers.authorised_share_capital}}
• Shares in Issue: {{public.issuers.shares_in_issue}}
• Nominal Share Price: {{public.issuers.nominal_share_price}}

The Company's strong market position and growth prospects make it an attractive investment opportunity.`,

      'forwardlooking_statements': `FORWARD-LOOKING STATEMENTS

This document contains forward-looking statements regarding {{public.issuers.organization_name}} and its business prospects. These statements are based on current expectations and assumptions and involve known and unknown risks and uncertainties.

Forward-looking statements include, but are not limited to:
• Business strategies and plans
• Growth prospects and market opportunities
• Financial projections and expectations
• Operational performance targets

Actual results may differ materially from those expressed or implied in forward-looking statements due to various factors including market conditions, regulatory changes, competitive pressures, and other business risks.

Investors should not place undue reliance on forward-looking statements, which speak only as of the date of this document. The Company undertakes no obligation to update forward-looking statements except as required by applicable regulations.`,

      'risks1': `SECURITY RISKS

{{public.issuers.organization_name}} may face various security-related risks that could impact its operations and financial performance. Investors should carefully consider these risks before making investment decisions.

The Company has implemented appropriate risk management frameworks and controls to mitigate these exposures where possible.`,

      'title': `{{public.listing.instrumentname}} - LISTING PARTICULARS`,

      'generalrequirements': `GENERAL REQUIREMENTS

This document has been prepared in accordance with the listing requirements of {{public.listing.instrumentexchange}} and applicable securities regulations.

The information contained herein has been compiled by {{public.issuers.organization_name}} and its advisors and is current as of the date of this document.

All information has been verified to the best of the Company's knowledge and belief.`,

      'tableofcontents': `TABLE OF CONTENTS

1. WARNING NOTICE
2. LISTING PARTICULARS
3. GENERAL INFORMATION
4. CORPORATE ADVISORS
5. FORWARD-LOOKING STATEMENTS
6. BOARD OF DIRECTORS
7. SALIENT POINTS
8. PURPOSE OF LISTING
9. PLANS AFTER LISTING
10. RISK FACTORS
11. SECURITIES INFORMATION
12. COSTS AND FEES`,

      'costs': `COSTS AND FEES

The following costs and fees are associated with the listing of {{public.listing.instrumentname}} on {{public.listing.instrumentexchange}}:

Sponsor Fees: {{public.listing.instrumentsponsorfees}}
Legal and Accounting Fees: {{public.listing.instrumentaccountinglegalfees}}
Exchange Fees: {{public.listing.instrumentexchangefees}}
Marketing Costs: {{public.listing.intrumentmarketingcosts}}
Annual Listing Fee: {{public.listing.instrumentannuallistingfee}}

These costs represent the primary expenses associated with achieving and maintaining the listing status.`
    };

    // Determine section type from promptname
    const sectionType = promptname.replace(/^sec\d+prompt_/, '').toLowerCase();
    
    // Return appropriate template or generic one
    return sectionTemplates[sectionType as keyof typeof sectionTemplates] || 
           `${title}

This section contains important information about {{public.issuers.organization_name}} related to ${title.toLowerCase()}.

[Content will be populated with company-specific information]

For more information, please refer to the complete listing documentation.

Generated from template: ${promptname}`;
  }
}

// Stage 2: Compliance & Draft Enhancement Agent (replicates N8N AI Agent - Draft/Compliance)
export class ComplianceAgent extends DocumentAgent {
  name = "Compliance & Draft Generator";

  async execute(templatesOutput: AgentOutput): Promise<AgentOutput> {
    console.log('[ComplianceAgent] Starting compliance enhancement with OpenAI...');
    
    // Get OpenAI client
    const openai = getOpenAI();
    
    // Fetch company data for context
    const supabase = await createClient();
    
    // Get listing data for context
    const { data: listingData } = await supabase
      .from('listing')
      .select('*')
      .eq('instrumentid', templatesOutput.instrumentid)
      .single();
      
    // Get issuer data for context
    const { data: issuerData } = await supabase
      .from('issuers')
      .select('*')
      .eq('id', templatesOutput.instrumentissuerid)
      .single();
    
    const sections = templatesOutput.sections || [];
    
    // Process sections in parallel for much faster performance
    const enhancementPromises = sections.map(async (section) => {
      try {
        console.log(`[ComplianceAgent] Processing ${section.promptname} with AI...`);
        
        // Create context-aware prompt for each section
        const systemPrompt = `You are a professional financial document writer specializing in exchange listing documents. Your task is to take a document template and enhance it with professional, compliant content.

CRITICAL LANGUAGE REQUIREMENTS:
1. ALWAYS use THIRD PERSON language - refer to "the Company", "ASMX Group", or "the Issuer"
2. NEVER use first person pronouns like "we", "our", "us", "I"
3. ALWAYS use formal, objective business language
4. Write from an external perspective as if describing the company to investors

INSTRUCTIONS:
1. Transform the template into professional, well-formatted document content
2. Maintain all placeholder variables ({{...}}) exactly as they are - DO NOT replace them
3. Enhance the language to be professional and compliant with exchange listing requirements
4. Ensure proper structure with clear headings and organized content
5. Add appropriate legal disclaimers and professional language where needed
6. Keep the content factual and avoid speculation
7. Output PLAIN TEXT only - no HTML, markdown, or special formatting
8. Use proper line breaks for readability
9. Use third person throughout: "The Company", "ASMX Group", "the Issuer"

COMPANY CONTEXT:
- Company: ${issuerData?.organization_name || 'The Company'}
- Industry: ${issuerData?.industry || 'Financial Services'}
- Listing Type: ${listingData?.instrumenttype || 'Equity'}
- Exchange: ${listingData?.instrumentexchange || listingData?.exchangename || 'Exchange'}

SECTION TYPE: ${section.title}`;

        const userPrompt = `Please enhance this document section template while preserving all placeholder variables. Ensure ALL language is in THIRD PERSON (the Company, ASMX Group, the Issuer). Output clean text without HTML tags:

TEMPLATE CONTENT:
${section.content}

Transform this into professional, exchange-compliant content using THIRD PERSON ONLY that maintains the structure and placeholders but enhances the language and presentation for a formal listing document.`;

        // Call OpenAI to enhance the section
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use faster model for better performance
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2, // Lower temperature for consistency and speed
          max_tokens: 1500 // Reduced token limit for faster processing
        });

        const enhancedContent = response.choices[0]?.message?.content || section.content;
        
        // Clean HTML tags and excessive formatting
        const cleanContent = this.cleanContent(enhancedContent);
        
        console.log(`[ComplianceAgent] Enhanced ${section.promptname} (${cleanContent.length} characters)`);
        
        return {
          ...section,
          content: cleanContent
        };
        
      } catch (error) {
        console.error(`[ComplianceAgent] Error enhancing ${section.promptname}:`, error);
        // Fall back to original content if AI enhancement fails
        return section;
      }
    });
    
    // Wait for all sections to complete in parallel
    const enhancedSections = await Promise.all(enhancementPromises);
    
    console.log(`[ComplianceAgent] Enhanced ${enhancedSections.length} sections with OpenAI in parallel`);
    
    return {
      instrumentid: templatesOutput.instrumentid,
      instrumentissuerid: templatesOutput.instrumentissuerid,
      sections: enhancedSections
    };
  }
  
  private cleanContent(content: string): string {
    // Remove HTML tags
    let cleaned = content.replace(/<[^>]*>/g, '');
    
    // Remove excessive line breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/#{1,6}\s/g, ''); // Headers
    
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s{3,}/g, '  ');
    
    // Trim and return
    return cleaned.trim();
  }
}

// Stage 3: Data Completion Agent (replicates N8N AI Agent |Completion)
export class DataCompletionAgent extends DocumentAgent {
  name = "Data Completion Specialist";

  async execute(draftOutput: AgentOutput): Promise<AgentOutput> {
    console.log('[DataCompletionAgent] Starting data completion with AI...');
    
    const supabase = await createClient();
    const openai = getOpenAI();
    
    // Fetch listing data (like N8N Supabase LISTING tool)
    const { data: listingData, error: listingError } = await supabase
      .from('listing')
      .select('*')
      .eq('instrumentid', draftOutput.instrumentid)
      .single();
      
    if (listingError) {
      throw new Error(`Failed to fetch listing data: ${listingError.message}`);
    }
    
    // Fetch issuer data (like N8N Supabase ISSUER tool)
    const { data: issuerData, error: issuerError } = await supabase
      .from('issuers')
      .select('*')
      .eq('id', draftOutput.instrumentissuerid)
      .single();
      
    if (issuerError) {
      throw new Error(`Failed to fetch issuer data: ${issuerError.message}`);
    }
    
    const sections = draftOutput.sections || [];
    
    // Process sections in parallel for much faster performance
    const completionPromises = sections.map(async (section) => {
      try {
        console.log(`[DataCompletionAgent] Processing ${section.promptname} with AI data completion...`);
        
        // First, replace basic placeholders with actual data
        let contentWithData = resolvePlaceholders(section.content, listingData, issuerData);
        
        // Create context-aware prompt for AI to generate final professional content
        const systemPrompt = `You are an expert financial document writer. Your task is to take a document template that has been populated with real company data and create the final, professional document section.

CRITICAL LANGUAGE REQUIREMENTS:
1. ALWAYS use THIRD PERSON language - refer to "the Company", "${issuerData?.organization_name || 'ASMX Group'}", or "the Issuer"
2. NEVER use first person pronouns like "we", "our", "us", "I", "my"
3. ALWAYS use formal, objective business language
4. Write from an external, professional perspective describing the company to potential investors
5. Use phrases like "The Company states that...", "According to the Company...", "${issuerData?.organization_name || 'The Company'} operates..."

INSTRUCTIONS:
1. Transform the template into a polished, professional document section
2. Use the provided company data to create coherent, well-written content
3. Maintain factual accuracy - only use the data provided
4. Format the content professionally with proper structure
5. Add appropriate transitions and connecting language between data points
6. Ensure compliance with exchange listing document standards
7. If any data appears to be missing or placeholder-like, handle gracefully
8. Create a well-formatted section that reads naturally
9. Output PLAIN TEXT only - no HTML, markdown, or special formatting
10. Use proper line breaks and spacing for readability
11. Ensure ALL content uses THIRD PERSON perspective throughout

COMPANY CONTEXT:
- Company Name: ${issuerData?.organization_name || 'ASMX Group'}
- Industry: ${issuerData?.industry || 'Financial Services'}
- Listing Type: ${listingData?.instrumenttype || 'Equity'}
- Exchange: ${listingData?.instrumentexchange || listingData?.exchangename || 'the Exchange'}

SECTION TYPE: ${section.title}`;

        const userPrompt = `Please create the final professional version of this document section using ONLY THIRD PERSON language:

CONTENT WITH DATA:
${contentWithData}

Transform this into a polished, professional document section using THIRD PERSON ONLY (the Company, ${issuerData?.organization_name || 'ASMX Group'}, the Issuer) that reads naturally and maintains all the factual information while improving the presentation and flow.`;

        // Call OpenAI to create the final professional version
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use faster model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2, // Lower temperature for consistency and speed
          max_tokens: 2000 // Balanced token limit
        });

        const finalContent = response.choices[0]?.message?.content || contentWithData;
        
        // Clean HTML tags and excessive formatting
        const cleanContent = this.cleanContent(finalContent);
        
        console.log(`[DataCompletionAgent] Completed ${section.promptname} (${cleanContent.length} characters)`);
        
        return {
          ...section,
          content: cleanContent
        };
        
      } catch (error) {
        console.error(`[DataCompletionAgent] Error completing ${section.promptname}:`, error);
        // Fall back to basic placeholder replacement if AI fails
        const fallbackContent = resolvePlaceholders(section.content, listingData, issuerData);
        return {
          ...section,
          content: this.cleanContent(fallbackContent)
        };
      }
    });
    
    // Wait for all sections to complete in parallel
    const completedSections = await Promise.all(completionPromises);
    
    console.log(`[DataCompletionAgent] Completed ${completedSections.length} sections with AI in parallel`);
    
    return {
      instrumentid: draftOutput.instrumentid,
      instrumentissuerid: draftOutput.instrumentissuerid,
      subsections: completedSections  // Changed to subsections to match N8N workflow output
    };
  }
  
  private cleanContent(content: string): string {
    // Remove HTML tags
    let cleaned = content.replace(/<[^>]*>/g, '');
    
    // Remove excessive line breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/#{1,6}\s/g, ''); // Headers
    
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s{3,}/g, '  ');
    
    // Trim and return
    return cleaned.trim();
  }
}

// Document Generation Orchestrator (replicates N8N workflow execution)
export class DocumentGenerationOrchestrator {
  private promptAgent = new PromptExtractionAgent();
  private complianceAgent = new ComplianceAgent();
  private completionAgent = new DataCompletionAgent();
  
  async generateDocument(params: GenerationParams): Promise<AgentOutput> {
    // Stage 1: Extract Templates (like N8N "AI Agent -Prompt")
    console.log('[DocumentGeneration] Stage 1: Extracting templates...');
    const templates = await this.promptAgent.execute(params);
    
    // Stage 2: Enhance with Compliance (like N8N "AI Agent - Draft / Compliance")
    console.log('[DocumentGeneration] Stage 2: Enhancing with compliance...');
    const drafted = await this.complianceAgent.execute(templates);
    
    // Stage 3: Complete with Data (like N8N "AI Agent |Completion")
    console.log('[DocumentGeneration] Stage 3: Completing with data...');
    const completed = await this.completionAgent.execute(drafted);
    
    console.log('[DocumentGeneration] Document generation complete!');
    
    // Return final result with ALL the generated sections for UI display
    return {
      instrumentid: completed.instrumentid,
      instrumentissuerid: completed.instrumentissuerid,
      // Include the final generated sections from completion stage
      sections: completed.subsections || completed.sections || [],
      // Also include validation results for reporting
      skippedTemplates: templates.skippedTemplates
    };
  }
}

// Export the main orchestrator instance
export const documentOrchestrator = new DocumentGenerationOrchestrator(); 