export interface DocumentFieldMapping {
  placeholder: string;           // "{{public.issuers.issuer_name}}"
  dataSource: 'listing' | 'issuers';
  column: string;               // "issuer_name"
  dataType: 'text' | 'date' | 'number' | 'jsonb';
  transformation?: 'currency' | 'date_format' | 'percentage';
  fallback?: string;            // Default value if null
}

// Field mappings based on actual database schema and direct_listingprompts templates
export const FIELD_MAPPINGS: DocumentFieldMapping[] = [
  // Issuer Information (from issuers table)
  { placeholder: "{{public.issuers.issuer_name}}", dataSource: "issuers", column: "issuer_name", dataType: "text", fallback: "[Issuer Name]" },
  { placeholder: "{{public.issuers.organization_name}}", dataSource: "issuers", column: "organization_name", dataType: "text", fallback: "[Organization Name]" },
  { placeholder: "{{public.issuers.incorporation_date}}", dataSource: "issuers", column: "incorporation_date", dataType: "date", transformation: "date_format" },
  { placeholder: "{{public.issuers.company_registration_number}}", dataSource: "issuers", column: "company_registration_number", dataType: "number" },
  { placeholder: "{{public.issuers.registered_address}}", dataSource: "issuers", column: "registered_address", dataType: "text" },
  { placeholder: "{{public.issuers.country}}", dataSource: "issuers", column: "country", dataType: "text" },
  { placeholder: "{{public.issuers.legal_structure}}", dataSource: "issuers", column: "legal_structure", dataType: "text" },
  { placeholder: "{{public.issuers.business_website}}", dataSource: "issuers", column: "business_website", dataType: "text" },
  { placeholder: "{{public.issuers.business_email}}", dataSource: "issuers", column: "business_email", dataType: "text" },
  { placeholder: "{{public.issuers.phone_number}}", dataSource: "issuers", column: "phone_number", dataType: "text" },
  
  // Leadership Team
  { placeholder: "{{public.issuers.chief_executiveofficer}}", dataSource: "issuers", column: "chief_executiveofficer", dataType: "text" },
  { placeholder: "{{public.issuers.ceo_title}}", dataSource: "issuers", column: "ceo_title", dataType: "text" },
  { placeholder: "{{public.issuers.ceo_nationality}}", dataSource: "issuers", column: "ceo_nationality", dataType: "text" },
  { placeholder: "{{public.issuers.financial_director}}", dataSource: "issuers", column: "financial_director", dataType: "text" },
  { placeholder: "{{public.issuers.fd_title}}", dataSource: "issuers", column: "fd_title", dataType: "text" },
  { placeholder: "{{public.issuers.how_many_directors_total}}", dataSource: "issuers", column: "how_many_directors_total", dataType: "number" },
  
  // Business Information
  { placeholder: "{{public.issuers.business_overview}}", dataSource: "issuers", column: "business_overview", dataType: "text" },
  { placeholder: "{{public.issuers.company_prospects}}", dataSource: "issuers", column: "company_prospects", dataType: "text" },
  { placeholder: "{{public.issuers.purpose_of_listing}}", dataSource: "issuers", column: "purpose_of_listing", dataType: "text" },
  { placeholder: "{{public.issuers.plans_after_listing}}", dataSource: "issuers", column: "plans_after_listing", dataType: "text" },
  { placeholder: "{{public.issuers.use_of_proceeds}}", dataSource: "issuers", column: "use_of_proceeds", dataType: "text" },
  
  // Share Capital
  { placeholder: "{{public.issuers.authorised_share_capital}}", dataSource: "issuers", column: "authorised_share_capital", dataType: "text" },
  { placeholder: "{{public.issuers.shares_in_issue}}", dataSource: "issuers", column: "shares_in_issue", dataType: "number" },
  { placeholder: "{{public.issuers.nominal_share_price}}", dataSource: "issuers", column: "nominal_share_price", dataType: "text" },
  { placeholder: "{{public.issuers.dividend_policy}}", dataSource: "issuers", column: "dividend_policy", dataType: "text" },
  
  // Professional Advisors
  { placeholder: "{{public.issuers.legal_advisors_name}}", dataSource: "issuers", column: "legal_advisors_name", dataType: "text" },
  { placeholder: "{{public.issuers.legal_advisors_address}}", dataSource: "issuers", column: "legal_advisors_address", dataType: "text" },
  { placeholder: "{{public.issuers.auditors_name}}", dataSource: "issuers", column: "auditors_name", dataType: "text" },
  { placeholder: "{{public.issuers.auditors_address}}", dataSource: "issuers", column: "auditors_address", dataType: "text" },
  
  // Listing Information (from listing table)
  { placeholder: "{{public.listing.instrumentname}}", dataSource: "listing", column: "instrumentname", dataType: "text" },
  { placeholder: "{{public.listing.instrumentticker}}", dataSource: "listing", column: "instrumentticker", dataType: "text" },
  { placeholder: "{{public.listing.instrumentissuername}}", dataSource: "listing", column: "instrumentissuername", dataType: "text" },
  { placeholder: "{{public.listing.instrumentexchange}}", dataSource: "listing", column: "instrumentexchange", dataType: "text" },
  { placeholder: "{{public.listing.intrumentexchange}}", dataSource: "listing", column: "instrumentexchange", dataType: "text" },
  { placeholder: "{{public.listing.exchangename}}", dataSource: "listing", column: "exchangename", dataType: "text" },
  { placeholder: "{{public.listing.instrumentsponsor}}", dataSource: "listing", column: "instrumentsponsor", dataType: "text" },
  { placeholder: "{{public.listing.instrumentsponsorname}}", dataSource: "listing", column: "instrumentsponsorname", dataType: "text" },
  { placeholder: "{{public.listing.instrumentlistingdate}}", dataSource: "listing", column: "instrumentlistingdate", dataType: "date", transformation: "date_format" },
  { placeholder: "{{public.listing.instrumentapprovaldate}}", dataSource: "listing", column: "instrumentapprovaldate", dataType: "date", transformation: "date_format" },
  { placeholder: "{{public.listing.instrumentlistingparticulardate}}", dataSource: "listing", column: "instrumentlistingparticulardate", dataType: "date", transformation: "date_format" },
  { placeholder: "{{public.listing.instrumentlistingprice}}", dataSource: "listing", column: "instrumentlistingprice", dataType: "number", transformation: "currency" },
  { placeholder: "{{public.listing.instrumentcurrency}}", dataSource: "listing", column: "instrumentcurrency", dataType: "text" },
  
  // Securities Details
  { placeholder: "{{public.listing.instrumentsecuritiesissued}}", dataSource: "listing", column: "instrumentsecuritiesissued", dataType: "number" },
  { placeholder: "{{public.listing.instrumentnosecuritiestobelisted}}", dataSource: "listing", column: "instrumentnosecuritiestobelisted", dataType: "number" },
  { placeholder: "{{public.listing.instrumentofferproceeds}}", dataSource: "listing", column: "instrumentofferproceeds", dataType: "text" },
  { placeholder: "{{public.listing.instrumentuseofproceeds}}", dataSource: "listing", column: "instrumentuseofproceeds", dataType: "text" },
  { placeholder: "{{public.listing.instrumentpurposeoflisting}}", dataSource: "listing", column: "instrumentpurposeoflisting", dataType: "text" },
  { placeholder: "{{public.listing.instrumentdividendrights}}", dataSource: "listing", column: "instrumentdividendrights", dataType: "text" },
  { placeholder: "{{public.listing.instrumentpreemptionrights}}", dataSource: "listing", column: "instrumentpreemptionrights", dataType: "text" },
  
  // Costs & Fees
  { placeholder: "{{public.listing.instrumentsponsorfees}}", dataSource: "listing", column: "instrumentsponsorfees", dataType: "text" },
  { placeholder: "{{public.listing.instrumentaccountinglegalfees}}", dataSource: "listing", column: "instrumentaccountinglegalfees", dataType: "text" },
  { placeholder: "{{public.listing.instrumentexchangefees}}", dataSource: "listing", column: "instrumentexchangefees", dataType: "text" },
  { placeholder: "{{public.listing.intrumentmarketingcosts}}", dataSource: "listing", column: "intrumentmarketingcosts", dataType: "text" },
  { placeholder: "{{public.listing.instrumentannuallistingfee}}", dataSource: "listing", column: "instrumentannuallistingfee", dataType: "text" },
  { placeholder: "{{public.listing.instrumentcommission}}", dataSource: "listing", column: "instrumentcommission", dataType: "number", transformation: "percentage" }
];

// Transformation utilities
export const transformValue = (value: any, transformation?: string): string => {
  if (!value) return '';
  
  switch (transformation) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(parseFloat(value));
      
    case 'date_format':
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
      
    case 'percentage':
      return `${parseFloat(value).toFixed(2)}%`;
      
    default:
      return String(value);
  }
};

// Placeholder resolution function
export const resolvePlaceholders = (
  content: string,
  listingData: any,
  issuerData: any
): string => {
  let resolvedContent = content;
  
  FIELD_MAPPINGS.forEach(mapping => {
    const sourceData = mapping.dataSource === 'listing' ? listingData : issuerData;
    const rawValue = sourceData?.[mapping.column];
    const transformedValue = transformValue(rawValue, mapping.transformation);
    const finalValue = transformedValue || mapping.fallback || `[${mapping.column}]`;
    
    // Replace all instances of the placeholder
    const regex = new RegExp(mapping.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    resolvedContent = resolvedContent.replace(regex, finalValue);
  });
  
  return resolvedContent;
}; 