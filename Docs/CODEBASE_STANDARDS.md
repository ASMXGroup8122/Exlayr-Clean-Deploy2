# Exlayr.AI Codebase Standards

## Table of Contents
1. [Page Creation Standards](#page-creation-standards)
2. [Authentication Standards](#authentication-standards)
3. [Route Protection](#route-protection)
4. [Directory Structure](#directory-structure)
5. [Document Generation Standards](#document-generation-standards)
6. [Domain Configuration](#domain-configuration)

## Page Creation Standards

### Directory Structure
```
src/app/
├── (auth)/             # Auth-related pages (sign-in, sign-up, etc.)
├── (dashboard)/        # Protected dashboard pages
│   └── dashboard/
│       ├── admin/     # Admin-specific pages
│       ├── sponsor/   # Sponsor-specific pages
│       │   └── [orgId]/
│       │       ├── listings/
│       │       │   ├── generate-document/  # Document generation
│       │       │   └── [listingId]/       # Individual listing pages
│       ├── issuer/    # Issuer-specific pages
│       └── exchange/  # Exchange-specific pages
└── page.tsx           # Root page (redirects to /sign-in)
```

### Page Creation Rules

1. **Client vs Server Components**
   - Use 'use client' directive for interactive pages
   - Keep server components where possible for better performance
   - Split complex pages into client/server parts

2. **Route Guard Implementation**
   ```typescript
   export default function ProtectedPage() {
     return (
       <RouteGuard allowedTypes={['admin']}>
         <PageContent />
       </RouteGuard>
     );
   }
   ```

3. **Page Layout Structure**
   ```typescript
   // layout.tsx
   export default async function Layout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     // Auth check if needed
     return <>{children}</>;
   }
   ```

4. **Dynamic Routes**
   - Use folder names with square brackets: `[orgId]`, `[listingId]`
   - Include type definitions for params
   - Handle loading and error states

## Authentication Standards

### 1. Authentication Flow

1. **Sign In Process**
   ```typescript
   // 1. User submits credentials
   // 2. Authenticate with Supabase
   // 3. Fetch user profile
   // 4. Check organization status
   // 5. Redirect based on account type
   ```

2. **Session Management**
   - PKCE (Proof Key for Code Exchange) flow
   - Cookie-based session storage
   - No localStorage for auth data
   - Coordinated session refresh between middleware and client
   - Short-lived coordination cookies for state management
   - Supabase handles core session management

3. **User Types**
   - Admin
   - Exchange Sponsor
   - Issuer
   - Exchange

### 2. Protected Routes

1. **Middleware Protection**
   ```typescript
   // Public paths (no auth needed)
   const PUBLIC_PATHS = [
     '/_next',
     '/api',
     '/static',
     '/images',
     '/favicon.ico',
     '/register-organization'
   ];

   // Auth-specific paths
   const AUTH_PATHS = [
     '/sign-in',
     '/sign-up',
     '/auth/callback',
     '/auth/error'
   ];
   ```

2. **Permission Levels**
   ```typescript
   const routePermissions = {
     '/dashboard/admin/users': ['manage_users'],
     '/dashboard/documents': ['view_documents'],
     '/dashboard/knowledge-base': ['view_knowledge_base']
   };
   ```

### 3. Error Handling

1. **Authentication Errors**
   ```typescript
   const ERROR_MESSAGES = {
     'AUTH.CODE_MISSING': 'Authentication code is missing',
     'AUTH.SESSION_MISSING': 'Could not establish session',
     'AUTH.CALLBACK_ERROR': 'Authentication process failed',
     'AUTH.SESSION_ERROR': 'Session expired or invalid',
     'AUTH.UNAUTHORIZED': 'Not authorized for this resource'
   };
   ```

2. **Error Routes**
   - `/auth/error` - General auth errors
   - `/access-denied` - Permission denied
   - `/auth/approval-pending` - Pending approval state

### 3. Session Coordination
   ```typescript
   // Middleware session refresh
   if (shouldRefreshSession(session)) {
       // Refresh token
       const refreshed = await refreshSession();
       
       // Set coordination cookie
       response.cookies.set('auth_state', {
           refreshed: true,
           timestamp: Date.now()
       }, {
           maxAge: 2 // 2 seconds
       });
   }

   // Client-side coordination
   const checkAuthState = async () => {
       // Check for recent refresh
       const authState = getAuthStateCookie();
       if (authState?.refreshed) {
           // Wait for refresh to complete
           await waitForRefresh(authState.timestamp);
       }
       // Proceed with session fetch
   };
   ```

### 4. Session States
   - Initial Load: Check for existing session
   - Navigation: Use existing session
   - Refresh: Coordinate between middleware and client
   - Expiry: Auto-refresh via middleware
   - Error: Redirect to sign-in

## Route Protection

### 1. Middleware Checks

```typescript
export async function middleware(request: NextRequest) {
  // 1. Skip for public paths
  // 2. Check session existence
  // 3. Verify user status
  // 4. Check organization status
  // 5. Validate permissions
  // 6. Allow/deny access
}
```

### 2. Route Guards

```typescript
<RouteGuard allowedTypes={['admin', 'sponsor']}>
  <ProtectedComponent />
</RouteGuard>
```

## Directory Structure

### 1. Core Directories

```
src/
├── app/                # Next.js app directory
├── components/         # Shared components
├── contexts/          # Context providers
├── lib/              # Utility functions
└── middleware/       # Auth & permission middleware
```

### 2. Feature Organization

- Group related features in same directory
- Use consistent naming conventions
- Keep component hierarchy shallow
- Split complex features into sub-components

### 3. Page Types

1. **Public Pages**
   - Sign in/up
   - Landing pages
   - Error pages

2. **Protected Pages**
   - Dashboard views
   - Admin panels
   - User management

3. **Organization-Specific Pages**
   - Sponsor dashboard
   - Issuer management
   - Exchange operations 

## Document Generation Standards

### 1. Database Structure

1. **Prompt Tables**
   ```sql
   direct_listingprompts (
     id: number,
     promptname: string,  // Format: sec{N}prompt_{fieldname}
     content: string
   )
   ```

2. **Naming Conventions**
   - Section prompts: `sec{N}prompt_{fieldname}`
   - Risk factors: `sec4prompt_risks{N}`
   - Status fields: `sec{N}prompt_status`

### 2. Section Management

1. **Section Types**
   ```typescript
   interface Section {
       id: string;
       title: string;
       content: string;
       status: 'pending' | 'generating' | 'completed' | 'locked';
       isLocked: boolean;
   }
   ```

2. **Section Fields**
   ```typescript
   interface ListingDocumentContent {
       [key: string]: string;
   }
   ```

3. **Prompt Ordering**
   ```typescript
   // Helper function to extract number from risk prompt
   const getPromptNumber = (promptname: string): number => {
       const match = promptname.match(/\d+$/);
       return match ? parseInt(match[0]) : 0;
   };

   // Sort prompts in correct order
   const sortPrompts = (prompts: string[]): string[] => {
       return prompts.sort((a, b) => {
           // Special case: title/status should always be first
           if (a.endsWith('_title')) return -1;
           if (b.endsWith('_title')) return 1;
           if (a.endsWith('_status')) return -1;
           if (b.endsWith('_status')) return 1;

           // For risk factors, sort by number
           return getPromptNumber(a) - getPromptNumber(b);
       });
   };
   ```

4. **Section Loading**
   ```typescript
   // Fetch and sort section prompts
   const fetchSectionPrompts = async (sectionNumber: string) => {
       const { data: promptsData } = await supabase
           .from('direct_listingprompts')
           .select('promptname')
           .ilike('promptname', `sec${sectionNumber}prompt_%`);

       // Sort prompts in correct order
       const sectionFields = sortPrompts(promptsData?.map(p => p.promptname) || []);
       return sectionFields;
   };
   ```

5. **Prompt Validation**
   ```typescript
   const validatePromptSequence = (prompts: string[]): boolean => {
       // Get all risk numbers
       const riskNumbers = prompts
           .filter(p => p.match(/risks\d+$/))
           .map(p => getPromptNumber(p));

       // Verify sequence is complete and in order
       return riskNumbers.every((num, index) => num === index + 1);
   };
   ```

### 3. Document Generation

1. **Webhook Payload Structure**
   ```typescript
   interface GenerationPayload {
       instrumentid: string;
       instrumentissuerid: string;
       section: {
           id: string;
           title: string;
           subsections: Array<{
               promptname: string;
               title: string;
           }>;
       };
   }
   ```

2. **Section Status Management**
   - Pending: Initial state
   - Generating: During webhook call
   - Completed: After successful generation
   - Locked: Prevent further modifications

3. **Error Handling**
   ```typescript
   try {
       // Generation logic
   } catch (error) {
       console.error('Error in generation:', error);
       setStatus('pending');
       showErrorMessage();
   }
   ```

### 4. UI Components

1. **Section Selection**
   - Dropdown for section selection
   - Progress indicators for each section
   - Lock/unlock controls

2. **Content Display**
   - Formatted section titles
   - Dynamic form fields based on prompts
   - Real-time content updates

3. **Styling Standards**
   ```css
   .section-container {
       animation: fadeInUp 0.5s ease-out;
   }
   .section-field {
       margin: 1rem 0;
       padding: 1rem;
       border-radius: 0.5rem;
   }
   ```

### 5. Best Practices

1. **Data Fetching**
   - Use Supabase for database operations
   - Cache section data when appropriate
   - Implement proper error handling

2. **State Management**
   - Keep section state in component
   - Use appropriate loading states
   - Maintain content persistence

3. **Performance**
   - Lazy load section content
   - Optimize webhook payload size
   - Cache generated documents

4. **Security**
   - Validate section access
   - Sanitize user inputs
   - Secure webhook endpoints 

## Domain Configuration

### Service Domains

1. **Application Domain**
   - Main application: `ai.exlayr.ai`
   - Serves the Next.js frontend application
   - Handles user authentication and dashboard interfaces

2. **Integration Services**
   - n8n instance: `app.exlayr.ai`
   - Handles workflow automation and webhooks
   - Used for document generation and processing

### Domain Usage Guidelines

1. **Webhook Configuration**
   - All n8n webhook URLs should use `app.exlayr.ai` domain
   - Example: `https://app.exlayr.ai/webhook/socialpost`

2. **Application Routes**
   - All application routes should use `ai.exlayr.ai` domain
   - Example: `https://ai.exlayr.ai/dashboard/sponsor`

3. **Environment Configuration**
   - Use appropriate environment variables for domain configuration
   - Maintain separate configurations for development and production 