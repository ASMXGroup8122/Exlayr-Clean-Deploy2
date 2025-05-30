'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, HelpCircle, Send } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link'; 
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface ToneOfVoice {
  id: string;
  name: string;
  description: string;
}

interface AIModelDetail {
  name: string;
  value: string;
}

interface AIModels {
  [key: string]: AIModelDetail;
}

interface PostFromUrlTabProps {
  orgId: string;
  formData: any; 
  setFormData: (updateFn: (prevData: any) => any) => void;
  tones: ToneOfVoice[];
  loadingTones: boolean;
  loadError: string | null;
  handleToneChange: (toneId: string) => void; 
  selectedTone: ToneOfVoice | null; 
  characterLengthOptions: string[];
  sentimentOptions: string[];
  imageTypeOptions: string[];
  linkedinPostTypes: string[];
  twitterPostTypes: string[];
  instagramPostTypes: string[];
  aiModels: AIModels; 
}

export default function PostFromUrlTab({
  orgId,
  formData,
  setFormData,
  tones,
  loadingTones,
  loadError,
  handleToneChange,
  selectedTone,
  characterLengthOptions,
  sentimentOptions,
  imageTypeOptions,
  linkedinPostTypes,
  twitterPostTypes,
  instagramPostTypes,
  aiModels,
}: PostFromUrlTabProps) {
  const [selectedAIModel, setSelectedAIModel] = useState<string>(aiModels.GPT4.value);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<{
    linkedin?: { text: string, imageUrl: string, saved: boolean },
    twitter?: { text: string, imageUrl: string, saved: boolean },
    instagram?: { text: string, imageUrl: string, saved: boolean }
  }>({});
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean, id: string) => {
    setFormData(prev => ({ ...prev, [id]: checked }));
  };

  const handleSelectChange = (value: string, id: string) => {
     setFormData(prev => ({ ...prev, [id]: value.toLowerCase() }));
  };
  
  const handleCharacterLengthChange = (value: string) => {
    setFormData(prev => ({ ...prev, character_length: value }));
  };

  const handleImageTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, image_type: value }));
  };
  
  const handlePlatformChange = (checked: boolean, platform: 'linkedin' | 'twitter' | 'instagram') => {
    setFormData(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: checked,
      },
    }));
  };

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setGeneratedContent({});

    // TEST: Verify API endpoints are accessible
    try {
      // Quick test to verify API endpoint is accessible
      const imageApiTest = await fetch('/api/ai/generate-social-post-image', { 
        method: 'HEAD'
      });
      console.log('Image API route accessibility test:', imageApiTest.status, imageApiTest.ok);
    } catch (error) {
      console.error('Image API endpoint test failed:', error);
    }

    const selectedPlatforms = Object.entries(formData.platforms)
      .filter(([_, isSelected]) => isSelected)
      .map(([platform]) => platform);

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Platform Required",
        description: "Please select at least one platform (LinkedIn, Twitter, Instagram) to generate content for.",
        variant: "destructive"
      });
      setIsGenerating(false);
      return;
    }

    const payload = {
      url: formData.url,
      thoughts: formData.thoughts,
      tone: selectedTone ? { 
        id: selectedTone.id, 
        name: selectedTone.name, 
        description: selectedTone.description 
      } : null,
      selectedModel: selectedAIModel,
      characterLength: formData.character_length,
      sentiment: formData.sentiment,
      includeSource: formData.include_source,
      platforms: selectedPlatforms
    };

    console.log("Calling /api/ai/generate-social-post-text with payload:", payload);

    try {
      const response = await fetch('/api/ai/generate-social-post-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate text content.');
      }

      console.log("API Response (Text Gen):", data);

      // Update state with received texts FIRST
      const newGeneratedContent: any = {}; // Using any temporarily for easier state update
      const generatedPlatforms = Object.keys(data.generatedTexts || {});

      if (generatedPlatforms.length > 0 && data.generatedTexts) {
        for (const platform of generatedPlatforms) {
            if (platform === 'linkedin' || platform === 'twitter' || platform === 'instagram') {
               newGeneratedContent[platform] = {
                 text: data.generatedTexts[platform],
                 imageUrl: '', // Initialize image URL as empty
                 saved: false,
               };
            }
        }
        setGeneratedContent(newGeneratedContent);
        toast({ 
          title: "Text Generated", 
          description: "Now generating images...",
          variant: "default"
        });

        // --- Now trigger image generation for each platform --- 
        const imagePromises = generatedPlatforms.map(platform => {
            if (platform !== 'linkedin' && platform !== 'twitter' && platform !== 'instagram') return Promise.resolve(); // Skip invalid platforms
            
            // Extract keywords from the first 100 words of text to help with theme identification
            const textSample = newGeneratedContent[platform].text.split(' ').slice(0, 100).join(' ');
            const extractTextContext = (text: string): string => {
              // Extract the first few sentences for context
              const sentences = text.split(/[.!?]+/).slice(0, 3).join('. ');
              return sentences;
            };

            const imagePayload = {
              // Use generated text as base for image prompt, plus image type
              promptText: newGeneratedContent[platform].text, 
              imageType: formData.image_type || 'photorealistic editorial', // Default if none selected
              platform: platform,
              // Add more context to help with theme extraction
              additionalContext: {
                userThoughts: formData.thoughts,
                contentSummary: extractTextContext(textSample),
                sentiment: formData.sentiment,
                topic: platform === 'linkedin' ? formData.linkedin_post_type : 
                       platform === 'twitter' ? formData.twitter_post_type : 
                       platform === 'instagram' ? formData.instagram_post_type : null
              }
            };
            console.log(`Calling image API for ${platform} with payload:`, imagePayload);
            
            // Add timestamp to track API response time
            const startTime = Date.now();
            
            try {
              return fetch('/api/ai/generate-social-post-image', { // Correct endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imagePayload)
              })
              .then(res => {
                // Log response status before parsing
                console.log(`Image API ${platform} response status:`, res.status, res.statusText);
                if (!res.ok) {
                  console.error(`Error response from image API for ${platform}:`, res.status, res.statusText);
                }
                return res.json();
              })
              .then(imgData => {
                // Log response time
                console.log(`Image API ${platform} response time: ${Date.now() - startTime}ms`);
                console.log(`Image API ${platform} response data:`, imgData);
                
                if (imgData.success && imgData.imageUrl) {
                  console.log(`Received image URL for ${platform}:`, imgData.imageUrl);
                  
                  // Verify the image URL is accessible
                  fetch(imgData.imageUrl, { method: 'HEAD' })
                    .then(imgCheckResponse => {
                      console.log(`Image URL check for ${platform}: Status ${imgCheckResponse.status}, Content-Type: ${imgCheckResponse.headers.get('content-type')}`);
                    })
                    .catch(imgCheckError => {
                      console.error(`Error checking image URL for ${platform}:`, imgCheckError);
                    });
                  
                  // Update the specific platform's imageUrl in state
                  setGeneratedContent(prev => {
                    const updated = {
                      ...prev,
                      [platform]: {
                        ...(prev[platform] || {}),
                        imageUrl: imgData.imageUrl
                      }
                    };
                    console.log('Updated generatedContent state:', updated);
                    return updated;
                  });
                } else {
                    console.error(`Image generation failed for ${platform}:`, imgData.message);
                    // Optionally update state to show an error image or message?
                    toast({ title: `Image Error (${platform})`, description: imgData.message || 'Failed', variant: "destructive" });
                }
              })
              .catch(error => {
                   console.error(`Fetch error during image generation for ${platform}:`, error);
                   toast({ title: `Image Error (${platform})`, description: error.message || 'Network error', variant: "destructive" });
              });
            } catch (error) {
              console.error(`Exception during image API setup for ${platform}:`, error);
              toast({ 
                title: `Image API Setup Error (${platform})`, 
                description: error instanceof Error ? error.message : 'Unknown error', 
                variant: "destructive" 
              });
              return Promise.resolve(); // Return a resolved promise to continue with other platforms
            }
        });

        await Promise.all(imagePromises);
        console.log("Finished all image generation requests.");
        toast({ title: "Images Generated", description: "Images ready for review.", variant: "default" });
        // --- End image generation trigger --- 

      } else {
        // Handle case where text generation returned no platforms/texts
        console.warn("Text generation did not return any texts.");
        toast({ 
            title: "Generation Issue", 
            description: "No text content was generated.", 
            variant: "default"
        }); 
        setGeneratedContent({}); // Ensure it's cleared
      }

    } catch (error) {
      console.error("Error calling generation API:", error);
      let errorMessage = "An unknown error occurred during text generation.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setGeneratedContent({});
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratedTextChange = (platform: 'linkedin' | 'twitter' | 'instagram', newText: string) => {
    setGeneratedContent(prev => ({
      ...prev,
      [platform]: {
        ...(prev[platform] as object),
        text: newText,
        saved: false
      }
    }));
  };

  const handleSaveTogglePlatformText = (e: React.MouseEvent<HTMLButtonElement>, platform: 'linkedin' | 'twitter' | 'instagram') => {
    e.preventDefault();
    e.stopPropagation();
    
    setGeneratedContent(prev => {
        const currentPlatformData = prev[platform];
        if (!currentPlatformData) return prev;
        
        return {
            ...prev,
            [platform]: {
                ...currentPlatformData,
                saved: !currentPlatformData.saved
            }
        };
    });
  };

  // Placeholder handler for the final submission
  const handleApproveAndPost = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Approve and Post clicked!");
    console.log("Final content to post:", generatedContent);
    
    // Track overall publishing status
    let overallSuccess = true;
    const platformResults: {[key: string]: {success: boolean, message: string}} = {};
    
    try {
      setIsGenerating(true); // Reuse loading state for posting
      
      // First, check if LinkedIn is selected and has content
      if (formData.platforms.linkedin && generatedContent.linkedin) {
        try {
          console.log("Posting to LinkedIn...");
          
          // Add detailed logging of what we're sending to LinkedIn API
          console.log("LinkedIn API request details:", {
            url: '/api/linkedin/post',
            method: 'POST',
            bodyData: {
              organizationId: orgId,
              message: generatedContent.linkedin.text,
              imageUrl: generatedContent.linkedin.imageUrl || undefined,
              altText: "AI-generated image for social media post"
            }
          });
          
          const linkedinResponse = await fetch('/api/linkedin/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              organizationId: orgId,
              message: generatedContent.linkedin.text,
              imageUrl: generatedContent.linkedin.imageUrl || undefined,
              altText: "AI-generated image for social media post"
            }),
          });
          
          const linkedinData = await linkedinResponse.json();
          console.log("LinkedIn post response:", linkedinData);
          
          // Log the full request details for debugging
          console.log("LinkedIn post request:", {
            organizationId: orgId,
            textLength: generatedContent.linkedin.text.length,
            hasImage: !!generatedContent.linkedin.imageUrl,
            imageUrl: generatedContent.linkedin.imageUrl
          });
          
          if (linkedinData.success) {
            platformResults.linkedin = { 
              success: true, 
              message: linkedinData.message || 'Posted successfully to LinkedIn' 
            };
            
            // Save successful post to social_posts table with proper approval fields
            try {
              const currentTime = new Date().toISOString();
              const saveResponse = await fetch('/api/social/save-post', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  organizationId: orgId,
                  platform: 'linkedin',
                  postText: generatedContent.linkedin.text,
                  imageUrl: generatedContent.linkedin.imageUrl || null,
                  url: formData.url || null,
                  thoughts: formData.thoughts || null,
                  postStatus: 'approved',
                  imageStatus: 'approved',
                  status: 'approved',
                  approvedAt: currentTime,
                  posted_at: currentTime, 
                  sentiment: formData.sentiment || null,
                  linkedin_post_type: formData.linkedin_post_type || null,
                  postId: linkedinData.postId || null
                }),
              });
              
              console.log("Save post response:", await saveResponse.json());
            } catch (saveError) {
              console.error("Error saving post to database:", saveError);
            }
          } else {
            overallSuccess = false;
            platformResults.linkedin = { 
              success: false, 
              message: linkedinData.error || 'Failed to post to LinkedIn' 
            };
          }
        } catch (error) {
          console.error("Error posting to LinkedIn:", error);
          overallSuccess = false;
          platformResults.linkedin = { 
            success: false, 
            message: error instanceof Error ? error.message : 'Failed to post to LinkedIn'
          };
        }
      }
      
      // TODO: Add similar implementation for Twitter/X when API integration is ready
      if (formData.platforms.twitter && generatedContent.twitter) {
        platformResults.twitter = { 
          success: false, 
          message: 'Twitter/X posting not yet implemented' 
        };
        
        // Even though we can't post to Twitter yet, save the post in our database as a draft
        try {
          const currentTime = new Date().toISOString();
          await fetch('/api/social/save-post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              organizationId: orgId,
              platform: 'twitter',
              postText: generatedContent.twitter.text,
              imageUrl: generatedContent.twitter.imageUrl || null,
              url: formData.url || null,
              thoughts: formData.thoughts || null,
              postStatus: 'planned', // Use 'planned' instead of 'draft' to avoid appearing in approval queue
              imageStatus: 'planned', // Use 'planned' instead of 'draft'
              status: 'planned', // Use 'planned' instead of 'draft'
              approvedAt: currentTime, // Mark it as already approved
              posted_at: null, // But not yet posted
              sentiment: formData.sentiment || null,
              twitter_post_type: formData.twitter_post_type || null
            }),
          });
        } catch (error) {
          console.error("Error saving Twitter post to database:", error);
        }
      }
      
      // TODO: Add similar implementation for Instagram when API integration is ready
      if (formData.platforms.instagram && generatedContent.instagram) {
        platformResults.instagram = { 
          success: false, 
          message: 'Instagram posting not yet implemented' 
        };
        
        // Even though we can't post to Instagram yet, save the post in our database as a draft
        try {
          const currentTime = new Date().toISOString();
          await fetch('/api/social/save-post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              organizationId: orgId,
              platform: 'instagram',
              postText: generatedContent.instagram.text,
              imageUrl: generatedContent.instagram.imageUrl || null,
              url: formData.url || null,
              thoughts: formData.thoughts || null,
              postStatus: 'planned', // Use 'planned' instead of 'draft' to avoid appearing in approval queue
              imageStatus: 'planned', // Use 'planned' instead of 'draft'
              status: 'planned', // Use 'planned' instead of 'draft'
              approvedAt: currentTime, // Mark it as already approved
              posted_at: null, // But not yet posted
              sentiment: formData.sentiment || null,
              instagram_post_type: formData.instagram_post_type || null
            }),
          });
        } catch (error) {
          console.error("Error saving Instagram post to database:", error);
        }
      }
      
      // Show appropriate toast notifications based on results
      if (overallSuccess) {
        toast({
          title: "Posts Successfully Published",
          description: "Your content has been posted to the selected platforms.",
          variant: "default"
        });
        
        // Redirect to the social media archive page after a brief delay
        setTimeout(() => {
          router.push(`/dashboard/social-media-archive?orgId=${orgId}`);
        }, 1500); // 1.5 second delay to allow the user to see the success message
      } else {
        // Create message showing which platforms succeeded/failed
        const resultsSummary = Object.entries(platformResults)
          .map(([platform, result]) => `${platform}: ${result.success ? 'Success' : 'Failed'}`)
          .join(', ');
          
        toast({
          title: "Some Posts Failed to Publish",
          description: `Results: ${resultsSummary}`,
          variant: "destructive"
        });
        
        // Even if some posts failed, we'll still redirect if at least one was successful
        const atLeastOneSuccess = Object.values(platformResults).some(result => result.success);
        if (atLeastOneSuccess) {
          setTimeout(() => {
            router.push(`/dashboard/social-media-archive?orgId=${orgId}`);
          }, 2500); // Longer delay (2.5 seconds) for partial success to give user time to read the error
        }
      }
      
    } catch (error) {
      console.error("Error in post approval process:", error);
      toast({
        title: "Publishing Failed",
        description: "An unexpected error occurred while publishing your posts.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderLocalToneSelector = () => (
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
        {loadingTones && tones.length === 0 && ( 
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

  return (
    <div className="space-y-6">
      {/* Tone of Voice */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="tone-of-voice-url" className="text-base font-medium">Tone of Voice</Label>
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
        {renderLocalToneSelector()}
        {selectedTone && (
          <div className="mt-1 text-sm text-gray-600">
            {selectedTone.description && (
              <p className="line-clamp-2">{selectedTone.description}</p>
            )}
          </div>
        )}
      </div>
      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="url">URL *</Label>
        <Input
          id="url" 
          required
          value={formData.url}
          onChange={handleInputChange}
          placeholder="Enter the URL you want to post about"
          className="w-full"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Switch
          id="include_source" 
          checked={formData.include_source}
          onCheckedChange={(checked) => handleSwitchChange(checked, 'include_source')}
        />
        <Label htmlFor="include_source">Include source in post</Label>
      </div>
      <div className="space-y-2">
        <Label>Sentiment *</Label>
        <Select
          value={formData.sentiment}
          onValueChange={(value) => handleSelectChange(value, 'sentiment')} 
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
          onChange={handleInputChange}
          placeholder="Share your thoughts on this content"
          className="w-full"
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>Character Length *</Label>
        <Select
          value={formData.character_length}
          onValueChange={handleCharacterLengthChange}
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
          onValueChange={handleImageTypeChange}
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
      {/* --- AI Generation Section (Styled Consistently - Revision 2) --- */}
      <div className="mt-6 space-y-6 p-4 border border-blue-100 rounded-lg bg-blue-50">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-blue-800">Generate Your Post with AI</h3>
          <p className="text-sm text-blue-700">
            Use AI to create platform-specific posts based on your URL, thoughts, and selected tone.
          </p>
          
          {/* Replicating Podcast Tab Structure */}
          <div className="bg-white p-3 rounded border border-blue-200 text-sm text-blue-700 mt-3">
            <p className="font-medium mb-1">Before generating:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure you have entered a valid URL above</li>
              <li>Provide your thoughts on the content</li>
              <li>Select your preferred tone of voice</li>
              <li>Choose the desired character length</li>
              <li>Select an Image Type for the AI image</li>
            </ul>
          </div>
            
          {/* AI Model Selection - Moved inside the blue box but after the list */}
          <div className="pt-4">
            <Label className="text-base font-medium text-gray-800">AI Model for Content Generation</Label> {/* Adjusted label style slightly */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 mt-2">
              {Object.entries(aiModels).map(([_, modelDetails]) => (
                <div key={modelDetails.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`model-url-${modelDetails.value}`}
                    name="ai-model-url-tab" 
                    value={modelDetails.value}
                    checked={selectedAIModel === modelDetails.value}
                    onChange={(e) => setSelectedAIModel(e.target.value)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <Label htmlFor={`model-url-${modelDetails.value}`} className="ml-2 text-sm font-medium text-gray-700">
                    {modelDetails.name}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select the AI model to generate the text for your social media posts.
            </p>
          </div>
        </div>
      </div>
      {/* --- End AI Generation Box --- */}
      {/* "Generate with AI" Button - Moved outside/below the blue box */}
      <div className="mt-6 flex justify-center"> {/* Adjusted margin */}
        <Button
          type="button"
          onClick={handleGenerateWithAI}
          disabled={isGenerating || !formData.url || !formData.thoughts} 
          className={`flex items-center gap-2 px-4 py-2 ${ 
            isGenerating 
              ? 'bg-blue-200 text-blue-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } rounded-md transition-colors`}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-transparent rounded-full"></div>
              Generating Content...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
      </div>
      {/* Platform Selection - Position after button */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Platforms *</Label>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Switch
              id="platform-linkedin-url" 
              checked={formData.platforms.linkedin}
              onCheckedChange={checked => handlePlatformChange(checked, 'linkedin')}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-linkedin-url">LinkedIn</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="platform-twitter-url" 
              checked={formData.platforms.twitter}
              onCheckedChange={checked => handlePlatformChange(checked, 'twitter')}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-twitter-url">X (Twitter)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="platform-instagram-url" 
              checked={formData.platforms.instagram}
              onCheckedChange={checked => handlePlatformChange(checked, 'instagram')}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-instagram-url">Instagram</Label>
          </div>
        </div>
      </div>
      {formData.platforms.linkedin && (
        <div className="space-y-2">
          <Label>LinkedIn Post Type *</Label>
          <Select
            value={formData.linkedin_post_type}
            onValueChange={(value) => handleSelectChange(value, 'linkedin_post_type')}
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
          <Select
            value={formData.twitter_post_type}
            onValueChange={(value) => handleSelectChange(value, 'twitter_post_type')}
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
          <Select
            value={formData.instagram_post_type}
            onValueChange={(value) => handleSelectChange(value, 'instagram_post_type')}
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
      {Object.keys(generatedContent).length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-200 space-y-8">
          <h2 className="text-xl font-semibold text-gray-800">Generated Content & Images</h2>
          
          {formData.platforms.linkedin && generatedContent.linkedin && (
            <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
              <h3 className="text-lg font-medium text-gray-700 mb-3">LinkedIn</h3>
              <div className="space-y-3">
                <Label htmlFor="linkedin-text-output">Generated Post Text:</Label>
                <Textarea
                  id="linkedin-text-output"
                  value={generatedContent.linkedin.text}
                  onChange={(e) => handleGeneratedTextChange('linkedin', e.target.value)}
                  className="w-full min-h-[120px] bg-gray-50"
                  rows={5}
                />
                <p className="text-xs text-gray-500 text-right">
                  {generatedContent.linkedin.text.length} characters
                </p>
                <Label>Generated Image:</Label>
                {generatedContent.linkedin && generatedContent.linkedin.imageUrl ? (
                  <img
                    key={generatedContent.linkedin.imageUrl}
                    src={generatedContent.linkedin.imageUrl} 
                    alt="LinkedIn Image Preview"
                    className="w-full max-w-md border border-gray-300 rounded"
                    loading="eager"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-gray-500 text-center">Generating image...</p>
                  </div>
                )}
                {generatedContent.linkedin && generatedContent.linkedin.imageUrl && (
                  <p className="text-xs text-gray-500 mt-1 break-all">
                    {generatedContent.linkedin.imageUrl}
                  </p>
                )}
                {/* Save/Edit Button */}
                <Button 
                  type="button"
                  variant={generatedContent.linkedin.saved ? "secondary" : "default"} 
                  size="sm" 
                  onClick={(e) => handleSaveTogglePlatformText(e, 'linkedin')}
                >
                  {generatedContent.linkedin.saved ? 'Edit' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {formData.platforms.twitter && generatedContent.twitter && (
            <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Twitter/X</h3>
              <div className="space-y-3">
                <Label htmlFor="twitter-text-output">Generated Tweet Text:</Label>
                <Textarea
                  id="twitter-text-output"
                  value={generatedContent.twitter.text}
                  onChange={(e) => handleGeneratedTextChange('twitter', e.target.value)}
                  className="w-full min-h-[80px] bg-gray-50"
                  rows={3}
                  maxLength={280} 
                />
                <p className="text-xs text-gray-500 text-right">
                  {generatedContent.twitter.text.length} / 280 characters
                </p>
                <Label>Generated Image:</Label>
                {generatedContent.twitter.imageUrl ? (
                  <img 
                    src={generatedContent.twitter.imageUrl} 
                    alt="Twitter/X Image Preview" 
                    className="w-full max-w-md border border-gray-300 rounded"
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-gray-500 text-center">Generating image...</p>
                  </div>
                )}
                {/* Save/Edit Button */}
                <Button 
                  type="button"
                  variant={generatedContent.twitter.saved ? "secondary" : "default"} 
                  size="sm" 
                  onClick={(e) => handleSaveTogglePlatformText(e, 'twitter')}
                >
                  {generatedContent.twitter.saved ? 'Edit' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {formData.platforms.instagram && generatedContent.instagram && (
            <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Instagram</h3>
              <div className="space-y-3">
                <Label htmlFor="instagram-text-output">Generated Caption Text:</Label>
                <Textarea
                  id="instagram-text-output"
                  value={generatedContent.instagram.text}
                  onChange={(e) => handleGeneratedTextChange('instagram', e.target.value)}
                  className="w-full min-h-[100px] bg-gray-50"
                  rows={4}
                  maxLength={2200} 
                />
                <p className="text-xs text-gray-500 text-right">
                  {generatedContent.instagram.text.length} / 2200 characters
                </p>
                <Label>Generated Image:</Label>
                {generatedContent.instagram.imageUrl ? (
                  <img 
                    src={generatedContent.instagram.imageUrl} 
                    alt="Instagram Image Preview" 
                    className="w-full max-w-xs border border-gray-300 rounded" 
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-gray-500 text-center">Generating image...</p>
                  </div>
                )}
                {/* Save/Edit Button */}
                <Button 
                  type="button"
                  variant={generatedContent.instagram.saved ? "secondary" : "default"} 
                  size="sm" 
                  onClick={(e) => handleSaveTogglePlatformText(e, 'instagram')}
                >
                  {generatedContent.instagram.saved ? 'Edit' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* --- Approve and Post Button (Appears after content generation) --- */}
      {Object.keys(generatedContent).length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-300 flex justify-end">
          <Button
            type="button"
            onClick={handleApproveAndPost}
            disabled={isGenerating}
            className={`${isGenerating ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} text-white text-base px-6 py-3 flex items-center gap-2`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Posting!
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Approve and Post
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 