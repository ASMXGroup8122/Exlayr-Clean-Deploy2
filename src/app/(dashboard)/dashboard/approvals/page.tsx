'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card"; // Removed CardHeader, CardTitle as they are not used directly in this specific edit
import { Button } from "@/components/ui/button";
import Image from 'next/image'; // Import Image component
import Link from 'next/link'; // Import Link

// Updated Interface based on expected payload
interface PendingItem {
  id: string; // Use resumeUrl as unique ID for now
  title: string; // Will map from payload.summary or generate default
  postContent: string; // From payload.post
  imageUrl?: string; // From payload.image
  submittedBy: string; // Will map from payload.email or user_id
  createdAt: string; // From payload.created_at or timestamp
  type: 'social' | 'video' | 'press_release' | 'content_creation';
  resumeUrl: string;
  payload: any; // Keep raw payload for reference if needed
}

export default function ApprovalsPage() {
  const { user } = useAuth(); // Get user from auth context
  const [pendingSocial, setPendingSocial] = useState<PendingItem[]>([]);
  const [pendingVideos, setPendingVideos] = useState<PendingItem[]>([]);
  const [pendingPressReleases, setPendingPressReleases] = useState<PendingItem[]>([]);
  const [pendingContentCreation, setPendingContentCreation] = useState<PendingItem[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch approval items when component mounts
  useEffect(() => {
    const fetchApprovalItems = async () => {
      if (!user?.organization_id) {
        console.log("Waiting for user organization info...");
        // Optionally set loading false earlier if user info is missing
        // setIsLoading(false);
        return; // Wait until user info is available
      }

      setIsLoading(true); // Ensure loading is true when fetch starts
      try {
        console.log('Fetching approval items from /api/approvals...');
        const response = await fetch('/api/approvals');
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch approvals: ${response.statusText}`);
        }
        const data = await response.json();
        const allItems = data.approvalItems || [];
        console.log('Received total items:', allItems.length);

        // Filter by organization_id and Map to PendingItem structure
        const userOrgId = user.organization_id;
        const mappedItems = allItems
          .filter((item: any) => item?.payload?.organization_id === userOrgId)
          .map((item: any): PendingItem => ({
            id: item.resumeUrl, // Using resumeUrl as a temporary unique ID
            title: item.payload?.summary || `Pending ${item.type?.replace('_', ' ') || 'Item'}`,
            postContent: item.payload?.post || 'No content available.',
            imageUrl: item.payload?.image,
            submittedBy: item.payload?.email || `User ID: ${item.payload?.user_id}` || 'Unknown Submitter',
            createdAt: item.payload?.created_at || item.payload?.timestamp || new Date().toISOString(), // Use created_at or timestamp from payload
            type: item.type,
            resumeUrl: item.resumeUrl,
            payload: item.payload, // Keep raw payload
          }));

        console.log(`Mapped items for org ${userOrgId}:`, mappedItems.length);
        
        // Sort items into their respective categories
        setPendingSocial(mappedItems.filter((item: PendingItem) => item.type === 'social'));
        setPendingVideos(mappedItems.filter((item: PendingItem) => item.type === 'video'));
        setPendingPressReleases(mappedItems.filter((item: PendingItem) => item.type === 'press_release'));
        setPendingContentCreation(mappedItems.filter((item: PendingItem) => item.type === 'content_creation'));

      } catch (error) {
        console.error('Error fetching/processing approval items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run fetch if we have the user organization ID
    if (user?.organization_id) {
        fetchApprovalItems();
    } else {
        // Handle case where user/orgId isn't loaded yet
        const timer = setTimeout(() => {
             if (!user?.organization_id) {
                 console.log("User/Org ID still not available after delay");
                 setIsLoading(false); // Stop loading if info doesn't arrive
             }
         }, 3000); // Wait 3 seconds
         return () => clearTimeout(timer);
    }

  }, [user]); // Re-run effect if user object changes

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
      return <p className="text-sm text-gray-500 text-center py-8">No pending {type.replace('_', ' ')} items.</p>;
    }

    return (
      <div className="space-y-4">
        {items.map((item) => {
          const isLoading = loadingItemId === item.id;
          // Use a more robust key if possible, resumeUrl is fallback
          const uniqueKey = item.resumeUrl || `${type}-${item.createdAt}-${Math.random()}`;
          return (
            <Card key={uniqueKey} className="w-full overflow-hidden">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                {/* Left side: Content */}
                <div className="flex-grow space-y-3">
                  <h3 className="text-base font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-xs text-gray-500">
                    Submitted by: {item.submittedBy} on {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  {/* Display AI Post Content */}
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                    {item.postContent}
                  </div>
                  {/* Display Image if available */}
                  {item.imageUrl && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500 block mb-1">Attached Image:</span>
                      {/* Option 1: Clickable Link 
                      <Link href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate block">
                        {item.imageUrl}
                      </Link>
                      */} 
                      {/* Option 2: Thumbnail */}                       
                      <Link href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-block border rounded hover:opacity-80 transition-opacity">
                         <Image 
                            src={item.imageUrl} 
                            alt="Approval Image" 
                            width={100} 
                            height={100} 
                            className="object-cover rounded"
                          />
                      </Link>
                    </div>
                  )}
                </div>
                {/* Right side: Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 flex-shrink-0 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDecision(item, 'reject')}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? 'Rejecting...' : 'Reject'}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleDecision(item, 'approve')}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto" 
                    disabled={isLoading}
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading approval items...</p>
        </div>
      ) : (
        <Tabs defaultValue="social">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
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
          <TabsContent value="content_creation">
            {renderPendingList(pendingContentCreation, 'content_creation')}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 