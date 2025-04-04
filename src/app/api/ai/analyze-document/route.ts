import { NextRequest } from 'next/server';
import { analyzeDocument, type Document } from '@/lib/ai/analysisService';
import { aiLogger } from '@/lib/ai/aiLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, sections, cycleId } = body;
    
    if (!documentId || !sections || !Array.isArray(sections) || !cycleId) {
      throw new Error('Invalid request. Document ID, sections, and cycle ID are required.');
    }

    // Create a TransformStream for streaming the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start processing in the background
    const processPromise = (async () => {
      try {
        // Initialize document for analysis
        const document: Document = {
          id: documentId,
          sections: [],
          cycleId
        };

        // Send initial progress
        await writer.write(encoder.encode(JSON.stringify({
          type: 'progress',
          progress: 0,
          stage: 'Starting analysis...',
          currentSection: '',
          cycleId
        }) + '\n'));

        // Process and analyze each section individually
        const analyzedSections = [];
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const progress = Math.round((i / sections.length) * 100);
          
          // Send progress update before analyzing
          await writer.write(encoder.encode(JSON.stringify({
            type: 'progress',
            progress,
            stage: `Analyzing section ${i + 1} of ${sections.length}`,
            currentSection: section.id,
            cycleId
          }) + '\n'));

          // Analyze this section
          const sectionDocument: Document = {
            id: documentId,
            sections: [section],
            cycleId
          };

          const sectionResult = await analyzeDocument(sectionDocument);
          const analyzedSection = sectionResult.sections[0];
          analyzedSections.push(analyzedSection);

          // Send section result immediately
          await writer.write(encoder.encode(JSON.stringify({
            type: 'section_complete',
            sectionId: section.id,
            cycleId,
            analysisResult: {
              isCompliant: analyzedSection.isCompliant,
              score: analyzedSection.score,
              suggestions: analyzedSection.suggestions,
              metadata: analyzedSection.metadata
            }
          }) + '\n'));
        }

        // Calculate final statistics
        const compliantSections = analyzedSections.filter(r => r.isCompliant).length;
        const nonCompliantSections = analyzedSections.filter(r => !r.isCompliant).length;
        const partiallyCompliantSections = analyzedSections.filter(r => !r.isCompliant && r.score > 0.5).length;
        const overallCompliance = analyzedSections.every(r => r.isCompliant);

        // Send completion progress
        await writer.write(encoder.encode(JSON.stringify({
          type: 'progress',
          progress: 100,
          stage: 'Analysis complete',
          currentSection: '',
          cycleId
        }) + '\n'));

        // Send final results
        await writer.write(encoder.encode(JSON.stringify({
          type: 'result',
          cycleId,
          sectionResults: analyzedSections.map(section => ({
            sectionId: section.sectionId,
            analysisResult: {
              isCompliant: section.isCompliant,
              score: section.score,
              suggestions: section.suggestions,
              metadata: section.metadata
            }
          })),
          compliantSections,
          partiallyCompliantSections,
          nonCompliantSections,
          overallCompliance
        }) + '\n'));

      } catch (error) {
        console.error('Analysis error:', error);
        await writer.write(encoder.encode(JSON.stringify({
          type: 'error',
          cycleId,
          message: error instanceof Error ? error.message : 'An error occurred during analysis'
        }) + '\n'));
      } finally {
        await writer.close();
      }
    })();

    // Return the stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 