# Authentication and Organization Registration Standard

## Overview
This document outlines the standard flows for user authentication and organization registration in the Exlayr.AI platform.

## Approval Flows

### 1. Organization Registration Flow
When a user registers a new organization:
1. User completes the organization registration form
2. On submission, they are redirected to `/registration-pending`
3. The registration-pending page (`src/app/registration-pending/page.tsx`) displays a message confirming their registration is being reviewed

### 2. Sign-in to Pending Organization Flow
When a user attempts to sign in to an organization that is still pending approval:
1. User signs in with their credentials
2. System checks organization status
3. If organization is pending, user is redirected to `/approval-pending`
4. The approval-pending page (`src/app/(auth)/approval-pending/page.tsx`) displays a message that their organization is still under review

## Flow Sequence

### 1. Initial Registration (`/register-organization`)
#### Component: `src/app/register-organization/page.tsx`
```typescript
// Entry point for organization registration
// Uses RegisterOrgProvider context for state management
```

#### State Management
- Handled by `src/contexts/AuthRegisterOrg.tsx`
- Initial form data:
  - email
  - password
  - first_name
  - last_name
  - company_name
  - organizationType ('issuer' | 'exchange_sponsor' | 'exchange')

#### Process
1. User fills basic registration form
2. Form submission triggers `registerOrg` function in `AuthRegisterOrg` context
3. Validation checks:
   - Email format
   - Password strength
   - Required fields
4. Creates auth user via Supabase auth.signUp
5. Creates initial user profile in `users` table:
   ```sql
   status: 'pending'
   account_type: based on organizationType
   ```
6. Redirects based on organization type:
   - issuer → `/create-issuer`
   - exchange_sponsor → `/create-sponsor`
   - exchange → `/create-exchange`

### 2. Detailed Organization Setup

#### A. Issuer Registration (`/create-issuer`)
##### Component: `src/app/create-issuer/page.tsx`
- Multi-step form with sections:
  1. Company Information
  2. Management Details
  3. Capital Structure
  4. Legal & Advisors
  5. Business Overview
  6. Regulatory Information
  7. Documents & Compliance

##### Data Flow
1. Form submission creates records in:
   ```sql
   -- Main issuer record
   issuers {
     status: 'pending',
     created_by: user.id,
     // ... all form fields
   }

   -- Document records
   issuer_documents {
     entity_type: 'issuer',
     entity_id: issuer.id,
     status: 'pending'
   }
   ```

#### B. Exchange Sponsor Registration (`/create-sponsor`)
##### Component: `src/app/create-sponsor/page.tsx`
- Single form with sections:
  1. Organization Details
  2. Contact Information
  3. Regulatory Information
  4. Social Media

##### Data Flow
1. Creates records in:
   ```sql
   exchange_sponsor {
     status: 'pending',
     created_by: user.id,
     // ... form fields
   }
   ```

#### C. Exchange Registration (`/create-exchange`)
##### Component: `src/app/create-exchange/page.tsx`
- Similar structure to sponsor registration
- Additional fields for exchange-specific details

### 3. Post-Registration Flow

#### A. Session Management
- Uses PKCE (Proof Key for Code Exchange) flow
- Session cookies managed by Supabase client
- Session persistence handled in `src/lib/supabase.ts`

#### B. Route Protection
- Middleware (`src/middleware.ts`) checks:
  1. Valid session
  2. User status
  3. Required permissions

#### C. Approval Pending State
- Route: `/approval-pending`
- Component: `src/app/approval-pending/page.tsx`
- Shows status based on:
  ```typescript
  user.status === 'pending'
  organization.status === 'pending'
  ```

#### D. Registration Pending State
- Route: `/registration-pending`
- Component: `src/app/registration-pending/page.tsx`
- This route is specifically for showing the pending status immediately after registering a new organization
- Distinct from `/approval-pending` which is for sign-in attempts to pending organizations

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL,
  status TEXT NOT NULL,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Organizations Tables
```sql
-- Issuers
CREATE TABLE issuers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  -- ... other fields
);

-- Exchange Sponsors
CREATE TABLE exchange_sponsor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  -- ... other fields
);

-- Exchanges
CREATE TABLE exchange (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  -- ... other fields
);
```

## Error Handling

### 1. Registration Errors
```typescript
try {
  // Registration logic
} catch (error) {
  if (error instanceof AuthError) {
    // Handle auth-specific errors
  } else if (error instanceof DatabaseError) {
    // Handle database errors
  }
}
```

### 2. Cleanup on Failure
- If user creation succeeds but org creation fails:
  1. Delete auth user
  2. Delete user profile
  3. Clean up any uploaded documents

### 3. Session Errors
- Redirect to `/auth/error` with specific error codes
- Handle token refresh failures
- Clear invalid sessions

## Security Considerations

### 1. Authentication
- PKCE flow for enhanced security
- Session management via HTTP-only cookies
- Token refresh mechanism

### 2. Authorization
- Role-based access control
- Organization-specific permissions
- Route protection via middleware

### 3. Data Protection
- Input validation on all forms
- SQL injection prevention via Supabase
- File upload restrictions and validation

## Testing Requirements

### 1. Unit Tests
- Test all form validations
- Test context providers
- Test error handling

### 2. Integration Tests
- Test complete registration flow
- Test session management
- Test role-based access

### 3. E2E Tests
- Complete registration journey
- Document upload process
- Approval flow

## Deployment Considerations

### 1. Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 2. Build Process
```bash
npm run build
# Validates all routes
# Generates static pages
# Builds API routes
```

### 3. Database Migrations
- Run migrations before deployment
- Handle schema changes carefully
- Maintain backward compatibility

## Troubleshooting Guide

### Common Issues
1. Session not persisting
   - Check cookie settings
   - Verify PKCE flow
   - Check middleware configuration

2. Registration failures
   - Verify database connections
   - Check form validation
   - Verify file upload permissions

3. Redirect issues
   - Check middleware rules
   - Verify route protection
   - Check session handling

### Debug Points
Key areas to add logging:
```typescript
// Auth context
console.debug('Auth state:', { user, session });

// Registration flow
console.debug('Registration step:', currentStep);

// API responses
console.debug('API response:', { status, data });
```

## Maintenance and Updates

### Version Control
- Semantic versioning for API changes
- Database migration versioning
- Documentation versioning

### Monitoring
- Track registration success rates
- Monitor file upload success
- Track approval flow metrics

### Performance Metrics
- Registration completion time
- File upload performance
- API response times 