'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Share2, Clock, Eye, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingName: string;
}

interface ShareLink {
  shareUrl: string;
  token: string;
  accessLevel: string;
  expiresAt: string | null;
}

export function ShareModal({ isOpen, onClose, listingId, listingName }: ShareModalProps) {
  const [accessLevel, setAccessLevel] = useState<'view' | 'comment'>('view');
  const [expiresInHours, setExpiresInHours] = useState<string>('48');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          accessLevel,
          expiresInHours: expiresInHours && expiresInHours !== 'never' ? parseInt(expiresInHours) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setShareLink(data);
      toast({
        title: "Share link generated successfully!",
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate share link',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      setCopied(true);
      toast({
        title: "Link copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCopied(false);
    onClose();
  };

  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    return new Date(expiresAt).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{listingName}</p>
            <p className="text-xs text-gray-500">Listing Document</p>
          </div>

          {!shareLink ? (
            <>
              {/* Access Level Selection */}
              <div className="space-y-2">
                <Label htmlFor="access-level">Access Level</Label>
                <Select value={accessLevel} onValueChange={(value: 'view' | 'comment') => setAccessLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <div>
                          <div className="font-medium">View Only</div>
                          <div className="text-xs text-gray-500">Recipients can only read the document</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="comment">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <div>
                          <div className="font-medium">View & Comment</div>
                          <div className="text-xs text-gray-500">Recipients can read and add comments</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiration Selection */}
              <div className="space-y-2">
                <Label htmlFor="expires-in">Link Expires In</Label>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerateLink} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Generate Share Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Generated Link */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Share link generated!</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Share URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          value={shareLink.shareUrl} 
                          readOnly 
                          className="text-sm bg-white"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCopyLink}
                          className="flex-shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-600">Access Level:</span>
                        <div className="font-medium capitalize">{shareLink.accessLevel}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Expires:</span>
                        <div className="font-medium">{formatExpiryDate(shareLink.expiresAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShareLink(null)} className="flex-1">
                    Generate Another
                  </Button>
                  <Button onClick={handleClose} className="flex-1">
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 