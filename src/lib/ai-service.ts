/**
 * Client-side service for AI API calls
 */

/**
 * Interface for section analysis result
 */
export interface SectionAnalysisResult {
  sectionId: string;
  compliance: 'compliant' | 'non-compliant' | 'partially-compliant';
  suggestion: string | null;
}

/**
 * Interface for document section
 */
export interface DocumentSection {
  id: string;
  title: string;
  content: string;
}

/**
 * Analyze a single section of a document
 * @param sectionId The ID of the section
 * @param sectionTitle The title of the section
 * @param sectionContent The content of the section
 * @returns The analysis result
 */
export async function analyzeSection(
  sectionId: string,
  sectionTitle: string,
  sectionContent: string
): Promise<{
  compliance: 'compliant' | 'non-compliant' | 'partially-compliant';
  issues: Array<{ rule: string; description: string; severity: 'high' | 'medium' | 'low' }>;
  suggestions: string[];
  explanation: string;
}> {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sectionId,
        sectionTitle,
        sectionContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error analyzing section: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error analyzing section:', error);
    throw error;
  }
}

/**
 * Analyze an entire document at once
 * @param documentId The ID of the document
 * @param sections Array of document sections
 * @returns Array of section analysis results
 */
export async function analyzeEntireDocument(
  documentId: string,
  sections: DocumentSection[]
): Promise<SectionAnalysisResult[]> {
  try {
    console.log(`Analyzing entire document: ${documentId} with ${sections.length} sections`);
    
    const response = await fetch('/api/ai/analyze-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        sections,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error analyzing document: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw error;
  }
} 