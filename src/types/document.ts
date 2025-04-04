import type { Database } from './supabase';

export type DocumentMetadata = {
    version?: string;
    status?: 'draft' | 'current' | 'archived';
    tags?: string[];
    lastReviewDate?: string;
    nextReviewDate?: string;
    reviewer?: string;
};

export type ExchangeDocument = Omit<Database['public']['Tables']['exchange_documents']['Row'], 'metadata'> & {
    metadata: DocumentMetadata | null;
}; 