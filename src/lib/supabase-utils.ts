import type { Database } from '@/types/supabase';
import type { ExchangeDocument, DocumentMetadata } from '@/types/document';
import { SupabaseClient } from '@supabase/supabase-js';

export async function fetchExchangeDocuments(
    supabase: SupabaseClient<Database>,
    exchangeId: string
): Promise<ExchangeDocument[]> {
    const { data, error } = await supabase
        .from('exchange_documents')
        .select('*')
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(doc => ({
        ...doc,
        metadata: doc.metadata as DocumentMetadata
    }));
}

export async function createExchangeDocument(
    supabase: SupabaseClient<Database>,
    exchangeId: string,
    file: File,
    category: string,
    filePath: string
) {
    const newDoc = {
        exchange_id: exchangeId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: filePath,
        category: category as Database['public']['Tables']['exchange_documents']['Insert']['category'],
        content_type: 'file',
        status: 'pending' as const,
        year: new Date().getFullYear(),
        metadata: {
            version: '1.0',
            status: 'draft',
            tags: []
        }
    };

    const { error } = await supabase
        .from('exchange_documents')
        .insert([newDoc]);

    if (error) throw error;
}

export async function deleteExchangeDocument(
    supabase: SupabaseClient<Database>,
    documentId: string
) {
    const { error } = await supabase
        .from('exchange_documents')
        .delete()
        .eq('id', documentId);

    if (error) throw error;
} 