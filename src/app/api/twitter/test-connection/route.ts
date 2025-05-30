import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TwitterApi } from "twitter-api-v2";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const reqData = await req.json();
    const { organizationId } = reqData;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Get Twitter API credentials from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("provider", "twitter")
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { 
          error: "Twitter connection not found. Please connect your Twitter account first.",
          details: tokenError?.message 
        },
        { status: 404 }
      );
    }

    // Create Twitter client using the stored credentials
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: tokenData.access_token,
      accessSecret: tokenData.access_token_secret,
    });

    // Verify credentials by fetching the user's account info
    const user = await twitterClient.v2.me();

    return NextResponse.json({
      success: true,
      message: "Twitter connection is working",
      user: user.data
    });
  } catch (error: any) {
    console.error("Error testing Twitter connection:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to connect to Twitter", 
        details: error.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
} 