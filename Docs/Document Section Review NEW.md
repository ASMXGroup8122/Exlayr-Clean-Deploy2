# Document Section Review Implementation Guide

## Overview
This document outlines the implementation of the **Exchange Document Review System**, providing a collaborative interface for reviewing submitted listing documents. The system consists of two main views:
1. Kanban Board View (`/dashboard/exchange/listings`) - For managing document workflow states.
2. Document Review View (`/dashboard/exchange/listings/[id]/documents`) - For detailed review of document subsections, comments, and status updates.

## System Architecture

### 1. Kanban Board Implementation

#### Database Schema
```typescript
interface Document {
  instrumentid: string;        // Primary key
  title: string; // Likely instrumentname from listing table
  instrumentsecuritiesadmissionstatus: 'draft' | 'pending' | 'approved' | 'listed'; // Map to review statuses
  updated_at: string;
  sponsor?: string;
  listing_type?: string;
  // Potentially add comment counts or section review progress if needed
}
```

#### UI Status Mapping
```typescript
UI Status    | Database Status (listing.instrumentsecuritiesadmissionstatus)
------------|----------------
in_review   | draft, pending 
approved    | approved
rejected    | rejected // Assuming a rejected status exists or needs adding
listed      | listed 
```

#### Component Hierarchy
```
DocumentKanbanBoard
├── KanbanColumn[]
│   └── SortableDocumentCard[]
│       └── DocumentCard
└── DragOverlay
```

#### Key Features
- Drag and drop functionality using @dnd-kit
- Optimistic UI updates
- Error handling with automatic reversion
- Visual feedback during drag operations
- Status-based column organization

### 2. Document Review Implementation (Exchange View)

#### Data Source
The primary content for review is fetched from the `listingdocumentdirectlisting` table, where each column represents a subsection of the document (e.g., `sec1_generalinfo`, `sec4_riskfactors1`).

#### Data Models (Client-Side Transformation)
```typescript
interface Subsection {
  id: string;      // Corresponds to column name in listingdocumentdirectlisting (e.g., 'sec1_generalinfo')
  title: string;   // User-friendly title (e.g., 'General Information')
  content: string; // Content from the corresponding column
}

interface Section {
  id: string;      // Main section identifier (e.g., 'sec1', 'sec2')
  document_id: string; // Foreign key to listing table (instrumentid)
  title: string;   // Main section title (e.g., 'Section 1: Document Overview')
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress' | 'draft' | 'locked' | 'ai_reviewed'; // Status for the main section
  version: number; // Placeholder for potential version tracking
  created_at: string;
  updated_at: string;
  subsections: Subsection[]; // Array of the actual content fields within this section
}

interface Comment {
  id: string;
  document_id: string;
  section_id: string; // Stores the subsection ID (e.g., 'sec1_generalinfo')
  user_id: string;
  user_name: string; // Denormalized: Stored directly in the table at insert time
  content: string;
  created_at: string;
  status: 'open' | 'resolved' | 'needs_clarification'; // Example statuses
}
```

#### Component Hierarchy
```
DocumentSectionReview (Page Component - Fetches Doc Content & ALL Comments)
├── TopBar (Collapsible Toggle, View/Export Buttons, User Info)
├── TableOfContents (Collapsible Sidebar, Hierarchical Sections/Subsections, Status Indicators)
└── MainContentArea (Scrollable)
    └── SectionDisplay[] (Mapped from sections state, receives grouped comments)
        ├── SectionHeader (Section Title, Status, User Avatar, AI Analyse, Lock Buttons)
        └── SubsectionDisplayArea (Mapped from section.subsections)
            ├── Subsection Title
            ├── ReadOnly Subsection Content Display
            ├── AIFeedback (Placeholder/Conditional)
            └── CommentsSection (Receives initialComments, handles posting & real-time updates)
```

## Implementation Details

### 1. Required Dependencies
```json
{
  "dependencies": {
    "@dnd-kit/core": "latest",
    "@dnd-kit/sortable": "latest",
    "@radix-ui/react-separator": "latest",
    "@radix-ui/react-sheet": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-avatar": "latest", // Added
    "framer-motion": "latest",
    "lucide-react": "latest",
    "tailwindcss": "latest",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "latest"
    // Add other UI dependencies like @radix-ui/react-avatar if used
  }
}
```

### 2. Key Components Implementation

#### DocumentKanbanBoard
*(No changes assumed)*
// ... existing Kanban board details ...

#### DocumentSectionReview (Page Component)
```typescript
interface DocumentSectionReviewProps {
  documentId: string;
}

const DocumentSectionReview = ({ documentId }: DocumentSectionReviewProps) => {
  // State: sections[], activeSectionId, loading, error, isSidebarCollapsed, userName, allComments (grouped by subsectionId)
  // useEffect: Fetches listingdocumentdirectlisting data AND all comments for the document.
  //            Groups comments by subsectionId and stores in allComments state.
  //            Transforms document data into hierarchical sections state.
  // Handlers: handleSaveChanges (for review actions), handleSectionSelect (for TOC scroll), toggleSidebar.
  // Renders TopBar, TableOfContents, and maps sections to SectionDisplay components, passing down grouped comments.
};
```
#### SectionDisplay (Component)
```typescript
// Renders a main section block.
// Receives grouped comments map (commentsBySubsection) as prop.
// Iterates through section.subsections.
// For each subsection: displays title, read-only content, AIFeedback, and renders CommentsSection, passing the relevant pre-fetched comments (initialComments).
```
#### CommentsSection (Component)
```typescript
// Receives initialComments prop containing pre-fetched comments for its subsection.
// Initializes local state with initialComments.
// useEffect fetches current user info (for posting) and sets up real-time subscription.
// Does NOT perform its own initial fetch for comments.
// Handles posting new comments (with optimistic update) for its subsectionId.
// Handles deleting own comments (with optimistic update).
```

### 3. Context Providers
*(DocumentAnalysisProvider might still be relevant for AI features but isn't the primary data source)*
```typescript
// DocumentAnalysisContext might be used later for AI features
interface DocumentAnalysisState {
  // ... potentially for AI status/results per section/subsection ...
}

// Required Providers Hierarchy (if analysis context is used)
<DocumentAnalysisProvider documentId={documentId}> 
  <DocumentSectionReview documentId={documentId} />
</DocumentAnalysisProvider>
```

## Database Integration

### 1. Tables Required
- `listing` - Document metadata and overall status.
- `listingdocumentdirectlisting` - Primary source of document content, structured by column (e.g., `sec1_generalinfo`). Also contains status per main section (e.g. `sec1_status`).
- `document_comments` - Stores comments linked to a specific `document_id` and `section_id` (where `section_id` refers to the subsection/column name like `sec1_generalinfo`).
- `document_section_status` - Potentially used to track more granular review status *per main section* (e.g., who approved 'sec1'). Needs clear definition if used alongside statuses in `listingdocumentdirectlisting`.
- `section_version_history` - Stores historical versions of content (likely linked per subsection/field).
- `profiles` - Potentially redundant for comment display; stores user info linked via `user_id`.
- `users` (Supabase Auth) - For authentication and `user_id`.
- `analysis_results` (Placeholder) - Future table for storing AI analysis results per subsection/version.

### 2. Key Database Operations
```typescript
// Fetch document content for review (in Parent Component)
const fetchDocumentContent = async (documentId: string) => {
  const { data, error } = await supabase
    .from('listingdocumentdirectlisting')
    .select('*')
    .eq('instrumentid', documentId)
    .single();
  // Transform 'data' into the hierarchical Section/Subsection structure client-side.
};

// Fetch ALL comments for the document (in Parent Component)
const fetchAllComments = async (documentId: string) => {
  const { data, error } = await supabase
    .from('document_comments')
    .select('*') // Includes user_name directly
    .eq('document_id', documentId);
  // Group comments by section_id client-side.
};

// Post a comment for a specific subsection (in CommentsSection)
const postComment = async (documentId: string, subsectionId: string, userId: string, userName: string, content: string) => {
  const { error } = await supabase
    .from('document_comments')
    .insert({ 
        document_id: documentId, 
        section_id: subsectionId, 
        user_id: userId, 
        user_name: userName, // Include denormalized name
        content: content 
    });
};

// Delete a specific comment (in CommentsSection)
const deleteComment = async (commentId: string) => {
  const { error } = await supabase
    .from('document_comments')
    .delete()
    .eq('id', commentId);
    // RLS policy should ensure users can only delete their own comments
};

// Update main section status (Example)
const updateSectionStatus = async (documentId: string, sectionId: string, newStatus: string, userId: string) => {
   const { error } = await supabase
     .from('document_section_status') // Or update status directly in listingdocumentdirectlisting if preferred
     .upsert({
        document_id: documentId,
        section_id: sectionId, // Main section ID like 'sec1'
        status: newStatus, 
        updated_at: new Date().toISOString(),
        updated_by: userId 
      }, { onConflict: 'document_id, section_id' }) // Assumes unique constraint
     .select();
}

// Update overall document status (listing table)
const updateDocumentStatus = async (documentId: string, status: string) => {
  const { error } = await supabase
    .from('listing')
    .update({
      instrumentsecuritiesadmissionstatus: status
    })
    .eq('instrumentid', documentId);
};
```

## Error Handling

1. **Optimistic Updates**
   - Implement immediate UI updates
   - Revert on failure
   - Show error notifications

2. **Loading States**
   - Display loading indicators during operations
   - Maintain UI responsiveness

## Security Considerations

1. **Access Control**
   - Implement role-based access
   - Validate user permissions

2. **Data Validation**
   - Sanitize user inputs
   - Validate status transitions

## Testing Strategy

1. **Unit Tests**
   - Component rendering
   - State management
   - Status mapping functions

2. **Integration Tests**
   - Drag and drop operations
   - Database operations
   - Context providers

3. **E2E Tests**
   - Complete user workflows
   - Error scenarios

## Deployment Checklist

1. **Environment Setup**
   - Configure Supabase connection
   - Set up environment variables
   - Configure CORS if needed

2. **Build Process**
   - Verify all dependencies
   - Run type checks
   - Build production assets

3. **Post-Deployment**
   - Verify database connections
   - Test all main functionalities
   - Monitor error rates

## Next Steps
1. Implement real-time collaboration features
2. Add document version history
3. Enhance AI analysis capabilities
4. Implement batch operations for documents
5. Add advanced filtering and search

## Maintenance Guidelines

1. **State Management**
   - Keep UI and database states in sync
   - Implement proper error boundaries
   - Monitor performance metrics

2. **Code Quality**
   - Follow TypeScript best practices
   - Maintain consistent styling
   - Document complex logic

3. **Performance**
   - Implement pagination for large lists
   - Optimize database queries
   - Monitor client-side performance
