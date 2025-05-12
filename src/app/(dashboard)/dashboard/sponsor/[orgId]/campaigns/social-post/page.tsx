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
import { HelpCircle, Sparkles, CheckCircle2, Save, Send, Wand2, Edit, PenSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PostFromUrlTab from './PostFromUrlTab';

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
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptSaved, setScriptSaved] = useState(false);
  const [hostName, setHostName] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState<string>(AI_MODELS.GPT4.value);
  
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

  // Adding state for AI editing dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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

  // Function to generate podcast script with AI
  const generatePodcastScript = async () => {
    if (!formData.thoughts || isGeneratingScript) return;
    
    setIsGeneratingScript(true);
    setGeneratedScript('');
    setScriptSaved(false);
    
    try {
      // Create prompt for OpenAI
      const toneDescription = selectedTone 
        ? `Tone of voice: ${selectedTone.name}. ${selectedTone.description}` 
        : "Use a professional and conversational tone.";
      
      const contentSource = formData.url 
        ? `URL source: ${formData.url}` 
        : selectedDocumentName 
          ? `Document source: ${selectedDocumentName}` 
          : "Create content based solely on the provided points.";
      
      const getPodcastWordCount = (length: string) => {
        switch(length) {
          case '10 minutes':
            return '1,500-1,800';
          case '15 minutes':
            return '2,200-2,500';
          case '25 minutes':
            return '3,700-4,000';
          default:
            return '2,200-2,500'; // Default to 15 minutes
        }
      };
      
      // Check if podcast length is selected
      if (!formData.character_length) {
        toast({
          title: "Length Required",
          description: "Please select a podcast length before generating",
          variant: "destructive"
        });
        setIsGeneratingScript(false);
        return;
      }
      
      const podcastLength = formData.character_length;
      const wordCount = getPodcastWordCount(podcastLength);
      const minutes = podcastLength.split(' ')[0]; // Extract minutes number
      const hostInfo = hostName ? `The podcast host name is: ${hostName}.` : '';
      
      // Create a system prompt that emphasizes podcast requirements
      const systemPrompt = "You are an expert podcast script writer who specializes in creating professional, engaging content of specific lengths.";
      
      // Create a detailed user prompt with STRONG emphasis on length
      const userPrompt = `CRITICAL INSTRUCTION: Create a COMPLETE, professional podcast script that is EXACTLY ${minutes} minutes long when read aloud (${wordCount} words at 150 words per minute).

TOPIC INFORMATION:
${formData.thoughts}

SOURCE MATERIAL:
${contentSource}

STYLE REQUIREMENTS:
${toneDescription}
${hostInfo}

LENGTH IS CRUCIAL:
- This script MUST be a FULL ${minutes}-minute podcast script
- The target word count is ${wordCount} words MINIMUM
- Previous attempts were too short (only 4-5 minutes)
- EXPAND content to fill the ENTIRE ${podcastLength} duration
- Add substantial detail, examples, analysis, and stories to reach proper length
- Do not abbreviate or summarize - provide COMPLETE content
- Write all sections with appropriate depth for a ${podcastLength} podcast

FORMATTING INSTRUCTIONS:
- Create a seamless narrative flow without ANY headings or titles
- DO NOT include a title line, audio cues, stage directions, or speaker labels
- Start directly with the content in a conversational tone
- Write in first person as if the host is speaking
- Return clean text for text-to-speech with no formatting elements

CONTENT STRUCTURE:
1. Welcoming introduction (45-60 seconds)
2. Clear outline of what will be covered
3. Develop 4-8 main points with SUBSTANTIAL depth, examples, and analysis
4. Include relevant statistics, stories, expert opinions, and case studies
5. Provide nuanced perspectives and thoughtful insights throughout
6. Proper conclusion that summarizes key points (45-60 seconds)
7. Call to action and sign-off

REMEMBER: The script MUST be a COMPLETE ${minutes}-minute podcast with appropriate depth and length.`;

      let scriptContent = "";
      
      // Generate with either GPT-4 or Gemini based on selection
      if (selectedAIModel === AI_MODELS.GPT4.value) {
        // Use OpenAI GPT-4
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {role: "system", content: systemPrompt},
              {role: "user", content: userPrompt}
            ],
            temperature: 0.7,
            max_tokens: 4000
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to generate script with GPT-4");
        }
        
        const data = await response.json();
        scriptContent = data.choices[0].message.content.trim();
      } 
      else if (selectedAIModel === AI_MODELS.GEMINI.value) {
        // Use Google's Gemini 2.5 Pro
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("Gemini API key not configured");
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              topP: 0.95
            }
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to generate script with Gemini");
        }
        
        const data = await response.json();
        scriptContent = data.candidates[0].content.parts[0].text.trim();
      }
      
      // Minimum word count threshold based on selected length
      const minWordThresholds = {
        '10 minutes': 1400,
        '15 minutes': 2100,
        '25 minutes': 3600
      };
      
      // Check if we need to regenerate for length
      const generatedWordCount = scriptContent.split(/\s+/).filter((word: string) => word.length > 0).length;
      const estimatedMinutes = Math.round(generatedWordCount / 150);
      const minThreshold = minWordThresholds[podcastLength as keyof typeof minWordThresholds] || 2100;
      
      // If script is too short, attempt to expand it automatically
      if (generatedWordCount < minThreshold) {
        toast({
          title: "Expanding Script",
          description: "Initial script was too short. Expanding content automatically...",
          variant: "default"
        });
        
        // Save the original short script
        const shortScript = scriptContent;
        
        // Create expansion prompt
        const expansionPrompt = `The generated podcast script is too short (${generatedWordCount} words, only about ${estimatedMinutes} minutes). 
        
Please EXPAND this script to reach at least ${wordCount} words (${minutes} minutes) while maintaining quality and coherence.

Add substantial detail, examples, stories, expert opinions, additional talking points, and deeper analysis to expand the content to proper length.

Original short script:
${shortScript}`;

        if (selectedAIModel === AI_MODELS.GPT4.value) {
          // Use OpenAI for expansion
          const expansionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                {role: "system", content: "You are an expert podcast script expander who makes short scripts longer while maintaining quality."},
                {role: "user", content: expansionPrompt}
              ],
              temperature: 0.7,
              max_tokens: 4000
            }),
          });
          
          if (expansionResponse.ok) {
            const expansionData = await expansionResponse.json();
            const expandedScript = expansionData.choices[0].message.content.trim();
            const expandedWordCount = expandedScript.split(/\s+/).filter((word: string) => word.length > 0).length;
            
            // Use expanded version if it's actually longer
            if (expandedWordCount > generatedWordCount) {
              scriptContent = expandedScript;
            }
          }
        }
        else if (selectedAIModel === AI_MODELS.GEMINI.value) {
          // Use Gemini for expansion
          const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
          
          const expansionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: "You are an expert podcast script expander who makes short scripts longer while maintaining quality.\n\n" + expansionPrompt }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                topP: 0.95
              }
            })
          });
          
          if (expansionResponse.ok) {
            const expansionData = await expansionResponse.json();
            const expandedScript = expansionData.candidates[0].content.parts[0].text.trim();
            const expandedWordCount = expandedScript.split(/\s+/).filter((word: string) => word.length > 0).length;
            
            // Use expanded version if it's actually longer
            if (expandedWordCount > generatedWordCount) {
              scriptContent = expandedScript;
            }
          }
        }
      }
      
      setGeneratedScript(scriptContent);
      
      // Re-calculate final word count
      const finalWordCount = scriptContent.split(/\s+/).filter((word: string) => word.length > 0).length;
      const finalEstimatedMinutes = Math.round(finalWordCount / 150);
      
      toast({
        title: "Script Generated",
        description: `Created ${finalWordCount.toLocaleString()} words (approx. ${finalEstimatedMinutes} min)`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error generating script:', error);
      
      // Provide error details in toast
      let errorMessage = "Script generation failed. ";
      if (error instanceof Error) {
        errorMessage += error.message;
      }
      
      toast({
        title: "Generation Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Fallback to a default script if API call fails
      const fallbackScript = `Welcome to ${hostName ? hostName + "'s podcast" : "our podcast"}. Thank you for joining me today. I'm excited to dive into some important topics that I believe will be valuable for all of our listeners.

Today, we're going to explore ${formData.thoughts.split('\n')[0] || 'several interesting topics'}. This subject has been on my mind lately, and I think it deserves a thorough discussion.

${formData.thoughts.split('\n').map(point => `Let's talk about ${point}. This is a fascinating aspect because it impacts how we understand the broader subject. When we examine this point in detail, we can see several important implications. First, it challenges conventional thinking by introducing new perspectives. Second, it helps us develop a more nuanced understanding of the topic. And finally, it connects to real-world applications that affect many people's lives and decisions.`).join('\n\n')}

I'd like to share a personal perspective on why this matters. In my experience, these issues have profound implications for how we approach our daily lives and long-term planning. The insights we gain from exploring these topics can help us make better decisions and understand complex situations more clearly.

Let's also consider some practical applications. When we apply these concepts in real-world situations, we often discover unexpected connections and opportunities. This practical dimension is what makes these discussions so valuable.

To summarize the key points we've covered today: we explored ${formData.thoughts.split('\n').map(point => point.trim()).filter(point => point.length > 0).slice(0, 3).join(', ')} and how they connect to the broader context of ${formData.thoughts.split('\n')[0] || 'our main topic'}. 

I hope you've found this discussion enlightening and thought-provoking. If you enjoyed this episode, please consider subscribing to the podcast and sharing it with others who might benefit from these insights.

Thank you for listening, and I look forward to continuing our conversation in the next episode.`;

      setGeneratedScript(fallbackScript);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Function to send a chat message for script modification
  const handleChatSubmit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent any default behaviors including form submission
    e.preventDefault();
    
    // Stop event propagation to prevent parent form submission
    e.stopPropagation();
    
    if (!chatInput.trim() || isChatProcessing) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to chat
    const newMessages = [
      ...chatMessages,
      { role: 'user' as const, content: userMessage }
    ];
    setChatMessages(newMessages);
    setIsChatProcessing(true);
    
    try {
      // Create context for the AI
      const scriptContext = generatedScript.substring(0, 1000) + 
        (generatedScript.length > 1000 ? '...' : '');
      
      const prompt = `You are an AI assistant helping to modify a podcast script. The current script starts with: "${scriptContext}..."
      
The user wants the following change: "${userMessage}"

Based on this request, please:
1. Understand what modification the user wants
2. Provide a brief response on how you'll modify the script
3. Generate a completely new version of the script incorporating the requested changes

Keep your response conversational but focused on the task. Follow the same style and guidelines as the original script.`;

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {role: "system", content: prompt},
            {role: "user", content: userMessage}
          ],
          temperature: 0.75,
          max_tokens: 4000
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process script modification');
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Extract the modified script and assistant message
      const scriptStartIndex = aiResponse.indexOf('```');
      let assistantMessage: string;
      let newScript: string;
      
      if (scriptStartIndex !== -1) {
        // If there's a code block, use it as the new script
        assistantMessage = aiResponse.substring(0, scriptStartIndex).trim();
        const scriptEndIndex = aiResponse.lastIndexOf('```');
        newScript = aiResponse.substring(scriptStartIndex + 3, scriptEndIndex).trim();
        // Remove any language identifier if present
        if (newScript.startsWith('markdown') || newScript.startsWith('text')) {
          newScript = newScript.substring(newScript.indexOf('\n')).trim();
        }
      } else {
        // If no code block, use the first paragraph as the message and the rest as the script
        const paragraphs = aiResponse.split('\n\n');
        assistantMessage = paragraphs[0].trim();
        newScript = paragraphs.slice(1).join('\n\n').trim();
        
        // If the AI didn't generate a clear split, make a best effort
        if (!newScript) {
          const lines = aiResponse.split('\n');
          assistantMessage = lines[0].trim();
          newScript = lines.slice(1).join('\n').trim();
        }
      }
      
      // Update the chat with assistant's response
      setChatMessages([
        ...newMessages,
        { role: 'assistant' as const, content: assistantMessage }
      ]);
      
      // Update the script if we successfully extracted it
      if (newScript) {
        setGeneratedScript(newScript);
        // Reset saved state since script was modified
        setScriptSaved(false);
      }
      
    } catch (error) {
      console.error('Error modifying script:', error);
      // Add error message to chat
      setChatMessages([
        ...newMessages,
        { role: 'assistant' as const, content: 'Sorry, I had trouble processing that request. Please try again with different wording.' }
      ]);
    } finally {
      setIsChatProcessing(false);
      // Scroll to the bottom of chat
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

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
      add_podcast: formData.add_podcast || activeTab === 'podcast',
      additional_instructions: formData.additional_instructions,
      // Include script if saved from podcast tab
      podcast_script: activeTab === 'podcast' && scriptSaved ? generatedScript : null,
      // Include host name for podcast
      podcast_host: activeTab === 'podcast' ? hostName : null,
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
      post_status: activeTab === 'podcast' ? 'pending' : 'approved', // Immediately approve social posts
      image_status: activeTab === 'podcast' ? 'pending' : 'approved', // Immediately approve social posts
      rejection: null
    };

    try {
      console.log('Submitting with tone:', selectedToneData ? selectedToneData.name : 'None');
      
      // For podcasts, use the webhook to go through approvals
      if (activeTab === 'podcast') {
        const response = await fetch('https://hook.eu2.make.com/q0c2np0nt9dayphd8zpposc73gvly4w6', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          toast({
            title: "Podcast Request Submitted",
            description: "Your podcast request has been sent for approval.",
            variant: "default"
          });
          router.push(`/dashboard/sponsor/${orgId}/campaigns`);
        } else {
          const errorText = await response.text();
          console.error('Failed to submit podcast request. Status:', response.status, 'Response:', errorText);
          toast({
            title: "Submission Failed",
            description: "There was an error submitting your podcast request. Please try again.",
            variant: "destructive"
          });
        }
      } 
      // For social posts (URL and Image tabs), directly save to social_posts table as approved
      else {
        const supabase = getSupabaseClient();
        
        // Create record in social_posts table with status='approved'
        const { data, error } = await supabase
          .from('social_posts')
          .insert({
            organization_id: orgId,
            user_id: user?.id,
            platform: Object.entries(formData.platforms)
              .filter(([_, enabled]) => enabled)
              .map(([platform]) => platform)
              .join(','), // Store all platforms in one field
            post_text: payload.thoughts, // Use thoughts as post text for now
            url: payload.url,
            sentiment: payload.sentiment,
            thoughts: payload.thoughts,
            character_length: payload.character_length,
            linkedin_post_type: formData.platforms.linkedin ? payload.linkedin_post_type : null,
            twitter_post_type: formData.platforms.twitter ? payload.twitter_post_type : null,
            instagram_post_type: formData.platforms.instagram ? payload.instagram_post_type : null,
            image_type: payload.image_type,
            post_status: 'approved',
            image_status: 'approved',
            status: 'approved',
            created_at: new Date().toISOString(),
            approved_at: new Date().toISOString() // Auto-approve
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
      
      {/* Document upload option - Only show for podcast tab */}
      {activeTab === 'podcast' && (
        <div className="space-y-2">
          <Label htmlFor="document-upload">Or upload a document</Label>
          <div className="flex items-center gap-2">
            <Input
              id="document-upload"
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setSelectedDocumentName(file ? file.name : null);
              }}
            />
            <Label
              htmlFor="document-upload"
              className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2`}
            >
              Choose File
            </Label>
            <span className="text-sm text-gray-600">
              {selectedDocumentName || "No file chosen"}
            </span>
          </div>
        </div>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="thoughts">
          {activeTab === 'podcast' 
            ? "Briefly describe your points that you want the podcast to cover *" 
            : "Your thoughts on this *"
          }
        </Label>
        
        {activeTab === 'podcast' && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              Describe any points you want to make here, the name of your podcast "start with 'Welcome to [your podcast name]" etc. You can influence what is said, what points are covered, etc.
            </p>
          </div>
        )}
        
        <Textarea
          id="thoughts"
          required
          value={formData.thoughts}
          onChange={(e) => setFormData({ ...formData, thoughts: e.target.value })}
          placeholder={activeTab === 'podcast' 
            ? "Describe the key points for your podcast" 
            : "Share your thoughts on this content"
          }
          className="w-full"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>
          {activeTab === 'podcast' ? 'Podcast length *' : 'Character Length *'}
        </Label>
        <Select
          value={formData.character_length}
          onValueChange={(value) => setFormData({ ...formData, character_length: value })}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={activeTab === 'podcast' ? "Select podcast length" : "Select character length"} />
          </SelectTrigger>
          <SelectContent>
            {(activeTab === 'podcast' ? podcastLengthOptions : characterLengthOptions).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeTab === 'podcast' && formData.character_length && (
          <p className="text-xs text-gray-500">
            {formData.character_length === '10 minutes' && 'Approx. 1,500-1,800 words'}
            {formData.character_length === '15 minutes' && 'Approx. 2,200-2,500 words'}
            {formData.character_length === '25 minutes' && 'Approx. 3,700-4,000 words'}
          </p>
        )}
      </div>
      
      {/* Host name input - Only for podcast tab */}
      {activeTab === 'podcast' && (
        <div className="space-y-2">
          <Label htmlFor="host-name">Host name</Label>
          <Input
            id="host-name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Enter podcast host name"
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            The host name will be used in the podcast script.
          </p>
        </div>
      )}
      
      {/* Script generation with AI - Only for podcast tab */}
      {activeTab === 'podcast' && (
        <div className="mt-6 space-y-6 p-4 border border-blue-100 rounded-lg bg-blue-50">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-blue-800">Generate Your Podcast Script with AI</h3>
            <p className="text-sm text-blue-700">
              Use AI to create a full podcast script based on your description, URL, or uploaded document.
              The script will follow your selected tone of voice and target length.
            </p>
            
            <div className="bg-white p-3 rounded border border-blue-200 text-sm text-blue-700">
              <p className="font-medium mb-1">Before generating:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Select a tone of voice above</li>
                <li>Choose your preferred podcast length</li>
                <li>Provide a URL or upload a document for reference (optional)</li>
                <li>Describe the points you want to cover</li>
              </ul>
            </div>
            
            <div className="my-4">
              <Label htmlFor="ai-model">AI Model</Label>
              <div className="flex gap-4 mt-2 flex-wrap">
                {Object.entries(AI_MODELS).map(([_, modelDetails]) => (
                  <div key={`podcast-${modelDetails.value}`} className="flex items-center">
                    <input
                      type="radio"
                      id={`model-podcast-${modelDetails.value}`}
                      name="ai-model-podcast"
                      value={modelDetails.value}
                      checked={selectedAIModel === modelDetails.value}
                      onChange={(e) => setSelectedAIModel(e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor={`model-podcast-${modelDetails.value}`} className="ml-2 text-sm font-medium">
                      {modelDetails.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Different models may produce better results for different topics and lengths.
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={generatePodcastScript}
              disabled={isGeneratingScript || !formData.thoughts}
              className={`flex items-center gap-2 px-4 py-2 ${
                isGeneratingScript 
                  ? 'bg-blue-200 text-blue-700' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } rounded-md transition-colors`}
            >
              {isGeneratingScript ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-transparent rounded-full"></div>
                  Generating Script...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
          
          {generatedScript && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="script" className="text-base font-medium">Your Generated Script</Label>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    type="button"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 mb-1 sm:mb-0"
                  >
                    <PenSquare className="h-3 w-3" />
                    Edit with AI
                  </Button>
                  {scriptSaved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Script Saved
                    </span>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        // Save the script to be used for podcast creation
                        setFormData({
                          ...formData,
                          additional_instructions: generatedScript
                        });
                        setScriptSaved(true);
                        
                        toast({
                          title: "Script Saved",
                          description: "Your script will be used to create the podcast.",
                          variant: "default"
                        });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                    >
                      <Save className="h-3 w-3" />
                      Save Script
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                id="script"
                value={generatedScript}
                onChange={(e) => {
                  setGeneratedScript(e.target.value);
                  // Reset saved state if user edits the script
                  if (scriptSaved) setScriptSaved(false);
                }}
                className="w-full font-mono text-sm"
                rows={12}
              />
              <div className="flex justify-between items-center text-xs text-gray-500">
                <p>
                  You can edit this script directly or use the AI assistant to help with modifications.
                </p>
                <p>
                  {(() => {
                    const wordCount = generatedScript.split(/\s+/).filter((word: string) => word.length > 0).length;
                    const wordsPerMinute = 150; // Average speaking rate
                    const estimatedMinutes = Math.round(wordCount / wordsPerMinute);
                    return `${wordCount.toLocaleString()} words (approx. ${estimatedMinutes} minutes at speaking pace)`;
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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
              checked={formData.platforms.instagram}
              onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, instagram: checked } })}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-instagram">Instagram</Label>
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
             className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
           >
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
              checked={formData.platforms.instagram}
              onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, instagram: checked } })}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="platform-instagram-image">Instagram</Label>
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

  // Add a new function to handle script editing with AI
  const handleScriptEdit = async () => {
    if (!editInstruction.trim() || isEditing) return;
    
    setIsEditing(true);
    
    try {
      // Get the current word count and duration
      const currentWordCount = generatedScript.split(/\s+/).filter((word: string) => word.length > 0).length;
      const wordsPerMinute = 150; // Average speaking rate
      const currentDuration = Math.round(currentWordCount / wordsPerMinute);
      
      // Parse the edit instruction for length targets
      const lengthMatch = editInstruction.match(/expand to (\d+) m(in|inute)/i);
      const targetMinutes = lengthMatch ? parseInt(lengthMatch[1]) : null;
      const targetWordCount = targetMinutes ? targetMinutes * wordsPerMinute : null;
      
      // Create a system prompt that emphasizes length requirements
      const systemPrompt = "You are an expert podcast script editor who specializes in creating professional, engaging content of specific lengths.";
      
      // Create a detailed user prompt
      let userPrompt = `I need you to edit the following podcast script based on this instruction: "${editInstruction}"

CURRENT METRICS:
- Current word count: ${currentWordCount} words
- Estimated speaking duration: ${currentDuration} minutes at 150 words per minute

`;

      // Add specific length guidance if detected in the instruction
      if (targetMinutes) {
        userPrompt += `LENGTH REQUIREMENT DETECTED:
- Target duration: ${targetMinutes} minutes
- Target word count: approximately ${targetWordCount} words
- You MUST significantly expand the content to reach this target length
- Add detailed examples, stories, statistics, and deeper analysis to existing points
- Consider adding 1-2 entirely new related points if needed to reach the target length

`;
      }

      userPrompt += `EDITING GUIDELINES:
- Maintain the original speaking style and tone
- Keep the content coherent and well-structured
- Ensure all transitions between sections are smooth
- Do NOT include any section headings, audio cues, or formatting that would interfere with text-to-speech
- Content should be immediately ready for recording - no meta-commentary, section markers, or speaker indicators
- Return a COMPLETE script, not just edits or additions

HERE IS THE ORIGINAL SCRIPT TO EDIT:

${generatedScript}`;

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {role: "system", content: systemPrompt},
            {role: "user", content: userPrompt}
          ],
          temperature: 0.7,
          max_tokens: 4000
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process script modification');
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Clean up the response - remove any markdown code blocks
      let newScript = aiResponse;
      
      // If there are markdown code blocks, extract the content
      if (newScript.includes('```')) {
        const codeBlockStart = newScript.indexOf('```');
        const codeBlockEnd = newScript.lastIndexOf('```');
        if (codeBlockStart !== -1 && codeBlockEnd !== -1 && codeBlockEnd > codeBlockStart) {
          newScript = newScript.substring(codeBlockStart + 3, codeBlockEnd).trim();
          // Remove any language indicator if present
          if (newScript.startsWith('markdown') || newScript.startsWith('text')) {
            newScript = newScript.substring(newScript.indexOf('\n')).trim();
          }
        }
      }
      
      // Update the script
      setGeneratedScript(newScript);
      
      // Reset saved state since script was modified
      setScriptSaved(false);
      
      // Close the dialog
      setIsEditDialogOpen(false);
      setEditInstruction('');
      
      // Calculate new word count
      const newWordCount = newScript.split(/\s+/).filter((word: string) => word.length > 0).length;
      const newDuration = Math.round(newWordCount / wordsPerMinute);
      
      toast({
        title: "Script Updated",
        description: `Script expanded to ${newWordCount.toLocaleString()} words (approx. ${newDuration} min)`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error modifying script:', error);
      toast({
        title: "Error",
        description: "Failed to update script. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

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
                  <>
                    <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700">
                        You can create a single voice podcast from a URL a document, or you can generate a script below. Exlayr will create a podcast for your approval and you can post on your SoundCloud account (when you have set it up)
                      </p>
                    </div>
                    {renderFormContent()}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 mt-6">
            {activeTab === 'podcast' && (
              <>
                <Link href="/dashboard/approvals" className="text-sm text-blue-600 hover:underline w-full sm:w-auto text-center">
                  View Pending Approvals
                </Link>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Create Podcast'}
                </Button>
              </>
            )}
          </div>
        </form>

        {/* AI Script Editing Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md p-4 sm:p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg">Edit Podcast Script with AI</DialogTitle>
              <DialogDescription className="pt-2">
                Describe the changes you want to make to your script. The AI will generate a new version based on your instructions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3 sm:py-4">
              <Textarea
                placeholder="E.g., Make it more conversational, add a section about sustainability, remove technical jargon, etc."
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="w-full sm:w-auto order-1 sm:order-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleScriptEdit}
                disabled={!editInstruction.trim() || isEditing}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                {isEditing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Update Script'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
} 