'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  author: {
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  type?: 'comment' | 'ai_suggestion' | 'revision' | 'approval';
}

interface CommentSectionProps {
  sectionId: string;
  comments: Comment[];
  onAddComment: (content: string) => void;
}

export default function CommentSection({ sectionId, comments, onAddComment }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    onAddComment(newComment);
    setNewComment('');
  };

  const getCommentTypeStyles = (type?: Comment['type']) => {
    switch (type) {
      case 'ai_suggestion':
        return 'bg-blue-50 border-blue-200';
      case 'revision':
        return 'bg-yellow-50 border-yellow-200';
      case 'approval':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {comments.map(comment => (
        <div 
          key={comment.id}
          className={`p-4 rounded-lg border ${getCommentTypeStyles(comment.type)}`}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author.avatar} />
              <AvatarFallback>
                {comment.author.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{comment.author.name}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-700">{comment.content}</p>
            </div>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="sm"
            disabled={!newComment.trim()}
          >
            Post
          </Button>
        </div>
      </form>
    </div>
  );
} 
