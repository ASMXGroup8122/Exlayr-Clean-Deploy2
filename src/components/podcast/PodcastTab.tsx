import React, { useState, useEffect } from 'react';
import { FormatSelector, PodcastFormat } from './FormatSelector';
import { VoiceSelectorField } from './VoiceSelectorField';
import PodcastPlayer from './PodcastPlayer';
import ElevenLabsConnectionHelper from './ElevenLabsConnectionHelper';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { HelpCircle, Sparkles, CheckCircle2, Save, PenSquare } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Add these interfaces near the top of the file
interface ToneOfVoice {
  id: string;
  name: string;
  description: string;
}

// Update the FormData interface to match parent component
interface FormData {
  url: string;
  include_source: boolean;
  sentiment: string;
  thoughts: string;
  character_length: string;
  email: string;
  linkedin_post_type: string;
  twitter_post_type: string;
  instagram_post_type: string;
  add_podcast: boolean;
  additional_instructions: string;
  tone_of_voice_id: string;
  image_type: string;
  hostName: string;
  conversationUrlInput: string;
  platforms: {
    linkedin: boolean;
    twitter: boolean;
    instagram: boolean;
  };
  [key: string]: any; // Allow other properties
}

// Define a new props interface
interface PodcastTabProps {
  orgId: string;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  selectedFileObject: File | null;
  setSelectedFileObject: React.Dispatch<React.SetStateAction<File | null>>;
  selectedDocumentName: string | null;
  setSelectedDocumentName: React.Dispatch<React.SetStateAction<string | null>>;
  isConversationComingSoon?: boolean;
}

export default function PodcastTab({
  orgId,
  formData,
  setFormData,
  selectedFileObject,
  setSelectedFileObject,
  selectedDocumentName,
  setSelectedDocumentName,
  isConversationComingSoon = false,
}: PodcastTabProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // Internal states for PodcastTab
  const [podcastFormat, setPodcastFormat] = useState<PodcastFormat>('single');
  const [selectedHostVoiceId, setSelectedHostVoiceId] = useState<string | null>(null);
  const [selectedGuestVoiceId, setSelectedGuestVoiceId] = useState<string | null>(null);
  const [podcastTitle, setPodcastTitle] = useState('');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isCreatingPodcast, setIsCreatingPodcast] = useState(false);
  const [createdPodcastId, setCreatedPodcastId] = useState<string | null>(null);
  const [hasElevenLabsConnection, setHasElevenLabsConnection] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptSaved, setScriptSaved] = useState(false);
  const [conversationSourceTab, setConversationSourceTab] = useState('url');
  
  // Add these states
  const [tones, setTones] = useState<ToneOfVoice[]>([]);
  const [selectedTone, setSelectedTone] = useState<ToneOfVoice | null>(null);
  const [loadingTones, setLoadingTones] = useState(false);
  
  // Reset form fields when switching podcast format
  useEffect(() => {
    if (podcastFormat === 'single') {
      setSelectedGuestVoiceId(null);
      setFormData((prev: FormData) => ({
        ...prev,
        conversationUrlInput: '',
      }));
    } else {
      setGeneratedScript('');
      setScriptSaved(false);
      setFormData((prev: FormData) => ({
        ...prev,
        url: '',
      }));
    }
  }, [podcastFormat, setFormData]);

  // Add form reset handler
  const resetForm = () => {
    setFormData({
      url: '',
      include_source: false,
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
        instagram: false,
      },
    });
    setSelectedGuestVoiceId(null);
    setSelectedHostVoiceId(null);
    setGeneratedScript('');
    setScriptSaved(false);
    setSelectedFileObject(null);
    setSelectedDocumentName(null);
    setPodcastTitle('');
  };

  // Add this effect to fetch tones
  useEffect(() => {
    const fetchTones = async () => {
      if (!orgId) return;
      
      setLoadingTones(true);
      try {
        const { data, error } = await supabase
          .from('tone_of_voice')
          .select('id, name, description')
          .eq('organization_id', orgId)
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        setTones(data || []);
        
        // Find selected tone if there's a tone_of_voice_id in formData
        if (formData.tone_of_voice_id && data) {
          const tone = data.find(t => t.id === formData.tone_of_voice_id);
          if (tone) setSelectedTone(tone);
        }
      } catch (error) {
        console.error('Error fetching tones:', error);
        toast({
          title: "Error",
          description: "Failed to load tones of voice",
          variant: "destructive"
        });
      } finally {
        setLoadingTones(false);
      }
    };

    fetchTones();
  }, [orgId, supabase, formData.tone_of_voice_id, toast]);

  // Add the tone selection handler
  const handleToneChange = (toneId: string) => {
    setFormData((prev: FormData) => ({ ...prev, tone_of_voice_id: toneId }));
    const tone = tones.find(t => t.id === toneId);
    setSelectedTone(tone || null);
  };

  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };
  
  // useEffect to check ElevenLabs connection
  useEffect(() => {
    if (!orgId) return;
    
    const checkConnection = async () => {
      setIsCheckingConnection(true);
      try {
        const { data: oauthToken, error: oauthError } = await supabase
          .from('oauth_tokens')
          .select('access_token')
          .eq('organization_id', orgId)
          .eq('provider', 'elevenlabs')
          .maybeSingle();
          
        if (!oauthError && oauthToken?.access_token) {
          setHasElevenLabsConnection(true);
          return;
        }
        
        const { data: settingsData, error: settingsError } = await supabase
          .from('organization_settings')
          .select('elevenlabs_api_key')
          .eq('organization_id', orgId)
          .maybeSingle();
          
        setHasElevenLabsConnection(!!settingsData?.elevenlabs_api_key);
      } catch (error) {
        console.error('[PodcastTab] Error checking ElevenLabs connection:', error);
        setHasElevenLabsConnection(false);
      } finally {
        setIsCheckingConnection(false);
      }
    };
    
    checkConnection();
  }, [orgId, supabase]);

  // Ensure format is 'single' if conversation is coming soon
  useEffect(() => {
    if (isConversationComingSoon && podcastFormat === 'conversation') {
      setPodcastFormat('single');
    }
  }, [isConversationComingSoon, podcastFormat]);

  // Computed values for button state
  const isConversationRequirementsMet = React.useMemo(() => {
    if (podcastFormat !== 'conversation') return true;
    
    // Check source
    const hasValidSource = conversationSourceTab === 'url' && formData.conversationUrlInput?.trim() ||
                          conversationSourceTab === 'file' && selectedFileObject ||
                          conversationSourceTab === 'text' && formData.thoughts?.trim();
    
    // Check voices
    const hasValidVoices = !!(selectedHostVoiceId && selectedGuestVoiceId);
    
    return hasValidSource && hasValidVoices;
  }, [podcastFormat, conversationSourceTab, formData, selectedFileObject, selectedHostVoiceId, selectedGuestVoiceId]);

  // Add form field change handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({ ...prev, [name]: value }));
  };

  // Add character length change handler
  const handleCharacterLengthChange = (value: string) => {
    setFormData((prev: FormData) => ({ ...prev, character_length: value }));
  };

  const handleCreatePodcastInternal = async () => {
    // Prevent conversation mode if it's marked as coming soon
    if (podcastFormat === 'conversation' && isConversationComingSoon) {
      toast({
        title: "Feature Not Available",
        description: "Conversation mode for podcasts is coming soon and currently unavailable.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !orgId) {
      toast({ title: "Error", description: "User or Organization ID is missing.", variant: "destructive" });
      return;
    }

    if (!podcastTitle.trim()) {
      toast({ title: "Error", description: "Please enter a title for the podcast.", variant: "destructive" });
      return;
    }

    if (podcastFormat === 'single') {
      if (!generatedScript) {
        toast({ title: "Error", description: "Please generate a script first for single voice podcast.", variant: "destructive" });
        return;
      }
      if (!selectedHostVoiceId) {
        toast({ title: "Error", description: "Please select a host voice for single voice podcast.", variant: "destructive" });
        return;
      }
    } else { // conversation
      if (!selectedHostVoiceId || !selectedGuestVoiceId) {
        toast({ title: "Error", description: "Please select both host and guest voices for conversation podcast.", variant: "destructive" });
        return;
      }
      
      let sourceProvided = false;
      if (conversationSourceTab === 'url' && formData.conversationUrlInput?.trim()) {
        sourceProvided = true;
      } else if (conversationSourceTab === 'file' && selectedFileObject) {
        sourceProvided = true;
      } else if (conversationSourceTab === 'text' && formData.thoughts?.trim()) {
        sourceProvided = true;
      }

      if (!sourceProvided) {
        toast({ title: "Error", description: "Please provide a URL, upload a document, or paste text for conversation mode.", variant: "destructive" });
        return;
      }
    }

    setIsCreatingPodcast(true);
    setCreatedPodcastId(null);

    try {
      console.log('[PodcastTab] Creating podcast with format:', podcastFormat);
      const payload: any = {
        organizationId: orgId,
        title: podcastTitle,
        podcastFormat: podcastFormat, // 'single' or 'conversation'
      };

      if (podcastFormat === 'single') {
        payload.script = generatedScript; // This is the text content for single voice
        payload.voiceId = selectedHostVoiceId;
      } else { // conversation
        payload.hostVoiceId = selectedHostVoiceId;
        payload.guestVoiceId = selectedGuestVoiceId;

        if (conversationSourceTab === 'url' && formData.conversationUrlInput?.trim()) {
          payload.sourceType = 'url';
          payload.sourceValue = formData.conversationUrlInput.trim();
        } else if (conversationSourceTab === 'file' && selectedFileObject) {
          try {
            const fileContent = await readFileAsText(selectedFileObject);
            payload.sourceType = 'file';
            payload.sourceValue = fileContent;
          } catch (error) {
            console.error("Error reading file:", error);
            toast({ title: "Error reading file", description: (error as Error).message || "Could not read the uploaded file.", variant: "destructive" });
            setIsCreatingPodcast(false);
            return;
          }
        } else if (conversationSourceTab === 'text' && formData.thoughts?.trim()) {
          payload.sourceType = 'text';
          payload.sourceValue = formData.thoughts.trim();
        } else {
          // This case should ideally be caught by the validation above, but as a safeguard:
          toast({ title: "Error", description: "No valid source selected for conversation.", variant: "destructive" });
          setIsCreatingPodcast(false);
          return;
        }
      }
      
      console.log('[PodcastTab] API Payload:', payload);

      const response = await fetch('/api/podcast/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Error creating podcast:', result);
        throw new Error(result.error || `Failed to create podcast. Status: ${response.status}`);
      }

      console.log('Podcast creation initiated:', result);
      setCreatedPodcastId(result.podcastId);
      toast({
        title: "Podcast Initiated",
        description: "Podcast generation has started. You will be redirected to approvals.",
      });
      router.push('/dashboard/approvals');

    } catch (error) {
      console.error('Error in handleCreatePodcastInternal:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred while creating the podcast.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingPodcast(false);
    }
  };

  // Add this after the tone selection handler
  const handleGenerateScript = async () => {
    if (!formData.thoughts || !formData.character_length || !formData.tone_of_voice_id) {
      toast({
        title: "Missing Information",
        description: "Please provide thoughts, character length, and tone of voice.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingScript(true);
    try {
      const response = await fetch('/api/ai/generate-podcast-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.url,
          documentName: selectedDocumentName,
          thoughts: formData.thoughts,
          character_length: formData.character_length,
          hostName: formData.hostName,
          voiceId: selectedHostVoiceId,
          orgId,
          podcastTitle,
          tone_of_voice_id: formData.tone_of_voice_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate script: ${response.status}`);
      }

      const result = await response.json();
      if (!result.script) {
        throw new Error('No script returned from the API');
      }

      setGeneratedScript(result.script);
      setScriptSaved(true);
      toast({ 
        title: 'Script Generated', 
        description: 'You can now review and edit the script.', 
        variant: 'default' 
      });
    } catch (error) {
      console.error('Script generation error:', error);
      toast({ 
        title: 'Script Generation Failed', 
        description: (error as Error).message || 'Could not generate script. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // DEBUG LOGS for button disabled state
  const isSingleFormat = podcastFormat === 'single';
  const isConversationFormat = podcastFormat === 'conversation';

  const singleFormatRequirementsMet = isSingleFormat && !!generatedScript && !!selectedHostVoiceId;
  const singleFormatMissingReqs = isSingleFormat && (!generatedScript || !selectedHostVoiceId);

  const conversationUrlProvided = !!formData.conversationUrlInput?.trim();
  const conversationFileProvided = !!selectedFileObject;
  const conversationTextProvided = !!formData.thoughts?.trim();
  const conversationSourceProvided = conversationUrlProvided || conversationFileProvided || conversationTextProvided;
  const conversationVoicesProvided = !!selectedHostVoiceId && !!selectedGuestVoiceId;
  
  const conversationFormatMissingReqs = 
    isConversationFormat && 
    (!conversationSourceProvided || !conversationVoicesProvided);

  if (isConversationFormat) { // Log only when in conversation mode for easier debugging
    console.log('[PodcastTab] Debug Button Disabled State (Conversation):');
    console.log('  isCreatingPodcast:', isCreatingPodcast);
    console.log('  podcastTitle:', podcastTitle, '!podcastTitle.trim():', !podcastTitle.trim());
    console.log('  conversationUrlInput:', formData.conversationUrlInput, 'conversationUrlProvided:', conversationUrlProvided);
    console.log('  selectedFileObject:', selectedFileObject, 'conversationFileProvided:', conversationFileProvided);
    console.log('  thoughts:', formData.thoughts, 'conversationTextProvided:', conversationTextProvided);
    console.log('  ANY conversationSourceProvided:', conversationSourceProvided);
    console.log('  selectedHostVoiceId:', selectedHostVoiceId, '!!selectedHostVoiceId', !!selectedHostVoiceId);
    console.log('  selectedGuestVoiceId:', selectedGuestVoiceId, '!!selectedGuestVoiceId', !!selectedGuestVoiceId);
    console.log('  conversationVoicesProvided:', conversationVoicesProvided);
    console.log('  CONVERSATION missing reqs (part of || ):', conversationFormatMissingReqs);
    console.log('  OVERALL button disabled:', 
      isCreatingPodcast || 
      !podcastTitle.trim() || 
      singleFormatMissingReqs ||
      conversationFormatMissingReqs
    );
  }
  // END DEBUG LOGS

  // Add console logs for debugging
  console.log('--- PodcastTab RENDER ---');
  console.log('Current podcastFormat:', podcastFormat);
  console.log('formData.hostName:', formData.hostName);
  console.log('Full props.formData:', JSON.stringify(formData));
  console.log('--- End PodcastTab RENDER ---');

  return (
    <>
      <FormatSelector value={podcastFormat} onChange={setPodcastFormat} isConversationComingSoon={isConversationComingSoon} />
      
      {/* ElevenLabs Connection Check */}
      {hasElevenLabsConnection === false && (
        <ElevenLabsConnectionHelper organizationId={orgId} />
      )}
      {isCheckingConnection && (
        <div className="flex items-center justify-center p-4 my-2">
          <div className="animate-spin h-5 w-5 border-b-2 border-blue-600 rounded-full mr-2"></div>
          <span className="text-sm text-gray-500">Checking ElevenLabs connection...</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`space-y-6 mt-6 ${hasElevenLabsConnection === false ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Tone of Voice Selector - Always visible */}
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
          
          <Select
            value={formData.tone_of_voice_id || ''}
            onValueChange={handleToneChange}
            disabled={loadingTones}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingTones ? 'Loading tones...' : 'Select a tone'} />
            </SelectTrigger>
            <SelectContent>
              {loadingTones && (
                <SelectItem value="loading" disabled>
                  Loading tones...
                </SelectItem>
              )}
              {!loadingTones && tones.length === 0 && (
                <SelectItem value="no-tones" disabled>
                  No tones available
                </SelectItem>
              )}
              {tones.map((tone: ToneOfVoice) => (
                <SelectItem key={tone.id} value={tone.id}>
                  {tone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedTone && (
            <div className="mt-1 text-sm text-gray-600">
              {selectedTone.description && (
                <p className="line-clamp-2">{selectedTone.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Host Voice Selector - Always visible */}
        {orgId && (
          <div className="space-y-2">
            <VoiceSelectorField
              label="Host Voice *"
              organizationId={orgId}
              selectedVoiceId={selectedHostVoiceId || ''}
              onVoiceChange={setSelectedHostVoiceId}
            />
          </div>
        )}

        {/* Single Voice Mode Content */}
        {podcastFormat === 'single' && (
          <>
            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="url-podcast-single">URL (Optional source for AI script generation)</Label>
              <Input
                id="url-podcast-single"
                name="url"
                value={formData.url || ''}
                onChange={handleInputChange}
                placeholder="Enter URL for content source"
                className="w-full"
              />
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label htmlFor="document-upload-podcast-single">Or upload a document (PDF, DOCX, TXT - Optional source)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="document-upload-podcast-single"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedDocumentName(file.name);
                      setSelectedFileObject(file);
                    } else {
                      setSelectedDocumentName(null);
                      setSelectedFileObject(null);
                    }
                  }}
                />
                <Label
                  htmlFor="document-upload-podcast-single"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Choose File
                </Label>
                <span className="text-sm text-gray-600">
                  {selectedDocumentName || "No file chosen"}
                </span>
              </div>
              {selectedDocumentName && (
                <p className="text-xs text-gray-500">
                  Using document: {selectedDocumentName}. URL field will be ignored.
                </p>
              )}
            </div>

            {/* Thoughts/Description Input */}
            <div className="space-y-2">
              <Label htmlFor="thoughts">Your Thoughts *</Label>
              <Textarea
                id="thoughts"
                name="thoughts"
                value={formData.thoughts || ''}
                onChange={handleInputChange}
                placeholder="Enter your thoughts or content for the podcast"
                className="w-full"
                rows={5}
              />
            </div>

            {/* Podcast Length Selector */}
            <div className="space-y-2">
              <Label htmlFor="character-length">Character Length *</Label>
              <Select
                value={formData.character_length || ''}
                onValueChange={handleCharacterLengthChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  {["10 minutes", "15 minutes", "25 minutes"].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.character_length && (
                <p className="text-xs text-gray-500">
                  {formData.character_length === '10 minutes' && 'Approx. 1,500-1,800 words'}
                  {formData.character_length === '15 minutes' && 'Approx. 2,200-2,500 words'}
                  {formData.character_length === '25 minutes' && 'Approx. 3,700-4,000 words'}
                </p>
              )}
            </div>

            {/* Host Name Input */}
            <div className="space-y-2">
              <Label htmlFor="host-name">Host name (for script)</Label>
              <Input
                id="host-name"
                name="hostName"
                value={formData.hostName || ''}
                onChange={handleInputChange}
                placeholder="Enter podcast host name"
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                The host name will be used in the podcast script.
              </p>
            </div>

            {/* Generate Script Button */}
            <div className="space-y-2">
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isGeneratingScript || !formData.thoughts || !formData.character_length || !formData.tone_of_voice_id}
                onClick={handleGenerateScript}
              >
                {isGeneratingScript ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Generating Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Script with AI
                  </>
                )}
              </Button>
            </div>

            {/* Generated Script Display */}
            {generatedScript && (
              <div className="space-y-2">
                <Label htmlFor="generated-script">Your Generated Script *</Label>
                <Textarea
                  id="generated-script"
                  value={generatedScript}
                  onChange={e => {
                    setGeneratedScript(e.target.value);
                    setScriptSaved(false);
                  }}
                  rows={10}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">You can edit the script before creating the podcast.</p>
              </div>
            )}
          </>
        )}

        {/* Conversation Mode Content */}
        {podcastFormat === 'conversation' && (
          <div className={isConversationComingSoon ? 'opacity-50 pointer-events-none' : ''}>
            {/* Guest Voice Selector */}
            {orgId && (
              <div className="space-y-2">
                <VoiceSelectorField
                  label="Guest Voice *"
                  organizationId={orgId}
                  selectedVoiceId={selectedGuestVoiceId}
                  onVoiceChange={setSelectedGuestVoiceId}
                />
              </div>
            )}

            {/* Conversation Source Tabs */}
            <div className="mt-6">
              <Label className="text-base font-medium">Conversation Source</Label>
              <Tabs value={conversationSourceTab} onValueChange={setConversationSourceTab} className="mt-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="url">Import from URL</TabsTrigger>
                  <TabsTrigger value="file">Upload Document</TabsTrigger>
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                </TabsList>

                {/* URL Tab Content */}
                <TabsContent value="url" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="url-podcast-conversation">Source URL</Label>
                    <Input
                      id="url-podcast-conversation"
                      name="conversationUrlInput"
                      value={formData.conversationUrlInput || ''}
                      onChange={handleInputChange}
                      placeholder="Enter URL for conversation source"
                      className="w-full"
                    />
                  </div>
                </TabsContent>

                {/* File Tab Content */}
                <TabsContent value="file" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="document-upload-podcast-conversation">Upload Document (PDF, DOCX, TXT)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="document-upload-podcast-conversation"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedDocumentName(file.name);
                            setSelectedFileObject(file);
                          } else {
                            setSelectedDocumentName(null);
                            setSelectedFileObject(null);
                          }
                        }}
                      />
                      <Label
                        htmlFor="document-upload-podcast-conversation"
                        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                      >
                        Choose File
                      </Label>
                      {selectedDocumentName && (
                        <span className="text-sm text-gray-600">{selectedDocumentName}</span>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Text Tab Content */}
                <TabsContent value="text" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="thoughts-podcast-conversation">Paste Text</Label>
                    <Textarea
                      id="thoughts-podcast-conversation"
                      name="thoughts"
                      value={formData.thoughts || ''}
                      onChange={handleInputChange}
                      placeholder="Paste or type conversation text here"
                      className="w-full"
                      rows={5}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Podcast Title - Always visible */}
        <div className="space-y-2">
          <Label htmlFor="podcast-title">Podcast Title *</Label>
          <Input
            id="podcast-title"
            value={podcastTitle}
            onChange={(e) => setPodcastTitle(e.target.value)}
            placeholder="Enter podcast title"
            required
          />
        </div>

        {/* Create Podcast Button */}
        <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4">
          <Button
            type="button"
            onClick={handleCreatePodcastInternal}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            disabled={
              isCreatingPodcast || 
              !podcastTitle.trim() ||
              (podcastFormat === 'single' && (!selectedHostVoiceId || !generatedScript)) ||
              (podcastFormat === 'conversation' && (isConversationComingSoon || !isConversationRequirementsMet))
            }
          >
            {isCreatingPodcast ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-green-300 border-t-transparent rounded-full mr-2"></div>
                Creating Podcast...
              </>
            ) : (
              'Create Podcast'
            )}
          </Button>
        </div>

        {/* Podcast Player - Show when podcast is created */}
        {createdPodcastId && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Podcast Status</h3>
            <PodcastPlayer podcastId={createdPodcastId} organizationId={orgId} />
          </div>
        )}
      </div>
    </>
  );
} 