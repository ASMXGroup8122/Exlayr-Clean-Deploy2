'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Plus, File, Download, Trash2, CheckCircle, Search, Filter } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type DocumentCategory = 
    | 'sponsor_guidelines'
    | 'compliance_docs'
    | 'due_diligence'
    | 'templates'
    | 'procedures'
    | 'regulations'
    | 'training'
    | 'other';

export default function SponsorKnowledgeVaultPage() {
    const { user } = useAuth();
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch documents
    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('knowledge_vault_documents')
                .select('*')
                .eq('organization_id', user?.organization_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.organization_id) {
            fetchDocuments();
        }
    }, [user]);

    return (
        <div className="p-4 md:p-6">
            {/* Responsive Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold">Knowledge Vault</h1>
                {/* Controls */}
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 h-9 text-sm w-full"
                        />
                    </div>
                    <Button
                        onClick={() => setShowUpload(!showUpload)}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm h-9 w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Add Document
                    </Button>
                </div>
            </div>

            {showUpload && user?.organization_id && (
                <div className="mb-6 p-4 bg-white rounded-lg shadow">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Document Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="sponsor_guidelines">Sponsor Guidelines</option>
                            <option value="compliance_docs">Compliance Documents</option>
                            <option value="due_diligence">Due Diligence Templates</option>
                            <option value="templates">Document Templates</option>
                            <option value="procedures">Procedures</option>
                            <option value="regulations">Regulations</option>
                            <option value="training">Training Materials</option>
                            <option value="other">Other Documents</option>
                        </select>
                    </div>
                    <DocumentUpload
                        category={selectedCategory}
                        organizationId={user.organization_id}
                        onUploadComplete={() => {
                            setShowUpload(false);
                            fetchDocuments();
                        }}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center items-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading documents...</p>
                        </div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by adding some documents.</p>
                    </div>
                ) : (
                    documents
                        .filter(doc => 
                            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.category.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-lg shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center">
                                        <File className="h-6 w-6 text-blue-500 mr-2" />
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">{doc.name}</h3>
                                            <p className="text-sm text-gray-500">{doc.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => window.open(doc.url, '_blank')}
                                            className="text-gray-400 hover:text-gray-500"
                                        >
                                            <Download className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Add delete functionality
                                            }}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
} 