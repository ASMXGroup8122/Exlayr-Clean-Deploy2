'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, GitPullRequest, CheckCircle, XCircle, Loader2, ChevronDown } from 'lucide-react';
import InteractionTimeline from './InteractionTimeline';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Interaction } from './InteractionTimeline';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';

type SectionStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';

interface SectionReviewProps {
  documentId: string;
  sectionId: string;
  reviewCycleId: string;
  content: string;
  version: number;
  onStatusChange: (status: SectionStatus) => void;
  currentStatus: SectionStatus;
}

type InteractionType = 'comment' | 'revision' | 'approval' | 'rejection';

export default function SectionReview({
  documentId,
  sectionId,
  reviewCycleId,
  content,
  version,
  onStatusChange,
  currentStatus
}: SectionReviewProps) {
  const { state } = useDocumentAnalysis();
  const [comment, setComment] = useState('');
  const [interactionType, setInteractionType] = useState<InteractionType>('comment');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const [isOpen, setIsOpen] = useState(false);

  // Get interactions for this section from context
  const sectionInteractions = state.interactions[sectionId] || [];

  // Memoize the status change handler
  const handleStatusChange = useCallback((newStatus: SectionStatus) => {
    onStatusChange(newStatus);
    setIsOpen(false);
  }, [onStatusChange]);

  const getStatusLabel = (status: SectionStatus) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'needs_revision':
        return 'Needs Revision';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
      default:
        return 'Pending Review';
    }
  };

  const getStatusColor = (status: SectionStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('document_interactions')
        .insert({
          document_id: documentId,
          section_id: sectionId,
          review_cycle_id: reviewCycleId,
          content: comment,
          type: interactionType,
          version,
          created_by: user.id,
          metadata: {
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email
          }
        })
        .select()
        .single();

      if (error) throw error;

      setComment('');
      setInteractionType('comment');
      
      toast({
        title: 'Success',
        description: 'Your interaction has been added',
        variant: 'default',
      });

    } catch (error) {
      console.error('Error adding interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add interaction',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg">
      {/* Header with status indicator */}
      <div className="flex items-center justify-between p-2 border-b bg-muted">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Version {version}</span>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {currentStatus === 'approved' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {currentStatus === 'in_progress' && <GitPullRequest className="w-4 h-4 text-blue-500" />}
        </div>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`${getStatusColor(currentStatus)} border-0`}
            >
              {getStatusLabel(currentStatus)}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStatusChange('approved')}>
              Mark as Approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('needs_revision')}>
              Request Revision
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
              Mark In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('rejected')}>
              Mark as Rejected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
              Reset to Pending
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content and Timeline */}
      <div className="p-2">
        <div className="prose prose-sm max-w-none mb-2">
          {content}
        </div>
        
        <InteractionTimeline interactions={sectionInteractions} />

        <div className="mt-2 space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment, request revision, or approve/reject..."
            className="min-h-[100px]"
          />
          <Button 
            onClick={handleSubmit}
            disabled={!comment.trim() || isLoading}
            className={cn(
              'w-full',
              isLoading && 'cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 