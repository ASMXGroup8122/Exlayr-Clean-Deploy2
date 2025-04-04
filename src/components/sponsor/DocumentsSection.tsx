'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type Document = {
    id: string;
    name: string;
    type: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    storage_path: string;
    created_at: string;
    updated_at: string;
    uploaded_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
};

interface DocumentsSectionProps {
    entityId: string;
    entityType: 'sponsor' | 'exchange' | 'issuer' | 'listing';
    documents: Document[];
    onDocumentUpdate: (updatedDocs: Document[]) => void;
}

export function DocumentsSection({ 
    entityId,
    entityType,
    documents = [],
    onDocumentUpdate 
}: DocumentsSectionProps) {
    const supabase = createClientComponentClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [localDocuments, setLocalDocuments] = useState<Document[]>(documents);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch documents when entityId/entityType changes
    useEffect(() => {
        let mounted = true;

        const fetchDocuments = async () => {
            try {
                const { data: latestDocs, error: docsError } = await supabase
                    .from('exchange_sponsor_documents')
                    .select('*')
                    .eq('entity_type', entityType)
                    .eq('entity_id', entityId)
                    .order('created_at', { ascending: false });

                if (docsError) throw docsError;

                if (mounted && latestDocs) {
                    setLocalDocuments(latestDocs);
                    onDocumentUpdate(latestDocs);
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };

        fetchDocuments();

        return () => {
            mounted = false;
        };
    }, [entityId, entityType, supabase, onDocumentUpdate]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setIsUploading(true);
            setError(null);
            
            const file = event.target.files?.[0];
            if (!file) {
                throw new Error('No file selected');
            }

            // Get user data
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Failed to get user data');
            }

            const timestamp = new Date().getTime();
            const fileName = `${timestamp}-${file.name}`;
            const filePath = `${entityType}/${entityId}/${fileName}`;

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('exchange_sponsor_documents')
                .upload(filePath, file);

            if (uploadError) {
                throw new Error('Failed to upload file');
            }

            // Create database record
            const { error: insertError } = await supabase
                .from('exchange_sponsor_documents')
                .insert({
                    name: file.name,
                    type: file.type,
                    status: 'pending',
                    entity_type: entityType,
                    entity_id: entityId,
                    storage_path: filePath,
                    uploaded_by: user.id
                });

            if (insertError) {
                // If database insert fails, remove the uploaded file
                await supabase.storage
                    .from('exchange_sponsor_documents')
                    .remove([filePath]);
                throw new Error('Failed to create document record');
            }

            // Refresh documents list
            const { data: updatedDocs } = await supabase
                .from('exchange_sponsor_documents')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId);

            if (updatedDocs) {
                onDocumentUpdate(updatedDocs);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload document');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (doc: Document) => {
        try {
            setIsDeleting(true);
            
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('exchange_sponsor_documents')
                .remove([doc.storage_path]);

            if (storageError) {
                throw new Error('Failed to delete file from storage');
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('exchange_sponsor_documents')
                .delete()
                .eq('id', doc.id);

            if (dbError) {
                throw new Error('Failed to delete document record');
            }

            // Refresh documents list
            const { data: updatedDocs } = await supabase
                .from('exchange_sponsor_documents')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId);

            if (updatedDocs) {
                onDocumentUpdate(updatedDocs);
            }
        } catch (err) {
            console.error('Delete error:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete document');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Documents</h2>
                <div className="flex items-center gap-2">
                    <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Upload Document'}
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt"
                            disabled={isUploading}
                            ref={fileInputRef}
                        />
                    </label>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                    {error}
                </div>
            )}

            {isUploading && (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-600">Uploading document...</span>
                </div>
            )}

            <div className="border rounded-lg divide-y">
                {localDocuments.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        No documents uploaded yet
                    </div>
                ) : (
                    localDocuments.map((doc) => (
                        <div key={doc.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                    <p className="text-xs text-gray-500">
                                        Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                        {doc.status !== 'draft' && ` • ${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDelete(doc)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 