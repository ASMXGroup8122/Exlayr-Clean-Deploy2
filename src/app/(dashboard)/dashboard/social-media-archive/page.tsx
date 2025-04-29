'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

// Define the structure for social posts (can be shared type later)
interface SocialPostItem {
  id: string;
  post_text: string;
  image_url?: string;
  platform: string;
  post_status: 'pending' | 'approved' | 'rejected';
  image_status: 'pending' | 'approved' | 'rejected';
  status: 'pending' | 'approved' | 'posted'; // Keep original status if needed elsewhere
  created_at: string;
  approved_at?: string; // If you have an approval timestamp
  organization_id: string;
  user_id: string;
  deleted: boolean;
}

export default function SocialMediaArchivePage() {
  const { user } = useAuth();
  const [approvedSocial, setApprovedSocial] = useState<SocialPostItem[]>([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(true);
  const [selectedPost, setSelectedPost] = useState<SocialPostItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const supabase = getSupabaseClient();

  const fetchApprovedPosts = async (searchTerm: string) => {
    if (!user?.organization_id || !supabase) return;
    setIsLoadingApproved(true);
    console.log(`[ArchivePage] Fetching approved posts... Search: "${searchTerm}"`);

    let query = supabase
      .from('social_posts')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('deleted', false)
      .eq('post_status', 'approved')
      .or('image_status.eq.approved,image_url.is.null'); // Keep initial OR

    // Apply search filter if searchTerm is provided
    if (searchTerm.trim()) {
      const cleanedSearchTerm = searchTerm.trim();
      // Chain the search condition using OR
      query = query.or(
          `post_text.ilike.%${cleanedSearchTerm}%, platform.ilike.%${cleanedSearchTerm}%`
      );
    }

    // Add sorting and limit
    query = query.order('created_at', { ascending: false })
               .limit(100);

    const { data, error } = await query;

    if (error) {
      console.error('[ArchivePage] Error fetching approved social posts:', error);
      toast({
        title: 'Error Loading Approved Posts',
        description: error.message,
        variant: 'destructive',
      });
      setApprovedSocial([]); // Clear data on error
    } else {
      console.log(`[ArchivePage] Fetched ${data?.length ?? 0} approved posts.`);
      setApprovedSocial(data || []);
    }
    setIsLoadingApproved(false);
  };

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (user?.organization_id && supabase) {
        console.log('[ArchivePage] useEffect running for data fetch');
        fetchApprovedPosts(debouncedSearchTerm);
    } else {
        console.log('[ArchivePage] useEffect skipped: user or supabase not ready');
    }
  }, [user?.organization_id, supabase, debouncedSearchTerm]);

  // Updated rendering logic
  const renderApprovedList = (items: SocialPostItem[]) => {
     if (items.length === 0) {
       return <p className="text-sm text-gray-500 text-center py-8">No approved social posts found in the archive.</p>;
     }

     // Grouping is still useful
     const grouped = items.reduce((acc, item) => {
       const platform = item.platform || 'unknown';
       if (!acc[platform]) acc[platform] = [];
       acc[platform].push(item);
       return acc;
     }, {} as Record<string, SocialPostItem[]>);

     return (
       <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
         <div className="space-y-8">
           {Object.entries(grouped).map(([platform, posts]) => (
             <div key={platform}>
               <h2 className="text-lg font-semibold mb-3 capitalize">{platform}</h2>
               <div className="space-y-4">
                 {posts.map((item) => (
                   <DialogTrigger key={item.id} asChild onClick={() => setSelectedPost(item)}>
                     <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                       <CardContent className="p-4 flex items-start gap-4">
                         {item.image_url && (
                           <div className="flex-shrink-0">
                             <Image 
                               src={item.image_url.trim()} 
                               alt="Post Thumbnail" 
                               width={60}
                               height={60} 
                               className="object-cover rounded border" 
                             />
                           </div>
                         )}
                         <div className="flex-grow">
                           <p className="text-sm font-medium text-gray-800 line-clamp-3">
                             {item.post_text} 
                           </p>
                           <p className="text-xs text-gray-500 mt-1">
                             Created: {new Date(item.created_at).toLocaleDateString()}
                           </p>
                         </div>
                       </CardContent>
                     </Card>
                   </DialogTrigger>
                 ))}
               </div>
             </div>
           ))}
         </div>

         <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
           <DialogHeader>
             <DialogTitle>Archived Post Details</DialogTitle>
             {selectedPost && (
                 <DialogDescription>
                     Platform: {selectedPost.platform || 'N/A'} | Created: {new Date(selectedPost.created_at).toLocaleDateString()}
                 </DialogDescription>
             )}
           </DialogHeader>
           {selectedPost && (
             <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
               {selectedPost.image_url && (
                 <div>
                   <Image 
                     src={selectedPost.image_url.trim()} 
                     alt="Full Post Image" 
                     width={600} 
                     height={600} 
                     className="object-contain rounded border mx-auto max-w-full"
                     style={{ width: 'auto', height: 'auto' }}
                   />
                 </div>
               )}
               <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
                  {selectedPost.post_text}
               </div>
             </div>
           )}
         </DialogContent>
       </Dialog>
     );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Social Media Archive</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search archived post text..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:w-1/2 lg:w-1/3"
        />
      </div>

      {isLoadingApproved ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading archived posts...</p>
        </div>
      ) : (
        <div>
          {renderApprovedList(approvedSocial)}
        </div>
      )}
    </div>
  );
} 