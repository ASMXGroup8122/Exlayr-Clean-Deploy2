import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth Debug] Starting debugging session');
    
    // 1. Debug cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    const authCookieNames = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];
    const foundAuthCookies = allCookies.filter(cookie => 
      authCookieNames.some(name => cookie.name.includes(name))
    );
    
    // 2. Create Supabase client
    const supabase = await createClient();
    
    // 3. Check session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // 4. Get user data
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    // Return diagnostics
    return NextResponse.json({
      success: true,
      cookies: {
        count: allCookies.length,
        authCookies: foundAuthCookies.map(c => ({
          name: c.name,
          valueLength: c.value.length
        }))
      },
      auth: {
        hasSession: !!sessionData?.session,
        sessionExpiry: sessionData?.session?.expires_at 
          ? new Date(sessionData.session.expires_at * 1000).toISOString()
          : null,
        hasUser: !!userData?.user,
        userId: userData?.user?.id || null,
        userEmail: userData?.user?.email || null,
        sessionError: sessionError ? sessionError.message : null,
        userError: userError ? userError.message : null
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Auth Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 