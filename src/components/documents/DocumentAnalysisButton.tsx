'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { clientLogger } from '@/lib/ai/clientLogger';
import { Loader2, AlertCircle, CheckCircle, Activity, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { type ToastProps } from '@/components/ui/toast';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';

interface Section {
  id: string;
  content: string;
  title?: string;
}

interface AnalysisResult {
  sectionId: string;
  isCompliant: boolean;
  suggestions: string[];
  score: number;
}

interface ProgressData {
  type: 'progress';
  progress: number;
  stage: string;
  currentSection: string;
}

interface ResultData {
  type: 'result';
  sectionResults?: Array<{
    sectionId: string;
    analysisResult: {
      isCompliant: boolean;
      score: number;
      suggestions?: string[];
      metadata?: any;
    };
  }>;
  results?: {
    documentId: string;
    sections: Array<{
      sectionId: string;
      title: string;
      isCompliant: boolean;
      score: number;
      suggestions?: string[];
      metadata?: any;
    }>;
    overallCompliance: boolean;
    timestamp: string;
  };
  compliantSections?: number;
  partiallyCompliantSections?: number;
  nonCompliantSections?: number;
  overallCompliance?: boolean;
}

interface ErrorData {
  type: 'error';
  message: string;
}

interface SectionState {
  isAnalyzed: boolean;
  result?: {
    isCompliant: boolean;
    score: number;
    suggestions?: string[];
    metadata?: any;
  };
}

interface SectionCompleteData {
  type: 'section_complete';
  sectionId: string;
  analysisResult: {
    isCompliant: boolean;
    score: number;
    suggestions?: string[];
    metadata?: any;
  };
}

// Add alternative format that might be used
interface SectionCompleteAltData {
  type: 'sectionComplete';
  sectionId: string;
  analysisResult: {
    isCompliant: boolean;
    score: number;
    suggestions?: string[];
    metadata?: any;
  };
}

// Make the type union accept all possible formats
type StreamData = ProgressData | ResultData | ErrorData | SectionCompleteData | SectionCompleteAltData | Record<string, any>;

// Define Subsection type consistent with analysisService.ts
interface SubsectionFE { 
  id: string;
  title: string;
  content: string;
}

// Update DocumentSection to match the structure used in DocumentSectionReview
interface DocumentSection { 
  id: string; // Main section ID (e.g., 'sec1')
  title: string; // Main section title
  status?: string; // Keep optional status
  subsections: SubsectionFE[]; // Use the subsections array
  // 'content' field removed
}

interface DocumentAnalysisButtonProps {
  documentId: string;
  sections: DocumentSection[]; // This now expects the updated DocumentSection type
  onAnalysisStart?: () => void;
  onReviewCycleCreated?: (cycleId: string) => void;
  onAnalyzingChange?: (analyzing: boolean) => void;
  isExternallyAnalyzing?: boolean;
}

interface AnalysisResultsState {
  sectionResults?: Array<{
    sectionId: string;
    analysisResult: {
      isCompliant: boolean;
      score: number;
      suggestions?: string[];
    };
  }>;
}

export default function DocumentAnalysisButton({
  documentId,
  sections,
  onAnalysisStart,
  onReviewCycleCreated,
  onAnalyzingChange,
  isExternallyAnalyzing = false
}: DocumentAnalysisButtonProps) {
  const { state, dispatch } = useDocumentAnalysis();
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressRef = useRef<number>(0);
  const supabase = getSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const [buttonText, setButtonText] = useState('Analyze with AI');
  const isAnalyzing = state?.isAnalyzing || false;
  
  // Track external analyzing state changes
  useEffect(() => {
    // Only update if there's an actual state change to prevent unnecessary re-renders
    const newAnalyzingState = isExternallyAnalyzing || (state?.isAnalyzing || false);
    
    // Only set state if value has changed
    if (isAnalyzing !== newAnalyzingState) {
      onAnalyzingChange?.(newAnalyzingState);
    }
  }, [isExternallyAnalyzing, state?.isAnalyzing, isAnalyzing, onAnalyzingChange]);
  
  // Notify parent of analyzing state changes
  useEffect(() => {
    if (onAnalyzingChange && state?.isAnalyzing !== undefined) {
      // Only call when the state value actually changes
      onAnalyzingChange(state.isAnalyzing);
    }
  }, [state?.isAnalyzing, onAnalyzingChange]);
  
  // Update button text based on analysis state
  useEffect(() => {
    if (state?.error) {
      setButtonText('Retry Analysis');
    } else if (state?.sectionStates?.[sections[0]?.id]?.isAnalyzed) {
      setButtonText('Re-analyze');
    } else if (isAnalyzing) {
      setButtonText('Analyzing...');
    } else {
      setButtonText('Analyze with AI');
    }
  }, [isAnalyzing, state?.error, state?.sectionStates, sections]);

  useEffect(() => {
    if (!documentId) return;

    // Set up document-level subscription
    const channel = supabase
      .channel(`document_interactions:${documentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'document_interactions',
        filter: `document_id=eq.${documentId}`
      }, (payload) => {
        // Force UI update on new interaction
        dispatch?.({ 
          type: 'ADD_INTERACTION', 
          payload: {
            sectionId: payload.new.section_id,
            interaction: payload.new
          }
        });
      })
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [documentId, dispatch]);

  // Reset error state when unmounting
  useEffect(() => {
    return () => {
      dispatch?.({ type: 'SET_ERROR', payload: null });
    };
  }, [dispatch]);

  const showToast = ({ title, description, variant = 'default' }: { title: string; description: string; variant?: ToastProps['variant'] }) => {
    toast({
      title,
      description,
      variant,
      duration: variant === 'destructive' ? 5000 : 3000,
    });
  };

  const createReviewCycle = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Not authenticated');

      // Get the max cycle number for this document
      const { data: maxCycleData } = await supabase
        .from('document_review_cycles')
        .select('cycle_number')
        .eq('document_id', documentId)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single();

      const nextCycleNumber = (maxCycleData?.cycle_number || 0) + 1;

      const { data, error } = await supabase
        .from('document_review_cycles')
        .insert({
          document_id: documentId,
          cycle_number: nextCycleNumber,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          submitted_by: authData.user.id
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id;
    } catch (error) {
      console.error('Error creating review cycle:', error);
      throw new Error('Failed to create review cycle');
    }
  };

  const createInteractionFromAnalysis = async (sectionId: string, analysisResult: any, cycleId: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Not authenticated');

      if (!sectionId || !cycleId || !analysisResult) {
        throw new Error('Missing required fields for interaction creation');
      }

      const { error } = await supabase
        .from('document_interactions')
        .insert({
          document_id: documentId,
          section_id: sectionId,
          review_cycle_id: cycleId,
          type: 'ai_suggestion',
          content: analysisResult.isCompliant 
            ? 'Section is compliant with requirements'
            : `Section needs revision:\n${analysisResult.suggestions?.join('\n')}`,
          created_by: authData.user.id,
          version: 1,
          created_at: new Date().toISOString(),
          metadata: {
            score: analysisResult.score,
            suggestions: analysisResult.suggestions,
            analysis: analysisResult.metadata?.analysis,
            vectorScore: analysisResult.metadata?.vectorScore,
            category: analysisResult.isCompliant ? 'compliant' : 'needs_revision'
          }
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating interaction:', error);
      dispatch?.({ type: 'SET_ERROR', payload: 'Failed to save analysis results' });
      throw error;
    }
  };

  // Handle cleanup
  const handleCleanup = async (cycleId: string, reason: string = 'cancelled') => {
    try {
      await supabase
        .from('document_review_cycles')
        .update({
          status: reason,
          completed_at: new Date().toISOString()
        })
        .eq('id', cycleId);

      dispatch?.({ type: 'CLEAR_PENDING_OPERATIONS' });
      dispatch?.({ type: 'SET_ANALYZING', payload: false });
      
      showToast({
        title: 'Analysis Stopped',
        description: `Document analysis was ${reason}.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      dispatch?.({ type: 'SET_ERROR', payload: 'Failed to cleanup analysis properly' });
    }
  };

  const handleAnalyze = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log("[AnalyzeBtn] handleAnalyze called (Reverted State).");
    if (isAnalyzing) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    onAnalyzingChange?.(true);
    let cycleId: string | null = null;

    try {
      dispatch?.({ type: 'SET_ANALYZING', payload: true });
      dispatch?.({ type: 'SET_ERROR', payload: null });

      console.log("[AnalyzeBtn] Creating review cycle...");
      cycleId = await createReviewCycle();
      if (!cycleId) throw new Error('Failed to create review cycle');
      console.log(`[AnalyzeBtn] Review cycle created: ${cycleId}`);
      onReviewCycleCreated?.(cycleId);
      onAnalysisStart?.();

      const handleStreamData = (data: StreamData) => {
         console.log("[AnalyzeBtn] Stream Data Received:", data); 
         console.log("[AnalyzeBtn] Stream Data Type:", data.type);  // Explicitly log the type
         
         switch (data.type) {
           case 'progress':
             if ('progress' in data && 'currentSection' in data && 'stage' in data) {
               dispatch?.({ type: 'SET_PROGRESS', payload: { 
                 progress: data.progress, 
                 currentSection: data.currentSection, 
                 stage: data.stage 
               }});
             }
             break;
           case 'section_complete':
             if ('sectionId' in data && 'analysisResult' in data) {
               console.log(`[AnalyzeBtn] Section Complete Data:`, JSON.stringify(data.analysisResult));
               if (cycleId) {
                  createInteractionFromAnalysis(data.sectionId, data.analysisResult, cycleId)
                    .catch(err => console.error("Interaction Error:", err));
               }
               dispatch?.({ type: 'SET_SECTION_RESULT', payload: { 
                 sectionId: data.sectionId, 
                 result: data.analysisResult 
               }});
             }
             break;
           case 'sectionComplete': 
             if ('sectionId' in data && 'analysisResult' in data) {
               console.log(`[AnalyzeBtn] sectionComplete Case - Data:`, data);
               if (cycleId) {
                  createInteractionFromAnalysis(data.sectionId, data.analysisResult, cycleId)
                    .catch(err => console.error("Interaction Error:", err));
                  dispatch?.({ type: 'SET_SECTION_RESULT', payload: { 
                    sectionId: data.sectionId, 
                    result: data.analysisResult 
                  }});
               } else {
                  console.error("[AnalyzeBtn] sectionComplete missing required fields");
               }
             }
             break;
           case 'result': 
             // Handle result with any type to avoid TypeScript errors with dynamic data shape
             const resultData: any = data;
             console.log(`[AnalyzeBtn] Result Case - Data:`, resultData);
             
             // Check for results.sections array which contains all section results
             if (resultData.results?.sections && Array.isArray(resultData.results.sections)) {
               console.log(`[AnalyzeBtn] Found ${resultData.results.sections.length} section results`);
               
               // Process each section result separately
               resultData.results.sections.forEach((sectionResult: any) => {
                 if (sectionResult.sectionId) {
                   console.log(`[AnalyzeBtn] Processing section result for ${sectionResult.sectionId}`);
                   
                   // Each section should have metadata.subsectionResults
                   if (cycleId) {
                     createInteractionFromAnalysis(sectionResult.sectionId, sectionResult, cycleId)
                       .catch(err => console.error("Interaction Error:", err));
                   }
                   
                   dispatch?.({ 
                     type: 'SET_SECTION_RESULT', 
                     payload: { 
                       sectionId: sectionResult.sectionId, 
                       result: sectionResult 
                     } 
                   });
                 }
               });
             }
             // Check for older format with sectionResults array
             else if (resultData.sectionResults && Array.isArray(resultData.sectionResults)) {
               resultData.sectionResults.forEach((secResult: any) => {
                 if (secResult.sectionId && secResult.analysisResult) {
                   console.log(`[AnalyzeBtn] Found section result in 'result' data:`, secResult.sectionId);
                   if (cycleId) {
                     createInteractionFromAnalysis(secResult.sectionId, secResult.analysisResult, cycleId)
                       .catch(err => console.error("Interaction Error:", err));
                   }
                   dispatch?.({ 
                     type: 'SET_SECTION_RESULT', 
                     payload: { 
                       sectionId: secResult.sectionId, 
                       result: secResult.analysisResult 
                     } 
                   });
                 }
               });
             } else {
               console.log("[AnalyzeBtn] Result message doesn't contain expected section data structure");
             }
             break;
           case 'error':
             if ('message' in data) {
               console.error("[AnalyzeBtn] Stream Error Received:", data.message);
               throw new Error(data.message);
             }
             break;
           default:
             console.log("[AnalyzeBtn] Unknown Stream Data Type:", data.type);
             // Try to extract section data if it exists
             if ('sectionId' in data && 'analysisResult' in data) {
               console.log(`[AnalyzeBtn] Found section data in unknown type:`, data.sectionId);
               if (cycleId) {
                 createInteractionFromAnalysis(data.sectionId, data.analysisResult, cycleId)
                   .catch(err => console.error("Interaction Error:", err));
               }
               dispatch?.({ 
                 type: 'SET_SECTION_RESULT', 
                 payload: { 
                   sectionId: data.sectionId, 
                   result: data.analysisResult 
                 } 
               });
             }
         }
       };
      
      console.log("[AnalyzeBtn] Fetching API...");
      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, sections, cycleId }),
        signal: controller.signal
      });
      console.log(`[AnalyzeBtn] API Response Status: ${response.status}`);

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => `Status: ${response.statusText}`);
        console.error("[AnalyzeBtn] API request failed:", errorText);
        throw new Error(`Analysis request failed: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) { console.log("[AnalyzeBtn] Stream finished."); break; }
        if (controller.signal.aborted) throw new Error('Analysis cancelled');
        const chunk = decoder.decode(value);
        console.log("[AnalyzeBtn] Received chunk:", chunk); // Log the raw chunk
        
        const lines = chunk.split('\n').filter(Boolean);
        console.log("[AnalyzeBtn] Parsed lines:", lines); // Log the parsed lines
        
        lines.forEach(line => {
          try { 
            console.log("[AnalyzeBtn] Processing line:", line); // Log each line being processed
            handleStreamData(JSON.parse(line)); 
          }
          catch (err) { console.error("[AnalyzeBtn] Stream JSON parse error:", err, "Line:", line); } 
        });
      }
      
      console.log("[AnalyzeBtn] Analysis complete. Dispatching SET_ANALYZING: false.");
      dispatch?.({ type: 'SET_ANALYZING', payload: false }); 
      onAnalyzingChange?.(false);
      showToast({ title: 'Analysis Complete', description: 'Document analysis finished.' });

    } catch (error: any) {
      console.error("[AnalyzeBtn] Error in handleAnalyze:", error);
      if (error.name !== 'AbortError') {
        dispatch?.({ type: 'SET_ERROR', payload: error.message || 'Unknown analysis error' });
        showToast({ title: 'Analysis Failed', description: error.message || 'Unknown analysis error', variant: 'destructive' });
      } else {
         dispatch?.({ type: 'SET_ERROR', payload: 'Analysis cancelled' });
      }
      // Ensure analyzing state is set false on error
      dispatch?.({ type: 'SET_ANALYZING', payload: false });
      onAnalyzingChange?.(false);
      if (cycleId) { /* Optional: Cleanup cycle on error? handleCleanup(cycleId, 'error'); */ }
    } finally {
       console.log("[AnalyzeBtn] handleAnalyze finally block.");
       abortControllerRef.current = null; 
    }
  };

  // Log state values used in render (keep for debugging)
  console.log("[AnalyzeBtn UI] Rendering - Reverted", { /* Revert logging if needed */ });

  return (
    <div className="flex flex-col gap-4"> 
      <div className="flex flex-col gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                variant="outline"
                className={cn("relative w-full", isAnalyzing && "pr-8")}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {buttonText}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {buttonText}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[300px]">
              {state?.error ? (
                <p className="text-red-500">{state?.error}</p>
              ) : (
                isAnalyzing ? (
                  <p className="animate-pulse">
                    {state?.analysisStage || `Analyzing... ${state?.progress}%`}
                  </p>
                ) : (
                  <p>Start document analysis</p>
                )
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Progress Bar & Status Text */}
        {isAnalyzing && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 relative overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${state?.progress ?? 0}%` }}
              />
            </div>
        )}
        {isAnalyzing && !state?.error && (
            <div className="text-sm text-gray-600 text-center"> 
                {state?.analysisStage || `Analyzing: ${state?.currentSection || '...'}`}
            </div>
        )}
      </div>
    </div>
  );
} 