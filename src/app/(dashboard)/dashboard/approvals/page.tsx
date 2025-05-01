'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';

// --- Define the structure for social posts (Renamed & Expanded) --- >
interface SocialPostItem {
  id: string;
  post_text: string;
  image_url?: string;
  platform: string;
  post_status: 'pending' | 'approved' | 'rejected';
  image_status: 'pending' | 'approved' | 'rejected';
  status: 'pending' | 'approved' | 'posted';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  organization_id: string;
  user_id: string;
  deleted: boolean;
  character_length?: number; // Optional based on usage
  // Fields needed for payloads
  url?: string;
  include_source?: boolean;
  sentiment?: string;
  thoughts?: string;
  email?: string;
  linkedin_post_type?: string;
  twitter_post_type?: string;
  instagram_post_type?: string;
  add_podcast?: boolean;
  additional_instructions?: string;
  // Supabase JSON object type might differ, adjust if needed
  platforms?: { [key: string]: any } | null; 
}
// <--- End Interface --->

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [pendingSocial, setPendingSocial] = useState<SocialPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user?.organization_id) return;
    setIsLoading(true);

    // Initial fetch
    const fetchInitialPosts = async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('status', 'pending')
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching social posts:', error);
        setIsLoading(false);
        return;
      }
      setPendingSocial(data || []);
      setIsLoading(false);
    };

    // Realtime subscription
    const channel = supabase
      .channel('social_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_posts',
          filter: `organization_id=eq.${user.organization_id}`
        },
        (payload) => {
          console.log('Realtime event:', payload);
          // Type guard to ensure payload.new is a PendingItem
          const isPendingItem = (obj: any): obj is SocialPostItem =>
            obj && typeof obj.id === 'string' && typeof obj.post_text === 'string' && typeof obj.platform === 'string';
          if (payload.eventType === 'INSERT') {
            if (isPendingItem(payload.new) && payload.new.status === 'pending' && !payload.new.deleted) {
              setPendingSocial(prev => [payload.new as SocialPostItem, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (isPendingItem(payload.new)) {
              if (payload.new.deleted || payload.new.status !== 'pending') {
                setPendingSocial(prev => prev.filter(item => item.id !== payload.new.id));
              } else {
                setPendingSocial(prev => prev.map(item => item.id === payload.new.id ? payload.new as SocialPostItem : item));
              }
            }
          } else if (payload.eventType === 'DELETE') {
            if (isPendingItem(payload.old)) {
              setPendingSocial(prev => prev.filter(item => item.id !== payload.old.id));
            }
          }
        }
      )
      .subscribe();

    fetchInitialPosts();
    return () => {
      channel.unsubscribe();
    };
  }, [user?.organization_id]);

  // Helper to group posts by platform
  const groupByPlatform = (items: SocialPostItem[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.platform]) acc[item.platform] = [];
      acc[item.platform].push(item);
      return acc;
    }, {} as Record<string, SocialPostItem[]>);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  // Approve/Reject logic for post text or image
  const handleDecision = async (
    item: SocialPostItem,
    field: 'post' | 'image' | 'full_post',
    decision: 'reject' | 'approve_and_post'
  ) => {
    if (!user?.id) return;

    // Set loading state based on the action
    let loadingIdSuffix = '';
    if (decision === 'reject') {
      loadingIdSuffix = field + '_' + decision; // e.g., post_reject
    } else if (decision === 'approve_and_post') {
      loadingIdSuffix = decision; // e.g., approve_and_post
    }
    const currentLoadingId = item.id + loadingIdSuffix;
    setLoadingItemId(currentLoadingId);
    
    console.log(`[handleDecision START] Action: ${decision}, Field: ${field}, Item ID: ${item.id}, Loading ID: ${currentLoadingId}`);

    try {
      if (decision === 'reject') {
        // Fetch latest row for payload (Required for regeneration context)
        const { data: updatedRows, error: fetchError } = await supabase
          .from('social_posts')
          .select('*')
          .eq('id', item.id)
          .single();
        if (fetchError) throw fetchError;

        const payload = {
          timestamp: new Date().toISOString(),
          organization_id: updatedRows.organization_id,
          user_id: updatedRows.user_id,
          post_id: updatedRows.id,
          url: updatedRows.url || null,
          include_source: updatedRows.include_source || false,
          sentiment: updatedRows.sentiment || null,
          thoughts: updatedRows.thoughts || null,
          character_length: updatedRows.character_length || null,
          email: updatedRows.email || null,
          linkedin_post_type: updatedRows.linkedin_post_type || null,
          twitter_post_type: updatedRows.twitter_post_type || null,
          instagram_post_type: updatedRows.instagram_post_type || null,
          add_podcast: updatedRows.add_podcast || false,
          additional_instructions: updatedRows.additional_instructions || null,
          platforms: {
            linkedin: updatedRows.platforms?.linkedin || false,
            twitter: updatedRows.platforms?.twitter || false,
            instagram: updatedRows.platforms?.instagram || false
          },
          post_text: updatedRows.post_text || null,
          platform: updatedRows.platform || null,
          image_url: updatedRows.image_url || null,
          post_status: updatedRows.post_status || null,
          image_status: updatedRows.image_status || null,
          status: 'reject', // Indicate regeneration request
          field: field, // 'post' or 'image'
          rejection: field // Keeps current logic, Make filters on this
        };

        // --- Use Env Var for Regeneration Webhook --- >
        const regenerationWebhookUrl = process.env.NEXT_PUBLIC_REGENERATION_WEBHOOK_URL;
        if (!regenerationWebhookUrl) {
            console.error("Error: NEXT_PUBLIC_REGENERATION_WEBHOOK_URL is not defined in environment variables.");
            toast({ title: 'Configuration Error', description: 'Regeneration webhook is not configured.', variant: 'destructive' });
            throw new Error('Regeneration webhook configuration missing.'); // Stop execution
        }
        // <--- End Env Var Usage --->

        console.log(`[handleDecision REJECT] Payload constructed for Item ID: ${item.id}, Field: ${field}`);
        try {
          console.log(`[handleDecision REJECT] Sending regeneration webhook for Item ID: ${item.id}, Field: ${field}`);
          const res = await fetch(regenerationWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
             const errorText = await res.text();
             console.error("Webhook failed response:", errorText);
             throw new Error(`Webhook failed with status ${res.status}`);
          }
          toast({
            title: `Regeneration Sent`, // Updated toast title
            description: `The request to regenerate the ${field} has been sent.`,
          });
        } catch (err: any) {
          console.error(`[handleDecision REJECT WEBHOOK ERROR] Item ID: ${item.id}, Field: ${field}`, err);
          toast({
            title: 'Webhook Error',
            description: err.message || 'Failed to send regeneration webhook.',
            variant: 'destructive',
          });
        }
      } else if (decision === 'approve_and_post') {
        // 1. Update Database Status
        console.log(`[handleDecision APPROVE_POST] Updating DB status for Item ID: ${item.id}`);
        const updateData: Partial<SocialPostItem> = {
          post_status: 'approved',
          status: 'approved'
        };
        if (item.image_url) {
          updateData.image_status = 'approved';
        }

        const { error: dbUpdateError } = await supabase
          .from('social_posts')
          .update(updateData)
          .eq('id', item.id);

        if (dbUpdateError) {
          console.error(`[handleDecision APPROVE_POST DB ERROR] Item ID: ${item.id}`, dbUpdateError);
          throw new Error(`Database update failed: ${dbUpdateError.message}`);
        }
        console.log(`[handleDecision APPROVE_POST] DB status updated for Item ID: ${item.id}`);

        // --- Determine and Get Platform-Specific Webhook URL Directly --- >
        let targetWebhookUrl: string | undefined;
        const platform = item.platform?.toLowerCase();
        console.log(`[handleDecision APPROVE_POST] Checking platform: "${platform}"`); 

        switch (platform) {
          case 'linkedin':
            targetWebhookUrl = process.env.NEXT_PUBLIC_LINKEDIN_APPROVE_WEBHOOK_URL;
            break;
          case 'twitter': 
            targetWebhookUrl = process.env.NEXT_PUBLIC_TWITTER_APPROVE_WEBHOOK_URL;
            break;
          case 'insta':
          case 'instagram':
            targetWebhookUrl = process.env.NEXT_PUBLIC_INSTAGRAM_APPROVE_WEBHOOK_URL;
            break;
          // Add cases for other platforms
          default:
            console.error(`Error: Unknown platform "${item.platform}" for approval webhook.`);
            toast({ title: 'Configuration Error', description: `Approval webhook not configured for platform: ${item.platform}.`, variant: 'destructive' });
            throw new Error(`Approval webhook configuration missing for platform: ${item.platform}.`);
        }

        if (!targetWebhookUrl) {
            // Log the specific variable name that failed
            const missingVar = 
                platform === 'linkedin' ? 'NEXT_PUBLIC_LINKEDIN_APPROVE_WEBHOOK_URL' :
                platform === 'twitter' ? 'NEXT_PUBLIC_TWITTER_APPROVE_WEBHOOK_URL' :
                platform === 'instagram' ? 'NEXT_PUBLIC_INSTAGRAM_APPROVE_WEBHOOK_URL' :
                'APPROVE_WEBHOOK_URL'; // Fallback
            console.error(`Error: Environment variable ${missingVar} is not defined, despite platform match.`);
            toast({ title: 'Configuration Error', description: `Approval webhook for ${item.platform} is not configured correctly in .env.local.`, variant: 'destructive' });
            throw new Error(`Approval webhook configuration missing for ${item.platform}.`);
        }
        // <--- End Env Var Usage --->

        // 3. Construct Final Payload (Using the original 'item' data as it's now approved)
        //    Alternatively, re-fetch if there's a chance data changed between load and click.
        //    Using 'item' is simpler if rapid changes aren't expected.
        const finalPayload = { 
            timestamp: new Date().toISOString(),
            organization_id: item.organization_id,
            user_id: item.user_id, // Or maybe the approving user's ID from `user.id`?
            post_id: item.id,
            platform: item.platform,
            post_text: item.post_text, 
            image_url: item.image_url || null,
            // Include any other fields Make.com needs for posting
            url: item.url || null, // Example: Include original source URL if needed
            // ... add other relevant fields from 'item' ... 
        };

        console.log(`[handleDecision APPROVE_POST] Payload constructed for Item ID: ${item.id}, Platform: ${item.platform}`);

        // 4. Send to Platform-Specific Webhook
        console.log(`[handleDecision APPROVE_POST] Sending approval webhook to ${targetWebhookUrl} for Item ID: ${item.id}`);
        const res = await fetch(targetWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload),
        });

        if (!res.ok) {
           const errorText = await res.text();
           console.error("Approve Webhook failed response:", errorText);
           // Consider if we need to rollback DB update here? Complex.
           throw new Error(`Approval webhook for ${item.platform} failed with status ${res.status}`);
        }

        toast({
          title: `Post Approved & Sent`, 
          description: `The post for ${item.platform} has been approved and sent for publishing.`,
        });

        // Remove the item from the pending list optimistically or wait for realtime?
        // Optimistic removal:
        // setPendingSocial(prev => prev.filter(p => p.id !== item.id)); 
      }
    } catch (err: any) {
      // Catch errors from DB update or webhook checks/calls
      console.error(`[handleDecision ERROR] Action: ${decision}, Item ID: ${item.id}, Error:`, err);
      toast({
        title: 'Action Failed',
        description: err.message || `Failed to ${decision.replace('_', ' ')}.`, // Generic error
        variant: 'destructive',
      });
    } finally {
      // Add a small delay before clearing the loading state
      setTimeout(() => {
        setLoadingItemId(null);
        console.log(`[handleDecision FINALLY] Cleared loading state for Item ID: ${item.id}, Action: ${decision}, Field: ${field}`);
      }, 100); 
    }
  };

  // Handle delete post function
  const handleDeletePost = async (item: SocialPostItem) => {
    if (!user?.id) return;
    
    // Set loading state for delete operation
    const currentLoadingId = item.id + 'delete';
    setLoadingItemId(currentLoadingId);
    
    console.log(`[handleDeletePost START] Deleting post ID: ${item.id}`);
    
    try {
      // First check if the post exists and if we have read permissions
      const { data: existingPost, error: fetchError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', item.id)
        .single();
        
      if (fetchError) {
        console.error(`[handleDeletePost FETCH ERROR] Post ID: ${item.id}`, fetchError);
        throw new Error(`Failed to find post: ${fetchError.message || 'Unknown error'}`);
      }
      
      if (!existingPost) {
        throw new Error(`Post with ID ${item.id} not found`);
      }
      
      console.log(`[handleDeletePost INFO] Found post: ${JSON.stringify(existingPost)}`);
      
      // Only update the deleted field to avoid constraint violations
      console.log(`[handleDeletePost UPDATE] Setting deleted=true for post ID: ${item.id}`);
      
      const { error: deleteError } = await supabase
        .from('social_posts')
        .update({ deleted: true })
        .eq('id', item.id);
      
      if (deleteError) {
        console.error(`[handleDeletePost UPDATE ERROR] Failed to set deleted=true for post ID: ${item.id}`, deleteError);
        console.error(`Error details: ${JSON.stringify(deleteError)}`);
        throw new Error(`Failed to delete post: ${deleteError.message || 'Could not update deleted field'}`);
      }
      
      // If we get here, the deleted field was updated successfully
      console.log(`[handleDeletePost SUCCESS] Post marked as deleted successfully for post ID: ${item.id}`);
      
      // Apply optimistic UI update - immediately remove the item from the pendingSocial state
      setPendingSocial(prev => prev.filter(post => post.id !== item.id));
      
      // Show success notification
      toast({
        title: "Post Deleted",
        description: "The social post has been deleted and removed from the list.",
        variant: "default"
      });
      
    } catch (err: any) {
      console.error(`[handleDeletePost ERROR] Post ID: ${item.id}, Error:`, err);
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete the post.',
        variant: 'destructive',
      });
    } finally {
      // Clear loading state
      setTimeout(() => {
        setLoadingItemId(null);
        console.log(`[handleDeletePost FINALLY] Cleared loading state for Post ID: ${item.id}`);
      }, 100);
    }
  };

  const renderPendingList = (items: SocialPostItem[]) => {
    if (items.length === 0) {
      return <p className="text-sm text-gray-500 text-center py-8">No pending social posts.</p>;
    }
    const grouped = groupByPlatform(items);
    return (
      <div className="space-y-8">
        {Object.entries(grouped).map(([platform, posts]) => (
          <div key={platform}>
            <h2 className="text-lg font-bold mb-2 capitalize flex items-center gap-2">
              {platform}
            </h2>
            <div className="space-y-4">
              {posts.map((item) => (
                <Card key={item.id} className="w-full">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow space-y-3 min-h-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-semibold text-gray-800">
                          {item.post_text.substring(0, 50)}...
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs border ${statusColor(item.post_status)}`}>Post: {item.post_status}</span>
                          {item.post_status === 'pending' && (
                             <Button
                                size="sm"
                                variant="outline"
                                disabled={loadingItemId === item.id + 'post_reject'}
                                onClick={() => handleDecision(item, 'post', 'reject')}
                              >
                                {loadingItemId === item.id + 'post_reject' ? 'Regenerating...' : 'Regenerate'} 
                              </Button>
                          )}
                        </div>
                        {item.image_url && (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs border ${statusColor(item.image_status)}`}>Image: {item.image_status}</span>
                             {item.image_status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={loadingItemId === item.id + 'image_reject'}
                                  onClick={() => handleDecision(item, 'image', 'reject')}
                                >
                                  {loadingItemId === item.id + 'image_reject' ? 'Regenerating...' : 'Regenerate'}
                                </Button>
                             )}
                           </div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex gap-2">
                          <Button
                              size="sm"
                              variant="default"
                              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50"
                              disabled={item.post_status !== 'pending' || (item.image_url && item.image_status !== 'pending') || loadingItemId === item.id + 'approve_and_post'}
                              onClick={() => handleDecision(item, 'full_post', 'approve_and_post')}
                          >
                              {loadingItemId === item.id + 'approve_and_post' ? 'Approving & Posting...' : 'Approve & Post'}
                          </Button>
                          <Button
                              size="sm"
                              variant="destructive"
                              disabled={loadingItemId === item.id + 'delete'}
                              onClick={() => handleDeletePost(item)}
                          >
                              {loadingItemId === item.id + 'delete' ? 'Deleting...' : 'Delete Post'}
                          </Button>
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap min-h-0">
                        {item.post_text}
                      </div>
                      {item.image_url && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 block mb-1">Attached Image:</span>
                          <Link href={item.image_url.trim()} target="_blank" rel="noopener noreferrer" className="inline-block border rounded hover:opacity-80 transition-opacity">
                            <Image src={item.image_url.trim()} alt="Post Image" width={100} height={100} className="object-cover rounded" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <h1 className="text-2xl font-bold">Content Approvals</h1>
        <Link href="/dashboard/social-media-archive" className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
          <span>View Archived Posts</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
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
                0
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="press_releases" className="relative">
              Press Releases
              <Badge variant="secondary" className="absolute -top-2 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0.5 text-xs rounded-full">
                0
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="content_creation" className="relative">
              Content Creation
              <Badge variant="secondary" className="absolute -top-2 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0.5 text-xs rounded-full">
                0
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="social">
            {renderPendingList(pendingSocial)}
          </TabsContent>
          <TabsContent value="videos">
            <p className="text-sm text-gray-500 text-center py-8">No pending videos.</p>
          </TabsContent>
          <TabsContent value="press_releases">
            <p className="text-sm text-gray-500 text-center py-8">No pending press releases.</p>
          </TabsContent>
          <TabsContent value="content_creation">
            <p className="text-sm text-gray-500 text-center py-8">No pending content creation items.</p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 