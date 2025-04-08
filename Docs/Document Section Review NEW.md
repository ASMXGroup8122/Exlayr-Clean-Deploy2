# Document Section Review Implementation Guide

## Overview
This document outlines the implementation of the Document Review System, which provides a collaborative interface for document review with AI integration. The system consists of two main views:
1. Kanban Board View (`/dashboard/exchange/listings`) - For managing document workflow states
2. Document Review View (`/dashboard/exchange/[id]/documents`) - For detailed document section review

## System Architecture

### 1. Kanban Board Implementation

#### Database Schema
```typescript
interface Document {
  instrumentid: string;        // Primary key
  title: string;
  instrumentsecuritiesadmissionstatus: 'draft' | 'pending' | 'approved' | 'listed';
  updated_at: string;
  sponsor?: string;
  listing_type?: string;
  feedback_count?: number;
  sections_reviewed?: number;
  total_sections?: number;
}
```

#### UI Status Mapping
```typescript
UI Status    | Database Status
------------|----------------
in_review   | draft
pending     | pending
approved    | approved
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

### 2. Document Review Implementation

#### Data Models
```typescript
interface Section {
  id: string;
  document_id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';
  version: number;
  created_at: string;
  updated_at: string;
  group?: string;
}

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  timestamp: string;
  status: 'open' | 'resolved' | 'needs_clarification';
}
```

#### Component Hierarchy
```
DocumentSectionReview
├── Header
│   ├── BackToDocuments
│   ├── DocumentTitle
│   └── ActionButtons
│       ├── SaveDraft
│       └── SubmitForReview
├── TableOfContents
│   └── SectionList
└── MainContent
    └── SectionComponent[]
        ├── SectionHeader
        ├── ContentEditor
        ├── AIFeedback
        └── CommentSection
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
    "framer-motion": "latest",
    "lucide-react": "latest",
    "tailwindcss": "latest",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "latest"
  }
}
```

### 2. Key Components Implementation

#### DocumentKanbanBoard
```typescript
interface KanbanBoardProps {
  onDocumentSelect: (documentId: string) => void;
}

const DocumentKanbanBoard = ({ onDocumentSelect }: KanbanBoardProps) => {
  // State management for documents and drag operations
  // Implementation of drag-and-drop logic
  // Database updates with optimistic UI
};
```

#### DocumentSectionReview
```typescript
interface DocumentSectionReviewProps {
  documentId: string;
}

const DocumentSectionReview = ({ documentId }: DocumentSectionReviewProps) => {
  // Document section management
  // AI integration
  // Comment system
};
```

### 3. Context Providers
```typescript
// DocumentAnalysisContext
interface DocumentAnalysisState {
  isAnalyzing: boolean;
  analysisResult: any;
  error: string | null;
  sectionStates: Record<string, SectionState>;
  currentSection: string | null;
}

// Required Providers Hierarchy
<DocumentAnalysisProvider>
  <DocumentSectionReview />
</DocumentAnalysisProvider>
```

## Database Integration

### 1. Tables Required
- `listing` - Document metadata and status
- `document_sections` - Individual document sections
- `comments` - User comments on sections
- `analysis_results` - AI analysis results

### 2. Key Database Operations
```typescript
// Update document status
const updateDocumentStatus = async (documentId: string, status: string) => {
  const { error } = await supabase
    .from('listing')
    .update({
      instrumentsecuritiesadmissionstatus: status
    })
    .eq('instrumentid', documentId);
};

// Fetch document sections
const fetchSections = async (documentId: string) => {
  const { data, error } = await supabase
    .from('document_sections')
    .select('*')
    .eq('document_id', documentId)
    .order('section_order');
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
