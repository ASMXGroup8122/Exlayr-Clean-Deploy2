'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DocumentComplianceIndicatorProps {
  sectionId: string;
  className?: string;
}

interface ComplianceResult {
  sectionId: string;
  compliance: 'compliant' | 'non-compliant' | 'partially-compliant';
  suggestion: string | null;
}

export default function DocumentComplianceIndicator({ 
  sectionId,
  className
}: DocumentComplianceIndicatorProps) {
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  
  // Listen for document analysis complete event
  useEffect(() => {
    const handleDocumentAnalysisComplete = (event: CustomEvent) => {
      const { results } = event.detail;
      if (!results || !Array.isArray(results)) return;
      
      // Find the result for this section
      const sectionResult = results.find((result: ComplianceResult) => result.sectionId === sectionId);
      if (sectionResult) {
        setComplianceResult(sectionResult);
      }
    };
    
    // Add event listener
    window.addEventListener('document-analysis-complete', handleDocumentAnalysisComplete as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('document-analysis-complete', handleDocumentAnalysisComplete as EventListener);
    };
  }, [sectionId]);
  
  // Always render an icon based on compliance status
  const renderComplianceIcon = () => {
    if (!complianceResult) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Not yet analyzed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    switch (complianceResult.compliance) {
      case 'compliant':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compliant with exchange guidelines</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'partially-compliant':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-semibold">Partially compliant</p>
                  {complianceResult.suggestion && (
                    <p className="text-sm mt-1">{complianceResult.suggestion}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'non-compliant':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-semibold">Non-compliant</p>
                  {complianceResult.suggestion && (
                    <p className="text-sm mt-1">{complianceResult.suggestion}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Unknown compliance status</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };
  
  return (
    <div className={cn("flex items-center", className)}>
      {renderComplianceIcon()}
    </div>
  );
} 