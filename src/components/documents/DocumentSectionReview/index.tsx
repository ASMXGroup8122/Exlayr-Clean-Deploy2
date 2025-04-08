'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import DocumentAnalysisButton from '../DocumentAnalysisButton';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import TableOfContents from './TableOfContents';
import SectionComponent from './SectionComponent';
import { Section, Comment } from './types';

interface DocumentSectionReviewProps {
  documentId: string;
  initialSections?: Section[];
}

export default function DocumentSectionReview({ documentId, initialSections = [] }: DocumentSectionReviewProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { state: analysisState } = useDocumentAnalysis();

  const handleSectionStatusChange = (sectionId: string, newStatus: Section['status']) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, status: newStatus }
          : section
      )
    );
  };

  const handleSaveDraft = () => {
    // TODO: Implement save draft functionality
  };

  const handleSubmitForReview = () => {
    // TODO: Implement submit for review functionality
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Table of Contents */}
      <div className="w-64 border-r bg-muted p-4">
        <TableOfContents 
          sections={sections}
          activeSection={activeSection}
          onSectionSelect={setActiveSection}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Document Review</h1>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={handleSubmitForReview}>
              Submit for Review
            </Button>
          </div>
        </div>

        {/* Document Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {sections.map(section => (
              <SectionComponent
                key={section.id}
                section={section}
                onStatusChange={handleSectionStatusChange}
                analysisResult={analysisState?.sectionStates?.[section.id]?.result}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 