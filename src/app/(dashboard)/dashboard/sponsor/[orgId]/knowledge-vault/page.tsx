'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BookOpen, Plus, File, Download, Trash2, CheckCircle, Search, Filter, Pencil, AlertTriangle, Info, Sparkles, Mic, VolumeIcon, KeyIcon, ChevronDown, Edit, CalendarIcon, MailIcon, Bot, Brain, Zap } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import LinkedInIcon from '@/components/icons/linkedin-icon';
import { cn } from '@/lib/utils';
import { BuzzsproutDialog } from '@/components/connection/BuzzsproutDialog';

type DocumentCategory = 
    | 'sponsor_guidelines'
    | 'compliance_docs'
    | 'due_diligence'
    | 'templates'
    | 'procedures'
    | 'regulations'
    | 'training'
    | 'other';

interface ToneOfVoice {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id: string;
}

interface SpokenVoice {
  id: string;
  name: string;
  description: string;
  voice_id: string;
  settings: {
    stability: number;
    clarity: number;
  };
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export default function SponsorKnowledgeVaultPage() {
    const { user } = useAuth();
    const supabase = getSupabaseClient();
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("documents");
    
    // Organization and client filtering states
    const [organizationName, setOrganizationName] = useState<string>('');
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [selectedDocCategory, setSelectedDocCategory] = useState<string>('all');
    const [clients, setClients] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    
    // Tone of Voice states
    const [tones, setTones] = useState<ToneOfVoice[]>([]);
    const [loadingTones, setLoadingTones] = useState(false);
    const [showToneDialog, setShowToneDialog] = useState(false);
    const [editingTone, setEditingTone] = useState<ToneOfVoice | null>(null);
    const [newTone, setNewTone] = useState({ name: '', description: '', shortDescription: '' });
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    
    // Spoken Voice states
    const [voices, setVoices] = useState<SpokenVoice[]>([]);
    const [loadingVoices, setLoadingVoices] = useState(false);
    const [showVoiceDialog, setShowVoiceDialog] = useState(false);
    const [editingVoice, setEditingVoice] = useState<SpokenVoice | null>(null);
    const [newVoice, setNewVoice] = useState({ 
        name: '', 
        description: '', 
        voiceId: '', 
        settings: { 
            stability: 0.30 as number, 
            clarity: 0.75 as number 
        } 
    });
    const [isTestingVoice, setIsTestingVoice] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<any[]>([]);
    const [fetchingAvailableVoices, setFetchingAvailableVoices] = useState(false);
    const [hasValidApiKey, setHasValidApiKey] = useState(false);
    const [organizationApiKey, setOrganizationApiKey] = useState('');
    const [testPhrase, setTestPhrase] = useState("This is a test of your selected voice profile. How does it sound?");
    
    // Social Connection states
    const [connections, setConnections] = useState<any[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
    
    // Add LinkedIn connection states
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [linkedinLoading, setLinkedinLoading] = useState(false);
    
    // Add these state variables for Twitter connection
    const [twitterConnected, setTwitterConnected] = useState(false);
    const [twitterLoading, setTwitterLoading] = useState(false);
    
    // Add BuzzSprout connection state
    const [buzzsproutConnected, setBuzzsproutConnected] = useState(false);
    const [buzzsproutLoading, setBuzzsproutLoading] = useState(false);
    const [buzzsproutPodcastName, setBuzzsproutPodcastName] = useState('');
    const [showBuzzsproutDialog, setShowBuzzsproutDialog] = useState(false);
    
    // Add this new state to track all connection statuses in a single object
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({
        linkedin: false,
        twitter: false,
        elevenlabs: false,
        buzzsprout: false
    });
    
    // Add this new state to track all loading statuses in a single object
    const [loadingStatuses, setLoadingStatuses] = useState<Record<string, boolean>>({
        linkedin: false,
        twitter: false,
        elevenlabs: false,
        buzzsprout: false
    });
    
    // Add function to check LinkedIn connection status
    const checkLinkedInConnection = async () => {
        if (!user?.organization_id) return;
        
        try {
            console.log('Checking LinkedIn connection status for organization:', user.organization_id);
            
            const { data, error } = await supabase
                .from('oauth_tokens')
                .select('*')
                .eq('organization_id', user.organization_id)
                .eq('provider', 'linkedin')
                .single();
                
            if (error) {
                if (error.code === 'PGRST116') {
                    // No data found - not an error, just not connected
                    console.log('No LinkedIn connection found');
                    setLinkedinConnected(false);
                } else {
                    // Actual database error
                    console.error('Error checking LinkedIn connection status:', error);
                    setLinkedinConnected(false);
                }
            } else if (data) {
                console.log('LinkedIn connection found:', data);
                // Make sure we update the state to reflect the connection
                if (!linkedinConnected) {
                    setLinkedinConnected(true);
                }
            } else {
                console.log('No LinkedIn connection data available');
                setLinkedinConnected(false);
            }
        } catch (err) {
            console.error('Exception checking LinkedIn connection status:', err);
            setLinkedinConnected(false);
        }
    };
    
    // Update the handleConnectLinkedIn function to force a page reload after the popup closes
    const handleConnectLinkedIn = () => {
        if (!user?.organization_id) {
            toast({
                title: "Error",
                description: "Organization ID is missing. Please reload the page.",
                variant: "destructive"
            });
            return;
        }
        
        setLinkedinLoading(true);
        try {
            // Construct the authentication URL
            const authUrl = `/api/auth/linkedin/authorize?organizationId=${user.organization_id}`;
            
            // Open a popup window for authorization
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            const authWindow = window.open(
                authUrl,
                'LinkedIn Authorization',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
            );
            
            // Poll periodically to check if popup closed
            const checkPopupInterval = setInterval(() => {
                if (authWindow?.closed) {
                    clearInterval(checkPopupInterval);
                    setLinkedinLoading(false);
                    
                    // Check connection status after popup closes
                    checkLinkedInConnection();
                    
                    // Force a page reload after a short delay to ensure DB updates are reflected
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            }, 500);
            
        } catch (err) {
            console.error('Error connecting to LinkedIn:', err);
            toast({
                title: "Error",
                description: "Failed to connect to LinkedIn. Please try again.",
                variant: "destructive"
            });
            setLinkedinLoading(false);
        }
    };
    
    // Add function to disconnect LinkedIn
    const handleDisconnectLinkedIn = async () => {
        if (!user?.organization_id) return;
        
        setLinkedinLoading(true);
        try {
            console.log("Attempting to disconnect LinkedIn for organization:", user.organization_id);
            
            const { data, error } = await supabase
                .from('oauth_tokens')
                .delete()
                .eq('organization_id', user.organization_id)
                .eq('provider', 'linkedin');
                
            if (error) {
                console.error('Error disconnecting LinkedIn:', error);
                throw error;
            }
            
            console.log("LinkedIn disconnected successfully:", data);
            setLinkedinConnected(false);
            toast({
                title: "LinkedIn Disconnected",
                description: "Your LinkedIn account has been disconnected successfully.",
                variant: "default"
            });
        } catch (err) {
            console.error('Error disconnecting LinkedIn:', err);
            toast({
                title: "Error",
                description: "Failed to disconnect LinkedIn. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLinkedinLoading(false);
        }
    };

    // Add function to handle managing LinkedIn connection
    const handleManageLinkedIn = () => {
        // Create and show a dialog for managing LinkedIn connection
        const confirmed = window.confirm('Do you want to disconnect your LinkedIn account? This will prevent posting to LinkedIn until you reconnect.');
        
        if (confirmed) {
            console.log("User confirmed LinkedIn disconnection");
            handleDisconnectLinkedIn().catch(err => {
                console.error("Error in handleDisconnectLinkedIn:", err);
                setLinkedinLoading(false);
            });
        } else {
            console.log("User cancelled LinkedIn disconnection");
        }
    };

    // AI-assisted tone generation with real API
    const generateToneWithAI = async () => {
        if (!newTone.name.trim()) {
            toast({
                title: "Name Required",
                description: "Please enter a tone name first to generate a description",
                variant: "destructive"
            });
            return;
        }
        
        setIsGeneratingAI(true);
        
        try {
            // Call our API endpoint to generate a tone description with OpenAI
            const response = await fetch('/api/ai/generate-tone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newTone.name,
                    description: newTone.shortDescription
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate description');
            }
            
            const data = await response.json();
            
            setNewTone(prev => ({
                ...prev,
                description: data.description
            }));
            
            toast({
                title: "AI Description Generated",
                description: "We've created a tone description. Feel free to edit it to better match your needs.",
            });
        } catch (err: any) {
            console.error('Error generating AI tone:', err);
            toast({
                title: "Generation Failed",
                description: err.message || "Could not generate an AI description. Please try again or enter one manually.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Fetch documents with robust error handling and authentication checks
    const fetchDocuments = async () => {
        if (!user?.organization_id) {
            console.log("Cannot fetch documents: No organization ID available");
            return;
        }
        
        try {
            setLoading(true);
            console.log("Fetching documents for organization:", user.organization_id);
            
            // First check if we have an authenticated session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Authentication error:', sessionError);
                throw new Error(`Authentication error: ${sessionError.message}`);
            }
            
            if (!sessionData?.session?.user) {
                console.error('No authenticated user session found');
                throw new Error('Your session has expired. Please refresh the page and sign in again.');
            }
            
            // Now try to fetch documents with full error logging
            const { data, error } = await supabase
                .from('knowledge_vault_documents')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('created_at', { ascending: false });

            // Log detailed error information if there's a problem
            if (error) {
                console.error('Supabase error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                
                // Specific error handling for common issues
                if (error.code === '42P01') {
                    throw new Error('Database table not found. The knowledge_vault_documents table might not exist.');
                } else if (error.code === '42501') {
                    throw new Error('Permission denied. You may not have access to this data.');
                } else if (error.code === 'PGRST301') {
                    throw new Error('Foreign key violation. The organization_id might be invalid.');
                } else {
                    throw new Error(`Database error: ${error.message || JSON.stringify(error)}`);
                }
            }
            
            if (!data) {
                console.log('No documents found but no error returned');
                setDocuments([]);
                return;
            }
            
            console.log(`Documents fetched successfully: ${data.length} documents found`);
            setDocuments(data);
        } catch (err: any) {
            console.error('Error fetching documents:', err);
            
            // Provide user-friendly error message based on error type
            let errorMessage = 'Failed to load documents. Please try refreshing the page.';
            
            if (err.message?.includes('Authentication error')) {
                errorMessage = 'Session expired. Please refresh the page and sign in again.';
            } else if (err.message?.includes('Permission denied')) {
                errorMessage = 'You don\'t have permission to access these documents.';
            } else if (err.message?.includes('Database table not found')) {
                errorMessage = 'Document storage is not set up correctly. Please contact support.';
            }
            
            toast({
                title: "Error Loading Documents",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch tones of voice
    const fetchTones = async () => {
        if (!user?.organization_id) return;
        
        try {
            setLoadingTones(true);
            const { data, error } = await supabase
                .from('tone_of_voice')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('name', { ascending: true });
                
            if (error) throw error;
            setTones(data || []);
        } catch (err) {
            console.error('Error fetching tones of voice:', err);
            toast({
                title: "Error",
                description: "Failed to load tones of voice",
                variant: "destructive"
            });
        } finally {
            setLoadingTones(false);
        }
    };
    
    // Save new tone of voice
    const saveTone = async () => {
        if (!user?.organization_id || !newTone.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Tone name is required",
                variant: "destructive"
            });
            return;
        }
        
        try {
            const toneData = {
                name: newTone.name.trim(),
                description: newTone.description.trim(),
                user_id: user.id,
                organization_id: user.organization_id,
            };
            
            let response;
            
            if (editingTone) {
                // Update existing tone
                response = await supabase
                    .from('tone_of_voice')
                    .update(toneData)
                    .eq('id', editingTone.id);
            } else {
                // Insert new tone
                response = await supabase
                    .from('tone_of_voice')
                    .insert(toneData);
            }
            
            if (response.error) throw response.error;
            
            // Reset form and refresh list
            setNewTone({ name: '', description: '', shortDescription: '' });
            setEditingTone(null);
            setShowToneDialog(false);
            fetchTones();
            
            toast({
                title: editingTone ? "Tone Updated" : "Tone Created",
                description: editingTone 
                    ? `"${newTone.name}" has been updated` 
                    : `"${newTone.name}" has been added to your tones of voice`,
            });
        } catch (err: any) {
            console.error('Error saving tone of voice:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to save tone of voice",
                variant: "destructive"
            });
        }
    };
    
    // Delete tone of voice
    const deleteTone = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the tone "${name}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('tone_of_voice')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Remove from list
            setTones(tones.filter(tone => tone.id !== id));
            
            toast({
                title: "Tone Deleted",
                description: `"${name}" has been removed from your tones of voice`,
            });
        } catch (err: any) {
            console.error('Error deleting tone of voice:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete tone of voice",
                variant: "destructive"
            });
        }
    };
    
    // Edit tone of voice
    const handleEditTone = (tone: ToneOfVoice) => {
        setEditingTone(tone);
        setNewTone({
            name: tone.name,
            description: tone.description,
            shortDescription: tone.description.split('.').slice(0, 3).join('.') + '.'
        });
        setShowToneDialog(true);
    };

    // Fetch voices from the database
    const fetchVoices = async () => {
        if (!user?.organization_id) return;
        
        try {
            setLoadingVoices(true);
            const { data, error } = await supabase
                .from('spoken_voice')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('name', { ascending: true });
                
            if (error) throw error;
            setVoices(data || []);
            
            // Also fetch the organization's API key if available
            const { data: orgData, error: orgError } = await supabase
                .from('organization_settings')
                .select('elevenlabs_api_key')
                .eq('organization_id', user.organization_id)
                .single();
                
            if (!orgError && orgData?.elevenlabs_api_key) {
                setOrganizationApiKey(orgData.elevenlabs_api_key);
                setHasValidApiKey(true);
            }
        } catch (err) {
            console.error('Error fetching voice profiles:', err);
            toast({
                title: "Error",
                description: "Failed to load voice profiles",
                variant: "destructive"
            });
        } finally {
            setLoadingVoices(false);
        }
    };
    
    // Save voice profile
    const saveVoice = async () => {
        if (!user?.organization_id || !newVoice.name.trim() || !newVoice.voiceId.trim()) {
            toast({
                title: "Validation Error",
                description: "Voice name and Voice ID are required",
                variant: "destructive"
            });
            return;
        }
        
        try {
            const voiceData = {
                name: newVoice.name.trim(),
                description: newVoice.description.trim(),
                voice_id: newVoice.voiceId.trim(),
                settings: newVoice.settings,
                user_id: user.id,
                organization_id: user.organization_id,
            };
            
            let response;
            
            if (editingVoice) {
                // Update existing voice
                response = await supabase
                    .from('spoken_voice')
                    .update(voiceData)
                    .eq('id', editingVoice.id);
            } else {
                // Insert new voice
                response = await supabase
                    .from('spoken_voice')
                    .insert(voiceData);
            }
            
            if (response.error) throw response.error;
            
            // Reset form and refresh list
            setNewVoice({ name: '', description: '', voiceId: '', settings: { stability: 0.30, clarity: 0.75 } });
            setEditingVoice(null);
            setShowVoiceDialog(false);
            fetchVoices();
            
            toast({
                title: editingVoice ? "Voice Updated" : "Voice Created",
                description: editingVoice 
                    ? `"${newVoice.name}" has been updated` 
                    : `"${newVoice.name}" has been added to your voice profiles`,
            });
        } catch (err: any) {
            console.error('Error saving voice profile:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to save voice profile",
                variant: "destructive"
            });
        }
    };

    // Delete voice profile
    const deleteVoice = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the voice profile "${name}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('spoken_voice')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Remove from list
            setVoices(voices.filter(voice => voice.id !== id));
            
            toast({
                title: "Voice Profile Deleted",
                description: `"${name}" has been removed from your voice profiles`,
            });
        } catch (err: any) {
            console.error('Error deleting voice profile:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete voice profile",
                variant: "destructive"
            });
        }
    };

    // Verify and save the ElevenLabs API key
    const verifyAndSaveApiKey = async () => {
        if (!apiKeyInput.trim() || !user?.organization_id) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid API key",
                variant: "destructive"
            });
            return;
        }
        
        setIsVerifyingApiKey(true);
        
        try {
            // Step 1: Verify the API key with ElevenLabs
            let isKeyVerified = false;
            
            try {
                // Call your backend to verify the API key
                const response = await fetch('/api/elevenlabs/verify-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        apiKey: apiKeyInput
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to verify API key');
                }
                
                // API key verification was successful
                isKeyVerified = true;
            } catch (verifyError: any) {
                console.error('Error verifying API key:', verifyError);
                throw new Error(verifyError.message || "Could not verify the API key");
            }
            
            // Step 2: Save the API key to the database if verification was successful
            if (isKeyVerified) {
                try {
                    console.log("Saving API key to oauth_tokens...");
                    
                    // First check if a record already exists
                    const { data: existingToken, error: lookupError } = await supabase
                        .from('oauth_tokens')
                        .select('id')
                        .eq('organization_id', user.organization_id)
                        .eq('provider', 'elevenlabs')
                        .maybeSingle();
                        
                    if (lookupError) {
                        console.error('Error checking for existing token:', lookupError);
                        throw new Error(`Could not check for existing token: ${lookupError.message}`);
                    }
                    
                    let dbResult;
                    
                    if (existingToken) {
                        // Update existing record
                        console.log('Updating existing ElevenLabs token');
                        dbResult = await supabase
                            .from('oauth_tokens')
                            .update({
                                access_token: apiKeyInput,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingToken.id);
                    } else {
                        // Insert new record
                        console.log('Creating new ElevenLabs token');
                        const tokenId = crypto.randomUUID();
                        dbResult = await supabase
                            .from('oauth_tokens')
                            .insert({
                                id: tokenId,
                                organization_id: user.organization_id,
                                provider: 'elevenlabs',
                                provider_account_name: 'ElevenLabs API',
                                access_token: apiKeyInput,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });
                    }
                    
                    if (dbResult.error) {
                        console.error('Database error saving to oauth_tokens:', dbResult.error);
                        throw new Error(dbResult.error.message || 'Failed to save API key to oauth_tokens');
                    }
                    
                    // Remove the key from organization_settings if it exists there
                    // This helps with migration from the old approach to the new oauth_tokens approach
                    try {
                        const { data: existingSettings } = await supabase
                            .from('organization_settings')
                            .select('id')
                            .eq('organization_id', user.organization_id)
                            .maybeSingle();
                        
                        if (existingSettings) {
                            await supabase
                                .from('organization_settings')
                                .update({
                                    elevenlabs_api_key: null,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', existingSettings.id);
                            
                            console.log('Removed API key from organization_settings');
                        }
                    } catch (cleanupError) {
                        console.error('Non-critical error cleaning up organization_settings:', cleanupError);
                        // Don't throw here, as we've already saved to oauth_tokens
                    }
                    
                    // Update local state
                    setOrganizationApiKey(apiKeyInput);
                    setHasValidApiKey(true);
                    setApiKeyInput('');
                    
                    toast({
                        title: "API Key Saved",
                        description: "Your ElevenLabs API key has been verified and saved",
                    });
                    
                    // Force refresh the page to show the updated state
                    window.location.reload();
                    
                } catch (dbError: any) {
                    console.error('Database error saving API key:', dbError);
                    throw new Error(`The API key was verified but could not be saved: ${dbError.message}`);
                }
            }
        } catch (err: any) {
            console.error('API key verification flow error:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to verify or save API key",
                variant: "destructive"
            });
        } finally {
            setIsVerifyingApiKey(false);
        }
    };

    // Fetch available voices from ElevenLabs
    const fetchAvailableVoices = async (apiKey = organizationApiKey) => {
        if (!apiKey) return;
        
        setFetchingAvailableVoices(true);
        
        try {
            const response = await fetch('/api/elevenlabs/list-voices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch available voices');
            }
            
            const data = await response.json();
            setAvailableVoices(data.voices || []);
        } catch (err: any) {
            console.error('Error fetching available voices:', err);
            toast({
                title: "Error",
                description: err.message || "Could not fetch available voices",
                variant: "destructive"
            });
        } finally {
            setFetchingAvailableVoices(false);
        }
    };

    // Test voice playback
    const testVoice = async (voiceId: string = newVoice.voiceId) => {
        if (!voiceId || !organizationApiKey) {
            toast({
                title: "Error",
                description: "Missing voice ID or API key",
                variant: "destructive"
            });
            return;
        }
        
        setIsTestingVoice(true);
        
        try {
            const response = await fetch('/api/elevenlabs/test-voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: organizationApiKey,
                    voiceId,
                    text: testPhrase || "This is a test of your selected voice profile. How does it sound?",
                    settings: newVoice.settings
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to test voice');
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
            
        } catch (err: any) {
            console.error('Error testing voice:', err);
            toast({
                title: "Test Failed",
                description: err.message || "Could not test the voice",
                variant: "destructive"
            });
        } finally {
            setIsTestingVoice(false);
        }
    };

    // Edit voice profile
    const handleEditVoice = (voice: SpokenVoice) => {
        setEditingVoice(voice);
        setNewVoice({
            name: voice.name,
            description: voice.description || '',
            voiceId: voice.voice_id,
            settings: voice.settings || { stability: 0.30, clarity: 0.75 }
        });
        setShowVoiceDialog(true);
    };

    // Handle voice selection from the dropdown
    const handleVoiceSelection = (voiceId: string) => {
        const selectedVoice = availableVoices.find(voice => voice.voice_id === voiceId);
        if (selectedVoice) {
            setNewVoice(prev => ({
                ...prev,
                voiceId: selectedVoice.voice_id,
                name: prev.name || selectedVoice.name
            }));
        }
    };

    // Fetch organization name from exchange_sponsors table
    const fetchOrganizationName = async () => {
        if (!user?.organization_id) return;
        
        try {
            // First try to use the company_name from user profile
            if (user.company_name) {
                setOrganizationName(user.company_name);
                return;
            }
            
            // Query exchange_sponsors table for sponsor organizations
            const { data, error } = await supabase
                .from('exchange_sponsors')
                .select('name')
                .eq('id', user.organization_id)
                .single();

            if (error) {
                console.warn('Could not fetch organization name:', error);
                setOrganizationName('Organization');
                return;
            }

            setOrganizationName(data?.name || 'Organization');
        } catch (error) {
            console.error('Error fetching organization name:', error);
            setOrganizationName('Organization');
        }
    };

    // Fetch clients for filtering
    const fetchClients = async () => {
        if (!user?.organization_id) {
            console.log("❌ fetchClients: No organization_id available");
            return;
        }
        
        try {
            setLoadingClients(true);
            console.log("🔍 Fetching clients for organization:", user.organization_id);
            
            const { data, error } = await supabase
                .from('issuers')
                .select('id, issuer_name, status')
                .eq('exchange_sponsor', user.organization_id)
                .order('issuer_name', { ascending: true });

            if (error) {
                console.error('❌ Supabase error fetching clients:', error);
                console.error('Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                setClients([]);
                return;
            }

            console.log(`✅ Fetched ${data?.length || 0} clients:`, data);
            setClients(data || []);
        } catch (error) {
            console.error('❌ Exception fetching clients:', error);
            setClients([]);
        } finally {
            setLoadingClients(false);
        }
    };

    // Fetch documents, tones, and voices when user changes
    useEffect(() => {
        if (user?.organization_id) {
            console.log("🔄 Knowledge Vault: Loading organization data for:", user.organization_id);
            fetchOrganizationName();
            fetchClients();
            fetchDocuments();
            fetchTones();
            fetchVoices();
        }
    }, [user]);

    // Check social media connections only when the 'connections' tab is active and user is available
    useEffect(() => {
        if (activeTab === 'connections' && user?.organization_id) {
            console.log("Connections tab active, checking social media connections.");
            checkLinkedInConnection();
            checkTwitterConnection();
            checkBuzzsproutConnection();
        }
    }, [activeTab, user?.organization_id]);

    // Listen for LinkedIn popup messages
    useEffect(() => {
        const handleAuthComplete = (event: MessageEvent) => {
            // Only accept messages from our own origin
            if (event.origin !== window.location.origin) return;
            
            // Check if this is a LinkedIn auth message
            if (event.data?.type === 'LINKEDIN_AUTH_COMPLETE') {
                const success = event.data.status;
                console.log('LinkedIn auth completed with status:', success);
                if (success) {
                    // Immediately update the UI state to show connected
                    setLinkedinConnected(true);
                    
                    toast({
                        title: "LinkedIn Connected",
                        description: "Your LinkedIn account has been connected successfully.",
                        variant: "default"
                    });
                    
                    // Force a page reload to ensure all states are refreshed
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    toast({
                        title: "LinkedIn Connection Failed",
                        description: "Failed to connect to LinkedIn. Please try again.",
                        variant: "destructive"
                    });
                }
                
                // Refresh the connection status
                checkLinkedInConnection();
                setLinkedinLoading(false);
            }
        };
        
        // Add event listener
        window.addEventListener('message', handleAuthComplete);
        
        // Clean up
        return () => {
            window.removeEventListener('message', handleAuthComplete);
        };
    }, [checkLinkedInConnection, setLinkedinConnected, setLinkedinLoading, toast]);

    // Add Twitter connection check function
    const checkTwitterConnection = async () => {
      if (!user?.organization_id) return;
      
      try {
        console.log('Checking Twitter connection status for organization:', user.organization_id);
        
        const { data, error } = await supabase
          .from('oauth_tokens')
          .select('*')
          .eq('organization_id', user.organization_id)
          .eq('provider', 'twitter')
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // No data found - not an error, just not connected
            console.log('No Twitter connection found');
            setTwitterConnected(false);
          } else {
            // Actual database error
            console.error('Error checking Twitter connection status:', error);
            setTwitterConnected(false);
          }
        } else if (data) {
          console.log('Twitter connection found:', data);
          // Make sure we update the state to reflect the connection
          if (!twitterConnected) {
            setTwitterConnected(true);
          }
        } else {
          console.log('No Twitter connection data available');
          setTwitterConnected(false);
        }
      } catch (err) {
        console.error('Exception checking Twitter connection status:', err);
        setTwitterConnected(false);
      }
    };

    // Add Twitter connection handler function
    const handleConnectTwitter = () => {
      if (!user?.organization_id) {
        toast({
          title: "Error",
          description: "Organization ID is missing. Please reload the page.",
          variant: "destructive"
        });
        return;
      }
      
      setTwitterLoading(true);
      try {
        // Construct the authentication URL
        const authUrl = `/api/auth/twitter/authorize?organizationId=${user.organization_id}`;
        
        // Open a popup window for authorization
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const authWindow = window.open(
          authUrl,
          'Twitter Authorization',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );
        
        // Poll periodically to check if popup closed
        const checkPopupInterval = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkPopupInterval);
            setTwitterLoading(false);
            
            // Check connection status after popup closes
            checkTwitterConnection();
            
            // Force a page reload after a short delay to ensure DB updates are reflected
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        }, 500);
      } catch (error) {
        console.error('Error opening Twitter auth window:', error);
        setTwitterLoading(false);
        toast({
          title: "Connection Error",
          description: "Failed to open Twitter authorization window.",
          variant: "destructive"
        });
      }
    };

    // Add Twitter disconnect handler function
    const handleDisconnectTwitter = async () => {
      if (!user?.organization_id) return;
      
      try {
        setTwitterLoading(true);
        // Update the loadingStatuses object
        setLoadingStatuses(prev => ({ ...prev, twitter: true }));
        
        // Delete the record from oauth_tokens
        const { error } = await supabase
          .from('oauth_tokens')
          .delete()
          .eq('organization_id', user.organization_id)
          .eq('provider', 'twitter');
          
        if (error) {
          console.error('Error disconnecting Twitter:', error);
          toast({
            title: "Disconnection Failed",
            description: "Failed to disconnect Twitter account. Please try again.",
            variant: "destructive"
          });
        } else {
          console.log('Twitter disconnected successfully');
          toast({
            title: "Twitter Disconnected",
            description: "Your Twitter account has been disconnected.",
            variant: "default"
          });
          setTwitterConnected(false);
          // Update the connectionStatuses object
          setConnectionStatuses(prev => ({ ...prev, twitter: false }));
        }
      } catch (err) {
        console.error('Exception disconnecting Twitter:', err);
        toast({
          title: "Disconnection Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      } finally {
        setTwitterLoading(false);
        // Update the loadingStatuses object
        setLoadingStatuses(prev => ({ ...prev, twitter: false }));
      }
    };

    // Add the Twitter auth completion listener
    useEffect(() => {
      const handleAuthComplete = (event: MessageEvent) => {
        // Only accept messages from our own origin
        if (event.origin !== window.location.origin) return;
        
        // Check if this is a Twitter auth message
        if (event.data?.type === 'TWITTER_AUTH_COMPLETE') {
          const success = event.data.status;
          console.log('Twitter auth completed with status:', success);
          if (success) {
            // Immediately update the UI state to show connected
            setTwitterConnected(true);
            
            toast({
              title: "Twitter Connected",
              description: "Your Twitter account has been connected successfully.",
              variant: "default"
            });
            
            // Force a page reload to ensure all states are refreshed
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            toast({
              title: "Twitter Connection Failed",
              description: "Failed to connect to Twitter. Please try again.",
              variant: "destructive"
            });
          }
          
          // Refresh the connection status
          checkTwitterConnection();
          setTwitterLoading(false);
        }
      };
      
      // Add event listener
      window.addEventListener('message', handleAuthComplete);
      
      // Clean up
      return () => {
        window.removeEventListener('message', handleAuthComplete);
      };
    }, []);

    // BuzzSprout connection check - improved with better error handling
    const checkBuzzsproutConnection = async () => {
      if (!user?.organization_id) return;
      
      try {
        console.log('Checking BuzzSprout connection status for organization:', user.organization_id);
        
        const { data, error } = await supabase
          .from('oauth_tokens')
          .select('*')
          .eq('organization_id', user.organization_id)
          .eq('provider', 'buzzsprout')
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // No data found - not an error, just not connected
            console.log('No BuzzSprout connection found');
            setBuzzsproutConnected(false);
            setBuzzsproutPodcastName('');
            // Update the connectionStatuses object
            setConnectionStatuses(prev => ({ ...prev, buzzsprout: false }));
          } else {
            // Actual database error
            console.error('Error checking BuzzSprout connection status:', error);
            setBuzzsproutConnected(false);
            // Update the connectionStatuses object
            setConnectionStatuses(prev => ({ ...prev, buzzsprout: false }));
          }
        } else if (data) {
          console.log('BuzzSprout connection found:', data);
          // Make sure we update the state to reflect the connection
          setBuzzsproutConnected(true);
          setBuzzsproutPodcastName(data.provider_account_name || 'BuzzSprout Podcast');
          // Update the connectionStatuses object
          setConnectionStatuses(prev => ({ ...prev, buzzsprout: true }));
        } else {
          console.log('No BuzzSprout connection data available');
          setBuzzsproutConnected(false);
          // Update the connectionStatuses object
          setConnectionStatuses(prev => ({ ...prev, buzzsprout: false }));
        }
      } catch (err) {
        console.error('Exception checking BuzzSprout connection status:', err);
        setBuzzsproutConnected(false);
        setBuzzsproutPodcastName('');
        // Update the connectionStatuses object
        setConnectionStatuses(prev => ({ ...prev, buzzsprout: false }));
      }
    };

    // Handle disconnecting BuzzSprout
    const handleDisconnectBuzzsprout = async () => {
      if (!user?.organization_id) return;
      
      try {
        setBuzzsproutLoading(true);
        // Update the loadingStatuses object
        setLoadingStatuses(prev => ({ ...prev, buzzsprout: true }));
        
        // Delete the record from oauth_tokens
        const { error } = await supabase
          .from('oauth_tokens')
          .delete()
          .eq('organization_id', user.organization_id)
          .eq('provider', 'buzzsprout');
          
        if (error) {
          console.error('Error disconnecting BuzzSprout:', error);
          toast({
            title: "Disconnection Failed",
            description: "Failed to disconnect BuzzSprout account. Please try again.",
            variant: "destructive"
          });
        } else {
          console.log('BuzzSprout disconnected successfully');
          toast({
            title: "BuzzSprout Disconnected",
            description: "Your BuzzSprout connection has been removed.",
            variant: "default"
          });
          setBuzzsproutConnected(false);
          // Update the connectionStatuses object
          setConnectionStatuses(prev => ({ ...prev, buzzsprout: false }));
        }
      } catch (err) {
        console.error('Exception disconnecting BuzzSprout:', err);
        toast({
          title: "Disconnection Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      } finally {
        setBuzzsproutLoading(false);
        // Update the loadingStatuses object
        setLoadingStatuses(prev => ({ ...prev, buzzsprout: false }));
      }
    };
    
    // Handle showing BuzzSprout connection dialog
    const handleBuzzsproutConnection = () => {
      setShowBuzzsproutDialog(true);
    };

    // Add a new useEffect to automatically check for API key when the voices tab is opened
    useEffect(() => {
        if (activeTab === "spoken-voice" && user?.organization_id && !hasValidApiKey) {
            console.log("Spoken voice tab activated, checking for existing API key");
            
            const findExistingApiKey = async () => {
                try {
                    // First check oauth_tokens (preferred source)
                    const { data: oauthToken, error: oauthError } = await supabase
                        .from('oauth_tokens')
                        .select('access_token')
                        .eq('organization_id', user.organization_id)
                        .eq('provider', 'elevenlabs')
                        .maybeSingle();
                        
                    if (!oauthError && oauthToken?.access_token) {
                        console.log('Found existing ElevenLabs API key in oauth_tokens');
                        setOrganizationApiKey(oauthToken.access_token);
                        setHasValidApiKey(true);
                        
                        // Fetch available voices with the found key
                        fetchAvailableVoices(oauthToken.access_token);
                        return;
                    }
                        
                    // Fall back to organization_settings if not found in oauth_tokens
                    const { data, error } = await supabase
                        .from('organization_settings')
                        .select('elevenlabs_api_key')
                        .eq('organization_id', user.organization_id)
                        .maybeSingle();
                        
                    if (!error && data?.elevenlabs_api_key) {
                        console.log('Found existing ElevenLabs API key in organization_settings');
                        setOrganizationApiKey(data.elevenlabs_api_key);
                        setHasValidApiKey(true);
                        
                        // Fetch available voices with the found key
                        fetchAvailableVoices(data.elevenlabs_api_key);
                    } else {
                        console.log('No existing ElevenLabs API key found');
                        setHasValidApiKey(false);
                    }
                } catch (err) {
                    console.error('Error finding existing API key:', err);
                }
            };
            
            findExistingApiKey();
        }
    }, [activeTab, user?.organization_id, hasValidApiKey]);

    // Add a function to delete documents
    const deleteDocument = async (docId: string, docName: string, docUrl: string) => {
        if (!window.confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            // Extract storage path from URL
            const urlPath = new URL(docUrl).pathname;
            const storagePath = urlPath.split('/storage/v1/object/public/documents/')[1];
            
            if (storagePath) {
                // Delete file from storage
                await supabase.storage
                    .from('documents')
                    .remove([storagePath]);
            }
            
            // Delete record from database
            const { error } = await supabase
                .from('knowledge_vault_documents')
                .delete()
                .eq('id', docId);
                
            if (error) throw error;
            
            // Update local state to remove the document
            setDocuments(documents.filter(doc => doc.id !== docId));
            
            toast({
                title: "Document Deleted",
                description: `"${docName}" has been removed from your knowledge vault`,
            });
        } catch (err: any) {
            console.error('Error deleting document:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete document",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 md:p-6">
            {/* Enhanced Header */}
            <div className="relative mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Brain className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                                    Knowledge Vault
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Your AI-powered central intelligence hub
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span>Active</span>
                            </div>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                <Zap className="w-3 h-3 mr-1" />
                                AI Enhanced
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
            
            <Tabs defaultValue="documents" value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                // Remove the redundant ElevenLabs check here as it's handled by a separate effect
                // Check if switching to connections tab - update connection statuses
                // if (value === "connections" && user?.organization_id) {
                    // Check for ElevenLabs API key
                    // const checkElevenLabsConnection = async () => {
                        // try {
                            // First check oauth_tokens (preferred source)
                            // const { data: oauthToken, error: oauthError } = await supabase
                                // .from('oauth_tokens')
                                // .select('access_token')
                                // .eq('organization_id', user.organization_id)
                                // .eq('provider', 'elevenlabs')
                                // .maybeSingle();
                                
                            // if (!oauthError && oauthToken?.access_token) {
                                // setOrganizationApiKey(oauthToken.access_token);
                                // setHasValidApiKey(true);
                                // console.log('Found ElevenLabs API key in oauth_tokens');
                                // return;
                            // }
                                
                            // Fall back to organization_settings if not found in oauth_tokens
                            // const { data, error } = await supabase
                                // .from('organization_settings')
                                // .select('elevenlabs_api_key')
                                // .eq('organization_id', user.organization_id)
                                // .single();
                                
                            // if (!error && data?.elevenlabs_api_key) {
                                // setOrganizationApiKey(data.elevenlabs_api_key);
                                // setHasValidApiKey(true);
                                // console.log('Found ElevenLabs API key in organization_settings');
                            // } else {
                                // console.log('ElevenLabs API key not found in either oauth_tokens or organization_settings');
                                // setHasValidApiKey(false);
                            // }
                        // } catch (err) {
                            // console.error('Error checking ElevenLabs connection:', err);
                            // setHasValidApiKey(false);
                        // }
                    // };
                    // checkElevenLabsConnection();
                    
                    // Add more connection checks here as needed in the future
                // }
            }} className="w-full">
                <TabsList className="w-full flex overflow-x-auto p-0.5 mb-2 space-x-1">
                    <TabsTrigger 
                        value="documents" 
                        className="flex-1 min-w-[85px] px-2 py-2 text-xs sm:text-sm whitespace-nowrap"
                    >
                        Docs
                    </TabsTrigger>
                    <TabsTrigger 
                        value="tones-of-voice" 
                        className="flex-1 min-w-[85px] px-2 py-2 text-xs sm:text-sm whitespace-nowrap"
                    >
                        Tones
                    </TabsTrigger>
                    <TabsTrigger 
                        value="spoken-voice" 
                        className="flex-1 min-w-[85px] px-2 py-2 text-xs sm:text-sm whitespace-nowrap"
                    >
                        Voice
                    </TabsTrigger>
                    <TabsTrigger 
                        value="connections" 
                        className="flex-1 min-w-[85px] px-2 py-2 text-xs sm:text-sm whitespace-nowrap"
                    >
                        Connect
                    </TabsTrigger>
                </TabsList>
                
                {/* Document Tab Content */}
                <TabsContent value="documents">
                    {/* Enhanced Search Section */}
                    <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    type="text"
                                    placeholder="Search your knowledge base..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 pr-4 py-3 h-12 text-sm w-full bg-white/50 border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                                />
                            </div>
                            <Button
                                onClick={() => setShowUpload(!showUpload)}
                                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm h-12 w-full sm:w-auto"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Document
                            </Button>
                        </div>
                    </div>

                    {/* Enhanced Filtering Controls */}
                    <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Organisation Filter */}
                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <div className="w-4 h-4 mr-2 bg-blue-500 rounded-full" />
                                    Filter by Organisation
                                </label>
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm bg-white/50 transition-all duration-300"
                                >
                                    <option value="all">All Documents</option>
                                    <option value="sponsor">{organizationName} Documents</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.issuer_name} {client.status && `(${client.status})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <div className="w-4 h-4 mr-2 bg-indigo-500 rounded-full" />
                                    Filter by Category
                                </label>
                                <select
                                    value={selectedDocCategory}
                                    onChange={(e) => setSelectedDocCategory(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm bg-white/50 transition-all duration-300"
                                >
                                    <option value="all">All Categories</option>
                                    <option value="memorandum_articles">Memorandum & Articles</option>
                                    <option value="director_cvs">Director CVs</option>
                                    <option value="director_contracts">Director Contracts</option>
                                    <option value="material_contracts">Material Contracts</option>
                                    <option value="business_plan">Business Plan</option>
                                    <option value="investment_deck">Investment Deck</option>
                                    <option value="accounts">Financial Statements & Accounts</option>
                                    <option value="press_releases">Press Releases</option>
                                    <option value="sponsor_guidelines">Sponsor Guidelines</option>
                                    <option value="compliance_docs">Compliance Documents</option>
                                    <option value="due_diligence">Due Diligence</option>
                                    <option value="templates">Templates</option>
                                    <option value="procedures">Procedures</option>
                                    <option value="regulations">Regulations</option>
                                    <option value="training">Training Materials</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {showUpload && user?.organization_id && (
                        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/50 p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Upload Document</h3>
                            </div>
                            
                            {/* Client Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assign to Client
                                </label>
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="sponsor">{organizationName} Documents</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.issuer_name} {client.status && `(${client.status})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Document Category */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Document Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="memorandum_articles">Memorandum & Articles</option>
                                    <option value="director_cvs">Director CVs</option>
                                    <option value="director_contracts">Director Contracts</option>
                                    <option value="material_contracts">Material Contracts</option>
                                    <option value="business_plan">Business Plan</option>
                                    <option value="investment_deck">Investment Deck</option>
                                    <option value="accounts">Financial Statements & Accounts</option>
                                    <option value="press_releases">Press Releases</option>
                                    <option value="sponsor_guidelines">Sponsor Guidelines</option>
                                    <option value="compliance_docs">Compliance Documents</option>
                                    <option value="due_diligence">Due Diligence Templates</option>
                                    <option value="templates">Document Templates</option>
                                    <option value="procedures">Procedures</option>
                                    <option value="regulations">Regulations</option>
                                    <option value="training">Training Materials</option>
                                    <option value="other">Other Documents</option>
                                </select>
                            </div>
                            
                            <DocumentUpload
                                category={selectedCategory}
                                organizationId={user.organization_id}
                                issuerId={selectedClient === 'sponsor' ? undefined : parseInt(selectedClient)}
                                onUploadComplete={() => {
                                    setShowUpload(false);
                                    fetchDocuments();
                                }}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full flex justify-center items-center py-16">
                                <div className="text-center">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                                        <div className="absolute inset-0 rounded-full bg-blue-100/20 animate-pulse"></div>
                                    </div>
                                    <p className="mt-4 text-gray-600 font-medium">Loading your knowledge base...</p>
                                </div>
                            </div>
                        ) : (() => {
                            // Filter documents based on selected criteria
                            const filteredDocuments = documents.filter(doc => {
                                const matchesSearch = searchQuery === '' || 
                                    doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    doc.category?.toLowerCase().includes(searchQuery.toLowerCase());
                                
                                const matchesClient = selectedClient === 'all' || 
                                    (selectedClient === 'sponsor' && !doc.issuer_id) ||
                                    (selectedClient !== 'sponsor' && doc.issuer_id === selectedClient);
                                
                                const matchesCategory = selectedDocCategory === 'all' || doc.category === selectedDocCategory;
                                
                                return matchesSearch && matchesClient && matchesCategory;
                            });

                            return filteredDocuments.length === 0 ? (
                                <div className="col-span-full text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
                                    <div className="mx-auto rounded-full w-20 h-20 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 mb-6">
                                        <BookOpen className="h-10 w-10 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        {documents.length === 0 ? 'No documents yet' : 'No documents match your filters'}
                                    </h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                        {documents.length === 0 
                                            ? 'Start building your knowledge vault by uploading your first document.' 
                                            : 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                                        }
                                    </p>
                                    {documents.length === 0 && (
                                        <Button
                                            onClick={() => setShowUpload(true)}
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <Plus className="h-5 w-5 mr-2" />
                                            Add Your First Document
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                filteredDocuments.map(doc => (
                                    <div key={doc.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-300 group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center flex-1">
                                                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg mr-4 group-hover:scale-110 transition-transform duration-300">
                                                    <File className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.file_name || doc.name}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{doc.category}</p>
                                                    {doc.issuer_id && (
                                                        <div className="flex items-center mt-2">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                                                            <p className="text-xs text-blue-700 font-medium">
                                                                {clients.find(c => c.id === doc.issuer_id)?.issuer_name || 'Unknown Client'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2 ml-4">
                                                {doc.url?.startsWith('data:') ? (
                                                    <a
                                                        href={doc.url}
                                                        download={doc.file_name || doc.name}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                        title="Download"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </a>
                                                ) : doc.url?.startsWith('pending-upload://') ? (
                                                    <div className="flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                                        Processing
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => window.open(doc.url, '_blank')}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                        title="Open"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        deleteDocument(doc.id, doc.file_name || doc.name, doc.url);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            );
                        })()}
                    </div>
                </TabsContent>
                
                {/* Tones of Voice Tab Content */}
                <TabsContent value="tones-of-voice">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                            <div className="flex-1 max-w-full sm:max-w-xl">
                                <p className="text-sm text-gray-600">
                                    Create custom tones of voice that can be selected when creating social media posts. 
                                    Each tone helps AI generate content with a specific personality and writing style.
                                </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={() => {
                                        setEditingTone(null);
                                        setNewTone({ name: '', description: '', shortDescription: '' });
                                        setShowToneDialog(true);
                                    }}
                                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm h-10 w-full sm:w-auto"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Tone
                                </Button>
                            </div>
                        </div>
                        
                        {/* Info card */}
                        <Card className="mb-8 bg-blue-50 border-blue-200">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-start">
                                    <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-900 mb-2">Tone of Voice Tips</h4>
                                        <p className="text-sm text-blue-700 leading-relaxed">
                                            Describe your tone in detail for best results. For example: "Professional but warm, 
                                            uses simple language and avoids jargon. Friendly and approachable while maintaining 
                                            industry expertise. Uses short sentences and occasional questions to engage readers."
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tones of Voice List */}
                        <div className="space-y-4 sm:space-y-5">
                            {loadingTones ? (
                                <div className="flex justify-center items-center py-16">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-4 text-gray-500 font-medium">Loading tones of voice...</p>
                                    </div>
                                </div>
                            ) : tones.length === 0 ? (
                                <Card className="text-center py-16 border-dashed">
                                    <CardContent className="pt-6">
                                        <div className="mx-auto rounded-full w-16 h-16 flex items-center justify-center bg-gray-100">
                                            <AlertTriangle className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">No tones of voice</h3>
                                        <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                                            Get started by adding your first tone of voice to enhance your social media content.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setEditingTone(null);
                                                setNewTone({ name: '', description: '', shortDescription: '' });
                                                setShowToneDialog(true);
                                            }}
                                            className="mt-6 bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Your First Tone
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                    {tones.map(tone => (
                                        <Card key={tone.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2 p-4 sm:p-6">
                                                <CardTitle className="text-lg">{tone.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-2 px-4 sm:px-6">
                                                {tone.description ? (
                                                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">{tone.description}</p>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No description provided</p>
                                                )}
                                            </CardContent>
                                            <CardFooter className="flex justify-end gap-2 p-4 sm:p-6 pt-3 border-t">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="h-9"
                                                    onClick={() => handleEditTone(tone)}
                                                >
                                                    <Pencil className="h-4 w-4 mr-1.5" />
                                                    Edit
                                                </Button>
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    className="h-9"
                                                    onClick={() => deleteTone(tone.id, tone.name)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                                    Delete
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
                
                {/* Spoken Voice Tab Content */}
                <TabsContent value="spoken-voice">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                            <div className="flex-1 max-w-full sm:max-w-xl">
                                <p className="text-sm text-gray-600">
                                    Create custom voice profiles for your podcasts using ElevenLabs.
                                    Each voice defines how your audio content will sound when generated.
                                </p>
                                {hasValidApiKey && (
                                    <div className="mt-2 flex items-center text-sm text-emerald-600">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
                                        <span className="font-medium">ElevenLabs connected and ready to use</span>
                                    </div>
                                )}
                            </div>
                            {hasValidApiKey && (
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        onClick={() => {
                                            setEditingVoice(null);
                                            setNewVoice({ name: '', description: '', voiceId: '', settings: { stability: 0.30, clarity: 0.75 } });
                                            fetchAvailableVoices();
                                            setShowVoiceDialog(true);
                                        }}
                                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm h-10 w-full sm:w-auto"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Voice Profile
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        {/* Info card */}
                        <Card className={`mb-8 ${hasValidApiKey ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-start">
                                    {hasValidApiKey ? (
                                        <CheckCircle className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h4 className={`text-sm font-medium ${hasValidApiKey ? 'text-emerald-900' : 'text-blue-900'} mb-2`}>
                                            {hasValidApiKey ? 'ElevenLabs Connection Active' : 'Voice Profile Tips'}
                                        </h4>
                                        <p className={`text-sm ${hasValidApiKey ? 'text-emerald-700' : 'text-blue-700'} leading-relaxed`}>
                                            {hasValidApiKey ? (
                                                <>Your ElevenLabs account is connected and ready for use. You can now create voice profiles, adjust settings, 
                                                and test different voices for your podcast content. Each voice profile you create can be used to generate audio for your content.</>
                                            ) : (
                                                <>Choose voices that match your brand personality. You can adjust settings like 
                                                stability and clarity to fine-tune how each voice sounds. For best results,
                                                select professional voices that are clear and engaging for your audience.</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* API Key Management Section */}
                        {!hasValidApiKey ? (
                            <Card className="mb-6">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Connect ElevenLabs</CardTitle>
                                    <CardDescription>
                                        You need to connect your ElevenLabs account to create voice profiles
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="api-key">ElevenLabs API Key</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="api-key"
                                                    type="password"
                                                    placeholder="Enter your ElevenLabs API key"
                                                    value={apiKeyInput}
                                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button 
                                                    onClick={verifyAndSaveApiKey}
                                                    disabled={isVerifyingApiKey || !apiKeyInput.trim()}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {isVerifyingApiKey ? (
                                                        <>
                                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                            Verifying...
                                                        </>
                                                    ) : 'Connect'}
                                                </Button>
                                            </div>
                                            {/* Error notice */}
                                            <div className="text-xs text-amber-600 mt-1 bg-amber-50 border border-amber-200 rounded p-2">
                                                <p className="font-medium">Important:</p>
                                                <p>Make sure your ElevenLabs account is active with a valid API key. If you see database errors, please refresh the page and try again.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-4 rounded-md">
                                            <h4 className="font-medium text-sm mb-2">How to get your API key:</h4>
                                            <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-5">
                                                <li>Sign in to your <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ElevenLabs account</a></li>
                                                <li>Go to your Profile Settings</li>
                                                <li>Find the API Key section</li>
                                                <li>Copy your API key and paste it above</li>
                                            </ol>
                                            <p className="mt-3 text-sm text-gray-600">
                                                Don't have an account? <a href="https://try.elevenlabs.io/onhhrbwvo8mj" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sign up for ElevenLabs</a>
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex justify-end mb-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setApiKeyInput('');
                                        setHasValidApiKey(false);
                                        setOrganizationApiKey('');
                                    }}
                                    className="text-xs h-8"
                                >
                                    <KeyIcon className="h-3 w-3 mr-1.5" />
                                    Update API Key
                                </Button>
                            </div>
                        )}

                        {/* Voice Profiles List */}
                        <div className="space-y-4 sm:space-y-5">
                            {loadingVoices ? (
                                <div className="flex justify-center items-center py-16">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-4 text-gray-500 font-medium">Loading voice profiles...</p>
                                    </div>
                                </div>
                            ) : voices.length === 0 ? (
                                <Card className="text-center py-16 border-dashed">
                                    <CardContent className="pt-6">
                                        <div className="mx-auto rounded-full w-16 h-16 flex items-center justify-center bg-gray-100">
                                            <Mic className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">No voice profiles yet</h3>
                                        <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                                            {hasValidApiKey 
                                                ? "Browse through available ElevenLabs voices, test them, and save your favorites as voice profiles."
                                                : "Connect your ElevenLabs account to start creating voice profiles."}
                                        </p>
                                        {hasValidApiKey && (
                                            <Button
                                                onClick={() => {
                                                    setEditingVoice(null);
                                                    setNewVoice({ name: '', description: '', voiceId: '', settings: { stability: 0.30, clarity: 0.75 } });
                                                    fetchAvailableVoices();
                                                    setShowVoiceDialog(true);
                                                }}
                                                className="mt-6 bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Voice Profile
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {voices.map(voice => (
                                        <Card key={voice.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2 p-4 sm:p-6">
                                                <CardTitle className="text-lg">{voice.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-2 px-4 sm:px-6">
                                                {voice.description ? (
                                                    <p className="text-sm text-gray-600 leading-relaxed max-h-20 overflow-y-auto">{voice.description}</p>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No description provided</p>
                                                )}
                                                <div className="mt-4 space-y-1.5">
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>Stability:</span>
                                                        <span>{voice.settings?.stability || 0.3}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>Clarity:</span>
                                                        <span>{voice.settings?.clarity || 0.75}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="flex justify-between gap-2 p-4 sm:p-6 pt-3 border-t">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="h-9"
                                                    onClick={() => testVoice(voice.voice_id)}
                                                    disabled={isTestingVoice}
                                                >
                                                    {isTestingVoice ? (
                                                        <>
                                                            <div className="animate-spin mr-2 h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                                            Playing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <VolumeIcon className="h-3.5 w-3.5 mr-1.5" />
                                                            Test Voice
                                                        </>
                                                    )}
                                                </Button>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-9"
                                                        onClick={() => handleEditVoice(voice)}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1.5" />
                                                        Edit
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm"
                                                        className="h-9"
                                                        onClick={() => deleteVoice(voice.id, voice.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1.5" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
                
                {/* Connections Tab Content */}
                <TabsContent value="connections">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                            <div className="flex-1 max-w-full sm:max-w-xl">
                                <p className="text-sm text-gray-600">
                                    Connect your social media accounts to automatically publish content.
                                    Manage all your platform connections in one place.
                                </p>
                            </div>
                        </div>
                        
                        {/* Info card */}
                        <Card className="mb-8 bg-blue-50 border-blue-200">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-start">
                                    <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-900 mb-2">Connection Information</h4>
                                        <p className="text-sm text-blue-700 leading-relaxed">
                                            Connect your social media accounts to enable automatic posting. Your credentials are securely stored and can be revoked at any time. 
                                            We only request the minimum permissions needed to post content on your behalf.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Core Platforms Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <CheckCircle className="h-5 w-5 mr-2 text-emerald-500" /> 
                                Core Platforms
                            </h3>
                            
                            {/* Connections Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {/* ElevenLabs Connection Card */}
                                <Card className={`overflow-hidden hover:shadow-md transition-shadow ${hasValidApiKey ? 'bg-gray-50' : ''}`}>
                                    <CardHeader className="pb-2 p-4 sm:p-6">
                                        <CardTitle className="text-lg flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M14.334 9.75c.069 0 .136.011.201.033l2.5.834c.246.081.416.305.416.565v1.636c0 .26-.17.484-.416.565l-2.5.834a.624.624 0 0 1-.401 0l-2.5-.834a.624.624 0 0 1-.416-.565v-1.636c0-.26.17-.484.416-.565l2.5-.834a.625.625 0 0 1 .2-.033zM3.665 11.826c.068 0 .136.011.2.033l2.5.834c.246.082.417.305.417.565v1.636c0 .26-.17.484-.416.565l-2.5.834a.618.618 0 0 1-.401 0l-2.5-.834A.624.624 0 0 1 .55 14.894v-1.636c0-.26.17-.484.416-.565l2.5-.834a.625.625 0 0 1 .2-.033zm10.668-6.752c.069 0 .136.011.2.033l2.5.834c.247.082.417.306.417.566v1.636c0 .26-.17.483-.416.565l-2.5.834a.624.624 0 0 1-.401 0l-2.5-.834a.624.624 0 0 1-.416-.565V6.507c0-.26.17-.484.416-.566l2.5-.834a.625.625 0 0 1 .2-.033zm-5.335 3.376c.069 0 .136.011.2.033l2.5.834c.247.082.417.305.417.566v1.635c0 .26-.17.484-.416.566l-2.5.834a.625.625 0 0 1-.401 0l-2.5-.834a.624.624 0 0 1-.416-.566v-1.635c0-.26.17-.484.416-.566l2.5-.834a.625.625 0 0 1 .2-.033zm0 6.752c.069 0 .136.011.2.033l2.5.834c.247.082.417.305.417.566v1.635c0 .26-.17.484-.416.566l-2.5.834a.624.624 0 0 1-.401 0l-2.5-.834a.624.624 0 0 1-.416-.566v-1.635c0-.26.17-.484.416-.566l2.5-.834a.625.625 0 0 1 .2-.033zm5.335-3.376c.069 0 .136.011.2.033l2.5.834c.247.082.417.306.417.566v1.635c0 .26-.17.484-.416.566l-2.5.834a.624.624 0 0 1-.401 0l-2.5-.834a.624.624 0 0 1-.416-.566v-1.635c0-.26.17-.484.416-.566l2.5-.834a.625.625 0 0 1 .2-.033z"/>
                                            </svg>
                                            ElevenLabs
                                            {hasValidApiKey && (
                                                <span className="ml-2 flex items-center text-sm text-emerald-600">
                                                    <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" />
                                                    Connected
                                                </span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-2 px-4 sm:px-6">
                                        <p className="text-sm text-gray-600">
                                            {hasValidApiKey 
                                                ? "Your ElevenLabs account is connected and can be used for voice synthesis."
                                                : "Connect your ElevenLabs account to generate realistic voices for your podcast content."
                                            }
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2 p-4 sm:p-6 pt-3 border-t">
                                        {hasValidApiKey ? (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="h-9"
                                                onClick={() => {
                                                    setApiKeyInput('');
                                                    setHasValidApiKey(false);
                                                    setOrganizationApiKey('');
                                                }}
                                            >
                                                <KeyIcon className="h-3.5 w-3.5 mr-1.5" />
                                                Update API Key
                                            </Button>
                                        ) : (
                                            <Button 
                                                variant="default" 
                                                size="sm"
                                                className="h-9 bg-blue-600 hover:bg-blue-700"
                                                onClick={() => setActiveTab("spoken-voice")}
                                            >
                                                Connect Account
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                                
                                {/* LinkedIn Connection Card */}
                                <Card className={cn("overflow-hidden", linkedinConnected ? "border-green-200 bg-green-50" : "")}>
                                    <CardHeader className="pb-2 p-4 sm:p-6 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"/>
                                                </svg>
                                                <CardTitle className="text-lg">
                                                    LinkedIn
                                                </CardTitle>
                                            </div>
                                            {linkedinConnected && (
                                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                    Connected
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2 px-4 sm:px-6">
                                        <p className="text-sm text-gray-600">
                                            {linkedinConnected
                                                ? "Your LinkedIn company page is connected. You can post content to your company page."
                                                : "Connect your LinkedIn account to post professional updates to your company's LinkedIn account (you must be a LinkedIn page admin)"
                                            }
                                        </p>
                                        {linkedinConnected && (
                                            <p className="text-xs text-green-600 mt-1.5">
                                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                                Ready to publish posts to your organization's page
                                            </p>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-end pt-3 border-t">
                                        {linkedinLoading && !linkedinConnected && (
                                            <div className="mr-3 flex items-center text-gray-500">
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                                                <span className="text-sm">Processing...</span>
                                            </div>
                                        )}
                                        <Button 
                                            variant={linkedinConnected ? "outline" : "default"}
                                            size="sm"
                                            className={cn(
                                                "h-10 rounded-md",
                                                linkedinConnected
                                                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    : "bg-blue-600 hover:bg-blue-700"
                                            )}
                                            onClick={linkedinConnected ? handleDisconnectLinkedIn : handleConnectLinkedIn}
                                            disabled={linkedinLoading}
                                        >
                                            {linkedinConnected ? (
                                                linkedinLoading ? (
                                                    <>
                                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                                        <span>Disconnecting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4 mr-1.5" />
                                                        <span>Disconnect</span>
                                                    </>
                                                )
                                            ) : (
                                                linkedinLoading ? 'Connecting...' : 'Connect Account'
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                                
                                {/* X (Twitter) Connection Card */}
                                <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", twitterConnected ? "border-green-200 bg-green-50" : "")}>
                                    <CardHeader className="pb-2 p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-900" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                                                </svg>
                                                <CardTitle className="text-lg">
                                                    X (Twitter)
                                                </CardTitle>
                                            </div>
                                            {twitterConnected && (
                                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                    Connected
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2 px-4 sm:px-6">
                                        <p className="text-sm text-gray-600">
                                            {twitterConnected
                                                ? "Your Twitter account is connected. You can create and post text updates to your timeline."
                                                : "Connect your X (formerly Twitter) account to post tweets and threads to your timeline."
                                            }
                                        </p>
                                        {twitterConnected && (
                                            <p className="text-xs text-green-600 mt-1.5">
                                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                                Ready to publish posts to your timeline
                                            </p>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-end pt-3 border-t">
                                        {twitterLoading && !twitterConnected && (
                                            <div className="mr-3 flex items-center text-gray-500">
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                                                <span className="text-sm">Processing...</span>
                                            </div>
                                        )}
                                        <Button 
                                            variant={twitterConnected ? "outline" : "default"}
                                            size="sm"
                                            className={cn(
                                                "h-10 rounded-md",
                                                twitterConnected
                                                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    : "bg-blue-600 hover:bg-blue-700"
                                            )}
                                            onClick={twitterConnected ? handleDisconnectTwitter : handleConnectTwitter}
                                            disabled={twitterLoading}
                                        >
                                            {twitterConnected ? (
                                                twitterLoading ? (
                                                    <>
                                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                                        <span>Disconnecting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4 mr-1.5" />
                                                        <span>Disconnect</span>
                                                    </>
                                                )
                                            ) : (
                                                twitterLoading ? 'Connecting...' : 'Connect Account'
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                                
                                {/* BuzzSprout Connection Card */}
                                <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", buzzsproutConnected ? "border-green-200 bg-green-50" : "")}>
                                    <CardHeader className="pb-2 p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M19.3 5.3C18.5 4.5 17.4 4 16.2 4c-1.2 0-2.3 0.4-3.1 1.3C12.3 6 11.8 7 11.8 8.2c0 1.8 0.9 3.4 2.5 4.3 v1.5c0 0.8-0.7 1.5-1.5 1.5H7.5c-0.8 0-1.5-0.7-1.5-1.5V5.5C6 4.7 5.3 4 4.5 4S3 4.7 3 5.5v16c0 0.8 0.7 1.5 1.5 1.5h10c2.8 0 5-2.2 5-5v-8.1C20.9 8.8 20.1 6.9 19.3 5.3zM16.2 11c-0.4 0-0.7-0.1-1-0.3 -0.7-0.4-1.2-1.2-1.2-2 0-0.4 0.1-0.7 0.3-1 0.4-0.7 1.2-1.2 2-1.2 0.4 0 0.7 0.1 1 0.3 0.7 0.4 1.2 1.2 1.2 2 0 0.4-0.1 0.7-0.3 1C17.8 10.6 17 11 16.2 11z" />
                                                </svg>
                                                <CardTitle className="text-lg">
                                                    BuzzSprout
                                                </CardTitle>
                                            </div>
                                            {buzzsproutConnected && (
                                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                    Connected
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2 px-4 sm:px-6">
                                        <p className="text-sm text-gray-600">
                                            Connect to BuzzSprout to publish podcast episodes directly from your content.
                                        </p>
                                        {buzzsproutConnected && (
                                            <p className="text-xs text-green-600 mt-1.5">
                                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                                Connected to: {buzzsproutPodcastName}
                                            </p>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-end pt-3 border-t">
                                        <Button 
                                            variant={buzzsproutConnected ? "outline" : "default"}
                                            size="sm"
                                            className={cn(
                                                "h-9 rounded-md",
                                                buzzsproutConnected
                                                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    : "bg-blue-600 hover:bg-blue-700"
                                            )}
                                            onClick={
                                                buzzsproutConnected ? 
                                                handleDisconnectBuzzsprout : 
                                                handleBuzzsproutConnection
                                            }
                                            disabled={buzzsproutLoading}
                                        >
                                            {buzzsproutConnected ? (
                                                buzzsproutLoading ? (
                                                    <>
                                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                                        <span>Disconnecting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4 mr-1.5" />
                                                        <span>Disconnect</span>
                                                    </>
                                                )
                                            ) : (
                                                buzzsproutLoading ? (
                                                    <>
                                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                        <span>Connecting...</span>
                                                    </>
                                                ) : 'Connect Account'
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                        
                        {/* More Connections Button and Expandable Sections */}
                        <div className="mt-8">
                            <Collapsible>
                                <div className="flex justify-center mb-6">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto">
                                            <ChevronDown className="h-4 w-4 mr-2" />
                                            More Connections
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>
                                
                                <CollapsibleContent>
                                    {/* Content & Collaboration Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <Edit className="h-5 w-5 mr-2 text-blue-500" /> 
                                            Content & Collaboration
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {/* Google Docs Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
                                                            <path fill="#4285F4" d="M14 9h5.5L14 3.5V9z"/>
                                                            <path fill="#4285F4" d="M14 9h5.5L14 3.5V9z"/>
                                                            <path fill="#4285F4" d="M13 9V3.5L8.5 8L13 9z"/>
                                                            <path fill="#FBBC05" d="M8.5 8L3.5 13H8L8.5 8z"/>
                                                            <path fill="#34A853" d="M8 13h10.5L14 17.5L8 13z"/>
                                                            <path fill="#EA4335" d="M13 9l1 8.5l-5.5 4.5L13 9z"/>
                                                            <path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                                                        </svg>
                                                        Google Docs
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Google Docs to import and collaborate on document content.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Google Sheets Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                                        </svg>
                                                        Google Sheets
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Google Sheets to sync data and manage structured information.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Airtable Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M11.55 21H3q-.825 0-1.413-.588T1 19V5q0-.825.588-1.413T3 3h18q.825 0 1.413.588T23 5v14q0 .825-.588 1.413T21 21h-5.45l-2 2l-2-2Zm3.95-2v-7.4l-2.68 4.48c-.15.22-.38.34-.61.34c-.23 0-.46-.12-.6-.34L9 11.63l-5 3.07v1.8c0 .414.336.75.75.75h10.75ZM4 13.8l5.5-3.35c.15-.1.3-.1.45.0l2.5 1.7l2.95-4.9c.05-.1.2-.15.35-.15s.3.1.35.15l2.9 4.9V5.5c0-.414-.336-.75-.75-.75H4.75c-.414 0-.75.336-.75.75v8.3Z"/>
                                                        </svg>
                                                        Airtable
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Airtable to organize and manage content in flexible databases.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    </div>
                                    
                                    {/* Scheduling Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <CalendarIcon className="h-5 w-5 mr-2 text-indigo-500" /> 
                                            Scheduling
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {/* Google Calendar Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                                                        </svg>
                                                        Google Calendar
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Google Calendar to schedule and manage your content calendar.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Calendly Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 1.5A10.5 10.5 0 1 0 22.5 12A10.5 10.5 0 0 0 12 1.5ZM9.5 16.5V7.5l7 4.5Z"/>
                                                        </svg>
                                                        Calendly
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Calendly to streamline meeting scheduling and appointments.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    </div>
                                    
                                    {/* Email & CRM Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <MailIcon className="h-5 w-5 mr-2 text-red-500" /> 
                                            Email & CRM
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {/* Mailchimp Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M5.33 19.02c-.51 0-1.13-.36-1.44-1c-.36-.73-.2-1.55.42-1.97c.06-.04.12-.08.18-.12c0-.03-.01-.05-.01-.08c-.1-.59.2-1.22.69-1.35c0-.09 0-.18.02-.26c.13-.67.5-.94.94-.94c.29 0 .59.12.86.35l.25.21c.24-.27.5-.5.77-.69a.18.18 0 0 0 .07-.11c.07-.45.14-.84.48-1.13c.57-.48 1.39-.45 1.88.07c.59-.57 1.31-1 2.09-1.25c.05-.79.5-1.24 1.09-1.24c.37 0 .79.17 1.21.49c.28-.5.74-.82 1.27-.82c.91 0 1.63.94 1.57 2.05c.09-.03.19-.05.29-.05c.77 0 1.37.76 1.37 1.69c0 .12-.01.25-.04.37c.11.03.22.08.33.15c.82.52.98 1.62.31 2.32l-.08.09c.35.29.57.73.57 1.22c0 .65-.39 1.23-.95 1.45c.2.27.31.61.31.97c0 .86-.66 1.55-1.46 1.55c-.49 0-.95-.28-1.2-.73h-3.48c-.05.26-.18.49-.37.67c.14.21.23.46.23.74c0 .32-.12.61-.31.84c.19.23.31.52.31.84c0 .74-.59 1.34-1.32 1.34h-.27c-.26.55-.8.92-1.43.92c-.87 0-1.58-.72-1.58-1.61c0-.08 0-.16.01-.24h-1.71c-.09.01-.17.01-.26.01c-.74 0-1.37-.56-1.37-1.21c0-.56.1-1.05.3-1.45h-2.06Z"/>
                                                        </svg>
                                                        Mailchimp
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Mailchimp to manage email campaigns and marketing automation.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* HubSpot Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M19.25 15.38v-2.345h2.346v-2.19H19.25V8.5h-2.19v2.345H14.5v2.19h2.56v2.345h2.19zm-9.75-6.9v3.436h2.97c-.136 1.284-1.148 2.214-2.97 2.214c-1.773 0-3.25-1.47-3.25-3.25S7.727 7.63 9.5 7.63c.97 0 1.84.43 2.42 1.09l2.48-2.48C13.12 4.86 11.43 4 9.5 4C5.92 4 3 6.92 3 10.5s2.92 6.5 6.5 6.5c3.78 0 6.302-2.66 6.302-6.396c0-.41-.036-.796-.098-1.174H9.5v.05z"/>
                                                        </svg>
                                                        HubSpot
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect HubSpot to manage customer relationships and marketing campaigns.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Brevo Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M11.55 12.082c.273.182.627.182.9 0L22 5.716V5.5c0-1.24-1.01-2.25-2.25-2.25H4.25C3.01 3.25 2 4.26 2 5.5v.197l9.55 6.385z"/>
                                                            <path fill="currentColor" d="M13.26 13.295a3.003 3.003 0 0 1-2.52 0L2 7.452v11.67c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V7.47l-8.74 5.823z"/>
                                                        </svg>
                                                        Brevo (SendinBlue)
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Brevo to design and send automated email campaigns.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end gap-2 p-4 sm:p-6 pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        className="h-9 bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        Connect Account
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Gmail Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                                            <path fill="#EA4335" d="M5.526 4h14.06c.94 0 1.65.79 1.65 1.722v3.309l-8.78 5.792l-8.78-5.792V5.722C3.676 4.79 4.476 4 5.526 4z"/>
                                                            <path fill="#FBBC04" d="M21.236 9.031v9.297c0 .84-.82 1.672-1.65 1.672h-1.672v-7.166l-6.669 4.073l-6.669-4.073v7.166H3.676c-.83 0-1.65-.832-1.65-1.672V9.031l8.78 5.8z"/>
                                                            <path fill="#34A853" d="M19.586 20h-3.322v-7.166l-6.669 4.073l-6.669-4.073V20H2.026V5.722C2.026 4.79 2.826 4 3.876 4h16.46c1.05 0 1.85.79 1.85 1.722V20z"/>
                                                            <path fill="#4285F4" d="M3.767 4h16.466c1.05 0 1.85.79 1.85 1.722v3.309l-8.78 5.792l-8.78-5.792V5.722c0-.7.06-1.376.83-1.626L3.767 4z"/>
                                                        </svg>
                                                        Gmail
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect your Gmail account to send emails and manage communications.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end gap-2 p-4 sm:p-6 pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        className="h-9 bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        Connect Account
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    </div>
                                    
                                    {/* AI & Automation Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <Bot className="h-5 w-5 mr-2 text-green-500" /> 
                                            AI & Automation
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {/* OpenAI (GPT-4) Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 3a9 9.005 0 0 1 7.763 13.568l-1.71-1.71c-.2-.2-.5-.29-.79-.29H17v-1.19c0-.45-.54-.67-.85-.35L14.2 15.02a2.037 2.037 0 0 0-.73 1.56v.03a2 2 0 0 0 3.35 1.46l.27-.27h.73c.69 0 1.35-.28 1.83-.76l.55-.55A9 9 0 1 1 3 12a9 9 0 0 1 9-9zm1 7h-2v3H8v2h3v3h2v-3h3v-2h-3v-3z"/>
                                                        </svg>
                                                        OpenAI (GPT-4)
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect OpenAI to generate content and automate creative workflows.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Google Gemini Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 11.6H6v3.8h6v-3.8zm0-5.8H6v3.8h6V5.8zM18 11.6h-4v3.8h4v-3.8zm0-5.8h-4v3.8h4V5.8zM12 17.4H6v3.8h6v-3.8zm6 0h-4v3.8h4v-3.8z"/>
                                                        </svg>
                                                        Google Gemini
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Google Gemini to use multimodal AI for content creation.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Anthropic Claude Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 3a9 9.005 0 0 1 7.763 13.568l-1.71-1.71c-.2-.2-.5-.29-.79-.29H17v-1.19c0-.45-.54-.67-.85-.35L14.2 15.02a2.037 2.037 0 0 0-.73 1.56v.03a2 2 0 0 0 3.35 1.46l.27-.27h.73c.69 0 1.35-.28 1.83-.76l.55-.55A9 9 0 1 1 3 12a9 9 0 0 1 9-9zm1 7h-2v3H8v2h3v3h2v-3h3v-2h-3v-3z"/>
                                                        </svg>
                                                        Anthropic Claude
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Claude for AI content generation and summarization.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* DeepSeek Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2zm0 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16zm0 3a5 5 0 1 1-5 5a5 5 0 0 1 5-5z"/>
                                                        </svg>
                                                        DeepSeek
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect DeepSeek to leverage advanced AI models for content creation.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Meta LLaMA Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2zm0 2.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15zm-2 3.75a.76.76 0 0 1 .75.75a.76.76 0 0 1-.75.75a.76.76 0 0 1-.75-.75a.76.76 0 0 1 .75-.75zm4 0a.76.76 0 0 1 .75.75a.76.76 0 0 1-.75.75a.76.76 0 0 1-.75-.75a.76.76 0 0 1 .75-.75zm-6.14 4.85a.54.54 0 0 1 .28-.03c.14.03.36.11.58.45c.34.52.86 1.15 1.62 1.69c.9.64 2.33 1.33 4.66 1.33s3.76-.69 4.66-1.33c.76-.54 1.28-1.17 1.62-1.69c.22-.34.44-.42.58-.45a.54.54 0 0 1 .28.03c.11.04.2.11.27.2a.478.478 0 0 1 .15.3c.01.13-.03.24-.11.35c-.48.7-1.17 1.5-2.17 2.18c-1.15.82-2.83 1.59-5.28 1.59s-4.13-.77-5.28-1.59c-1-.68-1.69-1.48-2.17-2.18a.609.609 0 0 1-.11-.35c.01-.11.06-.22.15-.3c.07-.09.16-.16.27-.2z"/>
                                                        </svg>
                                                        Meta LLaMA
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Meta LLaMA for open-source AI capabilities and custom models.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                            
                                            {/* Zapier Card */}
                                            <Card className="overflow-hidden hover:shadow-md transition-shadow bg-gray-100 opacity-75">
                                                <CardHeader className="pb-2 p-4 sm:p-6">
                                                    <CardTitle className="text-lg flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" viewBox="0 0 24 24">
                                                            <path fill="currentColor" d="M12 0C5.63 0 0 5.67 0 12s5.63 12 12 12c6.41 0 12-5.67 12-12S18.41 0 12 0zm0 4a2.25 2.25 0 1 1 0 4.5A2.25 2.25 0 0 1 12 4zm4.5 5.25a2.25 2.25 0 1 1 0 4.5a2.25 2.25 0 0 1 0-4.5zm-9 0a2.25 2.25 0 1 1 0 4.5a2.25 2.25 0 0 1 0-4.5zm4.5 5.25a2.25 2.25 0 1 1 0 4.5a2.25 2.25 0 0 1 0-4.5z"/>
                                                        </svg>
                                                        Zapier
                                                        <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200">Coming Soon</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pb-2 px-4 sm:px-6">
                                                    <p className="text-sm text-gray-600">
                                                        Connect Zapier to automate workflows between your favorite apps.
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="flex justify-end pt-3 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm"
                                                        disabled={true}
                                                        className="h-9 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                                    >
                                                        Coming Soon
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            
            {/* Tone of Voice Dialog */}
            <Dialog open={showToneDialog} onOpenChange={setShowToneDialog}>
                <DialogContent className="sm:max-w-md max-w-[95%] w-full rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editingTone ? 'Edit Tone of Voice' : 'Add Tone of Voice'}</DialogTitle>
                        <DialogDescription className="text-gray-600 pt-1.5">
                            {editingTone 
                                ? 'Modify this tone of voice for your social media posts.' 
                                : 'Create a new tone of voice for your social media posts.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2.5">
                            <Label htmlFor="name" className="text-base">Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                placeholder="e.g., Professional, Casual, Energetic"
                                value={newTone.name}
                                onChange={(e) => setNewTone({...newTone, name: e.target.value})}
                                className="h-10"
                            />
                        </div>
                        
                        {!editingTone && (
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="shortDescription" className="text-base">
                                        Short Description for AI
                                        <span className="ml-1.5 text-xs text-gray-500 font-normal">(optional)</span>
                                    </Label>
                                </div>
                                <Input
                                    id="shortDescription"
                                    placeholder="e.g., Professional but friendly, for financial content"
                                    value={newTone.shortDescription}
                                    onChange={(e) => setNewTone({...newTone, shortDescription: e.target.value})}
                                    className="h-10"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This helps guide the AI in generating a more accurate tone description
                                </p>
                            </div>
                        )}
                        
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="description" className="flex items-center gap-1 text-base">
                                    Full Description
                                    <span className="text-xs text-gray-500 font-normal">(recommended)</span>
                                </Label>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={generateToneWithAI}
                                    disabled={isGeneratingAI || !newTone.name.trim()}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
                                </Button>
                            </div>
                            <Textarea
                                id="description"
                                placeholder="Describe the tone in detail for best results..."
                                value={newTone.description}
                                onChange={(e) => setNewTone({...newTone, description: e.target.value})}
                                rows={5}
                                className="min-h-[120px] text-base"
                            />
                            {isGeneratingAI && (
                                <div className="flex items-center justify-center py-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                                    <span className="text-sm text-gray-600">AI is generating your tone description...</span>
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1.5">
                                Include style, formality level, and specific language patterns
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowToneDialog(false)}
                            className="w-full sm:w-auto h-10"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            onClick={saveTone} 
                            className="w-full sm:w-auto h-10 bg-blue-600 hover:bg-blue-700"
                        >
                            {editingTone ? 'Save Changes' : 'Create Tone'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Voice Profile Dialog */}
            <Dialog open={showVoiceDialog} onOpenChange={setShowVoiceDialog}>
                <DialogContent className="sm:max-w-md max-w-[95%] w-full rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editingVoice ? 'Edit Voice Profile' : 'Add Voice Profile'}</DialogTitle>
                        <DialogDescription className="text-gray-600 pt-1.5">
                            {editingVoice 
                                ? 'Modify this voice profile for your podcasts.' 
                                : 'Create a new voice profile for your podcast content.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2.5">
                            <Label htmlFor="voice-name" className="text-base">Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="voice-name"
                                placeholder="e.g., Professional Male, Friendly Female"
                                value={newVoice.name}
                                onChange={(e) => setNewVoice({...newVoice, name: e.target.value})}
                                className="h-10"
                            />
                        </div>
                        
                        <div className="space-y-2.5">
                            <Label htmlFor="voice-description" className="text-base">Description</Label>
                            <Textarea
                                id="voice-description"
                                placeholder="Describe how this voice sounds and when to use it..."
                                value={newVoice.description}
                                onChange={(e) => setNewVoice({...newVoice, description: e.target.value})}
                                rows={3}
                                className="min-h-[80px] text-base"
                            />
                        </div>
                        
                        <div className="space-y-2.5">
                            <Label htmlFor="voice-id" className="text-base">ElevenLabs Voice <span className="text-red-500">*</span></Label>
                            {fetchingAvailableVoices ? (
                                <div className="flex items-center gap-2 py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <p className="text-sm text-gray-600">Loading available voices...</p>
                                </div>
                            ) : availableVoices.length > 0 ? (
                                <div className="space-y-2">
                                    <select
                                        id="voice-select"
                                        value={newVoice.voiceId}
                                        onChange={(e) => handleVoiceSelection(e.target.value)}
                                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select a voice --</option>
                                        {availableVoices.map(voice => (
                                            <option key={voice.voice_id} value={voice.voice_id}>
                                                {voice.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex justify-between">
                                        <p className="text-xs text-gray-500">
                                            Select from the available ElevenLabs voices
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mt-1"
                                            onClick={() => window.open('https://elevenlabs.io/voice-library', '_blank')}
                                        >
                                            Browse more voices
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        id="voice-id"
                                        placeholder="Enter ElevenLabs Voice ID"
                                        value={newVoice.voiceId}
                                        onChange={(e) => setNewVoice({...newVoice, voiceId: e.target.value})}
                                        className="h-10 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 whitespace-nowrap"
                                        onClick={() => fetchAvailableVoices()}
                                    >
                                        Load Voices
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-base">Voice Settings</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => testVoice()}
                                    disabled={isTestingVoice || !newVoice.voiceId}
                                    className="h-8 text-xs flex items-center gap-1.5"
                                >
                                    {isTestingVoice ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                            Playing...
                                        </>
                                    ) : (
                                        <>
                                            <VolumeIcon className="h-3.5 w-3.5" />
                                            Test Voice
                                        </>
                                    )}
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Test phrase input */}
                                <div className="space-y-2">
                                    <Label htmlFor="test-phrase" className="text-sm">Test Phrase</Label>
                                    <Textarea
                                        id="test-phrase"
                                        placeholder="Enter a phrase to test the voice"
                                        value={testPhrase}
                                        onChange={(e) => setTestPhrase(e.target.value)}
                                        className="min-h-[60px] text-sm"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="stability" className="text-sm">Stability: <span className="text-gray-500">{newVoice.settings.stability.toFixed(2)}</span></Label>
                                    <Input
                                        id="stability"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={newVoice.settings.stability}
                                        onChange={(e) => setNewVoice({
                                            ...newVoice,
                                            settings: {
                                                ...newVoice.settings,
                                                stability: parseFloat(e.target.value)
                                            }
                                        })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500">Lower values allow more variation in the voice</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="clarity" className="text-sm">Clarity: <span className="text-gray-500">{newVoice.settings.clarity.toFixed(2)}</span></Label>
                                    <Input
                                        id="clarity"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={newVoice.settings.clarity}
                                        onChange={(e) => setNewVoice({
                                            ...newVoice,
                                            settings: {
                                                ...newVoice.settings,
                                                clarity: parseFloat(e.target.value)
                                            }
                                        })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500">Higher values increase clarity and reduce artifacts</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowVoiceDialog(false)}
                            className="w-full sm:w-auto h-10"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            onClick={saveVoice}
                            className="w-full sm:w-auto h-10 bg-blue-600 hover:bg-blue-700"
                        >
                            {editingVoice ? 'Save Changes' : 'Create Voice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* BuzzSprout Dialog */}
            {user?.organization_id && (
                <BuzzsproutDialog
                    isOpen={showBuzzsproutDialog}
                    onClose={() => setShowBuzzsproutDialog(false)}
                    onConnect={(details) => {
                        console.log('BuzzSprout connected:', details);
                        setBuzzsproutConnected(true);
                        setBuzzsproutPodcastName(details.podcastName);
                        setConnectionStatuses(prev => ({ ...prev, buzzsprout: true }));
                        
                        // Ensure the dialog is closed after connection
                        setShowBuzzsproutDialog(false);
                        
                        // Show success toast
                        toast({
                            title: "BuzzSprout Connected",
                            description: `Successfully connected to "${details.podcastName}" podcast.`,
                            variant: "default"
                        });
                    }}
                    organizationId={user.organization_id}
                    isConnected={buzzsproutConnected}
                    podcastName={buzzsproutPodcastName}
                    onDisconnect={() => {
                        handleDisconnectBuzzsprout();
                        // Close the dialog
                        setShowBuzzsproutDialog(false);
                    }}
                />
            )}
        </div>
    );
} 