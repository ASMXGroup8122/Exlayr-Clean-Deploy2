export type ListingStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected';
export type DocumentStatus = 'required' | 'pending' | 'in_review' | 'submitted' | 'rejected';
export type IPOStage = 'initial_filing' | 'documentation' | 'due_diligence' | 'final_approval';
export type ReviewStatus = 'draft' | 'under_review' | 'revision_requested' | 'approved' | 'rejected';
export type DocumentReviewCycleStatus = 'in_progress' | 'completed' | 'cancelled' | 'needs_revision';

export interface Document {
    id: string;
    name: string;
    type: string;
    status: DocumentStatus;
    dueDate: string;
    submittedDate?: string;
    comments?: string;
}

export interface IPOListing {
    id: string;
    companyName: string;
    status: ListingStatus;
    currentStage: IPOStage;
    progress: number;
    sponsor: string;
    submissionDate: string;
    targetDate: string;
    documents: Document[];
}

export interface DocumentReviewCycle {
  id: string;
  document_id: string;
  cycle_number: number;
  started_at: string;
  completed_at: string | null;
  submitted_by: string;
  reviewed_by: string | null;
  status: DocumentReviewCycleStatus;
  ai_analysis_summary?: {
    compliantSections: number;
    partiallyCompliantSections: number;
    nonCompliantSections: number;
    overallCompliance: boolean;
    completedAt: string;
    status?: string;
    reason?: string;
  };
}

export interface RevisionRequest {
  id: string;
  review_cycle_id: string;
  document_id: string;
  section_id: string;
  content: string;
  status: 'pending' | 'addressed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SectionVersionHistory {
  id: string;
  document_id: string;
  section_id: string;
  version_number: number;
  content: string;
  compliance_score: number;
  created_at: string;
  review_cycle_id: string;
} 