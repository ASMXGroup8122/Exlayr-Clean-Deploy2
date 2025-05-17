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

// Define a new props interface
interface PodcastTabProps {
  orgId: string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  selectedFileObject: File | null;
  setSelectedFileObject: React.Dispatch<React.SetStateAction<File | null>>;
  selectedDocumentName: string | null;
  setSelectedDocumentName: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function PodcastTab(props: PodcastTabProps) {
  const {
    orgId,
    formData,
    setFormData,
    selectedFileObject,
    setSelectedFileObject,
    selectedDocumentName,
    setSelectedDocumentName,
  } = props;

  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // Internal states for PodcastTab
  const [podcastFormat, setPodcastFormat] = useState<PodcastFormat>('single');
  const [selectedHostVoiceId, setSelectedHostVoiceId] = useState<string | null>(null);
  const [selectedGuestVoiceId, setSelectedGuestVoiceId] = useState<string | null>(null);
  const [podcastTitle, setPodcastTitle] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isCreatingPodcast, setIsCreatingPodcast] = useState(false);
  const [createdPodcastId, setCreatedPodcastId] = useState<string | null>(null);
  const [hasElevenLabsConnection, setHasElevenLabsConnection] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // States for single voice script generation UI (to be fully moved if not already)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false); 
  const [scriptSaved, setScriptSaved] = useState(false); 
  // Note: formData.hostName is used in the JSX, should be part of formData or a separate state if needed
  
  const [conversationSourceTab, setConversationSourceTab] = useState('url'); // 'url', 'file', 'text'
  
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

  const handleCreatePodcastInternal = async () => {
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

  return (
    <>
      <FormatSelector value={podcastFormat} onChange={setPodcastFormat} />
      {hasElevenLabsConnection === false && (
        <ElevenLabsConnectionHelper organizationId={orgId} />
      )}
      {isCheckingConnection && (
        <div className="flex items-center justify-center p-4 my-2">
          <div className="animate-spin h-5 w-5 border-b-2 border-blue-600 rounded-full mr-2"></div>
          <span className="text-sm text-gray-500">Checking ElevenLabs connection...</span>
        </div>
      )}
      <div className={hasElevenLabsConnection === false ? "opacity-50 pointer-events-none" : ""}>
        {orgId && (
          <div className="mt-4">
            <VoiceSelectorField
              label="Host Voice *"
              organizationId={orgId}
              selectedVoiceId={selectedHostVoiceId}
              onVoiceChange={setSelectedHostVoiceId}
            />
          </div>
        )}
      </div>
      {podcastFormat === 'single' && (
        <>
          <div className="mt-4 space-y-2">
            <Label htmlFor="url-podcast-single">URL (Optional source for AI script generation)</Label>
            <Input
              id="url-podcast-single"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="Enter URL for content source"
              className="w-full"
            />
          </div>
          <div className="mt-4 space-y-2">
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
                className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2`}
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
          <div className="mt-4 space-y-2">
            <Label htmlFor="thoughts-podcast-single">Briefly describe your points for AI script generation *</Label>
            <div className="mb-4 flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Describe any points you want to make here, the name of your podcast "start with 'Welcome to [your podcast name]" etc. You can influence what is said, what points are covered, etc.
              </p>
            </div>
            <Textarea
              id="thoughts-podcast-single"
              required
              value={formData.thoughts}
              onChange={(e) => setFormData({ ...formData, thoughts: e.target.value })}
              placeholder="Describe the key points for your podcast script..."
              className="w-full"
              rows={4}
            />
          </div>
          <div className="mt-4 space-y-2">
            <Label>Podcast length *</Label>
            <Select
              value={formData.character_length}
              onValueChange={(value) => setFormData({ ...formData, character_length: value })}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select podcast length" />
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
          <div className="mt-4 space-y-2">
            <Label htmlFor="host-name">Host name (for script)</Label>
            <Input
              id="host-name"
              value={formData.hostName}
              onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
              placeholder="Enter podcast host name"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              The host name will be used in the podcast script.
            </p>
          </div>
        </>
      )}
      {podcastFormat === 'conversation' && (
        <>
          {orgId && (
            <div className="mt-4">
              <VoiceSelectorField
                label="Guest Voice *"
                organizationId={orgId}
                selectedVoiceId={selectedGuestVoiceId}
                onVoiceChange={setSelectedGuestVoiceId}
              />
            </div>
          )}
          <div className="mt-6">
            <Label className="text-base font-medium">Conversation Source</Label>
            <Tabs value={conversationSourceTab} onValueChange={setConversationSourceTab} className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url">Import from URL</TabsTrigger>
                <TabsTrigger value="file">Upload Document</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="url-podcast-conversation">Source URL</Label>
                  <Input
                    id="url-podcast-conversation"
                    value={formData.conversationUrlInput || ''}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        conversationUrlInput: e.target.value, 
                        thoughts: '' 
                      });
                      setSelectedFileObject(null);
                      setSelectedDocumentName(null);
                    }}
                    placeholder="Enter URL of document/article"
                    className="w-full"
                  />
                </div>
              </TabsContent>
              <TabsContent value="file" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="document-upload-conversation">Upload Document (PDF, DOCX, TXT, EPUB, HTML)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="document-upload-conversation"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.epub,.html"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFileObject(file);
                          setSelectedDocumentName(file.name);
                          setFormData({ ...formData, url: '', thoughts: '' });
                        } else {
                          setSelectedFileObject(null);
                          setSelectedDocumentName(null);
                        }
                      }}
                    />
                    <Label
                      htmlFor="document-upload-conversation"
                      className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-center`}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {selectedDocumentName || "Upload Content File"}
                    </Label>
                  </div>
                  {selectedDocumentName && <p className='text-xs text-gray-500 mt-1'>Selected: {selectedDocumentName}</p>}
                </div>
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="thoughts-podcast-conversation-fallback">Paste Full Text Content</Label>
                  <Textarea
                    id="thoughts-podcast-conversation-fallback"
                    value={formData.thoughts}
                    onChange={(e) => {
                      setFormData({ ...formData, thoughts: e.target.value, url: '' });
                      setSelectedFileObject(null);
                      setSelectedDocumentName(null);
                    }}
                    placeholder="Paste or write the full conversation text here..."
                    className="w-full"
                    rows={8}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          {createdPodcastId && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Podcast Status</h3>
              <PodcastPlayer podcastId={createdPodcastId} organizationId={orgId} />
            </div>
          )}
        </>
      )}
      <div className="mt-4 space-y-2">
        <Label htmlFor="podcast-title">Podcast Title *</Label>
        <Input
          id="podcast-title"
          value={podcastTitle}
          onChange={(e) => setPodcastTitle(e.target.value)}
          placeholder="Enter podcast title"
          required
        />
      </div>
      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 mt-6">
        <Button
          type="button"
          onClick={handleCreatePodcastInternal}
          className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          disabled={isCreatingPodcast || !podcastTitle.trim() ||
            (podcastFormat === 'single' && (!generatedScript || !selectedHostVoiceId)) ||
            (podcastFormat === 'conversation' && (!conversationSourceProvided || !conversationVoicesProvided))
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
      {createdPodcastId && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Podcast Status</h3>
          <PodcastPlayer podcastId={createdPodcastId} organizationId={orgId} />
        </div>
      )}
    </>
  );
} 