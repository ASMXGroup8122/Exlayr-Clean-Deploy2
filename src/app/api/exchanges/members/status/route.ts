import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    const { memberId, newStatus, exchangeId } = await request.json();
    console.log('Received request to update member status:', { memberId, newStatus, exchangeId });
    
    // Validate input and ensure status is a valid value
    if (!memberId || !newStatus || !exchangeId) {
      console.error('Missing required fields:', { memberId, newStatus, exchangeId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Make sure status is one of the allowed values
    const validStatusValues = ['active', 'pending', 'rejected'];
    
    // Map 'suspended' to 'pending' to match database constraints
    let dbStatus = newStatus;
    if (newStatus === 'suspended') {
      dbStatus = 'pending';
      console.log('Mapping "suspended" status to "pending" for database compatibility');
    }
    
    // Validate the mapped status
    if (!validStatusValues.includes(dbStatus)) {
      console.error('Invalid status value after mapping:', dbStatus);
      return NextResponse.json(
        { error: `Invalid status value. Must be one of: ${validStatusValues.join(', ')}` },
        { status: 400 }
      );
    }
    
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    console.log('Using standard authenticated client for operations');
    
    // First, get the user_id from the exchange_member_roles table
    console.log('Fetching user_id from exchange_member_roles');
    const { data: memberData, error: memberError } = await supabase
      .from('exchange_member_roles')
      .select('user_id')
      .eq('id', memberId)
      .single();
    
    if (memberError) {
      console.error('Error fetching member data:', memberError);
      return NextResponse.json(
        { error: 'Failed to fetch member data: ' + memberError.message },
        { status: 500 }
      );
    }
    
    const userId = memberData.user_id;
    console.log('Found user_id:', userId);
    
    // Update member status in exchange_member_roles table
    console.log('Updating status in exchange_member_roles');
    const { error: roleError } = await supabase
      .from('exchange_member_roles')
      .update({ status: newStatus })
      .eq('id', memberId)
      .eq('exchange_id', exchangeId);
    
    if (roleError) {
      console.error('Error updating exchange_member_roles:', roleError);
      return NextResponse.json(
        { error: 'Failed to update member status: ' + roleError.message },
        { status: 500 }
      );
    }
    
    // Update the user's status in public.users table
    console.log('Updating status in public.users table');
    console.log('User ID for update:', userId);
    console.log('New status value for database:', dbStatus);
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({ status: dbStatus })
      .eq('id', userId)
      .select();
    
    if (userError) {
      console.error('Error updating user status in public.users:', userError);
      console.error('Error code:', userError.code);
      console.error('Error message:', userError.message);
      console.error('Error details:', userError.details);
      
      // If public.users update fails, we should roll back the exchange_member_roles update
      const { error: rollbackError } = await supabase
        .from('exchange_member_roles')
        .update({ status: newStatus === 'active' ? 'pending' : 'active' })
        .eq('id', memberId)
        .eq('exchange_id', exchangeId);
      
      if (rollbackError) {
        console.error('Failed to rollback exchange_member_roles update:', rollbackError);
      }
      
      return NextResponse.json(
        { error: 'Failed to update user status: ' + userError.message },
        { status: 500 }
      );
    }
    
    console.log('User status updated successfully:', userData);
    
    // If this is the first active member, make them admin
    if (newStatus === 'active') {
      console.log('Checking if this is the first active member');
      const { data: activeMembers, error: countError } = await supabase
        .from('exchange_member_roles')
        .select('id')
        .eq('exchange_id', exchangeId)
        .eq('status', 'active');
      
      if (countError) {
        console.error('Error checking active members:', countError);
      } else if (activeMembers && activeMembers.length === 1) {
        console.log('This is the first active member, making them admin');
        const { error: roleUpdateError } = await supabase
          .from('exchange_member_roles')
          .update({ role: 'admin' })
          .eq('id', memberId);
        
        if (roleUpdateError) {
          console.error('Error updating role to admin:', roleUpdateError);
        } else {
          console.log('Successfully updated role to admin');
        }
      }
    }
    
    console.log('Member status update completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unhandled error in member status update:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 