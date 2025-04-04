'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';

interface ComplianceResult {
  sectionId: string;
  compliance: 'compliant' | 'partially-compliant' | 'non-compliant';
  suggestion: string | null;
  score: number;
  metadata?: any;
}

interface AIRevisionRequestProps {
  sectionId: string;
  documentId: string;
  reviewCycleId: string;
  onRequestAdded: () => void;
  onDismiss: () => void;
}

export default function AIRevisionRequest({
  sectionId,
  documentId,
  reviewCycleId,
  onRequestAdded,
  onDismiss
}: AIRevisionRequestProps) {
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [requestAdded, setRequestAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();
  
  // Fetch stored analysis results
  useEffect(() => {
    const fetchAnalysisResults = async () => {
      try {
        const { data, error } = await supabase
          .from('section_version_history')
          .select('*')
          .eq('document_id', documentId)
          .eq('section_id', sectionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // PGRST116 is the error code for "no rows returned" - this is expected when no analysis exists yet
          if (error.code === 'PGRST116') {
            console.log('No analysis results found for this section yet');
            return;
          }
          throw error;
        }

        if (data) {
          setComplianceResult({
            sectionId,
            compliance: data.compliance_score >= 0.7 ? 'compliant' :
                       data.compliance_score >= 0.5 ? 'partially-compliant' :
                       'non-compliant',
            score: data.compliance_score,
            suggestion: data.suggestion || null
          });
        }
      } catch (err) {
        // Only log actual errors, not the expected "no results" case
        if (err && typeof err === 'object' && 'code' in err && err.code !== 'PGRST116') {
          console.error('Error fetching analysis results:', err);
        }
      }
    };

    fetchAnalysisResults();
  }, [documentId, sectionId]);

  const handleRequestRevision = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, get the AI suggestion
      const response = await fetch('/api/ai/suggest-revision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          sectionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI revision suggestion');
      }

      const data = await response.json();

      // Store both the revision request and the comment
      const [revisionResult, commentResult] = await Promise.all([
        // Store in revision_requests table
        supabase.from('revision_requests').insert({
          review_cycle_id: reviewCycleId,
          document_id: documentId,
          section_id: sectionId,
          content: data.suggestion,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
        // Store in comments table for UI display
        fetch('/api/documents/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            sectionId,
            content: data.suggestion,
            commentType: 'revision',
            status: 'pending',
            metadata: {
              aiGenerated: true,
              complianceScore: complianceResult?.score,
              reviewCycleId: reviewCycleId
            }
          }),
        })
      ]);

      if (revisionResult.error) {
        throw revisionResult.error;
      }

      if (!commentResult.ok) {
        const errorData = await commentResult.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to add revision comment');
      }

      // Update the UI to show the new revision request
      setComplianceResult(prev => prev ? {
        ...prev,
        suggestion: data.suggestion
      } : null);
      
      setRequestAdded(true);
      onRequestAdded();

      toast({
        title: 'Revision Request Added',
        description: 'The revision request has been added successfully.',
        variant: 'default',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add revision request';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsDismissed(true);
      onDismiss?.();
    }, 300);
  };

  // If no compliance result or dismissed, don't render anything
  if (!complianceResult || isDismissed) return null;

  const getBgColor = () => {
    switch (complianceResult.compliance) {
      case 'compliant':
        return 'bg-green-50 border-green-200';
      case 'partially-compliant':
        return 'bg-yellow-50 border-yellow-200';
      case 'non-compliant':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (complianceResult.compliance) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'partially-compliant':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'non-compliant':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (complianceResult.compliance) {
      case 'compliant':
        return 'Section Compliant';
      case 'partially-compliant':
        return 'Improvements Suggested';
      case 'non-compliant':
        return 'Revision Required';
      default:
        return 'Analysis Result';
    }
  };

  // Update the useEffect to also fetch existing revision requests
  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Fetch the latest analysis result
        const { data: analysisData, error: analysisError } = await supabase
          .from('section_version_history')
          .select('*')
          .eq('document_id', documentId)
          .eq('section_id', sectionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (analysisError && analysisError.code !== 'PGRST116') {
          throw analysisError;
        }

        // Fetch any existing revision requests
        const { data: revisionData, error: revisionError } = await supabase
          .from('revision_requests')
          .select('*')
          .eq('document_id', documentId)
          .eq('section_id', sectionId)
          .eq('review_cycle_id', reviewCycleId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (revisionError && revisionError.code !== 'PGRST116') {
          throw revisionError;
        }

        if (analysisData) {
          setComplianceResult({
            sectionId,
            compliance: analysisData.compliance_score >= 0.7 ? 'compliant' :
                       analysisData.compliance_score >= 0.5 ? 'partially-compliant' :
                       'non-compliant',
            score: analysisData.compliance_score,
            suggestion: revisionData?.content || analysisData.suggestion || null
          });

          // If we found an existing revision request, mark it as added
          if (revisionData) {
            setRequestAdded(true);
          }
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code !== 'PGRST116') {
          console.error('Error fetching results:', err);
        }
      }
    };

    fetchResults();
  }, [documentId, sectionId, reviewCycleId]);

  return (
    <div 
      className={cn(
        "border rounded-lg p-4 mb-4 relative transition-all duration-300",
        getBgColor(),
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss revision request"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1 flex items-center justify-between">
            <span>{getTitle()}</span>
            {complianceResult.score && (
              <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                Score: {Math.round(complianceResult.score * 100)}%
              </span>
            )}
          </h3>
          {complianceResult.suggestion && (
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              {complianceResult.suggestion}
            </p>
          )}
          {!requestAdded && complianceResult.suggestion && (
            <Button
              onClick={handleRequestRevision}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className={cn(
                "bg-white/75 border-current transition-all hover:bg-white",
                complianceResult.compliance === 'non-compliant' ? "text-red-700 hover:bg-red-50" :
                complianceResult.compliance === 'partially-compliant' ? "text-yellow-700 hover:bg-yellow-50" :
                "text-gray-700 hover:bg-gray-50"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Request Revision'
              )}
            </Button>
          )}
          {requestAdded && (
            <p className="text-sm text-green-600 flex items-center gap-2 bg-white/50 p-2 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              Revision request added successfully
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-2 bg-white/50 p-2 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 