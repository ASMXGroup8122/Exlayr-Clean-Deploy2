'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PendingItem {
  id: string;
  title: string; // e.g., URL for social, title for video/press release/content
  submittedBy: string; // Placeholder for user info
  submittedAt: string; // ISO date string
  type: 'social' | 'video' | 'press_release' | 'content_creation'; // Added content_creation
  resumeUrl: string; // <-- Added field for N8N resume URL
  // Add other relevant preview data later
  payload: any; // Store the full payload from N8N
}

export default function ApprovalsPage() {
  const [pendingSocial, setPendingSocial] = useState<PendingItem[]>([]);
  const [pendingVideos, setPendingVideos] = useState<PendingItem[]>([]);
  const [pendingPressReleases, setPendingPressReleases] = useState<PendingItem[]>([]);
  const [pendingContentCreation, setPendingContentCreation] = useState<PendingItem[]>([]); // New state
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null); // Track loading state per item

  // Helper function to remove item from state
  const removeItemFromState = (itemId: string, type: PendingItem['type']) => {
    switch (type) {
      case 'social':
        setPendingSocial(prev => prev.filter(item => item.id !== itemId));
        break;
      case 'video':
        setPendingVideos(prev => prev.filter(item => item.id !== itemId));
        break;
      case 'press_release':
        setPendingPressReleases(prev => prev.filter(item => item.id !== itemId));
        break;
      case 'content_creation':
        setPendingContentCreation(prev => prev.filter(item => item.id !== itemId));
        break;
    }
  };

  // Updated function to handle approval/rejection and call N8N resumeUrl
  const handleDecision = async (item: PendingItem, decision: 'approve' | 'reject') => {
    if (!item.resumeUrl) {
      console.error('Missing resumeUrl for item:', item.id);
      alert('Error: Cannot process approval. Resume URL is missing.');
      return;
    }

    setLoadingItemId(item.id); // Set loading state for this item

    const payload = {
      approved: decision === 'approve'
    };

    try {
      const response = await fetch(item.resumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'cors' // Explicitly set cors mode
      });

      if (response.ok) {
        console.log(`Successfully notified N8N for item ${item.id}: ${decision}`);
        removeItemFromState(item.id, item.type); // Remove item from UI on success
        // Consider adding a success toast notification here
      } else {
        // Handle HTTP errors from N8N (e.g., 4xx, 5xx)
        const errorText = await response.text();
        console.error(`N8N resume failed for item ${item.id} with status: ${response.status}. Response: ${errorText}`);
        alert(`Error: Could not ${decision} item. N8N workflow responded with status ${response.status}. Please check N8N logs.`);
      }
    } catch (error) {
      // Handle network errors (failed to fetch)
      console.error(`Network error resuming N8N workflow for item ${item.id}:`, error);
      alert(`Error: Could not contact the approval server. Please check your connection and try again.`);
    } finally {
      setLoadingItemId(null); // Clear loading state regardless of outcome
    }
  };

  const renderPendingList = (items: PendingItem[], type: PendingItem['type']) => {
    if (items.length === 0) {
      return <p className="text-sm text-gray-500 text-center py-8">No pending {type.replace('_', ' ')} items.</p>; // Updated message
    }

    return (
      <div className="space-y-4">
        {items.map((item) => {
          const isLoading = loadingItemId === item.id;
          return (
            <Card key={item.id}>
              <CardContent className="pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-sm font-medium truncate max-w-xs md:max-w-md lg:max-w-lg" title={item.title}>{item.title}</p>
                  <p className="text-xs text-gray-500">
                    Submitted by {item.submittedBy} on {new Date(item.submittedAt).toLocaleDateString()}
                  </p>
                  {/* Add more preview details here if needed */}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDecision(item, 'reject')}
                    disabled={isLoading} // Disable button when loading
                  >
                    {isLoading ? 'Rejecting...' : 'Reject'}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleDecision(item, 'approve')}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50" 
                    disabled={isLoading} // Disable button when loading
                  >
                    {isLoading ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Content Approvals</h1>

      <Tabs defaultValue="social">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10"> {/* Adjusted grid-cols */}
          <TabsTrigger value="social" className="relative">
            Social Posts
            <Badge variant="secondary" className="absolute -top-2 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0.5 text-xs rounded-full">
              {pendingSocial.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="videos" className="relative">
            Videos
            <Badge variant="secondary" className="absolute -top-2 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0.5 text-xs rounded-full">
              {pendingVideos.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="press_releases" className="relative">
            Press Releases
            <Badge variant="secondary" className="absolute -top-2 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0.5 text-xs rounded-full">
              {pendingPressReleases.length}
            </Badge>
          </TabsTrigger>
          {/* New Content Creation Tab */}
          <TabsTrigger value="content_creation" className="relative">
            Content Creation
            <Badge variant="secondary" className="absolute -top-2 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0.5 text-xs rounded-full">
              {pendingContentCreation.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social">
          {renderPendingList(pendingSocial, 'social')}
        </TabsContent>
        <TabsContent value="videos">
          {renderPendingList(pendingVideos, 'video')}
        </TabsContent>
        <TabsContent value="press_releases">
          {renderPendingList(pendingPressReleases, 'press_release')}
        </TabsContent>
        {/* New Content Creation Panel */}
        <TabsContent value="content_creation">
          {renderPendingList(pendingContentCreation, 'content_creation')}
        </TabsContent>
      </Tabs>
    </div>
  );
} 