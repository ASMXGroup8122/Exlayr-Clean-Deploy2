'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface CommentUser {
  email?: string;
}

interface DatabaseComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  section_id: string;
  users?: CommentUser;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  section_id: string;
  user_email?: string;
}

interface DocumentCommentSectionProps {
  sectionId: string;
  documentId: string;
  commentType: 'comment' | 'revision' | 'approval' | 'rejection';
}

export default function DocumentCommentSection({ sectionId, documentId, commentType }: DocumentCommentSectionProps) {
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseClient();
  const fetchInProgress = useRef(false);

  // Memoize the fetch function to prevent recreation on every render
  const fetchComments = useCallback(async () => {
    if (!sectionId || fetchInProgress.current) return;
    
    try {
      fetchInProgress.current = true;
      console.log('Fetching comments for section:', sectionId);
      
      const { data: comments, error: commentsError } = await supabase
        .from('document_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          section_id,
          users (
            email
          )
        `)
        .eq('section_id', sectionId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Transform database comments to our Comment interface
      const filteredComments: Comment[] = (comments as DatabaseComment[] || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        section_id: comment.section_id,
        user_email: comment.users?.email
      }));
      
      setLocalComments(filteredComments);
      setError(null);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [sectionId, supabase]);

  // Effect to fetch comments only on mount or when sectionId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Set up real-time subscription for new comments
  useEffect(() => {
    if (!sectionId) return;

    const channel = supabase
      .channel('document-comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'document_comments',
        filter: `section_id=eq.${sectionId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Instead of fetching the single comment, trigger a full refresh
          fetchComments();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sectionId, supabase, fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to add comments');
      }
      
      const { error: commentError } = await supabase
        .from('document_comments')
        .insert([
          {
            content: newComment.trim(),
            section_id: sectionId,
            user_id: user.id
          }
        ]);

      if (commentError) throw commentError;

      // Clear the input - the real-time subscription will handle adding the comment
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !localComments.length) {
    return <div className="text-center py-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comments</h3>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {localComments.map(comment => (
          <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>{comment.user_email || 'Unknown User'}</span>
              <span>{format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
        
        {localComments.length === 0 && (
          <p className="text-gray-500 text-center py-4">No comments yet</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[100px]"
        />
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        
        <Button 
          onClick={handleAddComment}
          disabled={isSubmitting || !newComment.trim()}
        >
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </div>
  );
}
