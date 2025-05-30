'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Comment } from './types';
import { MessageSquare, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string) => void;
  userId: string;
}

export default function CommentSection({
  comments,
  onAddComment,
  onDeleteComment,
  userId,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const getStatusIcon = (status: Comment['status']) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs_clarification':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {comments.length > 0 ? (
        <ScrollArea className="max-h-[300px] pr-3">
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="mt-0.5">
                  <Avatar className="h-6 w-6 text-xs">
                    <AvatarFallback>{comment.user_name ? comment.user_name.substring(0, 2).toUpperCase() : 'AN'}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{comment.user_name}</span>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(comment.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                      {userId === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive ml-1"
                          onClick={() => onDeleteComment(comment.id)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-sm text-muted-foreground italic px-3 py-4 border border-dashed rounded-md">
          No comments yet.
        </div>
      )}

      {/* Comment Input Area - Button next to Textarea */}
      <div className="flex items-end gap-2 pt-4 border-t"> 
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px] flex-1 resize-none" // Adjusted height, flex-1
          rows={2} // Suggest initial rows
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          // Removed w-full
          size="sm" 
        >
          Post
        </Button>
      </div>
    </div>
  );
} 
