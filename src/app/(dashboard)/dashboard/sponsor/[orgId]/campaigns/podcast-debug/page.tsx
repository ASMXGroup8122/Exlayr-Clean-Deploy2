'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { use } from 'react';
import { toast } from '@/components/ui/use-toast';

interface DebugPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default function PodcastDebugPage({ params }: DebugPageProps) {
  // Unwrap the params promise using React.use()
  const { orgId } = use(params);
  
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [podcastId, setPodcastId] = useState<string>('');
  const [checkingPodcast, setCheckingPodcast] = useState(false);
  
  const fetchDebugData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/podcast/debug?organizationId=${orgId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const data = await response.json();
      setDebugData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug data');
      console.error('Debug fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check URL params for podcastId
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const idFromParams = searchParams.get('podcastId');
    if (idFromParams) {
      setPodcastId(idFromParams);
      checkPodcastStatus(idFromParams);
    }
  }, []);
  
  // Fetch on component mount
  useEffect(() => {
    fetchDebugData();
  }, [orgId]);
  
  // Function to check a specific podcast status
  const checkPodcastStatus = async (id: string) => {
    if (!id) return;
    
    setCheckingPodcast(true);
    
    try {
      // First get the podcast details
      const detailsResponse = await fetch(`/api/podcast/generate-audio?id=${id}`);
      if (!detailsResponse.ok) {
        throw new Error(`Failed to fetch podcast details: ${detailsResponse.status}`);
      }
      
      const detailsData = await detailsResponse.json();
      if (!detailsData.data) {
        throw new Error('No podcast data found');
      }
      
      console.log('Podcast details:', detailsData.data);
      
      // If there's a project ID and status is processing, check status
      if (detailsData.data.elevenlabs_project_id && detailsData.data.status === 'processing') {
        const statusResponse = await fetch('/api/podcast/check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recordId: id,
            organizationId: orgId
          })
        });
        
        if (!statusResponse.ok) {
          throw new Error(`Failed to check podcast status: ${statusResponse.status}`);
        }
        
        const statusData = await statusResponse.json();
        console.log('Status check result:', statusData);
        
        toast({
          title: 'Podcast Status',
          description: `Status: ${statusData.status}, Progress: ${(statusData.progress || 0) * 100}%${statusData.audioUrl ? ', Audio URL available.' : ''}`,
        });
        
        // Refresh the debug data to show updated status
        fetchDebugData();
      } else {
        toast({
          title: 'Podcast Status',
          description: `Status: ${detailsData.data.status}${detailsData.data.audio_url ? ', Audio URL available.' : ''}`,
        });
      }
    } catch (err) {
      console.error('Error checking podcast status:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to check podcast status',
        variant: 'destructive'
      });
    } finally {
      setCheckingPodcast(false);
    }
  };
  
  // Function to force check all processing podcasts
  const checkAllProcessingPodcasts = async () => {
    if (!debugData?.recentPodcasts) return;
    
    // Filter to processing podcasts with project IDs
    const processingPodcasts = debugData.recentPodcasts.filter(
      (podcast: any) => podcast.status === 'processing' && podcast.elevenlabs_project_id
    );
    
    if (processingPodcasts.length === 0) {
      toast({
        title: 'No Processing Podcasts',
        description: 'There are no processing podcasts with project IDs to check.',
      });
      return;
    }
    
    setCheckingPodcast(true);
    
    let updatedCount = 0;
    let failedCount = 0;
    
    try {
      toast({
        title: 'Checking Podcasts',
        description: `Checking ${processingPodcasts.length} processing podcasts...`,
      });
      
      for (const podcast of processingPodcasts) {
        try {
          const response = await fetch('/api/podcast/check-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recordId: podcast.id,
              organizationId: orgId
            })
          });
          
          if (!response.ok) {
            console.error(`Failed to check podcast ${podcast.id}: ${response.status}`);
            failedCount++;
            continue;
          }
          
          const data = await response.json();
          
          if (data.status !== 'processing') {
            updatedCount++;
          }
        } catch (err) {
          console.error(`Error checking podcast ${podcast.id}:`, err);
          failedCount++;
        }
      }
      
      // Refresh data to show updated statuses
      await fetchDebugData();
      
      toast({
        title: 'Status Check Complete',
        description: `Updated: ${updatedCount}, Failed: ${failedCount}, Total: ${processingPodcasts.length}`,
      });
    } catch (err) {
      console.error('Error checking podcasts:', err);
      toast({
        title: 'Error',
        description: 'Failed to check podcast statuses',
        variant: 'destructive'
      });
    } finally {
      setCheckingPodcast(false);
    }
  };
  
  // Function to retrieve audio from ElevenLabs history
  const retrieveFromHistory = async (podcastId: string) => {
    if (!podcastId) return;
    
    setCheckingPodcast(true);
    
    try {
      const response = await fetch('/api/podcast/retrieve-from-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          podcastId,
          organizationId: orgId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }
      
      toast({
        title: 'Success',
        description: `Retrieved audio URL: ${data.audioUrl.substring(0, 30)}...`,
      });
      
      // Refresh the debug data
      await fetchDebugData();
    } catch (err) {
      console.error('Error retrieving from history:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to retrieve audio from history',
        variant: 'destructive'
      });
    } finally {
      setCheckingPodcast(false);
    }
  };
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Podcast Feature Debug</h1>
        <Button onClick={fetchDebugData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      
      {/* Podcast ID check form */}
      <Card className="mb-6">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg text-blue-700">
            Check Specific Podcast
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-grow">
              <Label htmlFor="podcastId" className="mb-2 block">Podcast ID</Label>
              <Input 
                id="podcastId" 
                value={podcastId} 
                onChange={(e) => setPodcastId(e.target.value)} 
                placeholder="Enter podcast ID to check status"
              />
            </div>
            <Button 
              onClick={() => checkPodcastStatus(podcastId)} 
              disabled={!podcastId || checkingPodcast}
            >
              {checkingPodcast ? 'Checking...' : 'Check Status'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {isLoading && !debugData && (
        <div className="p-10 flex justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {debugData && (
        <div className="space-y-6">
          {/* Configuration Card */}
          <Card>
            <CardHeader className={debugData.configuration.hasElevenLabsApiKey ? "bg-green-50" : "bg-red-50"}>
              <CardTitle className={`text-lg ${debugData.configuration.hasElevenLabsApiKey ? "text-green-700" : "text-red-700"}`}>
                ElevenLabs Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">API Key Configured</span>
                  <span className={debugData.configuration.hasElevenLabsApiKey ? "text-green-600" : "text-red-600"}>
                    {debugData.configuration.hasElevenLabsApiKey ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Voice Count</span>
                  <span>{debugData.configuration.voiceCount}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Storage Access</span>
                  <span className={debugData.configuration.storageAccessible ? "text-green-600" : "text-red-600"}>
                    {debugData.configuration.storageAccessible ? "Yes" : "No"}
                  </span>
                </div>
                {!debugData.configuration.hasElevenLabsApiKey && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                    <strong>Missing API Key:</strong> ElevenLabs API key not found. This should be configured in either oauth_tokens (preferred) or organization_settings.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Database Card */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg text-blue-700">
                Database Tables
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">podcast_audio_generations</span>
                  <span className={debugData.database.podcast_audio_generations.accessible ? "text-green-600" : "text-red-600"}>
                    {debugData.database.podcast_audio_generations.accessible ? "Accessible" : "Not Accessible"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">spoken_voice</span>
                  <span className={debugData.database.spoken_voice.accessible ? "text-green-600" : "text-red-600"}>
                    {debugData.database.spoken_voice.accessible ? "Accessible" : "Not Accessible"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Podcast Records Count</span>
                  <span>{debugData.database.podcast_audio_generations.recordCount}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Voice Records Count</span>
                  <span>{debugData.database.spoken_voice.recordCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* OAuth Tokens Card */}
          <Card>
            <CardHeader className={debugData.configuration.hasApiKeyInOauth ? "bg-green-50" : "bg-yellow-50"}>
              <CardTitle className={`text-lg ${debugData.configuration.hasApiKeyInOauth ? "text-green-700" : "text-yellow-700"}`}>
                OAuth Tokens Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">ElevenLabs OAuth Token</span>
                  <span className={debugData.configuration.hasApiKeyInOauth ? "text-green-600" : "text-red-600"}>
                    {debugData.configuration.hasApiKeyInOauth ? "Found" : "Not Found"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Organization Settings API Key</span>
                  <span className={debugData.configuration.hasApiKeyInSettings ? "text-green-600" : "text-red-600"}>
                    {debugData.configuration.hasApiKeyInSettings ? "Found" : "Not Found"}
                  </span>
                </div>
                
                {debugData.database.oauth_tokens.tokens && debugData.database.oauth_tokens.tokens.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Available OAuth Tokens:</h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                      <ul className="space-y-2">
                        {debugData.database.oauth_tokens.tokens.map((token: any) => (
                          <li key={token.id} className={`p-2 rounded ${token.provider === 'elevenlabs' ? 'bg-green-50' : ''}`}>
                            <span className="font-medium">{token.provider}</span>
                            {token.provider_account_name && (
                              <span className="text-gray-600 ml-2">({token.provider_account_name})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-sm rounded-md">
                    <strong>No OAuth Tokens:</strong> No OAuth tokens found for this organization.
                  </div>
                )}
                
                {!debugData.configuration.hasApiKeyInOauth && !debugData.configuration.hasApiKeyInSettings && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                    <strong>Missing API Key:</strong> Please connect your ElevenLabs account in the Knowledge Vault section to generate a token in oauth_tokens.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Organization Settings Card */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg text-blue-700">
                Organization Settings Records
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Current Organization ID</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{orgId}</code>
                </div>
                
                {debugData.database.organization_settings?.records && 
                 debugData.database.organization_settings.records.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Available Organization Settings:</h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                      <ul className="space-y-2">
                        {debugData.database.organization_settings.records.map((setting: any, index: number) => (
                          <li key={index} className={`p-2 rounded ${setting.organization_id === orgId ? 'bg-green-50 border border-green-200' : ''}`}>
                            <div className="flex flex-col">
                              <span className="font-medium mb-1">Organization ID:</span>
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{setting.organization_id}</code>
                              <div className="mt-2 flex items-center">
                                <span className="mr-2">Has ElevenLabs API Key:</span>
                                <span className={setting.has_key ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  {setting.has_key ? "Yes" : "No"}
                                </span>
                              </div>
                              <div className="mt-1">
                                <span className={setting.organization_id === orgId ? "text-green-600 font-medium" : "text-gray-500"}>
                                  {setting.organization_id === orgId ? "← This is your current organization" : ""}
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-sm rounded-md">
                    <strong>No Settings Records:</strong> No organization_settings records found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Podcasts Card */}
          <Card>
            <CardHeader className="bg-purple-50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-purple-700">
                Recent Podcasts ({debugData.recentPodcasts.length})
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={checkAllProcessingPodcasts}
                disabled={checkingPodcast || !debugData.recentPodcasts.some((p: any) => p.status === 'processing' && p.elevenlabs_project_id)}
              >
                {checkingPodcast ? 'Checking...' : 'Force Check All Processing'}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {debugData.recentPodcasts.length === 0 ? (
                <p className="text-gray-500 italic">No podcast records found</p>
              ) : (
                <div className="space-y-4">
                  {debugData.recentPodcasts.map((podcast: any) => (
                    <div key={podcast.id} className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">{podcast.title || 'Untitled'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          podcast.status === 'completed' ? 'bg-green-100 text-green-800' :
                          podcast.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {podcast.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        <p>Format: {podcast.format}</p>
                        <p>Created: {new Date(podcast.created_at).toLocaleString()}</p>
                        <p>ID: <code className="bg-gray-100 px-1 rounded text-xs select-all">{podcast.id}</code></p>
                        {podcast.elevenlabs_project_id && (
                          <p>Project ID: <code className="bg-gray-100 px-1 rounded text-xs">{podcast.elevenlabs_project_id}</code></p>
                        )}
                        <div className="flex mt-2 gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => checkPodcastStatus(podcast.id)}
                            disabled={checkingPodcast}
                          >
                            Check Status
                          </Button>
                          {(!podcast.audio_url && podcast.status !== 'failed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                              onClick={() => retrieveFromHistory(podcast.id)}
                              disabled={checkingPodcast}
                            >
                              Retrieve from History
                            </Button>
                          )}
                        </div>
                        {podcast.audio_url && (
                          <div className="mt-2">
                            <audio controls src={podcast.audio_url} className="w-full h-8" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Raw Data */}
          <Card>
            <CardHeader className="bg-gray-100">
              <CardTitle className="text-lg text-gray-700">
                Raw Debug Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-xs">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 