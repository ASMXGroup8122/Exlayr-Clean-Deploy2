import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API endpoint to save the LinkedIn organization ID to an existing token.
 * This is called from the LinkedIn callback page after successful authentication.
 */
export async function POST(request: NextRequest) {
  console.log('[LinkedIn SaveOrgId] Processing request');
  
  try {
    // Parse request body
    const body = await request.json();
    const { organizationId, linkedinOrgId } = body;
    
    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    if (!linkedinOrgId) {
      return NextResponse.json(
        { error: 'LinkedIn Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Validate that the LinkedIn organization ID is numeric
    if (!/^\d+$/.test(linkedinOrgId)) {
      return NextResponse.json(
        { error: 'LinkedIn Organization ID must be numeric' },
        { status: 400 }
      );
    }
    
    console.log(`[LinkedIn SaveOrgId] Updating token for org ${organizationId} with LinkedIn org ID ${linkedinOrgId}`);
    
    // Get existing token data
    const supabase = await createClient();
    const { data: tokenData, error: getError } = await supabase
      .from('oauth_tokens')
      .select('provider_metadata')
      .eq('organization_id', organizationId)
      .eq('provider', 'linkedin')
      .single();
    
    if (getError) {
      console.error('[LinkedIn SaveOrgId] Error retrieving token:', getError);
      return NextResponse.json(
        { error: 'Failed to retrieve LinkedIn token data' },
        { status: 404 }
      );
    }
    
    // Update the token with the organization ID
    const organizations = [
      {
        id: linkedinOrgId,
        role: 'ADMIN', // Mark as admin since this is manually specified
      },
      // Keep any existing organizations
      ...(tokenData?.provider_metadata?.organizations || [])
        // Filter out any with the same ID to avoid duplicates
        .filter((org: { id: string; role: string }) => org.id !== linkedinOrgId)
    ];
    
    // Update the provider_metadata
    const { error: updateError } = await supabase
      .from('oauth_tokens')
      .update({
        provider_metadata: {
          organizations,
        },
      })
      .eq('organization_id', organizationId)
      .eq('provider', 'linkedin');
    
    if (updateError) {
      console.error('[LinkedIn SaveOrgId] Error updating token:', updateError);
      return NextResponse.json(
        { error: 'Failed to update LinkedIn token with organization ID' },
        { status: 500 }
      );
    }
    
    console.log('[LinkedIn SaveOrgId] Successfully updated token with LinkedIn organization ID');
    
    return NextResponse.json({
      success: true,
      message: 'LinkedIn organization ID saved successfully',
    });
    
  } catch (error: any) {
    console.error('[LinkedIn SaveOrgId] Unexpected error:', error.message || error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 