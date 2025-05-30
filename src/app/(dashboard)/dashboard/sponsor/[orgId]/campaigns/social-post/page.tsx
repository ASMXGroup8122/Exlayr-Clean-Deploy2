'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { use } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { HelpCircle, Sparkles, CheckCircle2, Save, Send, Wand2, Edit, PenSquare, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PostFromUrlTab from './PostFromUrlTab';
import { Badge } from '@/components/ui/badge';
import { FormatSelector, PodcastFormat } from '@/components/podcast/FormatSelector';
import { VoiceSelectorField } from '@/components/podcast/VoiceSelectorField'; // Added import
import PodcastPlayer from '@/components/podcast/PodcastPlayer';
import ElevenLabsConnectionHelper from '@/components/podcast/ElevenLabsConnectionHelper';
import PodcastTab from '@/components/podcast/PodcastTab';

interface SocialPostPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

interface ToneOfVoice {
  id: string;
  name: string;
  description: string;
}

// Define available AI models with more details
// Values should correspond to what the backend expects for each model provider
const AI_MODELS = {
  GPT4: { name: "GPT-4 (OpenAI)", value: "gpt-4" },
  GEMINI: { name: "Gemini 1.5 Pro (Google)", value: "gemini-1.5-pro" }, 
  CLAUDE_OPUS: { name: "Claude 3 Opus (Anthropic)", value: "claude-3-opus-20240229" }, // Example value
  DEEPSEEK_CHAT: { name: "DeepSeek Chat (DeepSeek)", value: "deepseek-chat" } // Example value
};

// Specific AI Models for the Podcast Feature - REMOVING THIS
/*
const AI_MODELS_PODCAST = {
  GPT4: AI_MODELS.GPT4,
  GEMINI: AI_MODELS.GEMINI
};
*/

export default function SocialPostPage({ params }: SocialPostPageProps) {
  const { orgId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tones, setTones] = useState<ToneOfVoice[]>([]);
  const [loadingTones, setLoadingTones] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ToneOfVoice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedDocumentName, setSelectedDocumentName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'image' | 'podcast'>('url');
  const [selectedFileObject, setSelectedFileObject] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    url: '',
    include_source: true,
    sentiment: '',
    thoughts: '',
    character_length: '',
    email: '',
    linkedin_post_type: '',
    twitter_post_type: '',
    instagram_post_type: '',
    add_podcast: false,
    additional_instructions: '',
    tone_of_voice_id: '',
    image_type: '',
    hostName: '',
    conversationUrlInput: '',
    platforms: {
      linkedin: false,
      twitter: false,
      instagram: false
    }
  });

  // Fetch tones of voice
  useEffect(() => {
    const fetchTones = async () => {
      if (!orgId) return;
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      try {
        console.log('Starting to fetch tones...');
        setLoadingTones(true);
        setLoadError(null);
        
        // Set a timeout to stop loading after 10 seconds
        timeoutRef.current = setTimeout(() => {
          console.log('Tone loading timed out after 10 seconds');
          setLoadingTones(false);
          setLoadError('Loading timed out. Please try refreshing.');
        }, 10000);
        
        const { data, error } = await supabase
          .from('tone_of_voice')
          .select('id, name, description')
          .eq('organization_id', orgId)
          .order('name', { ascending: true });
        
        // Clear the timeout since the request completed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
          
        if (error) {
          console.error('Supabase error fetching tones:', error);
          throw error;
        }
        
        console.log(`Loaded ${data?.length || 0} tones successfully`);
        setTones(data || []);
        
        // Find selected tone
        if (formData.tone_of_voice_id && data) {
          const tone = data.find(t => t.id === formData.tone_of_voice_id);
          if (tone) setSelectedTone(tone);
        }
      } catch (err) {
        console.error('Error fetching tones of voice:', err);
        setLoadError('Failed to load tones');
        toast({
          title: "Error",
          description: "Failed to load tones of voice",
          variant: "destructive"
        });
      } finally {
        // Ensure loading state is turned off
        setLoadingTones(false);
      }
    };

    fetchTones();
    
    // Clean up timeout on component unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [orgId, supabase]);

  // Handle tone selection
  const handleToneChange = (toneId: string) => {
    setFormData({ ...formData, tone_of_voice_id: toneId });
    const tone = tones.find(t => t.id === toneId);
    setSelectedTone(tone || null);
  };

  const sentimentOptions = [
    'Agree',
    'Disagree',
    'Both sides',
    'Other'
  ];

  const characterLengthOptions = [
    '500-800',
    '1100-1300',
    '1500-1800'
  ];

  const podcastLengthOptions = [
    '10 minutes',
    '15 minutes',
    '25 minutes'
  ];

  const imageTypeOptions = [
    'photorealistic editorial',
    'cinematic illustration',
    'infographic',
    'cartoon',
    'surreal',
    'ai futuristic'
  ];

  const linkedinPostTypes = [
    'Thought Leadership',
    'Industry News',
    'Company News',
    'Product Updates',
    'Event Promotion',
    'Customer Success Story',
    'Market Analysis',
    'Educational Content',
    'Team Spotlight',
    'Behind the Scenes',
    'Industry Trends',
    'Tips and How-tos',
    'Company Culture',
    'Partnership Announcement',
    'Awards and Recognition'
  ];

  const twitterPostTypes = [
    'News Update',
    'Industry Insight',
    'Quick Tip',
    'Question/Poll',
    'Company Update'
  ];

  const instagramPostTypes = [
    'Visual Story',
    'Product Showcase',
    'Team Feature',
    'Event Highlight',
    'Behind the Scenes'
  ];

  const podcastCategories = [
    'AI',
    'Crypto',
    'Real World Assets'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // If the active tab is 'podcast', the creation is handled by PodcastTab.tsx and its own button.
    // This main form submission should not proceed for the podcast tab.
    if (activeTab === 'podcast') {
      setIsSubmitting(false); // Reset submitting state
      console.log("handleSubmit on SocialPostPage: Podcast tab is active, action handled by PodcastTab.");
      return;
    }

    // The following logic is now only for non-podcast tabs (URL, Image)
    const selectedToneData = tones.find(tone => tone.id === formData.tone_of_voice_id);
    
    const payload = {
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      user_id: user?.id,
      post_id: null, // This might need to be reviewed if it's used differently for URL/Image posts
      url: formData.url,
      include_source: formData.include_source,
      sentiment: formData.sentiment,
      thoughts: formData.thoughts,
      character_length: formData.character_length,
      email: formData.email,
      linkedin_post_type: formData.linkedin_post_type,
      twitter_post_type: formData.twitter_post_type,
      instagram_post_type: formData.instagram_post_type,
      add_podcast: false, // Explicitly false as this section is not for podcasts
      additional_instructions: formData.additional_instructions,
      tone_of_voice_id: formData.tone_of_voice_id || null,
      tone_of_voice: selectedToneData ? {
        name: selectedToneData.name,
        description: selectedToneData.description
      } : null,
      image_type: formData.image_type || null,
      platforms: {
        linkedin: formData.platforms.linkedin,
        twitter: formData.platforms.twitter,
        instagram: formData.platforms.instagram
      },
      post_text: null, // This might be formData.thoughts for URL/Image posts
      platform: null, // This will be set in the supabase insert
      image_url: null,
      post_status: 'approved', // Directly 'approved' for URL/Image posts
      image_status: 'approved', // Directly 'approved' for URL/Image posts
      rejection: null
    };

    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          organization_id: orgId,
          user_id: user?.id,
          platform: Object.entries(formData.platforms)
            .filter(([_, enabled]) => enabled)
            .map(([platform]) => platform)
            .join(','),
          post_text: payload.thoughts, // Using thoughts from payload
          url: payload.url,
          sentiment: payload.sentiment,
          thoughts: payload.thoughts,
          character_length: payload.character_length,
          linkedin_post_type: formData.platforms.linkedin ? payload.linkedin_post_type : null,
          twitter_post_type: formData.platforms.twitter ? payload.twitter_post_type : null,
          instagram_post_type: formData.platforms.instagram ? payload.instagram_post_type : null,
          image_type: payload.image_type,
          post_status: 'approved', // Consistent with payload
          image_status: 'approved', // Consistent with payload
          status: 'approved',
          created_at: new Date().toISOString(),
          approved_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Failed to save social post:', error);
        toast({
          title: "Posting Failed",
          description: "There was an error saving your social post. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Post Created",
          description: "Your post has been created and will be published shortly.",
          variant: "default"
        });
        router.push(`/dashboard/sponsor/${orgId}/campaigns`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      toast({
        title: "Error",
        description: "Failed to process your request. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select component rendering based on loading state
  const renderToneSelector = () => {
    return (
      <Select
        value={formData.tone_of_voice_id}
        onValueChange={handleToneChange}
        disabled={loadingTones}
      >
        <SelectTrigger className={`w-full h-10 bg-white ${loadingTones ? 'opacity-70' : ''}`}>
          {loadingTones ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full"></div>
              <span>Loading tones...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a tone of voice" />
          )}
        </SelectTrigger>
        <SelectContent 
          className="max-h-[300px] overflow-y-auto z-50" 
          position="popper"
          sideOffset={5}
          align="start"
        >
          {loadError && (
            <div className="p-3 text-center text-sm">
              <p className="text-red-500 font-medium">{loadError}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Refresh
              </Button>
            </div>
          )}
          
          {tones.length === 0 && !loadingTones && !loadError && (
            <div className="p-3 text-center text-sm">
              <p className="text-gray-700 font-medium">No tones available</p>
              <Link
                href={`/dashboard/sponsor/${orgId}/knowledge-vault?tab=tones-of-voice`}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 mt-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200">
                <Sparkles className="h-3 w-3" />
                Create with AI
              </Link>
            </div>
          )}
          
          {loadingTones && (
            <div className="p-3 text-center flex items-center justify-center">
              <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full mr-2"></div>
              <span className="text-sm text-gray-500">Loading tones...</span>
            </div>
          )}
          
          {tones.map((tone) => (
            <SelectItem key={tone.id} value={tone.id}>
              {tone.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderFormContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="tone-of-voice" className="text-base font-medium">Tone of Voice</Label>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Sparkles className="h-3 w-3 mr-0.5" />
              AI-Powered
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3 bg-white shadow-lg rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700">Choose a tone personality for your content. The AI will use this to match the voice and style.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Link
            href={`/dashboard/sponsor/${orgId}/knowledge-vault?tab=tones-of-voice`}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
            <Sparkles className="h-3.5 w-3.5" />
            Create Custom
          </Link>
        </div>
        
        {renderToneSelector()}
        
        {selectedTone && (
          <div className="mt-1 text-sm text-gray-600">
            {selectedTone.description && (
              <p className="line-clamp-2">{selectedTone.description}</p>
            )}
          </div>
        )}
      </div>

      {/* URL input - Simplified, podcast-specific conditions removed by commenting out or deleting. 
         Kept for activeTab !== 'podcast' scenarios or if PodcastTab internally handles its own URL if needed.
      */}
      {activeTab !== 'podcast' && (
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="Enter URL for content source"
          className="w-full"
        />
        </div>
      )}
      
      {/* Document upload option - REMOVED as it was podcast-specific */}
      {/* {activeTab === 'podcast' && podcastFormat === 'conversation' && ( ... )} */}

      {activeTab !== 'podcast' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Switch
            id="include-source"
            checked={formData.include_source}
            onCheckedChange={(checked) => setFormData({ ...formData, include_source: checked })}
          />
          <Label htmlFor="include-source">Include source in post</Label>
        </div>
      )}

      {activeTab !== 'podcast' && (
        <div className="space-y-2">
          <Label>Sentiment *</Label>
          <Select
            value={formData.sentiment}
            onValueChange={(value) => setFormData({ ...formData, sentiment: value.toLowerCase() })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sentiment" />
            </SelectTrigger>
            <SelectContent>
              {sentimentOptions.map((option) => (
                <SelectItem key={option} value={option.toLowerCase()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Thoughts Textarea - Simplified, podcast-specific conditions removed. 
         Kept for activeTab !== 'podcast' scenarios. PodcastTab handles its own thoughts/script input.
      */}
      {activeTab !== 'podcast' && (
      <div className="space-y-2">
            <Label htmlFor="thoughts">Your thoughts on this *</Label>
        <Textarea
          id="thoughts"
              required
          value={formData.thoughts}
          onChange={(e) => setFormData({ ...formData, thoughts: e.target.value })}
              placeholder="Share your thoughts on this content"
          className="w-full"
              rows={4}
        />
      </div>
      )}

      {/* Character Length / Podcast Length - Simplified. 
         Kept for activeTab !== 'podcast'. PodcastTab handles its own length selection.
      */}
      {activeTab !== 'podcast' && (
      <div className="space-y-2">
          <Label>Character Length *</Label>
        <Select
          value={formData.character_length}
          onValueChange={(value) => setFormData({ ...formData, character_length: value })}
          required
        >
          <SelectTrigger className="w-full">
              <SelectValue placeholder="Select character length" />
          </SelectTrigger>
          <SelectContent>
              {characterLengthOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      )}

      {/* Platform selection - Common to all tabs, so kept */}
      <div className="space-y-2">
        <Label>
          {activeTab === 'podcast' ? 'Promote on these Platforms when Approved' : 'Platforms *'}
        </Label>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Switch
              id="platform-linkedin"
              checked={formData.platforms.linkedin}
              onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, linkedin: checked } })}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-linkedin">LinkedIn</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="platform-twitter"
              checked={formData.platforms.twitter}
              onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, twitter: checked } })}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-twitter">X (Twitter)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="platform-instagram"
              checked={false}
              disabled={true}
              className="data-[state=checked]:bg-gray-400"
            />
            <Label htmlFor="platform-instagram" className="flex items-center">
              Instagram
              <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
            </Label>
          </div>
        </div>
      </div>

      {/* Conditionally render platform-specific post type selectors */}
      {activeTab !== 'podcast' && formData.platforms.linkedin && (
        <div className="space-y-2">
          <Label>LinkedIn Post Type *</Label>
          <Select
            value={formData.linkedin_post_type}
            onValueChange={(value) => setFormData({ ...formData, linkedin_post_type: value.toLowerCase() })}
            required={formData.platforms.linkedin}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select LinkedIn post type" />
            </SelectTrigger>
            <SelectContent>
              {linkedinPostTypes.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeTab !== 'podcast' && formData.platforms.twitter && (
        <div className="space-y-2">
          <Label>Twitter Post Type</Label>
          <Select
            value={formData.twitter_post_type}
            onValueChange={(value) => setFormData({ ...formData, twitter_post_type: value.toLowerCase() })}
            required={formData.platforms.twitter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Twitter post type" />
            </SelectTrigger>
            <SelectContent>
              {twitterPostTypes.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeTab !== 'podcast' && formData.platforms.instagram && (
        <div className="space-y-2">
          <Label>Instagram Post Type</Label>
          <Select
            value={formData.instagram_post_type}
            onValueChange={(value) => setFormData({ ...formData, instagram_post_type: value.toLowerCase() })}
            required={formData.platforms.instagram}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Instagram post type" />
            </SelectTrigger>
            <SelectContent>
              {instagramPostTypes.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Image Type - Only show for non-podcast tabs */}
      {activeTab !== 'podcast' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">Image Type</Label>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Sparkles className="h-3 w-3 mr-0.5" />
              AI-Generated
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3 bg-white shadow-lg rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700">Select a style for AI-generated images that will accompany your post.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={formData.image_type}
            onValueChange={(value) => setFormData({ ...formData, image_type: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select image style" />
            </SelectTrigger>
            <SelectContent>
              {imageTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // --- > New Function for Image Tab Form Content
  const renderImageFormContent = () => (
    <div className="space-y-6"> {/* Added a wrapper div for spacing consistency */}
      {/* Tone of Voice Selector (Keep as is) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Label htmlFor="tone-of-voice-image" className="text-base font-medium">Tone of Voice</Label> {/* Ensure unique ID if needed */}
             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               <Sparkles className="h-3 w-3 mr-0.5" />
               AI-Powered
             </span>
            <TooltipProvider>
              <Tooltip>
                 <TooltipTrigger asChild>
                   <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                 </TooltipTrigger>
                 <TooltipContent side="right" className="max-w-xs p-3 bg-white shadow-lg rounded-md border border-gray-200">
                   <p className="text-sm text-gray-700">Choose a tone personality for your content. The AI will use this to match the voice and style.</p>
                 </TooltipContent>
              </Tooltip>
            </TooltipProvider>
           </div>
          <Link
            href={`/dashboard/sponsor/${orgId}/knowledge-vault?tab=tones-of-voice`}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
            <Sparkles className="h-3.5 w-3.5" />
            Create Custom
          </Link>
         </div>
        
        {renderToneSelector()} {/* Reuse the same tone selector logic */}
        
        {selectedTone && (
          <div className="mt-1 text-sm text-gray-600">
             {selectedTone.description && (
              <p className="line-clamp-2">{selectedTone.description}</p>
             )}
           </div>
        )}
       </div>

      {/* --- > Image Upload Input (Replaces URL) */}
      <div className="space-y-2">
         <Label htmlFor="image-upload">Upload an image *</Label>
         <div className="flex items-center gap-2">
            <Input
              id="image-upload"
              type="file"
              required
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setSelectedFileName(file ? file.name : null);
              }}
            />
            <Label
              htmlFor="image-upload"
              className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2`}
            >
              Choose File
            </Label>
            <span className="text-sm text-gray-600">
              {selectedFileName || "No file chosen"}
            </span>
         </div>
       </div>
       {/* <--- End Image Upload Input */}

      {/* Your Thoughts Textarea */}
      <div className="space-y-2">
         <Label htmlFor="thoughts-image">What you would like convey in the post? *</Label>
         <Textarea
           id="thoughts-image"
           required
           value={formData.thoughts}
           onChange={(e) => setFormData({ ...formData, thoughts: e.target.value })}
           placeholder="Share your thoughts on this content"
           className="w-full"
           rows={4}
         />
       </div>

      {/* Character Length Selector */}
      <div className="space-y-2">
        <Label>Character Length *</Label>
        <Select
          value={formData.character_length}
          onValueChange={(value) => setFormData({ ...formData, character_length: value })}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select character length" />
          </SelectTrigger>
          <SelectContent>
            {characterLengthOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Platform Toggles */}
      <div className="space-y-2">
        <Label>Platforms *</Label>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* ... platform toggles ... (ensure IDs are unique if needed, e.g., platform-linkedin-image) */}
           <div className="flex items-center gap-2">
            <Switch
              id="platform-linkedin-image"
              checked={formData.platforms.linkedin}
              onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, linkedin: checked } })}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-linkedin-image">LinkedIn</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="platform-twitter-image"
              checked={formData.platforms.twitter}
              onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, twitter: checked } })}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-twitter-image">X (Twitter)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="platform-instagram-image"
              checked={false}
              disabled={true}
              className="data-[state=checked]:bg-gray-400"
            />
            <Label htmlFor="platform-instagram-image" className="flex items-center">
              Instagram
              <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
            </Label>
          </div>
        </div>
      </div>

      {/* Conditional Platform Specific Fields (keep structure, adjust IDs if necessary) */}
      {formData.platforms.linkedin && (
        <div className="space-y-2">
          <Label>LinkedIn Post Type *</Label>
          {/* ... linkedin select ... */}
          <Select
            value={formData.linkedin_post_type}
            onValueChange={(value) => setFormData({ ...formData, linkedin_post_type: value.toLowerCase() })}
            required={formData.platforms.linkedin}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select LinkedIn post type" />
            </SelectTrigger>
            <SelectContent>
              {linkedinPostTypes.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.platforms.twitter && (
         <div className="space-y-2">
          <Label>Twitter Post Type</Label>
          {/* ... twitter select ... */}
           <Select
            value={formData.twitter_post_type}
            onValueChange={(value) => setFormData({ ...formData, twitter_post_type: value.toLowerCase() })}
            required={formData.platforms.twitter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Twitter post type" />
            </SelectTrigger>
            <SelectContent>
              {twitterPostTypes.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

       {formData.platforms.instagram && (
         <div className="space-y-2">
          <Label>Instagram Post Type</Label>
          {/* ... instagram select ... */}
          <Select
            value={formData.instagram_post_type}
            onValueChange={(value) => setFormData({ ...formData, instagram_post_type: value.toLowerCase() })}
            required={formData.platforms.instagram}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Instagram post type" />
            </SelectTrigger>
            <SelectContent>
              {instagramPostTypes.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Image Type Selector (Keep as is) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <Label className="text-base font-medium">Image Type</Label>
           <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
             <Sparkles className="h-3 w-3 mr-0.5" />
             AI-Generated
           </span>
          <TooltipProvider>
            <Tooltip>
               <TooltipTrigger asChild>
                 <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
               </TooltipTrigger>
               <TooltipContent side="right" className="max-w-xs p-3 bg-white shadow-lg rounded-md border border-gray-200">
                 <p className="text-sm text-gray-700">Select a style for AI-generated images that will accompany your post.</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         </div>
        <Select
          value={formData.image_type}
          onValueChange={(value) => setFormData({ ...formData, image_type: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select image style" />
          </SelectTrigger>
          <SelectContent>
            {imageTypeOptions.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
  // <--- End Image Tab Form Content Function

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create Social Post</h1>
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardContent className="p-0">
              {/* Clean, simple tabs like in the screenshot */}
              <div className="border-b border-gray-200 bg-gray-50 px-4">
                <div className="flex space-x-8 -mb-px">
                   <button
                     type="button"
                     onClick={() => setActiveTab('url')}
                     className={`py-4 px-3 border-b-2 font-medium text-sm ${
                        activeTab === 'url'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                     }`}
                   >
                     Post from URL
                   </button>
                   <button
                     type="button"
                     onClick={() => setActiveTab('image')}
                     className={`py-4 px-3 border-b-2 font-medium text-sm ${
                        activeTab === 'image'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                     }`}
                   >
                     From Image
                   </button>
                   <button
                     type="button"
                     onClick={() => setActiveTab('podcast')}
                     className={`py-4 px-3 border-b-2 font-medium text-sm ${
                        activeTab === 'podcast'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                     }`}
                   >
                     Podcast
                   </button>
                </div>
              </div>
              
              {/* Tab content area */}
              <div className="p-6 bg-white">
                {activeTab === 'url' && (
                  <PostFromUrlTab 
                    orgId={orgId}
                    formData={formData}
                    setFormData={setFormData}
                    tones={tones}
                    loadingTones={loadingTones}
                    loadError={loadError}
                    handleToneChange={handleToneChange}
                    selectedTone={selectedTone}
                    characterLengthOptions={characterLengthOptions}
                    sentimentOptions={sentimentOptions}
                    imageTypeOptions={imageTypeOptions} 
                    linkedinPostTypes={linkedinPostTypes}
                    twitterPostTypes={twitterPostTypes}
                    instagramPostTypes={instagramPostTypes}
                    aiModels={AI_MODELS}
                  />
                )}
                {activeTab === 'image' && renderImageFormContent()}
                {activeTab === 'podcast' && (
                  <PodcastTab 
                    orgId={orgId}
                    formData={formData}
                    setFormData={setFormData}
                    selectedFileObject={selectedFileObject}
                    setSelectedFileObject={setSelectedFileObject}
                    selectedDocumentName={selectedDocumentName}
                    setSelectedDocumentName={setSelectedDocumentName}
                    isConversationComingSoon={true}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 mt-6">
            {/* The 'Save Social Post' button and 'View Pending Approvals' link 
                previously rendered here when activeTab === 'podcast' have been removed.
            */}
            {activeTab !== 'podcast' && (
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Save Post'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
} 