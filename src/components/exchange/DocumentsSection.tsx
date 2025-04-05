'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, Search, Filter, Calendar, Tag } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import type { ExchangeDocument, DocumentMetadata } from '@/types/document';
import { format } from 'date-fns';
import { fetchExchangeDocuments, createExchangeDocument, deleteExchangeDocument } from '@/lib/supabase-utils';

type DocumentCategory = {
    id: string;
    name: string;
    description: string;
    subcategories: {
        id: string;
        name: string;
        type: string;
    }[];
};

const documentCategories: DocumentCategory[] = [
    {
        id: 'listing',
        name: 'Listing Documentation',
        description: 'Documents related to listing process and requirements',
        subcategories: [
            { id: 'listing_rules', name: 'Listing Rules', type: 'listing_rules' },
            { id: 'listing_application', name: 'Listing Application', type: 'listing_application' },
            { id: 'listing_fees', name: 'Listing Fees', type: 'listing_fees' },
            { id: 'listing_requirements', name: 'Listing Requirements', type: 'listing_requirements' },
            { id: 'listing_process', name: 'Listing Process', type: 'listing_process' }
        ]
    },
    {
        id: 'regulatory',
        name: 'Regulatory Documentation',
        description: 'Regulatory and compliance documents',
        subcategories: [
            { id: 'exchange_license', name: 'Exchange License', type: 'exchange_license' },
            { id: 'regulatory_filings', name: 'Regulatory Filings', type: 'regulatory_filings' },
            { id: 'compliance_requirements', name: 'Compliance Requirements', type: 'compliance_requirements' },
            { id: 'regulatory_updates', name: 'Regulatory Updates', type: 'regulatory_updates' }
        ]
    },
    {
        id: 'operational',
        name: 'Operational Documentation',
        description: 'Trading and operational documents',
        subcategories: [
            { id: 'trading_rules', name: 'Trading Rules', type: 'trading_rules' },
            { id: 'market_making_rules', name: 'Market Making Rules', type: 'market_making_rules' },
            { id: 'trading_hours', name: 'Trading Hours', type: 'trading_hours' },
            { id: 'trading_fees', name: 'Trading Fees', type: 'trading_fees' },
            { id: 'settlement_procedures', name: 'Settlement Procedures', type: 'settlement_procedures' },
            { id: 'custody_requirements', name: 'Custody Requirements', type: 'custody_requirements' },
            { id: 'clearing_procedures', name: 'Clearing Procedures', type: 'clearing_procedures' }
        ]
    },
    {
        id: 'technical',
        name: 'Technical Documentation',
        description: 'Technical and integration documents',
        subcategories: [
            { id: 'api_documentation', name: 'API Documentation', type: 'api_documentation' },
            { id: 'technical_specifications', name: 'Technical Specifications', type: 'technical_specifications' },
            { id: 'integration_guides', name: 'Integration Guides', type: 'integration_guides' }
        ]
    }
];

interface DocumentsSectionProps {
    exchangeId: string;
    documents: ExchangeDocument[];
    onDocumentUpdate: (updatedDocs: ExchangeDocument[]) => void;
}

export function DocumentsSection({ 
    exchangeId,
    documents = [],
    onDocumentUpdate 
}: DocumentsSectionProps) {
    const supabase = getSupabaseClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        category: '',
        status: '',
        dateRange: '',
    });
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<ExchangeDocument | null>(null);

    const refreshDocuments = async () => {
        try {
            const docs = await fetchExchangeDocuments(supabase, exchangeId);
            onDocumentUpdate(docs);
        } catch (err) {
            console.error('Error fetching documents:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch documents');
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, category: string) => {
        try {
            setIsUploading(true);
            setError(null);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('No file selected');
            }

            const file = event.target.files[0];

            // Get user data
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Failed to get user data');

            // Generate file path
            const timestamp = new Date().getTime();
            const fileName = `${timestamp}-${file.name}`;
            const filePath = `exchange/${exchangeId}/${fileName}`;

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('exchange_documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            try {
                // Create database record
                await createExchangeDocument(supabase, exchangeId, file, category, filePath);
                // Refresh documents list
                await refreshDocuments();
            } catch (error) {
                // If database insert fails, remove the uploaded file
                await supabase.storage
                    .from('exchange_documents')
                    .remove([filePath]);
                throw error;
            }

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Upload error:', error);
            setError(error instanceof Error ? error.message : 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (doc: ExchangeDocument) => {
        try {
            setIsDeleting(true);
            
            // Delete from storage if file_path exists
            if (doc.file_path) {
                const { error: storageError } = await supabase.storage
                    .from('exchange_documents')
                    .remove([doc.file_path]);

                if (storageError) {
                    throw new Error('Failed to delete file from storage');
                }
            }

            // Delete from database
            await deleteExchangeDocument(supabase, doc.id);

            // Refresh documents list
            await refreshDocuments();
        } catch (err) {
            console.error('Delete error:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete document');
        } finally {
            setIsDeleting(false);
        }
    };

    const filterDocuments = (docs: ExchangeDocument[]) => {
        if (!docs) return [];
        
        return docs.filter(doc => {
            const matchesSearch = searchTerm === '' || 
                doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (doc.metadata?.tags || []).some(tag => 
                    tag.toLowerCase().includes(searchTerm.toLowerCase())
                );

            const matchesCategory = filters.category === '' || 
                doc.category === filters.category;

            const matchesStatus = filters.status === '' || 
                doc.status === filters.status;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    };

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentation</h2>
            
            <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border rounded-md"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            className="border rounded-md px-3 py-2"
                        >
                            <option value="">All Categories</option>
                            {documentCategories.flatMap(cat => 
                                cat.subcategories.map(sub => (
                                    <option key={sub.id} value={sub.type}>{sub.name}</option>
                                ))
                            )}
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="border rounded-md px-3 py-2"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documentCategories.map((category) => (
                    <div 
                        key={category.id}
                        className="bg-white rounded-lg shadow p-6"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {category.description}
                        </p>
                        
                        <div className="space-y-4">
                            {category.subcategories.map((subcategory) => {
                                const categoryDocs = documents.filter(
                                    doc => doc.category === subcategory.type
                                );

                                return (
                                    <div key={subcategory.id} className="border-t pt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-gray-900">
                                                {subcategory.name}
                                            </h4>
                                            <label className="relative cursor-pointer">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    onChange={(e) => {
                                                        console.log('Selected category:', subcategory.type);
                                                        setSelectedCategory(subcategory.type);
                                                        handleFileUpload(e, subcategory.type);
                                                    }}
                                                    accept=".pdf,.doc,.docx,.txt"
                                                    disabled={isUploading}
                                                />
                                                <div className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                                    <Upload className="h-4 w-4 mr-1" />
                                                    Upload
                                                </div>
                                            </label>
                                        </div>

                                        {categoryDocs.length > 0 ? (
                                            <div className="space-y-2">
                                                {categoryDocs.map((doc) => (
                                                    <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                                        <div className="flex items-center">
                                                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-sm text-gray-900">{doc.file_name}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleDelete(doc)}
                                                                className="text-red-600 hover:text-red-800"
                                                                disabled={isDeleting}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                No documents uploaded
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DocumentItem({ document, onDelete }: { document: ExchangeDocument; onDelete: () => void }) {
    const [showMetadata, setShowMetadata] = useState(false);

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                        <span className="text-sm font-medium text-gray-900">{document.file_name}</span>
                        <div className="flex items-center space-x-2 mt-1">
                            {document.status && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                    document.status === 'current' ? 'bg-green-100 text-green-800' :
                                    document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {document.status}
                                </span>
                            )}
                            {document.metadata?.version && (
                                <span className="text-xs text-gray-500">v{document.metadata.version}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowMetadata(!showMetadata)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <Tag className="h-4 w-4" />
                    </button>
                    <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${document.storage_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        View
                    </a>
                    <button
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-800"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            
            {showMetadata && (
                <div className="px-2 py-3 bg-gray-50 rounded-md text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-600">Last Review:</p>
                            <p>{document.metadata?.lastReviewDate ? 
                                format(new Date(document.metadata.lastReviewDate), 'PP') : 
                                'Not reviewed'}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Next Review:</p>
                            <p>{document.metadata?.nextReviewDate ? 
                                format(new Date(document.metadata.nextReviewDate), 'PP') : 
                                'Not scheduled'}</p>
                        </div>
                        {document.metadata?.tags && (
                            <div className="col-span-2">
                                <p className="text-gray-600">Tags:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {document.metadata.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 