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
            ├── AIFeedback (Reads subsection-specific results from context metadata)
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

#### AIFeedback (Component)
```typescript
// Uses useDocumentAnalysis() hook to access context state.
// Finds the analysis result object for its parent section (e.g., 'sec1').
// Extracts the specific analysis result for its own subsection from the parent's result.metadata.subsectionResults array.
// Displays loading/error states or the specific suggestions/critique points for the subsection.
```

#### analysisService.ts (Conceptual - Backend Service)
```typescript
// Receives data for a main section (including its subsections).
// Processes subsections sequentially to enable context awareness.
// For each subsection: 
//   1. Performs a placeholder check (immediate fail if found).
//   2. Selects the appropriate specialized agent (Risk, Financial, General, etc.).
//   3. Calls the agent's analyze method, passing subsection content AND document context.
//   4. Collects the detailed result object for the subsection.
// Aggregates overall status/score for the main section.
// Returns an aggregated result object containing:
//   - Overall section compliance/score.
//   - Aggregated list of all suggestions (with subsection titles prepended).
//   - Metadata containing the array of detailed subsection result objects.
```

#### GeneralAnalysisAgent (Conceptual - Backend Agent)
```typescript
// Receives subsection title, content, and document context map.
// Fetches relevant benchmark examples from Pinecone ('exchangedocs').
// Constructs a prompt for the LLM (GPT-4) instructing it to:
//   - Act as an exchange reviewer.
//   - Compare subsection content ONLY against Pinecone benchmarks for compliance.
//   - Check document context map ONLY to verify potential omissions.
//   - Generate concise (1-2 sentence) reviewer critique points based *only* on deviations from benchmarks.
//   - Explicitly forbid mentioning 'example' or 'benchmark' in the output critique.
// Parses the LLM's JSON response containing isCompliant, critiquePoints, score.
// Returns the result including critiquePoints mapped to the 'suggestions' field.
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
- `analysis_results` (Placeholder) - Future table for storing detailed AI analysis results per subsection/version.

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

## AI Analysis Logic

1.  **Trigger:** Initiated per main section by `DocumentAnalysisButton` in the `SectionHeader`.
2.  **UI Feedback:** Upon clicking the button:
    *   An overlay immediately appears, covering the screen and preventing further interaction.
    *   The overlay displays a loading spinner, the current analysis stage (e.g., "Analyzing Section..."), and a progress bar.
    *   The overlay remains visible throughout the entire analysis process (including API calls and stream processing).
    *   Once the analysis completes (either successfully or with an error), the overlay remains visible for a short duration (approx. 1.5 seconds) before disappearing, allowing the user to see the final status/toast message.
    *   The button itself also shows a loading state and disables interaction while analysis is running.
3.  **Data Sent:** The button sends the main section's ID, title, status, and its array of `subsections` (each with ID, title, content) to the `/api/ai/analyze-document` endpoint.
4.  **Backend Processing (`analysisService.ts`):
    *   Processes subsections sequentially.
    *   **Placeholder Check:** Immediately fails subsections containing placeholders (e.g., `[TBD]`, `XXX`).
    *   **Agent Selection:** Chooses a specialized agent (Risk, Financial, General) based on subsection type.
    *   **Benchmark Fetch:** Retrieves relevant compliant examples from the Pinecone `exchangedocs` index based on subsection content.
    *   **Contextual Analysis:** The agent analyzes the subsection content, comparing it against the Pinecone benchmarks, while also considering the content of other subsections (passed as context) to avoid flagging valid cross-references as omissions.
    *   **Critique Generation:** The agent generates concise, reviewer-style critique points based *only* on deviations from the Pinecone benchmarks, avoiding generic advice or mentioning the examples directly.
    *   **Result Aggregation:** Results (compliance, score, critique) from each subsection are collected. An overall status/score is calculated for the main section. The detailed subsection results are stored in a `metadata.subsectionResults` array within the main section's result object.
5.  **Streaming & Context Update:** The aggregated result object is streamed back to the client (`DocumentAnalysisButton`), which dispatches updates (`SET_PROGRESS`, `SET_SECTION_RESULT`) to the `DocumentAnalysisContext`.
6.  **UI Display (`AIFeedback` & Overlay):** 
    *   The overlay content (stage text, progress bar) updates based on the `SET_PROGRESS` actions dispatched to the context.
    *   Each `AIFeedback` component reads the context, finds the aggregated result for its parent section, looks inside the `metadata.subsectionResults` array, extracts the specific result matching its own `subsectionId`, and displays the specific critique points and compliance status for that individual subsection *after* the analysis completes and the overlay is hidden.

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
