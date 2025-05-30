import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { toast } from "@/components/ui/use-toast";
import { getSupabaseClient } from '@/lib/supabase/client';
import { Info, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";

// Temporary local Radio components until the ui/radio-group issue is fixed
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// Type definitions
type BullishTalksConfig = {
  name: string;
  apiToken: string;
  podcastId: string;
  loaded: boolean;
};

interface BuzzsproutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (details: { apiToken: string; podcastId: string; podcastName: string }) => void;
  organizationId: string;
  isConnected?: boolean;
  podcastName?: string;
  onDisconnect?: () => void;
}

export function BuzzsproutDialog({
  isOpen,
  onClose,
  onConnect,
  organizationId,
  isConnected = false,
  podcastName = '',
  onDisconnect
}: BuzzsproutDialogProps) {
  const [connectionType, setConnectionType] = useState<'asmx' | 'custom'>('asmx');
  const [customApiToken, setCustomApiToken] = useState('');
  const [customPodcastId, setCustomPodcastId] = useState('');
  const [customPodcastName, setCustomPodcastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bullishTalksConfig, setBullishTalksConfig] = useState<BullishTalksConfig>({
    name: "Bullish Talks!",  // Default fallback values
    apiToken: "",
    podcastId: "",
    loaded: false
  });
  
  // Fetch Bullish Talks configuration when dialog opens
  useEffect(() => {
    if (isOpen && !isConnected) {
      fetchBullishTalksConfig();
    }
  }, [isOpen, isConnected]);
  
  const fetchBullishTalksConfig = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Query the special system-wide Bullish Talks configuration
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('access_token, provider_account_id, provider_account_name')
        .eq('provider', 'buzzsprout_system')
        .eq('organization_id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      if (error) {
        console.error('Error fetching Bullish Talks config:', error);
        // Fall back to defaults if there's an error
        setBullishTalksConfig({
          name: "Bullish Talks!",
          apiToken: "700fed976f01132604c2549b28f8f5eb", // Fallback
          podcastId: "2378370", // Fallback
          loaded: true
        });
      } else if (data) {
        setBullishTalksConfig({
          name: data.provider_account_name || "Bullish Talks!",
          apiToken: data.access_token,
          podcastId: data.provider_account_id,
          loaded: true
        });
      }
    } catch (err) {
      console.error('Error in fetchBullishTalksConfig:', err);
      // Fall back to defaults
      setBullishTalksConfig({
        name: "Bullish Talks!",
        apiToken: "700fed976f01132604c2549b28f8f5eb", // Fallback
        podcastId: "2378370", // Fallback
        loaded: true
      });
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      
      // Determine which connection type was selected
      const connectionDetails = connectionType === 'asmx' 
        ? { 
            apiToken: bullishTalksConfig.apiToken, 
            podcastId: bullishTalksConfig.podcastId, 
            podcastName: bullishTalksConfig.name 
          }
        : { 
            apiToken: customApiToken, 
            podcastId: customPodcastId, 
            podcastName: customPodcastName || 'My BuzzSprout Podcast' 
          };
      
      // Validate the inputs for custom connection
      if (connectionType === 'custom') {
        if (!customApiToken.trim()) {
          toast({ title: "Error", description: "API Token is required", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!customPodcastId.trim()) {
          toast({ title: "Error", description: "Podcast ID is required", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }
      
      // Store the connection details in the database - use oauth_tokens table
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('oauth_tokens')
        .upsert({
          organization_id: organizationId,
          provider: 'buzzsprout',
          access_token: connectionDetails.apiToken,
          provider_account_id: connectionDetails.podcastId,
          provider_account_name: connectionDetails.podcastName,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }, { 
          onConflict: 'organization_id,provider'
        });
      
      if (error) {
        console.error('Error saving BuzzSprout connection:', error);
        throw new Error('Failed to save connection details');
      }
      
      // Immediately show success toast before callback
      toast({
        title: "Connected Successfully",
        description: `Connected to "${connectionDetails.podcastName}" on BuzzSprout.`,
        variant: "default"
      });
      
      // Close the dialog immediately
      onClose();
      
      // Then call the onConnect callback with the connection details
      // This will update the parent component's state
      onConnect(connectionDetails);
      
    } catch (err: any) {
      console.error('Error connecting to BuzzSprout:', err);
      toast({
        title: "Connection Failed",
        description: err.message || "There was an error connecting to BuzzSprout.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    
    try {
      setIsLoading(true);
      
      // Call the provided onDisconnect callback
      onDisconnect();
      
      // Close the dialog
      onClose();
      
    } catch (err: any) {
      console.error('Error disconnecting from BuzzSprout:', err);
      toast({
        title: "Disconnection Failed",
        description: err.message || "There was an error disconnecting from BuzzSprout.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openBuzzsproutSignup = () => {
    window.open("https://www.buzzsprout.com/sign_up", "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isConnected ? "Manage BuzzSprout Connection" : "Connect to BuzzSprout"}</DialogTitle>
          <DialogDescription>
            {isConnected 
              ? `Currently connected to "${podcastName}". You can disconnect this podcast.`
              : "Choose a podcast to connect with or add your own BuzzSprout podcast."}
          </DialogDescription>
        </DialogHeader>
        
        {isConnected ? (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center text-center space-y-4 p-6 border rounded-md bg-gray-50">
              <div className="text-lg font-medium">{podcastName}</div>
              <p className="text-sm text-gray-500">
                Your content will be automatically posted to this podcast when publishing.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <RadioGroup
              value={connectionType}
              onValueChange={(value: string) => setConnectionType(value as 'asmx' | 'custom')}
              className="space-y-4"
            >
              <div className="flex items-start space-x-2 rounded-md border p-4">
                <RadioGroupItem value="asmx" id="asmx" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="asmx" className="font-medium">Publish to 'Bullish Talks!' (ASMX Network)</Label>
                    {!bullishTalksConfig.loaded && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Your content will be automatically posted to the ASMX Network official podcast and distributed across multiple platforms.
                  </p>
                  <div className="rounded-md bg-blue-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Info className="h-4 w-4 text-blue-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 flex-1 md:flex md:justify-between">
                        <p className="text-xs text-blue-700">
                          The 'Bullish Talks!' podcast is distributed to Apple Podcasts, Spotify, Google Podcasts, and other major platforms.
                        </p>
                      </div>
                    </div>
                  </div>
                  {bullishTalksConfig.loaded && bullishTalksConfig.apiToken && (
                    <div className="text-xs text-green-600">
                      Connected to podcast ID: {bullishTalksConfig.podcastId}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-start space-x-2 rounded-md border p-4">
                <RadioGroupItem value="custom" id="custom" className="mt-1" />
                <div className="flex-1 space-y-4">
                  <Label htmlFor="custom" className="font-medium">Connect your own BuzzSprout podcast</Label>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="podcastName">Podcast Name</Label>
                      <Input
                        id="podcastName"
                        value={customPodcastName}
                        onChange={(e) => setCustomPodcastName(e.target.value)}
                        placeholder="My Podcast"
                        disabled={connectionType !== 'custom'}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="apiToken">API Token</Label>
                      <Input
                        id="apiToken"
                        value={customApiToken}
                        onChange={(e) => setCustomApiToken(e.target.value)}
                        placeholder="e.g., 700fed976f01132604c2549b28f8f5eb"
                        disabled={connectionType !== 'custom'}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="podcastId">Podcast ID</Label>
                      <Input
                        id="podcastId"
                        value={customPodcastId}
                        onChange={(e) => setCustomPodcastId(e.target.value)}
                        placeholder="e.g., 2378370"
                        disabled={connectionType !== 'custom'}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>To find your API Token and Podcast ID:</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1">
                      <li>Log in to your BuzzSprout account</li>
                      <li>Go to Settings &gt; API</li>
                      <li>Copy your API Token and Podcast ID</li>
                    </ol>
                  </div>
                  
                  <div className="flex items-center pt-2">
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-blue-600 flex items-center gap-1 text-sm"
                      onClick={openBuzzsproutSignup}
                    >
                      Don't have an account? Sign up for BuzzSprout
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {isConnected ? (
            <Button 
              onClick={handleDisconnect} 
              disabled={isLoading || !onDisconnect}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Disconnect
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleConnect} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
