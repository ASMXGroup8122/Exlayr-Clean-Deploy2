import { sectionAgents } from './agents/sectionAgents';
import { aiLogger } from './logger';

interface SubsectionFE { 
  id: string;
  title: string;
  content: string;
}

interface SectionFE {
  id: string;
  title: string;
  subsections: SubsectionFE[];
  status?: string;
}

export interface Document { 
  id: string;
  cycleId?: string;
  sections: SectionFE[];
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

// --- Helper Function for Placeholder Detection ---
function detectPlaceholders(content: string): string[] {
    if (!content) return [];
    const placeholderPatterns = [
        /\[.*?]/g,       // Matches anything in square brackets [...]
        /TBD/gi,        // Matches TBD (case-insensitive, whole word)
        /XXX+/gi,      // Matches XXX, XXXX, etc. (case-insensitive, whole word)
        /PLACEHOLDER/gi, // Matches PLACEHOLDER
        /INSERT\s*\w+/gi // Matches INSERT followed by a word (e.g., INSERT NAME)
    ];
    const foundPlaceholders: string[] = [];
    placeholderPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            // Add unique matches, limit length for clarity
            matches.forEach(match => {
                 const trimmedMatch = match.length > 30 ? match.substring(0, 27) + '...' : match;
                 if (!foundPlaceholders.includes(trimmedMatch)) {
                     foundPlaceholders.push(trimmedMatch);
                 }
            });
        }
    });
    return foundPlaceholders;
}

// Define type for the progress callback function
type ProgressCallback = (update: { progress: number, stage?: string, currentSection?: string }) => Promise<void>;

// Update analyzeDocument signature to accept the callback
export async function analyzeDocument(
    document: Document, 
    sendProgress?: ProgressCallback // Make callback optional
): Promise<DocumentAnalysisResult> {
  const results: DocumentAnalysisResult = {
    documentId: document.id,
    sections: [],
    overallCompliance: true,
    timestamp: new Date().toISOString()
  };

  aiLogger.logActivity('analysis', `Starting analysis for doc ${document.id}, ${document.sections.length} main sections.`);

  // Process main sections sequentially
  for (const mainSection of document.sections) {
    aiLogger.logActivity('analysis', `Processing main section: ${mainSection.title} with ${mainSection.subsections.length} subsections.`);

    let sectionIsCompliant = true;
    const sectionSuggestions: string[] = [];
    let sectionScoreSum = 0;
    let analyzedSubsectionsCount = 0;
    
    // ---> Declare subsectionResults array HERE <--- 
    const subsectionResults = []; // Array to hold detailed results for each subsection

    // Create a context map for this main section's subsections
    const subsectionContextMap = new Map<string, string>();
    mainSection.subsections.forEach(sub => subsectionContextMap.set(sub.title, sub.content));

    // Send progress update for starting the main section
    await sendProgress?.({ progress: 0, stage: `Starting section: ${mainSection.title}`, currentSection: mainSection.id });

    // --- Analyze subsections SEQUENTIALLY --- 
    const totalSubsections = mainSection.subsections.length;
    for (let i = 0; i < totalSubsections; i++) {
      const subsection = mainSection.subsections[i];
      let analysisOutcome: any;

      // Calculate and send progress BEFORE processing subsection
      const currentProgress = Math.round(((i + 1) / totalSubsections) * 100);
      await sendProgress?.({
          progress: currentProgress,
          stage: `Analyzing: ${subsection.title}`,
          currentSection: mainSection.id // Keep main section ID as current section context
      });

      // --- Placeholder Check ---
      const foundPlaceholders = detectPlaceholders(subsection.content);
      if (foundPlaceholders.length > 0) {
          aiLogger.logActivity('analysis', `  Placeholder(s) detected in subsection: ${subsection.title}`, { placeholders: foundPlaceholders });
          analysisOutcome = {
            subsectionId: subsection.id,
            subsectionTitle: subsection.title,
            isCompliant: false,
            suggestions: [`Placeholder text detected. Please complete or remove: ${foundPlaceholders.join(', ')}`],
            score: 0, 
            error: null
          };
          subsectionResults.push(analysisOutcome); // ---> Store placeholder result
          // Update aggregates directly here for placeholders
          sectionIsCompliant = false;
          results.overallCompliance = false;
          sectionScoreSum += 0; 
          analyzedSubsectionsCount++;
          continue; // Skip agent analysis
      }

      // --- Agent Analysis ---
      try {
        aiLogger.logActivity('analysis', `  Analyzing subsection (sequential): ${subsection.title} (ID: ${subsection.id})`);
        const subsectionType = subsection.title.toLowerCase();
        const agent = subsectionType.includes('risk') ? sectionAgents.risk :
                     subsectionType.includes('financial') ? sectionAgents.financial :
                     subsectionType.includes('governance') ? sectionAgents.governance :
                     sectionAgents.general;
        
        // Pass subsection details AND the context map to the agent
        const agentResult = await agent.analyze(
            subsection.title, 
            subsection.content,
            subsectionContextMap // Pass context map
        );
        
        analysisOutcome = {
            subsectionId: subsection.id,
            subsectionTitle: subsection.title,
            isCompliant: agentResult.isCompliant,
            suggestions: agentResult.suggestions || [],
            score: agentResult.score || 0,
            error: null
        };
      } catch (error) {
        console.error(`Error analyzing subsection "${subsection.title}":`, error);
        aiLogger.logActivity('error', `Error analyzing subsection "${subsection.title}" (ID: ${subsection.id}): ${error}`);
        analysisOutcome = { 
             subsectionId: subsection.id,
             subsectionTitle: subsection.title,
             isCompliant: false,
             suggestions: [`Error occurred during analysis. Details: ${error instanceof Error ? error.message : String(error)}`],
             score: 0,
             error: error instanceof Error ? error.message : String(error)
          }; 
      }
      subsectionResults.push(analysisOutcome); // ---> Store agent or error result

      // --- Aggregate from the analysisOutcome --- 
      analyzedSubsectionsCount++;
      sectionScoreSum += analysisOutcome.score;
      if (!analysisOutcome.isCompliant) {
        sectionIsCompliant = false;
        results.overallCompliance = false;
        if (analysisOutcome.suggestions && analysisOutcome.suggestions.length > 0) {
            sectionSuggestions.push(...analysisOutcome.suggestions.map((s: string) => `[${analysisOutcome.subsectionTitle}] ${s}`));
        }
      }
      // --- End Aggregation --- 

    } // End SEQUENTIAL subsection loop

    // --- Push Aggregated Main Section Result --- 
    results.sections.push({
      sectionId: mainSection.id,
      title: mainSection.title,
      isCompliant: sectionIsCompliant,
      suggestions: sectionSuggestions,
      score: analyzedSubsectionsCount > 0 ? Math.round(sectionScoreSum / analyzedSubsectionsCount) : 0,
      metadata: { 
          analyzedSubsections: analyzedSubsectionsCount,
          // Use the populated subsectionResults array
          subsectionResults: subsectionResults 
      }
    });

  } // End main section loop

  // Log final results structure before returning
  aiLogger.logActivity('analysis', `Analysis complete. Final results structure:`, {
      results: JSON.stringify(results, null, 2) // Log the full structure
  });

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

  // Send final overall progress (optional, API route also sends one)
  // await sendProgress?.({ progress: 100, stage: 'Finished all sections' });
  return results;
} 