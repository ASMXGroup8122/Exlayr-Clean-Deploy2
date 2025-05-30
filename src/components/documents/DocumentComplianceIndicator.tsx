'use client';

import { useState, useEffect } from 'react';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentComplianceIndicatorProps {
  sectionId: string;
}

export default function DocumentComplianceIndicator({ sectionId }: DocumentComplianceIndicatorProps) {
  const { analysisResult } = useDocumentAnalysis();
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [issues, setIssues] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  useEffect(() => {
    if (analysisResult && analysisResult.sections) {
      const sectionResult = analysisResult.sections.find((section: any) => section.id === sectionId);
      if (sectionResult) {
        setComplianceScore(sectionResult.score);
        setIssues(sectionResult.issues || 0);
        setSuggestions(sectionResult.suggestions || []);
      }
    }
  }, [analysisResult, sectionId]);
  
  if (complianceScore === null) {
    return (
      <div className="flex items-center p-4 border rounded-md bg-gray-50">
        <Clock className="w-5 h-5 text-gray-500 mr-3" />
        <div>
          <h4 className="text-sm font-medium">Compliance Check Pending</h4>
          <p className="text-xs text-gray-500">Run AI analysis to check compliance</p>
        </div>
      </div>
    );
  }
  
  const getStatusColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };
  
  const statusColor = getStatusColor(complianceScore);
  const icon = complianceScore >= 80 ? 
    <CheckCircle className="w-5 h-5 text-green-600 mr-3" /> : 
    <AlertCircle className="w-5 h-5 text-red-600 mr-3" />;
  
  return (
    <div className={`p-4 border rounded-md ${statusColor}`}>
      <div className="flex items-center mb-2">
        {icon}
        <div>
          <h4 className="text-sm font-medium">Compliance Score: {complianceScore}%</h4>
          {issues > 0 ? (
            <p className="text-xs">Found {issues} potential compliance issues</p>
          ) : (
            <p className="text-xs">No compliance issues detected</p>
          )}
        </div>
      </div>
      
      {suggestions.length > 0 && (
        <div className="mt-3 text-sm">
          <h5 className="font-medium mb-1">Suggestions:</h5>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 
