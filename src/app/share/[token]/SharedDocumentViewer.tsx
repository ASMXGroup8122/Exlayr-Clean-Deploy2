'use client';

import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Eye, 
  MessageSquare, 
  Clock, 
  Building, 
  FileText, 
  Lock,
  AlertTriangle,
  Send,
  User
} from 'lucide-react';
import { transformDocumentData } from '@/lib/doc-transform';
import { useToast } from '@/components/ui/use-toast';

interface SharedDocumentViewerProps {
  documentData: Record<string, any>;
  listing: {
    id: string;
    name: string;
    ticker: string;
    sponsor: string;
  };
  accessLevel: 'view' | 'comment';
  expiresAt: string | null;
  comments: any[];
  token: string;
}

interface Comment {
  id: string;
  section_id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  user_name?: string;
  users?: {
    first_name: string;
    last_name: string;
    company_name: string;
  };
}

export function SharedDocumentViewer({
  documentData,
  listing,
  accessLevel,
  expiresAt,
  comments,
  token
}: SharedDocumentViewerProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [guestName, setGuestName] = useState('');

  // Transform document data using existing utility
  const sections = useMemo(() => {
    console.log('SharedDocumentViewer - documentData:', documentData);
    const transformedSections = transformDocumentData(documentData).map(section => ({
      ...section,
      status: (section.status as any) || 'draft',
      subsections: section.subsections || []
    }));
    console.log('SharedDocumentViewer - transformedSections:', transformedSections);
    return transformedSections;
  }, [documentData]);

  // Group comments by field
  const groupedComments = useMemo(() => {
    const grouped: Record<string, Comment[]> = {};
    comments.forEach((comment) => {
      if (!grouped[comment.section_id]) {
        grouped[comment.section_id] = [];
      }
      grouped[comment.section_id].push(comment);
    });
    return grouped;
  }, [comments]);

  // Format expiry date
  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires';
    const date = new Date(expiresAt);
    const now = new Date();
    const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Expires soon';
    if (diffHours < 24) return `Expires in ${diffHours} hours`;
    const diffDays = Math.ceil(diffHours / 24);
    return `Expires in ${diffDays} days`;
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedFieldId) return;

    setIsSubmittingComment(true);
    try {
      const requestBody = {
        token,
        fieldId: selectedFieldId,
        content: newComment.trim(),
        guestName: guestName.trim() || 'Anonymous Guest',
      };

      // Debug logging for production
      console.log('Frontend - Submitting comment with data:', {
        ...requestBody,
        guestNameOriginal: guestName,
        guestNameTrimmed: guestName.trim(),
        guestNameFinal: guestName.trim() || 'Anonymous Guest'
      });

      const response = await fetch('/api/share/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      toast({
        title: "Comment submitted",
        description: "Your comment has been added successfully.",
      });

      setNewComment('');
      setSelectedFieldId(null);
      
      // Refresh the page to show the new comment
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with shared document info */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{listing.name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {listing.sponsor}
                  </span>
                  <span>Ticker: {listing.ticker}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={accessLevel === 'comment' ? 'default' : 'secondary'} className="flex items-center gap-1">
                {accessLevel === 'comment' ? (
                  <>
                    <MessageSquare className="h-3 w-3" />
                    Can Comment
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    View Only
                  </>
                )}
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                {formatExpiryDate(expiresAt)}
              </div>
            </div>
          </div>

          {/* Shared document notice */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                You are viewing a shared document. {accessLevel === 'comment' ? 'You can add comments.' : 'This is read-only access.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <ScrollArea className="h-full">
          <div className="space-y-8">
            {sections.map((section) => (
              <Card key={section.id} className="p-6">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                  </div>
                  {groupedComments[section.id] && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {groupedComments[section.id].length} comments
                    </Badge>
                  )}
                </div>

                {/* Section Subsections (Fields) */}
                <div className="space-y-6 ml-4">
                  {section.subsections?.map((subsection: any) => (
                    <div key={subsection.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-800">{subsection.title}</h3>
                        {accessLevel === 'comment' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedFieldId(subsection.id)}
                            className="flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Comment
                          </Button>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {documentData[subsection.id] || 'No content provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Field Comments */}
                      {groupedComments[subsection.id] && (
                        <div className="ml-4 space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Comments:</h4>
                          {groupedComments[subsection.id].map((comment) => (
                            <div key={comment.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-3">
                                <div className="p-1 bg-blue-100 rounded-full">
                                  <User className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {comment.user_id 
                                        ? `${comment.users?.first_name} ${comment.users?.last_name}` 
                                        : comment.user_name || 'Anonymous Guest'
                                      }
                                    </span>
                                    {comment.user_id && comment.users?.company_name && (
                                      <span className="text-xs text-gray-500">
                                        {comment.users.company_name}
                                      </span>
                                    )}
                                    {!comment.user_id && (
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        Guest
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {new Date(comment.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{comment.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Comment Modal */}
      {selectedFieldId && accessLevel === 'comment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            
            {/* Guest Name Input */}
            <div className="mb-4">
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name (optional)
              </label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Comment Input */}
            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Comment
              </label>
              <Textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter your comment..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFieldId(null);
                  setNewComment('');
                  setGuestName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmittingComment}
                className="flex items-center gap-2"
              >
                {isSubmittingComment ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 