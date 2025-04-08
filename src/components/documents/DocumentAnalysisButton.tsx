'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { clientLogger } from '@/lib/ai/clientLogger';
import { AIAgentViewButton } from '@/components/ai-assistant/ExlayrAIAgentView';
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
  sectionResults: Array<{
    sectionId: string;
    analysisResult: {
      isCompliant: boolean;
      score: number;
      suggestions?: string[];
      metadata?: any;
    };
  }>;
  compliantSections: number;
  partiallyCompliantSections: number;
  nonCompliantSections: number;
  overallCompliance: boolean;
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

type StreamData = ProgressData | ResultData | ErrorData | SectionCompleteData;

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  status?: string;
}

interface DocumentAnalysisButtonProps {
  documentId: string;
  sections: DocumentSection[];
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
  const [internalIsAnalyzing, setInternalIsAnalyzing] = useState(false);
  
  // Track external analyzing state changes
  useEffect(() => {
    // Only update if there's an actual state change to prevent unnecessary re-renders
    const newAnalyzingState = isExternallyAnalyzing || (state?.isAnalyzing || false);
    
    // Only set state if value has changed
    if (internalIsAnalyzing !== newAnalyzingState) {
      setInternalIsAnalyzing(newAnalyzingState);
    }
  }, [isExternallyAnalyzing, state?.isAnalyzing, internalIsAnalyzing]);
  
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
    } else if (state?.analysisResult) {
      setButtonText('Re-analyze');
    } else if (internalIsAnalyzing) {
      setButtonText('Analyzing...');
    } else {
      setButtonText('Analyze with AI');
    }
  }, [internalIsAnalyzing, state?.error, state?.analysisResult]);

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
    
    if (internalIsAnalyzing) return;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    onAnalyzingChange?.(true);
    
    try {
      // Start the analysis
      dispatch?.({ type: 'SET_ANALYZING', payload: true });
      dispatch?.({ type: 'SET_ERROR', payload: null });

      // Create a new review cycle
      const cycleId = await createReviewCycle();
      if (!cycleId) throw new Error('Failed to create review cycle');
      
      onReviewCycleCreated?.(cycleId);
      
      // Notify parent component that analysis has started
      onAnalysisStart?.();

      // Create a handler for the stream data that has access to cycleId
      const handleStreamData = (data: StreamData) => {
        switch (data.type) {
          case 'progress':
            dispatch?.({
              type: 'SET_PROGRESS',
              payload: {
                progress: data.progress,
                section: data.currentSection,
                stage: data.stage
              }
            });
            break;

          case 'section_complete':
            const { sectionId, analysisResult } = data;
            createInteractionFromAnalysis(sectionId, analysisResult, cycleId)
              .catch(error => {
                console.error('Error creating interaction:', error);
                dispatch?.({ type: 'SET_ERROR', payload: 'Failed to save analysis results' });
              });
            break;

          case 'error':
            throw new Error(data.message);
        }
      };
      
      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          sections,
          cycleId
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (controller.signal.aborted) {
          throw new Error('Analysis cancelled by user');
        }

        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const data: StreamData = JSON.parse(line);
            handleStreamData(data);
          } catch (error) {
            console.error('Error parsing stream data:', error);
          }
        }
      }

      dispatch?.({ type: 'SET_ANALYZING', payload: false });
      onAnalyzingChange?.(false);
      showToast({
        title: 'Analysis Complete',
        description: 'Document analysis has been completed successfully.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Analysis error:', error);
      dispatch?.({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      dispatch?.({ type: 'SET_ANALYZING', payload: false });
      onAnalyzingChange?.(false);
      showToast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      if (state?.isAnalyzing || internalIsAnalyzing) {
         onAnalyzingChange?.(false);
      }
      abortControllerRef.current = null;
    }
  };

  return (
    <div 
      className="flex flex-col gap-4" 
    >
      <div className="flex flex-col gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={internalIsAnalyzing}
                variant="outline"
                className={cn(
                  "relative w-full",
                  internalIsAnalyzing && "pr-8"
                )}
              >
                {internalIsAnalyzing ? (
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
                internalIsAnalyzing ? (
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

        {/* Progress Bar */}
        {internalIsAnalyzing && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 relative overflow-hidden">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${state?.progress}%` }}
            />
          </div>
        )}

        {/* Current Operation */}
        {internalIsAnalyzing && state?.currentSection && (
          <div className="text-sm text-gray-600 animate-pulse">
            {state?.analysisStage || `Analyzing section ${state?.currentSection}`}
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      <div className="space-y-4">
        {Object.entries(state?.interactions || {}).map(([sectionId, interactions]) => {
          const aiSuggestions = interactions.filter(i => i.type === 'ai_suggestion');
          if (aiSuggestions.length === 0) return null;

          const section = sections.find(s => s.id === sectionId);
          
          return (
            <div key={sectionId} className="p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {section?.title || 'Section'} Analysis Results
              </h3>
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    {suggestion.metadata?.category === 'compliant' ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Compliant</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Needs Revision</span>
                      </div>
                    )}
                    <span className="text-sm font-medium ml-auto">
                      Score: {suggestion.metadata?.score}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {suggestion.content}
                  </p>
                  {suggestion.metadata?.suggestions?.length > 0 && (
                    <ul className="space-y-1 bg-gray-50 p-3 rounded-md">
                      {suggestion.metadata.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start">
                          <span className="mr-2 text-gray-400">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
} 