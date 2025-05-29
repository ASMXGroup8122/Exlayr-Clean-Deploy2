import { NextRequest, NextResponse } from 'next/server';
import { documentOrchestrator } from '@/lib/ai/document-generation/agents';
import { documentOutputHandler } from '@/lib/ai/document-generation/output-handler';
import { createClient } from '@/utils/supabase/server';
import { DocumentOutputHandler } from '@/lib/ai/document-generation/output-handler';

// Progress tracking for real-time updates
const progressStore = new Map<string, {
  stage: string;
  progress: number;
  message: string;
  error?: string;
  completedSections?: string[];
  currentSection?: string;
}>();

// Section completion tracking
const sectionProgressStore = new Map<string, {
  completed: string[];
  total: number;
  currentlyGenerating: string[];
}>();

function generateSessionId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function updateProgress(sessionId: string, stage: string, progress: number, message: string, error?: string, completedSections?: string[], currentSection?: string) {
  progressStore.set(sessionId, { stage, progress, message, error, completedSections, currentSection });
  console.log(`[DocumentGeneration] ${sessionId}: ${stage} (${progress}%) - ${message}`);
}

async function updateSectionProgress(sessionId: string, completedSection: string, total: number, currentlyGenerating: string[] = []) {
  const current = sectionProgressStore.get(sessionId) || { completed: [], total, currentlyGenerating: [] };
  
  if (completedSection && !current.completed.includes(completedSection)) {
    current.completed.push(completedSection);
  }
  
  current.currentlyGenerating = currentlyGenerating;
  current.total = total;
  
  sectionProgressStore.set(sessionId, current);
  
  // Update main progress
  const progressPercent = Math.round((current.completed.length / total) * 60) + 40; // 40-100% for section generation
  await updateProgress(
    sessionId, 
    'generating_sections', 
    progressPercent, 
    `Generated ${current.completed.length}/${total} sections${currentlyGenerating.length > 0 ? `, processing: ${currentlyGenerating.join(', ')}` : ''}`,
    undefined,
    current.completed,
    currentlyGenerating[0]
  );
}

// POST /api/ai/generate-document
export async function POST(request: NextRequest) {
  const sessionId = generateSessionId();
  
  try {
    // Parse request body
    const { 
      instrumentid, 
      instrumentissuerid, 
      sections,           // ["sec1prompt", "sec2prompt", etc.]
      selectedDocuments,  // Knowledge base document IDs for RAG
      documentType = "equity-direct-listing"
    } = await request.json();

    // Validate required parameters
    if (!instrumentid || !instrumentissuerid || !sections || !Array.isArray(sections)) {
      return NextResponse.json({ 
        error: 'Missing required parameters: instrumentid, instrumentissuerid, and sections[]' 
      }, { status: 400 });
    }

    await updateProgress(sessionId, 'starting', 0, 'Initializing document generation...');

    // Verify listing and issuer exist
    const supabase = await createClient();
    
    const { data: listing, error: listingError } = await supabase
      .from('listing')
      .select('instrumentid, instrumentname, instrumentissuerid')
      .eq('instrumentid', instrumentid)
      .single();
      
    if (listingError || !listing) {
      return NextResponse.json({ 
        error: `Listing not found: ${instrumentid}` 
      }, { status: 404 });
    }

    const { data: issuer, error: issuerError } = await supabase
      .from('issuers')
      .select('id, issuer_name')
      .eq('id', instrumentissuerid)
      .single();
      
    if (issuerError || !issuer) {
      return NextResponse.json({ 
        error: `Issuer not found: ${instrumentissuerid}` 
      }, { status: 404 });
    }

    await updateProgress(sessionId, 'validated', 10, `Generating document for ${listing.instrumentname} by ${issuer.issuer_name}`);

    // Stage 1: Template Extraction (10-20%)
    await updateProgress(sessionId, 'extracting', 20, 'Extracting document templates...');
    
    const generationParams = {
      instrumentid,
      instrumentissuerid,
      sections,
      selectedDocuments
    };

    // Execute the optimized 3-stage AI pipeline
    const result = await documentOrchestrator.generateDocument(generationParams);
    
    // Get the actual sections (could be in sections or subsections field)
    const generatedSections = result.sections || result.subsections || [];
    
    await updateProgress(sessionId, 'templates_extracted', 40, `Extracted ${generatedSections.length} section templates${result.skippedTemplates?.length ? `, skipped ${result.skippedTemplates.length} templates without database columns` : ''}`);

    // Stage 4: Save to Database with proper ordering
    await updateProgress(sessionId, 'saving', 80, 'Saving generated sections to database...');
    
    const outputHandler = new DocumentOutputHandler();
    const saveResult = await outputHandler.saveToDatabase(result);
    
    if (!saveResult.success) {
      await updateProgress(sessionId, 'error', 0, `Database save failed: ${saveResult.error}`);
      return NextResponse.json({ 
        success: false, 
        error: saveResult.error 
      }, { status: 500 });
    }

    await updateProgress(sessionId, 'completed', 100, 
      `Document generation completed successfully! Generated ${generatedSections.length} sections and saved ${saveResult.columnsUpdated.length} to database.${result.skippedTemplates?.length ? ` Pre-validation skipped ${result.skippedTemplates.length} templates without database columns.` : ''}`
    );

    console.log(`[DocumentGeneration] Document generation completed for ${sessionId}. Generated ${generatedSections.length} sections, saved ${saveResult.columnsUpdated.length} to database.`);
    if (result.skippedTemplates?.length) {
      console.log(`[DocumentGeneration] Pre-validation skipped templates:`, result.skippedTemplates);
    }

    // Return the generated sections for UI display
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Document generated successfully',
      sections: generatedSections,
      savedCount: saveResult.columnsUpdated.length,
      skippedTemplates: result.skippedTemplates || [],
      stats: {
        totalTemplates: generatedSections.length,
        savedToDatabase: saveResult.columnsUpdated.length,
        skippedTemplates: result.skippedTemplates?.length || 0
      }
    });

  } catch (error: any) {
    console.error('[DocumentGeneration] Error:', error);
    await updateProgress(sessionId, 'error', 0, 'Generation failed', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      sessionId,
      stage: 'error'
    }, { status: 500 });
  }
}

// GET /api/ai/generate-document?sessionId=xxx (Check progress)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  
  const progress = progressStore.get(sessionId);
  const sectionProgress = sectionProgressStore.get(sessionId);
  
  if (!progress) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    sessionId,
    ...progress,
    sectionProgress: sectionProgress || { completed: [], total: 0, currentlyGenerating: [] },
    timestamp: new Date().toISOString()
  });
} 