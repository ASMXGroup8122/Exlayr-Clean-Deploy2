import { sectionAgents } from './agents/sectionAgents';
import { aiLogger } from './logger';

export interface Document {
  id: string;
  cycleId?: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export interface DocumentAnalysisResult {
  documentId: string;
  sections: Array<{
    sectionId: string;
    title: string;
    isCompliant: boolean;
    suggestions: string[];
    score: number;
    metadata?: any;
  }>;
  overallCompliance: boolean;
  timestamp: string;
}

export async function analyzeDocument(document: Document): Promise<DocumentAnalysisResult> {
  const results: DocumentAnalysisResult = {
    documentId: document.id,
    sections: [],
    overallCompliance: true,
    timestamp: new Date().toISOString()
  };

  aiLogger.logActivity('analysis', `Starting document analysis for document ID: ${document.id}`);
  aiLogger.logActivity('analysis', `Analyzing ${document.sections.length} sections for compliance`);

  for (const section of document.sections) {
    try {
      aiLogger.logActivity('analysis', `Analyzing section: ${section.title}`);

      // Determine which agent to use based on section title
      const sectionType = section.title.toLowerCase();
      const agent = sectionType.includes('risk') ? sectionAgents.risk :
                   sectionType.includes('financial') ? sectionAgents.financial :
                   sectionType.includes('governance') ? sectionAgents.governance :
                   sectionAgents.general;

      const analysisResult = await agent.analyze(section.title, section.content);

      aiLogger.logActivity('analysis', `Analysis complete for section: ${section.title}`, {
        agent: agent.constructor.name,
        isCompliant: analysisResult.isCompliant,
        score: analysisResult.score || 0,
        suggestions: analysisResult.suggestions
      });

      results.sections.push({
        sectionId: section.id,
        title: section.title,
        isCompliant: analysisResult.isCompliant,
        suggestions: analysisResult.suggestions || [],
        score: analysisResult.score || 0,
        metadata: analysisResult.metadata
      });

      // Update overall compliance
      if (!analysisResult.isCompliant) {
        results.overallCompliance = false;
      }

    } catch (error) {
      console.error(`Error analyzing section "${section.title}":`, error);
      aiLogger.logActivity('error', `Error analyzing section "${section.title}": ${error}`);
      
      results.sections.push({
        sectionId: section.id,
        title: section.title,
        isCompliant: false,
        suggestions: ['Error occurred during analysis'],
        score: 0
      });
      results.overallCompliance = false;
    }
  }

  // Log final results
  const compliantSections = results.sections.filter(s => s.isCompliant);
  const nonCompliantSections = results.sections.filter(s => !s.isCompliant);

  aiLogger.logActivity('analysis', `Analysis complete: ${compliantSections.length} compliant, ${nonCompliantSections.length} non-compliant sections`, {
    documentId: document.id,
    overallCompliance: results.overallCompliance,
    totalSections: results.sections.length,
    compliantCount: compliantSections.length,
    nonCompliantCount: nonCompliantSections.length
  });

  if (results.overallCompliance) {
    aiLogger.logActivity('analysis', '🎉 Congratulations! All sections are compliant with listing requirements.');
  } else {
    aiLogger.logActivity('analysis', '⚠️ Some sections require attention to meet listing requirements.');
  }

  return results;
} 