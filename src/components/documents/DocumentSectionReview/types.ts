export interface Section {
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

export interface Comment {
    id: string;
    user_id: string;
    user_name: string;
    text: string;
    timestamp: string;
    status: 'open' | 'resolved' | 'needs_clarification';
}

export interface User {
    id: string;
    name: string;
    initials: string;
    avatarUrl?: string;
}

export interface AIAnalysisResult {
    isCompliant: boolean;
    score: number;
    suggestions?: string[];
    metadata?: any;
} 