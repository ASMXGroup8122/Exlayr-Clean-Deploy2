import { createClient } from '@/utils/supabase/server';
import type { AgentOutput, GeneratedSection } from './agents';

// Get proper title from database column name (based on doc-transform.ts)
const COLUMN_TO_TITLE_MAPPING: Record<string, string> = {
  'sec1_warning': 'Warning',
  'sec1_listingparticulars': 'Listing Particulars',
  'sec1_generalinfo': 'General Information', 
  'sec1_corporateadvisors': 'Corporate Advisors',
  'sec1_forwardlooking_statements': 'Forward Looking Statements',
  'sec1_boardofdirectors': 'Board of Directors',
  'sec1_salientpoints': 'Salient Points',
  'sec1_purposeoflisting': 'Purpose of Listing',
  'sec1_plansafterlisting': 'Plans After Listing',
  'sec1_documentname': 'Document Name',
  
  'sec2_tableofcontents': 'Table of Contents',
  'sec2_importantdatestimes': 'Important Dates & Times',
  'sec2_generalrequirements': 'General Requirements',
  'sec2_responsibleperson': 'Responsible Person',
  'sec2_securitiesparticulars': 'Securities Particulars',
  'sec2_securitiestowhichthisrelates': 'Securities to Which This Relates',
};

// Section ordering configuration
const SECTION_ORDER: Record<string, string[]> = {
  sec1: [
    'sec1_documentname',
    'sec1_warning',
    'sec1_listingparticulars', 
    'sec1_generalinfo',
    'sec1_corporateadvisors',
    'sec1_forwardlooking_statements',
    'sec1_boardofdirectors',
    'sec1_salientpoints',
    'sec1_purposeoflisting',
    'sec1_plansafterlisting',
    'sec1_issuer_name'
  ],
  sec2: [
    'sec2_title',
    'sec2_tableofcontents',
    'sec2_importantdatestimes',
    'sec2_generalrequirements',
    'sec2_responsibleperson',
    'sec2_securitiesparticulars',
    'sec2_securitiestowhichthisrelates'
  ],
  sec3: [
    'sec3_title',
    'sec3_generalinfoissuer',
    'sec3_issuerprinpactivities',
    'sec3_issuerfinanposition',
    'sec3_issuersadministration_and_man',
    'sec3_recentdevelopments',
    'sec3_financialstatements'
  ],
  sec4: [
    'sec4_title',
    'sec4_risks1',
    'sec4_risks2',
    'sec4_risks3',
    'sec4_risks4',
    'sec4_risks5',
    'sec4_risks6',
    'sec4_risks7',
    'sec4_risks8',
    'sec4_risks9',
    'sec4_risks10',
    'sec4_risks11',
    'sec4_risks12',
    'sec4_risks13',
    'sec4_risks14',
    'sec4_risks15',
    'sec4_risks16'
  ],
  sec5: [
    'sec5_title',
    'sec5_informaboutsecurts1',
    'sec5_informaboutsecurts2',
    'sec5_informaboutsecurts3',
    'sec5_informaboutsecurts4',
    'sec5_informaboutsecurts5',
    'sec5_informaboutsecurts6',
    'sec5_costs'
  ],
  sec6: [
    'sec6_title',
    'sec6_exchange',
    'sec6_sponsoradvisorfees',
    'sec6_accountingandlegalfees',
    'sec6_merjlistingapplication1styearfees',
    'sec6_marketingcosts',
    'sec6_annualfees',
    'sec6_commissionforsubscription',
    'sec6_payingagent',
    'sec6_listingdocuments',
    'sec6_complianceapproved'
  ]
};

export interface DocumentSaveResult {
  success: boolean;
  error?: string;
  sectionsProcessed: number;
  columnsUpdated: string[];
  skippedSections: string[];
}

export class DocumentOutputHandler {
  private availableColumns: string[] = [];
  
  // Cache available columns to avoid repeated queries
  private async getAvailableColumns(): Promise<string[]> {
    if (this.availableColumns.length > 0) {
      return this.availableColumns;
    }
    
    const supabase = await createClient();
    
    try {
      // Get table schema to find available columns
      const { data, error } = await supabase
        .from('listingdocumentdirectlisting')
        .select('*')
        .limit(1);
        
      if (error) {
        console.warn('[DocumentOutput] Could not fetch table schema:', error);
        // Fallback to common columns we know exist
        this.availableColumns = [
          'instrumentid', 'sec1_warning', 'sec1_listingparticulars', 'sec1_generalinfo',
          'sec1_corporateadvisors', 'sec1_forwardlooking_statements', 'sec1_boardofdirectors',
          'sec1_salientpoints', 'sec1_purposeoflisting', 'sec1_plansafterlisting', 'sec1_documentname'
        ];
      } else if (data && data.length > 0) {
        // Extract column names from the first row
        this.availableColumns = Object.keys(data[0]);
        console.log(`[DocumentOutput] Detected ${this.availableColumns.length} available columns`);
      }
      
      return this.availableColumns;
    } catch (error) {
      console.error('[DocumentOutput] Error getting table schema:', error);
      // Return minimal fallback
      return ['instrumentid', 'sec1_warning', 'sec1_generalinfo'];
    }
  }
  
  // Public method to validate templates before generation
  public async validateTemplatesForGeneration(promptNames: string[]): Promise<{
    validTemplates: string[];
    invalidTemplates: string[];
    columnMapping: Record<string, string>;
  }> {
    const columnMapping = await this.generateColumnMapping(promptNames);
    
    const validTemplates: string[] = [];
    const invalidTemplates: string[] = [];
    
    for (const promptName of promptNames) {
      if (columnMapping[promptName]) {
        validTemplates.push(promptName);
      } else {
        invalidTemplates.push(promptName);
      }
    }
    
    console.log(`[DocumentOutput] Template validation: ${validTemplates.length} valid, ${invalidTemplates.length} invalid`);
    if (invalidTemplates.length > 0) {
      console.log(`[DocumentOutput] Templates without database columns:`, invalidTemplates);
    }
    
    return {
      validTemplates,
      invalidTemplates,
      columnMapping
    };
  }

  // Dynamically map prompt names to database columns
  private async generateColumnMapping(promptNames: string[]): Promise<Record<string, string>> {
    const availableColumns = await this.getAvailableColumns();
    const mapping: Record<string, string> = {};
    
    for (const promptName of promptNames) {
      // Try direct mapping first (replace sec1prompt_ with sec1_)
      let dbColumn = promptName.replace(/^sec(\d+)prompt_/, 'sec$1_');
      
      // Special cases for title columns
      if (promptName.endsWith('_title')) {
        const sectionNum = promptName.match(/^sec(\d+)/)?.[1];
        if (sectionNum === '1') {
          dbColumn = 'sec1_documentname'; // Special case for section 1 title
        } else {
          dbColumn = `sec${sectionNum}_title`;
        }
      }
      
      // Check if the column exists in the database
      if (availableColumns.includes(dbColumn)) {
        mapping[promptName] = dbColumn;
        console.log(`[DocumentOutput] Mapped ${promptName} -> ${dbColumn} ✓`);
      } else {
        // Try alternative mappings or skip
        console.warn(`[DocumentOutput] Column ${dbColumn} not found for ${promptName}, skipping`);
      }
    }
    
    return mapping;
  }

  async saveToDatabase(output: AgentOutput): Promise<DocumentSaveResult> {
    const supabase = await createClient();
    
    try {
      // Process each generated section/subsection
      let sections = output.subsections || output.sections || [];
      
      if (sections.length === 0) {
        throw new Error('No sections provided for database save');
      }
      
      // Sort sections in proper order before processing
      sections = this.sortSectionsByOrder(sections);
      console.log(`[DocumentOutput] Sorted ${sections.length} sections in proper order`);
      
      // Generate dynamic column mapping based on what's actually available
      const promptNames = sections.map(s => s.promptname);
      const columnMapping = await this.generateColumnMapping(promptNames);
      
      // Prepare updates object for database
      const updates: Record<string, string> = {};
      const columnsUpdated: string[] = [];
      const skippedSections: string[] = [];
      
      for (const section of sections) {
        // Map prompt name to database column
        const dbColumn = columnMapping[section.promptname];
        
        if (dbColumn) {
          // Format the content properly
          const formattedContent = this.formatContent(section, dbColumn);
          updates[dbColumn] = formattedContent;
          columnsUpdated.push(dbColumn);
          
          console.log(`[DocumentOutput] Mapped ${section.promptname} -> ${dbColumn}`);
        } else {
          skippedSections.push(section.promptname);
          console.warn(`[DocumentOutput] Skipped ${section.promptname} - no matching database column`);
        }
      }
      
      if (Object.keys(updates).length === 0) {
        throw new Error('No valid database columns found for generated content');
      }
      
      // Update the document in database
      const { error } = await supabase
        .from('listingdocumentdirectlisting')
        .update(updates)
        .eq('instrumentid', output.instrumentid);
        
      if (error) {
        throw error;
      }
      
      console.log(`[DocumentOutput] Successfully updated ${columnsUpdated.length} columns in database`);
      if (skippedSections.length > 0) {
        console.log(`[DocumentOutput] Skipped ${skippedSections.length} sections due to missing columns:`, skippedSections);
      }
      
      // Update the output object with sorted sections for return
      output.sections = sections;
      output.subsections = sections;
      
      return {
        success: true,
        sectionsProcessed: sections.length,
        columnsUpdated,
        skippedSections
      };
      
    } catch (error) {
      console.error('[DocumentOutput] Error saving to database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionsProcessed: 0,
        columnsUpdated: [],
        skippedSections: []
      };
    }
  }
  
  private formatContent(section: GeneratedSection, dbColumn: string): string {
    const title = COLUMN_TO_TITLE_MAPPING[dbColumn] || section.title;
    
    // Clean and format the content
    let content = section.content || '';
    
    // Remove any prompt name prefixes that might have leaked through
    content = content.replace(/^sec\d+prompt_\w+\s*:\s*/i, '');
    
    // Ensure proper formatting with title
    if (!content.toUpperCase().startsWith(title.toUpperCase())) {
      content = `${title.toUpperCase()}\n\n${content}`;
    }
    
    // Clean up any duplicate titles or formatting issues
    content = content.replace(/^([A-Z\s]+)\n\n\1/i, '$1');
    
    // Ensure proper line breaks and formatting
    content = content
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Add paragraph breaks after sentences before capitals
      .trim();
    
    return content;
  }

  // Function to sort sections in proper order
  private sortSectionsByOrder(sections: GeneratedSection[]): GeneratedSection[] {
    return sections.sort((a, b) => {
      // Extract section number from prompt name
      const getSectionNum = (promptname: string): number => {
        const match = promptname.match(/^sec(\d+)/);
        return match ? parseInt(match[1]) : 999;
      };
      
      // Extract database column name from prompt name
      const getDbColumn = (promptname: string): string => {
        return promptname.replace(/^sec(\d+)prompt_/, 'sec$1_');
      };
      
      const sectionA = getSectionNum(a.promptname);
      const sectionB = getSectionNum(b.promptname);
      
      // First sort by section number
      if (sectionA !== sectionB) {
        return sectionA - sectionB;
      }
      
      // Within the same section, use defined order
      const dbColumnA = getDbColumn(a.promptname);
      const dbColumnB = getDbColumn(b.promptname);
      const sectionKey = `sec${sectionA}`;
      const order = SECTION_ORDER[sectionKey] || [];
      
      const indexA = order.indexOf(dbColumnA);
      const indexB = order.indexOf(dbColumnB);
      
      // If both are in the order array, use their positions
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the order array, fall back to alphabetical
      return dbColumnA.localeCompare(dbColumnB);
    });
  }
}

// Export the handler instance
export const documentOutputHandler = new DocumentOutputHandler(); 