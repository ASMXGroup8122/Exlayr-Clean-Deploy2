/**
 * Represents a subsection of a listing document.
 */
export interface Subsection {
  id: string;      // Corresponds to column name (e.g., 'sec1_generalinfo')
  title: string;   // User-friendly title (e.g., 'General Information')
  content: string; // Content from the corresponding column
}

/**
 * Represents a main section of a listing document, containing multiple subsections.
 */
export interface Section {
  id: string;      // Main section identifier (e.g., 'sec1')
  document_id: string; // Foreign key to listing table (instrumentid)
  title: string;   // Main section title (e.g., 'Section 1: Document Overview')
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress' | 'draft' | 'locked' | 'ai_reviewed' | string | null; // Status for the main section - Allow string for flexibility
  version?: number; // Placeholder for potential version tracking
  created_at?: string;
  updated_at?: string;
  subsections: Subsection[]; // Array of the actual content fields within this section
}

/**
 * Represents a comment made on a specific subsection of a document.
 */
export interface Comment {
  id: string;
  document_id: string;
  section_id: string; // Stores the subsection ID (e.g., 'sec1_generalinfo')
  user_id: string;
  user_name: string; // Denormalized: Stored directly in the table
  content: string;
  created_at: string;
  status?: 'open' | 'resolved' | 'needs_clarification'; // Example statuses
} 