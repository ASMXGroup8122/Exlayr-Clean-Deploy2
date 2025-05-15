import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PodcastService } from '@/lib/services/podcast.service';

/**
 * Debug endpoint for podcast feature status
 * Returns information about:
 * - API configuration
 * - Recent podcast records
 * - Database tables status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    
    if (!organizationId) {
      return NextResponse.json({
        error: 'organizationId parameter is required'
      }, { status: 400 });
    }
    
    console.log(`[DEBUG] Checking podcast debug for organization ID: "${organizationId}"`);
    
    const supabase = getSupabaseClient();
    
    // Check for ElevenLabs API key in oauth_tokens (preferred source)
    console.log(`[DEBUG] Querying oauth_tokens with org ID: "${organizationId}"`);
    const { data: oauthTokens, error: oauthError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', 'elevenlabs')
      .maybeSingle();
    
    console.log(`[DEBUG] oauth_tokens result:`, 
      oauthError ? `Error: ${oauthError.message}` : 
      (oauthTokens?.access_token ? `Found token: ${oauthTokens.access_token.substring(0, 5)}...` : "No token found")
    );
    
    // If not found in oauth_tokens, check organization_settings as fallback
    console.log(`[DEBUG] Querying organization_settings with org ID: "${organizationId}"`);
    const { data: settingsData, error: settingsError } = await supabase
      .from('organization_settings')
      .select('elevenlabs_api_key')
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    console.log(`[DEBUG] organization_settings query:`, {
      organizationId,
      success: !settingsError,
      hasKey: !!settingsData?.elevenlabs_api_key,
      errorMessage: settingsError ? settingsError.message : null
    });
    
    // Get all organization_settings for debugging
    console.log(`[DEBUG] Getting all organization_settings for debugging`);
    const { data: allSettings, error: allSettingsError } = await supabase
      .from('organization_settings')
      .select('organization_id, elevenlabs_api_key')
      .limit(5);
    
    console.log(`[DEBUG] All settings:`, 
      allSettingsError ? `Error: ${allSettingsError.message}` : 
      `Found ${allSettings?.length || 0} settings records`
    );
    
    if (allSettings && allSettings.length > 0) {
      allSettings.forEach((setting, i) => {
        console.log(`[DEBUG] Setting #${i+1} - org_id: ${setting.organization_id}, has_key: ${!!setting.elevenlabs_api_key}`);
      });
    }
    
    // Get all oauth tokens for debugging
    console.log(`[DEBUG] Getting all oauth tokens for debugging`);
    const { data: allOauthTokens, error: allOauthError } = await supabase
      .from('oauth_tokens')
      .select('id, provider, provider_account_name, organization_id')
      .limit(10);
    
    console.log(`[DEBUG] All tokens:`, 
      allOauthError ? `Error: ${allOauthError.message}` : 
      `Found ${allOauthTokens?.length || 0} token records`
    );
    
    const hasApiKeyInSettings = !!settingsData?.elevenlabs_api_key;
    const hasApiKeyInOauth = !!oauthTokens?.access_token;
    const hasApiKey = hasApiKeyInSettings || hasApiKeyInOauth;
    
    // Get podcast records
    const { data: podcastRecords, error: podcastError } = await supabase
      .from('podcast_audio_generations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Check for voice records
    const { data: voiceRecords, error: voiceError } = await supabase
      .from('spoken_voice')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(10);
    
    // Get tables info
    const { data: podcastGenerationsTable, error: tableError } = await supabase
      .from('podcast_audio_generations')
      .select('id')
      .limit(1);
    
    const { data: spokenVoiceTable, error: voiceTableError } = await supabase
      .from('spoken_voice')
      .select('id')
      .limit(1);
    
    // Check storage access
    let storageAccessible = false;
    try {
      const { data: bucketInfo } = await supabase.storage.getBucket('podcast_audio');
      storageAccessible = !!bucketInfo;
    } catch (error) {
      storageAccessible = false;
    }
    
    // Get processing records
    const processingRecords = podcastRecords?.filter(r => r.status === 'processing') || [];
    
    // Build the response
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      configuration: {
        hasElevenLabsApiKey: hasApiKey,
        hasApiKeyInSettings: hasApiKeyInSettings,
        hasApiKeyInOauth: hasApiKeyInOauth,
        voiceCount: voiceRecords?.length || 0,
        storageAccessible,
        oauthTokensFound: allOauthTokens?.length || 0
      },
      database: {
        podcast_audio_generations: {
          accessible: !tableError,
          recordCount: podcastRecords?.length || 0
        },
        spoken_voice: {
          accessible: !voiceTableError,
          recordCount: voiceRecords?.length || 0
        },
        oauth_tokens: {
          accessible: !allOauthError,
          tokens: allOauthTokens || []
        },
        organization_settings: {
          accessible: !allSettingsError,
          records: allSettings?.map(s => ({
            organization_id: s.organization_id,
            has_key: !!s.elevenlabs_api_key
          })) || []
        }
      },
      recentPodcasts: podcastRecords || [],
      processingCount: processingRecords.length,
      errors: {
        settings: settingsError ? settingsError.message : null,
        oauth: oauthError ? oauthError.message : null,
        allOauth: allOauthError ? allOauthError.message : null,
        podcast: podcastError ? podcastError.message : null,
        voice: voiceError ? voiceError.message : null,
        table: tableError ? tableError.message : null
      }
    });
  } catch (error) {
    console.error('[Podcast Debug] Error:', error);
    return NextResponse.json({
      error: 'Failed to collect debug information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 