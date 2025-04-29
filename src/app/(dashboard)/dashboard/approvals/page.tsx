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

interface PendingItem {
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
  character_length: number;
}

const FAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/q0c2np0nt9dayphd8zpposc73gvly4w6';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [pendingSocial, setPendingSocial] = useState<PendingItem[]>([]);
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
          const isPendingItem = (obj: any): obj is PendingItem =>
            obj && typeof obj.id === 'string' && typeof obj.post_text === 'string' && typeof obj.platform === 'string';
          if (payload.eventType === 'INSERT') {
            if (isPendingItem(payload.new) && payload.new.status === 'pending' && !payload.new.deleted) {
              setPendingSocial(prev => [payload.new as PendingItem, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (isPendingItem(payload.new)) {
              if (payload.new.deleted || payload.new.status !== 'pending') {
                setPendingSocial(prev => prev.filter(item => item.id !== payload.new.id));
              } else {
                setPendingSocial(prev => prev.map(item => item.id === payload.new.id ? payload.new as PendingItem : item));
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
  const groupByPlatform = (items: PendingItem[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.platform]) acc[item.platform] = [];
      acc[item.platform].push(item);
      return acc;
    }, {} as Record<string, PendingItem[]>);
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
    item: PendingItem,
    field: 'post' | 'image',
    decision: 'approve' | 'reject',
    rejectionMessage?: string
  ) => {
    if (!user?.id) return;
    setLoadingItemId(item.id + field + '_' + decision);
    try {
      // Approve: update DB directly, no webhook
      if (decision === 'approve') {
        const updateData: any = {};
        if (field === 'post') updateData.post_status = 'approved';
        if (field === 'image') updateData.image_status = 'approved';
        const { error } = await supabase
          .from('social_posts')
          .update(updateData)
          .eq('id', item.id);
        if (error) throw error;
        toast({
          title: `${field === 'post' ? 'Post Text' : 'Image'} approved`,
          description: `The ${field === 'post' ? 'post text' : 'image'} was approved.`,
        });
      } else if (decision === 'reject') {
        // Reject: send webhook with rejection message
        // Fetch latest row for payload
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
          status: 'reject',
          field: field,
          rejection: field
        };
        try {
          const res = await fetch(FAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Webhook failed');
          toast({
            title: `Webhook Sent`,
            description: `The rejection status has been sent to Make.com.`,
          });
        } catch (err: any) {
          toast({
            title: 'Webhook Error',
            description: err.message || 'Failed to send webhook.',
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update status.',
        variant: 'destructive',
      });
    } finally {
      setLoadingItemId(null);
    }
  };

  const renderPendingList = (items: PendingItem[]) => {
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
                <Card key={item.id} className="w-full overflow-hidden">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-semibold text-gray-800">
                          {item.post_text.substring(0, 50)}...
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 items-center mb-2">
                        <span className={`px-2 py-1 rounded text-xs border ${statusColor(item.post_status)}`}>Post: {item.post_status}</span>
                        {item.post_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              disabled={loadingItemId === item.id + 'post_approve'}
                              onClick={() => handleDecision(item, 'post', 'approve')}
                            >
                              {loadingItemId === item.id + 'post_approve' ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={loadingItemId === item.id + 'post_reject'}
                              onClick={() => handleDecision(item, 'post', 'reject')}
                            >
                              {loadingItemId === item.id + 'post_reject' ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </>
                        )}
                        {item.image_url && (
                          <span className={`px-2 py-1 rounded text-xs border ${statusColor(item.image_status)}`}>Image: {item.image_status}</span>
                        )}
                        {item.image_url && item.image_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              disabled={loadingItemId === item.id + 'image_approve'}
                              onClick={() => handleDecision(item, 'image', 'approve')}
                            >
                              {loadingItemId === item.id + 'image_approve' ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={loadingItemId === item.id + 'image_reject'}
                              onClick={() => handleDecision(item, 'image', 'reject')}
                            >
                              {loadingItemId === item.id + 'image_reject' ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
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