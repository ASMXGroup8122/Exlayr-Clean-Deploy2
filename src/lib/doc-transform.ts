import { Section, Subsection, Comment } from '@/types/documents';

// Define a mapping from DB column names to user-friendly titles and section groupings
// This should be maintained and expanded based on the actual listingdocumentdirectlisting schema
const sectionMappings: Record<string, { title: string; sectionId: string; sectionTitle: string }> = {
  // Section 1: Document Overview
  sec1_documentname: { title: 'Document Name', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_warning: { title: 'Warning', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_listingparticulars: { title: 'Listing Particulars', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_generalinfo: { title: 'General Information', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_corporateadvisors: { title: 'Corporate Advisors', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_forwardlooking_statements: { title: 'Forward Looking Statements', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_boardofdirectors: { title: 'Board of Directors', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_salientpoints: { title: 'Salient Points', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_purposeoflisting: { title: 'Purpose of Listing', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_plansafterlisting: { title: 'Plans After Listing', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },
  sec1_issuer_name: { title: 'Issuer Name', sectionId: 'sec1', sectionTitle: 'Section 1: Document Overview' },

  // Section 2: Securities Details
  sec2_tableofcontents: { title: 'Table of Contents', sectionId: 'sec2', sectionTitle: 'Section 2: Securities Details' },
  sec2_importantdatestimes: { title: 'Important Dates & Times', sectionId: 'sec2', sectionTitle: 'Section 2: Securities Details' },
  sec2_generalrequirements: { title: 'General Requirements', sectionId: 'sec2', sectionTitle: 'Section 2: Securities Details' },
  sec2_responsibleperson: { title: 'Responsible Person', sectionId: 'sec2', sectionTitle: 'Section 2: Securities Details' },
  sec2_securitiesparticulars: { title: 'Securities Particulars', sectionId: 'sec2', sectionTitle: 'Section 2: Securities Details' },
  sec2_securitiestowhichthisrelates: { title: 'Securities to Which This Relates', sectionId: 'sec2', sectionTitle: 'Section 2: Securities Details' },

  // Section 3: Issuer Information
  sec3_generalinfoissuer: { title: 'General Information', sectionId: 'sec3', sectionTitle: 'Section 3: Issuer Information' },
  sec3_issuerprinpactivities: { title: 'Principal Activities', sectionId: 'sec3', sectionTitle: 'Section 3: Issuer Information' },
  sec3_issuerfinanposition: { title: 'Financial Position', sectionId: 'sec3', sectionTitle: 'Section 3: Issuer Information' },
  sec3_issuersadministration_and_man: { title: 'Administration and Management', sectionId: 'sec3', sectionTitle: 'Section 3: Issuer Information' },
  sec3_recentdevelopments: { title: 'Recent Developments', sectionId: 'sec3', sectionTitle: 'Section 3: Issuer Information' },
  sec3_financialstatements: { title: 'Financial Statements', sectionId: 'sec3', sectionTitle: 'Section 3: Issuer Information' },

  // Section 4: Risk Factors
  sec4_riskfactors1: { title: 'Risk Factors 1', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_riskfactors2: { title: 'Risk Factors 2', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_riskfactors3: { title: 'Risk Factors 3', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_riskfactors4: { title: 'Risk Factors 4', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks5: { title: 'Risk Factors 5', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks6: { title: 'Risk Factors 6', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks7: { title: 'Risk Factors 7', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks8: { title: 'Risk Factors 8', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks9: { title: 'Risk Factors 9', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks10: { title: 'Risk Factors 10', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks11: { title: 'Risk Factors 11', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks12: { title: 'Risk Factors 12', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks13: { title: 'Risk Factors 13', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks14: { title: 'Risk Factors 14', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks15: { title: 'Risk Factors 15', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },
  sec4_risks16: { title: 'Risk Factors 16', sectionId: 'sec4', sectionTitle: 'Section 4: Risk Factors' },

  // Section 5: Securities Information
  sec5_informaboutsecurts1: { title: 'Securities Information 1', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },
  sec5_informaboutsecurts2: { title: 'Securities Information 2', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },
  sec5_informaboutsecurts3: { title: 'Securities Information 3', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },
  sec5_informaboutsecurts4: { title: 'Securities Information 4', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },
  sec5_informaboutsecurts5: { title: 'Securities Information 5', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },
  sec5_informaboutsecurts6: { title: 'Securities Information 6', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },
  sec5_costs: { title: 'Costs', sectionId: 'sec5', sectionTitle: 'Section 5: Securities Information' },

  // Section 6: Costs & Fees
  sec6_exchange: { title: 'Exchange', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_sponsoradvisorfees: { title: 'Sponsor Advisor Fees', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_accountingandlegalfees: { title: 'Accounting and Legal Fees', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_merjlistingapplication1styearfees: { title: 'MERJ Listing Application (1st Year) Fees', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_marketingcosts: { title: 'Marketing Costs', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_annualfees: { title: 'Annual Fees', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_commissionforsubscription: { title: 'Commission for Subscription', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_payingagent: { title: 'Paying Agent', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_listingdocuments: { title: 'Listing Documents', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' },
  sec6_complianceapproved: { title: 'Compliance Approved', sectionId: 'sec6', sectionTitle: 'Section 6: Costs & Fees' }
};

/**
 * Transforms the raw data object from the `listingdocumentdirectlisting` table
 * into an array of hierarchical Section objects.
 * @param docData - The raw data object from the Supabase query.
 * @returns An array of Section objects.
 */
export function transformDocumentData(docData: Record<string, any>): Section[] {
  const sectionsMap: Record<string, Section> = {};
  const documentId = docData.instrumentid; // Assuming instrumentid is the foreign key

  for (const columnKey in docData) {
    const mapping = sectionMappings[columnKey];
    if (mapping) {
      const { title, sectionId, sectionTitle } = mapping;

      // Create section if it doesn't exist
      if (!sectionsMap[sectionId]) {
        sectionsMap[sectionId] = {
          id: sectionId,
          document_id: documentId,
          title: sectionTitle,
          // Get status from dedicated column like 'secX_status' or fallback
          status: docData[`${sectionId}_status`] || 'draft',
          subsections: [],
          // Optionally add created_at, updated_at if available in docData
          created_at: docData.created_at, 
          updated_at: docData.updated_at
        };
      }

      // Add subsection to the section
      sectionsMap[sectionId].subsections.push({
        id: columnKey,
        title: title,
        content: docData[columnKey] || '' // Ensure content is a string
      });
    }
  }

  // Convert map to array and sort sections (optional)
  const sectionsArray = Object.values(sectionsMap);
  // Optional: Sort sections based on ID (e.g., 'sec1', 'sec2')
  sectionsArray.sort((a, b) => {
    const numA = parseInt(a.id.replace('sec', ''), 10);
    const numB = parseInt(b.id.replace('sec', ''), 10);
    return numA - numB;
  });
  
  // Optional: Sort subsections within each section based on columnKey or a defined order
  sectionsArray.forEach(section => {
      section.subsections.sort((a, b) => a.id.localeCompare(b.id)); // Simple alphabetical sort by ID
  });

  return sectionsArray;
}

/**
 * Groups an array of comments by their subsection ID (section_id).
 * @param comments - An array of Comment objects.
 * @returns A record where keys are subsection IDs and values are arrays of comments.
 */
export function groupCommentsBySubsection(comments: Comment[]): Record<string, Comment[]> {
  return comments.reduce((acc, comment) => {
    const key = comment.section_id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(comment);
    return acc;
  }, {} as Record<string, Comment[]>);
} 