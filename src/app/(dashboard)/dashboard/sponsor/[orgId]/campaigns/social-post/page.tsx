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
import { HelpCircle, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

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
    
    // Find the selected tone's text content
    const selectedToneData = tones.find(tone => tone.id === formData.tone_of_voice_id);
    
    const payload = {
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      user_id: user?.id,
      post_id: null,
      url: formData.url,
      include_source: formData.include_source,
      sentiment: formData.sentiment,
      thoughts: formData.thoughts,
      character_length: formData.character_length,
      email: formData.email,
      linkedin_post_type: formData.linkedin_post_type,
      twitter_post_type: formData.twitter_post_type,
      instagram_post_type: formData.instagram_post_type,
      add_podcast: formData.add_podcast,
      additional_instructions: formData.additional_instructions,
      // Include both ID and text content of the tone
      tone_of_voice_id: formData.tone_of_voice_id || null,
      tone_of_voice: selectedToneData ? {
        name: selectedToneData.name,
        description: selectedToneData.description
      } : null,
      // Add image type
      image_type: formData.image_type || null,
      platforms: {
        linkedin: formData.platforms.linkedin,
        twitter: formData.platforms.twitter,
        instagram: formData.platforms.instagram
      },
      post_text: null,
      platform: null,
      image_url: null,
      post_status: 'pending',
      image_status: 'pending',
      rejection: null
    };

    try {
      console.log('Submitting with tone:', selectedToneData ? selectedToneData.name : 'None');
      
      const webhookUrl = process.env.NEXT_PUBLIC_SOCIAL_POST_CREATION_WEBHOOK;
      if (!webhookUrl) {
        console.error('Missing social post creation webhook URL');
        toast({
          title: "Configuration Error",
          description: "Social post creation webhook is not configured.",
          variant: "destructive"
        });
        throw new Error('Social post creation webhook missing');
      }
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/dashboard/sponsor/${orgId}/campaigns`);
      } else {
        const errorText = await response.text();
        console.error('Failed to submit social post. Status:', response.status, 'Response:', errorText);
        toast({
          title: "Submission Failed",
          description: "There was an error submitting your post. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting social post:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      toast({
        title: "Error",
        description: "Failed to create post. Please check your connection and try again.",
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
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 mt-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
              >
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto p-4 sm:p-6">
      <Card>
        <CardContent className="pt-6">
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
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
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

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="Enter the URL you want to post about"
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Switch
                id="include-source"
                checked={formData.include_source}
                onCheckedChange={(checked) => setFormData({ ...formData, include_source: checked })}
              />
              <Label htmlFor="include-source">Include source in post</Label>
            </div>

            <div className="space-y-2">
              <Label>Sentiment *</Label>
              <Select
                value={formData.sentiment}
                onValueChange={(value) => setFormData({ ...formData, sentiment: value })}
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

            <div className="space-y-2">
              <Label htmlFor="thoughts">Your thoughts on this *</Label>
              <Textarea
                id="thoughts"
                required
                value={formData.thoughts}
                onChange={(e) => setFormData({ ...formData, thoughts: e.target.value })}
                placeholder="Share your thoughts on this content"
                className="w-full"
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>LinkedIn Post Type *</Label>
              <Select
                value={formData.linkedin_post_type}
                onValueChange={(value) => setFormData({ ...formData, linkedin_post_type: value })}
                required
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

            <div className="space-y-2">
              <Label>Twitter Post Type</Label>
              <Select
                value={formData.twitter_post_type}
                onValueChange={(value) => setFormData({ ...formData, twitter_post_type: value })}
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

            <div className="space-y-2">
              <Label>Instagram Post Type</Label>
              <Select
                value={formData.instagram_post_type}
                onValueChange={(value) => setFormData({ ...formData, instagram_post_type: value })}
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

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Switch
                  id="add-podcast"
                  checked={formData.add_podcast}
                  onCheckedChange={(checked) => setFormData({ ...formData, add_podcast: checked })}
                />
                <Label htmlFor="add-podcast">Create podcast</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-instructions">Additional Instructions</Label>
              <Textarea
                id="additional-instructions"
                value={formData.additional_instructions}
                onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
                placeholder="Any additional instructions or notes"
                className="w-full"
              />
            </div>

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

            <div className="space-y-2">
              <Label>Platforms *</Label>
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
                    checked={formData.platforms.instagram}
                    onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, instagram: checked } })}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="platform-instagram">Instagram</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4">
        <Link href="/dashboard/approvals" className="text-sm text-blue-600 hover:underline w-full sm:w-auto text-center">
          View Pending Approvals
        </Link>
        <Button 
          type="submit" 
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Post...' : 'Create Social Post'}
        </Button>
      </div>
    </form>
  );
} 