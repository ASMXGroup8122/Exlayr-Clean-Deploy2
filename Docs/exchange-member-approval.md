# Exchange Member Approval Process

## Overview

This document outlines the process for approving exchange members in the Exlayr.AI platform. Exchange members are users who have registered and selected an exchange during the sign-up process. These members require admin approval before they can access the exchange.

## Database Structure

The exchange member data is stored in two key components:

1. **Base Table**: `exchange_member_roles`
   - Contains the relationship between users and exchanges
   - Stores role and status information
   - Fields: `id`, `exchange_id`, `user_id`, `role`, `status`, `created_at`

2. **View**: `exchange_member_view`
   - Joins `exchange_member_roles` with `auth.users`
   - Provides complete member information including user details
   - Fields: `id`, `user_id`, `exchange_id`, `role`, `status`, `created_at`, `email`, `full_name`

3. **User Table**: `public.users`
   - Contains user profile information
   - Status field has a constraint allowing only 'active', 'pending', and 'rejected' values
   - When a member is suspended, their status in `public.users` is mapped to 'pending'

## Member Status Flow

1. **Pending** - Initial state when a user registers and selects an exchange
2. **Active** - After admin approval, member can access the exchange
3. **Suspended** - If a member is rejected or later suspended by an admin (maps to 'pending' in `public.users`)

### Status Value Mapping

Status values in `exchange_member_roles` vs. `public.users`:

| UI Action    | exchange_member_roles | public.users |
|--------------|----------------------|--------------|
| Approve      | 'active'             | 'active'     |
| Reject       | 'suspended'          | 'pending'    |
| Suspend      | 'suspended'          | 'pending'    |
| Reactivate   | 'active'             | 'active'     |

## Admin Approval Process

### Viewing Pending Members

1. Navigate to the Admin Dashboard
2. Select "Exchanges" from the sidebar
3. Click on the specific exchange to view its details
4. Scroll to the "Exchange Members" section
5. Members with "pending" status require approval

### Approving a Member

1. Locate the member with "pending" status in the Exchange Members table
2. Click the "Approve" button next to the member
3. The system will update the member's status to "active" in both tables
4. The member will receive an email notification about the approval
5. The member can now access the exchange

### Rejecting a Member

1. Locate the member with "pending" status in the Exchange Members table
2. Click the "Reject" button next to the member
3. The system will update the member's status to "suspended" in `exchange_member_roles` and "pending" in `public.users`
4. The member will receive an email notification about the rejection
5. The member will not be able to access the exchange

## Managing Existing Members

### Suspending an Active Member

1. Locate the active member in the Exchange Members table
2. Click the "Suspend" button
3. The member's status will be updated to "suspended" in `exchange_member_roles` and "pending" in `public.users`
4. The member's access to the exchange will be revoked

### Reactivating a Suspended Member

1. Locate the suspended member in the Exchange Members table
2. Click the "Reactivate" button
3. The member's status will be updated to "active" in both tables
4. The member's access to the exchange will be restored

## Troubleshooting

### No Members Showing in Exchange Detail Page

If no members are showing in the Exchange Members section:

1. Verify that users have registered and selected this exchange
2. Check the `exchange_member_roles` table for records with this exchange ID
3. Ensure the `exchange_member_view` is correctly defined with the proper join
4. Verify that the user records exist in the `auth.users` table

### Status Update Errors

If status updates are failing:

1. Check that both `exchange_member_roles` and `public.users` tables are being updated
2. Verify the user has the correct permissions to update both tables
3. Ensure status values conform to the `users_status_check` constraint (only 'active', 'pending', 'rejected')
4. Check server logs for detailed error messages

### View Definition

The correct view definition should be:

```sql
CREATE OR REPLACE VIEW exchange_member_view AS
SELECT 
    emr.id,
    emr.user_id,
    emr.exchange_id,
    emr.role,
    emr.status,
    emr.created_at::timestamptz,
    u.email,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS full_name
FROM 
    exchange_member_roles emr
JOIN 
    auth.users u ON emr.user_id = u.id;
```

## Best Practices

1. **Regular Review**: Review pending members regularly to ensure timely approvals
2. **Verification**: Verify member information before approval
3. **Documentation**: Document reasons for rejections or suspensions
4. **Communication**: Maintain clear communication with members about their status

## Technical Implementation

The exchange member approval functionality is implemented in:

- Server Component: `src/app/(dashboard)/dashboard/admin/exchanges/[id]/page.tsx`
- Client Component: `src/app/(dashboard)/dashboard/admin/exchanges/[id]/ExchangeDetailClient.tsx`

The approval/rejection actions are handled by API endpoints:
- `/api/exchanges/members/status` - Updates member status

### API Endpoint Implementation

The `/api/exchanges/members/status` endpoint is implemented in `src/app/api/exchanges/members/status/route.ts` and handles member status updates:

```typescript
// src/app/api/exchanges/members/status/route.ts
export async function PUT(request: Request) {
  try {
    const { memberId, newStatus, exchangeId } = await request.json();
    
    // Validate input and ensure status is a valid value
    if (!memberId || !newStatus || !exchangeId) {
      console.error('Missing required fields:', { memberId, newStatus, exchangeId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Map 'suspended' to 'pending' to match database constraints
    let dbStatus = newStatus;
    if (newStatus === 'suspended') {
      dbStatus = 'pending'; // Users table only allows 'active', 'pending', 'rejected'
      console.log('Mapping "suspended" status to "pending" for database compatibility');
    }
    
    // Get the user_id from the exchange_member_roles table
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
    
    // Update member status in exchange_member_roles table
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
    const { error: userError } = await supabase
      .from('users')
      .update({ status: dbStatus })
      .eq('id', userId);
    
    if (userError) {
      // If public.users update fails, roll back the exchange_member_roles update
      const { error: rollbackError } = await supabase
        .from('exchange_member_roles')
        .update({ status: newStatus === 'active' ? 'pending' : 'active' })
        .eq('id', memberId)
        .eq('exchange_id', exchangeId);
      
      return NextResponse.json(
        { error: 'Failed to update user status: ' + userError.message },
        { status: 500 }
      );
    }
    
    // If this is the first active member, make them admin
    if (newStatus === 'active') {
      const { data: activeMembers } = await supabase
        .from('exchange_member_roles')
        .select('id')
        .eq('exchange_id', exchangeId)
        .eq('status', 'active');
      
      if (activeMembers && activeMembers.length === 1) {
        // This is the first approved member, make them admin
        await supabase
          .from('exchange_member_roles')
          .update({ role: 'admin' })
          .eq('id', memberId);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unhandled error in member status update:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
```

#### Key Features:

1. **Status Mapping**: Maps 'suspended' to 'pending' for `public.users` to satisfy the constraint
2. **Two-Table Update**: Updates both `exchange_member_roles` and `public.users` tables
3. **Rollback Logic**: Reverts changes if either update fails to maintain data consistency
4. **First Member Logic**: Automatically assigns admin role to the first approved member
5. **Error Handling**: Provides detailed error messages and logging
6. **Validation**: Ensures all required parameters are provided and valid

#### Request Format:

```json
{
  "memberId": "uuid-of-member",
  "newStatus": "active|suspended",
  "exchangeId": "uuid-of-exchange"
}
```

#### Response Format:

Success:
```json
{
  "success": true
}
```

Error:
```json
{
  "error": "Detailed error message"
}
```

### Database Constraints

The `public.users` table has a check constraint that limits status values:

```sql
ALTER TABLE public.users
ADD CONSTRAINT users_status_check 
CHECK (status IN ('pending', 'active', 'rejected'));
```

This requires the API to map UI status values to database-compatible values.