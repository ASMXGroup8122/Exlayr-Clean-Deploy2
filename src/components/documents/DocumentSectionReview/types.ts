export interface Section {
    id: string;
    title: string;
    content: string;
    status: 'draft' | 'ai reviewed' | 'approved' | 'locked';
    lastUpdatedBy: string;
    lastUpdatedByName: string;
    comments: Comment[];
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: string;
    status: 'open' | 'resolved' | 'needs clarification';
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