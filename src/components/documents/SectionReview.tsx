import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, GitPullRequest, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import InteractionTimeline from './InteractionTimeline';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Interaction } from './InteractionTimeline';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { cn } from '@/lib/utils';

interface SectionReviewProps {
  documentId: string;
  sectionId: string;
  reviewCycleId: string;
  content: string;
  version: number;
  onStatusChange?: (status: 'pending' | 'in_progress' | 'completed') => void;
}

type InteractionType = 'comment' | 'revision' | 'approval' | 'rejection';

export default function SectionReview({
  documentId,
  sectionId,
  reviewCycleId,
  content,
  version,
  onStatusChange
}: SectionReviewProps) {
  const { state } = useDocumentAnalysis();
  const [comment, setComment] = useState('');
  const [interactionType, setInteractionType] = useState<InteractionType>('comment');
  const [isLoading, setIsLoading] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  // Get interactions for this section from context
  const sectionInteractions = state.interactions[sectionId] || [];

  // Update section status when interactions change
  useEffect(() => {
    const newStatus = getStatusFromInteractions(sectionInteractions);
    setSectionStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [sectionInteractions, onStatusChange]);

  const getStatusFromInteractions = (ints: Interaction[]): 'pending' | 'in_progress' | 'completed' => {
    if (ints.length === 0) return 'pending';
    const lastInteraction = ints[0];
    if (lastInteraction.type === 'approval') return 'completed';
    if (lastInteraction.type === 'rejection') return 'completed';
    return 'in_progress';
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
          {sectionStatus === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {sectionStatus === 'in_progress' && <GitPullRequest className="w-4 h-4 text-blue-500" />}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {interactionType === 'comment' && <MessageSquare className="w-4 h-4" />}
              {interactionType === 'revision' && <GitPullRequest className="w-4 h-4" />}
              {interactionType === 'approval' && <CheckCircle className="w-4 h-4" />}
              {interactionType === 'rejection' && <XCircle className="w-4 h-4" />}
              <span className="ml-2 capitalize">{interactionType}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setInteractionType('comment')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Comment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInteractionType('revision')}>
              <GitPullRequest className="w-4 h-4 mr-2" />
              Request Revision
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInteractionType('approval')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInteractionType('rejection')}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
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