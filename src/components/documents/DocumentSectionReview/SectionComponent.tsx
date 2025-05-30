'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Section, type AIAnalysisResult } from './types';
import { CheckCircle, Lock, Sparkles, MessageSquare, Edit2, Save } from 'lucide-react';
import DocumentAnalysisButton from '../DocumentAnalysisButton';
import CommentSection from './CommentSection';
import { cn } from '@/lib/utils';

interface SectionComponentProps {
  section: Section;
  onStatusChange: (sectionId: string, status: Section['status']) => void;
  analysisResult?: AIAnalysisResult;
}

export default function SectionComponent({
  section,
  onStatusChange,
  analysisResult
}: SectionComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(section.content);
  const [showComments, setShowComments] = useState(false);

  const handleSave = () => {
    // TODO: Implement save functionality
    setIsEditing(false);
  };

  const getStatusIcon = (status: Section['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-500" />;
      case 'ai reviewed':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{section.title}</h3>
          {getStatusIcon(section.status)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            {section.comments.length}
          </Button>
          {section.status !== 'locked' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <Save className="w-4 h-4" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[200px]"
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            {section.content}
          </div>
        )}

        {analysisResult && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              AI Analysis
            </h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Compliance Score:</span>
                <span className={cn(
                  'text-sm',
                  analysisResult.score >= 0.8 ? 'text-green-600' :
                  analysisResult.score >= 0.5 ? 'text-yellow-600' :
                  'text-red-600'
                )}>
                  {Math.round(analysisResult.score * 100)}%
                </span>
              </div>
              {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                <div className="text-sm space-y-1">
                  <span className="font-medium">Suggestions:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {showComments && (
        <CardFooter>
          <CommentSection
            comments={section.comments}
            onAddComment={(text) => {
              // TODO: Implement add comment functionality
            }}
          />
        </CardFooter>
      )}
    </Card>
  );
} 
