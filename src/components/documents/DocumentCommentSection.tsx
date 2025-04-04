'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Info } from 'lucide-react'; // Import Info icon

interface Comment {
  id: string;
  section_id: string;
  user_id?: string;
  user?: string; // For display
  content: string;
  created_at: string;
  resolved: boolean;
  document_id?: string;
  comment_type?: 'comment' | 'revision' | 'approval' | 'rejection';
  status?: 'pending' | 'addressed' | 'ignored' | null;
}

interface DocumentCommentSectionProps {
  sectionId: string;
  documentId: string; // Add documentId prop
  comments: Comment[];
  onCommentStatusChange?: (sectionId: string, status: 'pending' | 'addressed' | 'ignored') => void;
  initialCommentType?: 'comment' | 'revision' | 'approval' | 'rejection';
}

export default function DocumentCommentSection({
  sectionId,
  documentId,
  comments,
  onCommentStatusChange,
  initialCommentType = 'comment'
}: DocumentCommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(comments || []);
  const [commentType, setCommentType] = useState<'comment' | 'revision' | 'approval' | 'rejection'>(initialCommentType);
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Update local comments when props change
    setLocalComments(comments || []);
  }, [comments]);

  // Update comment type when initialCommentType prop changes
  useEffect(() => {
    setCommentType(initialCommentType);
  }, [initialCommentType]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) return;
    
    setIsSubmitting(true);
    
    try {
      // Create the comment object
      const commentData = {
        document_id: documentId,
        section_id: sectionId,
        user_id: user.id,
        content: newComment,
        resolved: false,
        comment_type: commentType,
        status: commentType === 'revision' ? 'pending' : null
      };
      
      // Save to the database
      const { data, error } = await supabase
        .from('document_comments')
        .insert(commentData)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Add the new comment to local state with user display name
      const newCommentObj: Comment = {
        ...data,
        user: user.email || 'User' // Use email as fallback
      };
      
      setLocalComments(prev => [...prev, newCommentObj]);
      setNewComment('');
      setCommentType('comment'); // Reset to default comment type
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResolveComment = async (commentId: string) => {
    try {
      // Find the comment to toggle
      const comment = localComments.find(c => c.id === commentId);
      if (!comment) return;
      
      // Update in the database
      const { error } = await supabase
        .from('document_comments')
        .update({ resolved: !comment.resolved })
        .eq('id', commentId);
      
      if (error) throw error;
      
      // Update local state
      setLocalComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, resolved: !comment.resolved } 
            : comment
        )
      );
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment. Please try again.');
    }
  };

  const handleMarkRevisionAsAddressed = async (commentId: string) => {
    try {
      // Find the comment to update
      const comment = localComments.find(c => c.id === commentId);
      if (!comment) return;
      
      // Update in the database
      const { error } = await supabase
        .from('document_comments')
        .update({ status: 'addressed' })
        .eq('id', commentId);
      
      if (error) throw error;
      
      // Update local state
      setLocalComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, status: 'addressed' } 
            : comment
        )
      );

      // Notify parent component if callback provided
      if (onCommentStatusChange) {
        onCommentStatusChange(sectionId, 'addressed');
      }
    } catch (error) {
      console.error('Error updating revision status:', error);
      alert('Failed to update revision status. Please try again.');
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get background color based on comment type
  const getCommentStyles = (comment: Comment) => {
    if (comment.comment_type === 'approval') {
      return 'border-green-200 bg-green-50';
    } else if (comment.comment_type === 'revision') {
      return comment.status === 'addressed' 
        ? 'border-blue-200 bg-blue-50' 
        : 'border-yellow-200 bg-yellow-50';
    } else if (comment.comment_type === 'rejection') {
      return 'border-red-200 bg-red-50';
    } else {
      return comment.resolved ? 'border-green-200 bg-green-50' : 'border-gray-200';
    }
  };

  // Helper function to get badge text and style based on comment type
  const getCommentBadge = (comment: Comment) => {
    if (comment.comment_type === 'approval') {
      return {
        text: 'Approval',
        style: 'bg-green-100 text-green-800'
      };
    } else if (comment.comment_type === 'revision') {
      return {
        text: 'Revision Request',
        style: 'bg-yellow-100 text-yellow-800'
      };
    } else if (comment.comment_type === 'rejection') {
      return {
        text: 'Rejection',
        style: 'bg-red-100 text-red-800'
      };
    } else {
      return {
        text: comment.resolved ? 'Resolved' : 'Comment',
        style: comment.resolved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      };
    }
  };

  // Get tooltip content for each comment type
  const getCommentTypeInfo = (type: 'comment' | 'revision' | 'approval' | 'rejection') => {
    switch (type) {
      case 'comment':
        return 'Regular comments provide feedback without changing the section status.';
      case 'revision':
        return 'Revision requests indicate changes needed before approval. The section status will change to "Needs Revision".';
      case 'approval':
        return 'Approval comments indicate the section is accepted. The section status will change to "Approved".';
      case 'rejection':
        return 'Rejection comments indicate the section is not acceptable. The section status will change to "Rejected".';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-900">Comments</h3>
        
        {/* Information button for general comments help */}
        <div className="relative">
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setShowInfoTooltip(showInfoTooltip === 'general' ? null : 'general')}
            aria-label="Comments information"
          >
            <Info size={16} />
          </button>
          
          {showInfoTooltip === 'general' && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-md bg-white p-3 shadow-lg ring-1 ring-black ring-opacity-5 text-sm text-gray-700">
              <h4 className="font-medium mb-1">About Comments</h4>
              <p className="mb-2">Comments are used to provide feedback on document sections. Different types of comments affect the section status differently:</p>
              <ul className="space-y-1 list-disc pl-4">
                <li><span className="font-medium text-gray-800">Regular Comments:</span> General feedback with no status change</li>
                <li><span className="font-medium text-yellow-700">Revision Requests:</span> Changes needed before approval</li>
                <li><span className="font-medium text-green-700">Approvals:</span> Section is accepted</li>
                <li><span className="font-medium text-red-700">Rejections:</span> Section is not acceptable</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Comments List */}
      <div className="space-y-4 mb-4">
        {localComments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet.</p>
        ) : (
          localComments.map(comment => (
            <div 
              key={comment.id} 
              className={`border rounded-md p-3 ${getCommentStyles(comment)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getCommentBadge(comment).style}`}>
                    {getCommentBadge(comment).text}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {comment.user || 'User'} • {formatDate(comment.created_at)}
                  </span>
                </div>
                
                {/* Action buttons based on comment type */}
                <div>
                  {!comment.comment_type || comment.comment_type === 'comment' ? (
                    <button
                      onClick={() => handleResolveComment(comment.id)}
                      className={`text-xs px-2 py-1 rounded-md ${
                        comment.resolved 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {comment.resolved ? 'Resolved' : 'Resolve'}
                    </button>
                  ) : comment.comment_type === 'revision' && comment.status === 'pending' ? (
                    <button
                      onClick={() => handleMarkRevisionAsAddressed(comment.id)}
                      className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Mark as Addressed
                    </button>
                  ) : null}
                </div>
              </div>
              
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>
      
      {/* Comment Form */}
      <form onSubmit={handleCommentSubmit}>
        <div className="mb-3">
          <div className="flex space-x-2">
            <div className="flex items-center">
              <input 
                type="radio" 
                id="comment-type-comment" 
                name="comment-type" 
                value="comment"
                checked={commentType === 'comment'} 
                onChange={() => setCommentType('comment')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="comment-type-comment" className="ml-2 text-sm text-gray-700 flex items-center">
                Comment
                <div className="relative ml-1">
                  <button 
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowInfoTooltip(showInfoTooltip === 'comment' ? null : 'comment');
                    }}
                    aria-label="Comment information"
                  >
                    <Info size={14} />
                  </button>
                  
                  {showInfoTooltip === 'comment' && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 w-60 rounded-md bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 text-xs text-gray-700">
                      {getCommentTypeInfo('comment')}
                    </div>
                  )}
                </div>
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="radio" 
                id="comment-type-revision" 
                name="comment-type" 
                value="revision"
                checked={commentType === 'revision'} 
                onChange={() => setCommentType('revision')}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="comment-type-revision" className="ml-2 text-sm text-gray-700 flex items-center">
                Revision Request
                <div className="relative ml-1">
                  <button 
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowInfoTooltip(showInfoTooltip === 'revision' ? null : 'revision');
                    }}
                    aria-label="Revision information"
                  >
                    <Info size={14} />
                  </button>
                  
                  {showInfoTooltip === 'revision' && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 w-60 rounded-md bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 text-xs text-gray-700">
                      {getCommentTypeInfo('revision')}
                    </div>
                  )}
                </div>
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="radio" 
                id="comment-type-approval" 
                name="comment-type" 
                value="approval"
                checked={commentType === 'approval'} 
                onChange={() => setCommentType('approval')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="comment-type-approval" className="ml-2 text-sm text-gray-700 flex items-center">
                Approval
                <div className="relative ml-1">
                  <button 
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowInfoTooltip(showInfoTooltip === 'approval' ? null : 'approval');
                    }}
                    aria-label="Approval information"
                  >
                    <Info size={14} />
                  </button>
                  
                  {showInfoTooltip === 'approval' && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 w-60 rounded-md bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 text-xs text-gray-700">
                      {getCommentTypeInfo('approval')}
                    </div>
                  )}
                </div>
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="radio" 
                id="comment-type-rejection" 
                name="comment-type" 
                value="rejection"
                checked={commentType === 'rejection'} 
                onChange={() => setCommentType('rejection')}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="comment-type-rejection" className="ml-2 text-sm text-gray-700 flex items-center">
                Rejection
                <div className="relative ml-1">
                  <button 
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowInfoTooltip(showInfoTooltip === 'rejection' ? null : 'rejection');
                    }}
                    aria-label="Rejection information"
                  >
                    <Info size={14} />
                  </button>
                  
                  {showInfoTooltip === 'rejection' && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 w-60 rounded-md bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 text-xs text-gray-700">
                      {getCommentTypeInfo('rejection')}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <div className={`border rounded-md overflow-hidden transition-colors ${
          commentType === 'comment' ? 'border-gray-300 focus-within:border-blue-500' :
          commentType === 'revision' ? 'border-yellow-300 focus-within:border-yellow-500' :
          commentType === 'approval' ? 'border-green-300 focus-within:border-green-500' :
          'border-red-300 focus-within:border-red-500'
        }`}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Add a ${commentType}...`}
            className="w-full p-3 text-sm text-gray-700 focus:outline-none"
            rows={3}
          />
        </div>
        
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              !newComment.trim() || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : commentType === 'comment' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                  commentType === 'revision' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                  commentType === 'approval' ? 'bg-green-600 text-white hover:bg-green-700' :
                  'bg-red-600 text-white hover:bg-red-700'
            } transition-colors`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
