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
        // Define the progress update callback function
        const sendProgress = async (update: { progress: number, stage?: string, currentSection?: string }) => {
          try {
            await writer.write(encoder.encode(JSON.stringify({
              type: 'progress',
              cycleId, // Include cycleId for context
              ...update
            }) + '\n'));
          } catch (e) {
            console.error("Error writing progress update to stream:", e);
            // Decide if this should throw or just log
          }
        };

        // Send initial progress
        await sendProgress({ progress: 0, stage: 'Initializing Analysis...' });

        // Prepare document object for the service
        const document: Document = {
          id: documentId,
          sections: sections, // Pass the full sections array received from client
          cycleId
        };

        // Call analysis service ONCE, passing the progress callback
        const analysisResults = await analyzeDocument(document, sendProgress);

        // Send final completion progress
        await sendProgress({ progress: 100, stage: 'Analysis Complete' });
        
        // Send final results object (structure might need adjustment)
        await writer.write(encoder.encode(JSON.stringify({
          type: 'result', // Or use a specific 'analysis_complete' type
          cycleId,
          results: analysisResults // Send the complete result object
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