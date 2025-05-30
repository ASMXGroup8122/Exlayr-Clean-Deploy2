'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { clientLogger } from '@/lib/ai/clientLogger';
import { Loader2, AlertCircle, CheckCircle, Activity, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const supabase = getSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const [buttonText, setButtonText] = useState('Analyze with AI');
  
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const isAnalysisRunning = state?.isAnalyzing || isExternallyAnalyzing;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onAnalyzingChange?.(isAnalysisRunning);
  }, [isAnalysisRunning, onAnalyzingChange]);
  
  useEffect(() => {
    if (state?.error) setButtonText('Retry Analysis');
    else if (state?.sectionStates?.[sections[0]?.id]?.isAnalyzed) setButtonText('Re-analyze');
    else if (isAnalysisRunning) setButtonText('Analyzing...');
    else setButtonText('Analyze with AI');
  }, [isAnalysisRunning, state?.error, state?.sectionStates, sections]);

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
    console.log("[AnalyzeBtn] handleAnalyze invoked. Current isAnalysisRunning:", isAnalysisRunning);

    if (isAnalysisRunning) {
      console.log("[AnalyzeBtn] Analysis already running, exiting.");
      return;
    }
    
    console.log("[AnalyzeBtn] Setting isOverlayVisible = true.");
    setIsOverlayVisible(true);

    const buttonElement = e.currentTarget;
    buttonElement.classList.add('button-clicked');
    setTimeout(() => buttonElement.classList.remove('button-clicked'), 200);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let cycleId: string | null = null;

    try {
      console.log("[AnalyzeBtn] Dispatching SET_ANALYZING: true");
      dispatch?.({ type: 'SET_ANALYZING', payload: true });
      dispatch?.({ type: 'SET_ERROR', payload: null });
      onAnalysisStart?.();
      
      console.log("[AnalyzeBtn] Attempting to create review cycle...");
      cycleId = await createReviewCycle(); 
      if (!cycleId) {
         console.error("[AnalyzeBtn] createReviewCycle returned null/undefined ID.");
         throw new Error('Failed to obtain review cycle ID');
      }
      console.log(`[AnalyzeBtn] Review cycle created successfully: ${cycleId}`);
      onReviewCycleCreated?.(cycleId);
      
      const handleStreamData = (data: StreamData) => {
         console.log("[AnalyzeBtn] Stream Data Received:", data); 
         console.log("[AnalyzeBtn] Stream Data Type:", data.type);
         
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
             const resultData: any = data;
             console.log(`[AnalyzeBtn] Result Case - Data:`, resultData);
             
             if (resultData.results?.sections && Array.isArray(resultData.results.sections)) {
               console.log(`[AnalyzeBtn] Found ${resultData.results.sections.length} section results`);
               
               resultData.results.sections.forEach((sectionResult: any) => {
                 if (sectionResult.sectionId) {
                   console.log(`[AnalyzeBtn] Processing section result for ${sectionResult.sectionId}`);
                   
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
      
      console.log("[AnalyzeBtn] Preparing to fetch API: /api/ai/analyze-document");
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, sections, cycleId }),
        signal: controller.signal
      };
      console.log("[AnalyzeBtn] Fetch options prepared:", fetchOptions); 

      const response = await fetch('/api/ai/analyze-document', fetchOptions);
      console.log(`[AnalyzeBtn] Fetch call completed. Response status: ${response.status}`);

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => `Status: ${response.statusText}`);
        console.error("[AnalyzeBtn] API response not OK or body missing:", errorText);
        throw new Error(`Analysis request failed: ${errorText}`);
      }
      console.log("[AnalyzeBtn] API response OK, proceeding to read stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) { console.log("[AnalyzeBtn] Stream finished."); break; }
        if (controller.signal.aborted) throw new Error('Analysis cancelled');
        const chunk = decoder.decode(value);
        console.log("[AnalyzeBtn] Received chunk:", chunk);
        
        const lines = chunk.split('\n').filter(Boolean);
        console.log("[AnalyzeBtn] Parsed lines:", lines);
        
        lines.forEach(line => {
          try { 
            console.log("[AnalyzeBtn] Processing line:", line);
            handleStreamData(JSON.parse(line)); 
          }
          catch (err) { console.error("[AnalyzeBtn] Stream JSON parse error:", err, "Line:", line); } 
        });
      }
      
      console.log("[AnalyzeBtn] Stream finished successfully.");
      showToast({ title: 'Analysis Complete', description: 'Document analysis finished.' });

    } catch (error: any) {
      console.error("[AnalyzeBtn] Error caught within handleAnalyze try block:", error);
       if (error.name !== 'AbortError') {
        dispatch?.({ type: 'SET_ERROR', payload: error.message || 'Unknown analysis error' });
        showToast({ title: 'Analysis Failed', description: error.message || 'Unknown analysis error', variant: 'destructive' });
      } else {
         console.log("[AnalyzeBtn] Analysis aborted by user.");
      }
      if (cycleId && error.name !== 'AbortError') { /* Optional cleanup */ }
    } finally {
       console.log("[AnalyzeBtn] Entering finally block.");
       abortControllerRef.current = null;

       if (!controller.signal.aborted) {
            console.log("[AnalyzeBtn] Dispatching SET_ANALYZING: false in finally.");
            dispatch?.({ type: 'SET_ANALYZING', payload: false });
       } else {
           console.log("[AnalyzeBtn] Aborted, skipping SET_ANALYZING: false in finally.");
       }

       console.log(`[AnalyzeBtn] Setting ${1500}ms timer to set isOverlayVisible = false.`);
       setTimeout(() => {
           if (isMountedRef.current) {
               console.log("[AnalyzeBtn] Timer fired: Setting isOverlayVisible = false.");
               setIsOverlayVisible(false);
           } else {
               console.log("[AnalyzeBtn] Timer fired, but component unmounted.");
           }
       }, 1500); 
    }
  };

  console.log("[AnalyzeBtn UI] Rendering", { 
    isAnalysisRunning, 
    isContextAnalyzing: state?.isAnalyzing,
    isExternallyAnalyzing,
    isOverlayVisible,
    progress: state?.progress
  });

  return (
    <div className="flex flex-col gap-4 relative"> 
      <style jsx global>{`
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        .button-clicked {
          transform: scale(0.98);
          transition: transform 0.1s;
          background-color: #ebf5ff !important;
          border-color: #3b82f6 !important;
        }
        
        .analyze-btn-hover:hover {
          background-color: #f0f9ff;
          border-color: #93c5fd;
        }
      `}</style>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalysisRunning}
          variant={isAnalysisRunning ? "default" : "outline"}
          className={cn(
            "relative w-full overflow-hidden transition-all duration-200 analyze-btn-hover", 
            isAnalysisRunning 
              ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600 animate-[pulse-blue_2s_infinite]" 
              : "hover:bg-blue-50"
          )}
        >
          {isAnalysisRunning && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/30 to-blue-500/0 animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
          )}
          
          {isAnalysisRunning && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-blue-300"
              style={{ width: `${state?.progress ?? 0}%` }}
            />
          )}
          
          <div className="relative z-10 flex items-center justify-center">
            {isAnalysisRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="font-medium">{buttonText}</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {buttonText}
              </>
            )}
          </div>
        </Button>

        {isAnalysisRunning && !state?.error && (
          <div className="text-sm text-blue-700 font-medium text-center animate-pulse"> 
            {state?.analysisStage || `Analyzing ${state?.currentSection || 'document'}... ${state?.progress ?? 0}%`}
          </div>
        )}
      </div>

      {isOverlayVisible && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" style={{pointerEvents: 'none'}}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-[300px] max-w-[80vw]">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            </div>
            
            <h3 className="text-lg font-semibold text-center mb-2">
              {state?.analysisStage || "Analyzing Document..."}
            </h3>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${Math.max(5, state?.progress || 0)}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              {state?.progress ? `${state.progress}% complete` : "Starting analysis..."}
            </p>
            
            {state?.currentSection && (
              <p className="text-sm text-gray-500 text-center mt-2">
                Currently analyzing: <span className="font-medium">{state.currentSection}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
