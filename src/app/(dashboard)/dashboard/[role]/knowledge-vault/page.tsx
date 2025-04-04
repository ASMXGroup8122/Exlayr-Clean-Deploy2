'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Plus, File, Download, Trash2, CheckCircle } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';

type DocumentCategory = 
    | 'memorandum_articles'
    | 'director_cvs'
    | 'director_contracts'
    | 'material_contracts'
    | 'business_plan'
    | 'investment_deck'
    | 'accounts'
    | 'press_releases'
    | 'other';

export default function KnowledgeVaultPage() {
    const { user } = useAuth();
    const [issuerStatus, setIssuerStatus] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
    const [issuerId, setIssuerId] = useState<number | null>(null);

    // Fetch issuer status and ID
    const fetchIssuerInfo = async () => {
        try {
            const { data, error } = await supabase
                .from('issuers')
                .select('id, status')
                .single();
            
            if (error) throw error;
            if (data) {
                setIssuerId(data.id);
                setIssuerStatus(data.status);
            }
        } catch (err) {
            console.error('Error fetching issuer info:', err);
        }
    };

    useEffect(() => {
        fetchIssuerInfo();
    }, []);

    // Show pending message if not approved
    if (issuerStatus !== 'approved') {
        return (
            <div className="p-6">
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <div className="mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="h-12 w-12 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Knowledge Vault Access Pending
                    </h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                        Your Knowledge Vault is being prepared and will be available once your issuer application is approved.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Knowledge Vault</h1>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Document
                </button>
            </div>

            {showUpload && (
                <div className="mb-6 p-4 bg-white rounded-lg shadow">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Document Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="memorandum_articles">Memorandum and Articles</option>
                            <option value="director_cvs">Directors' CVs</option>
                            <option value="director_contracts">Directors' Contracts</option>
                            <option value="material_contracts">Material Contracts</option>
                            <option value="business_plan">Business Plan</option>
                            <option value="investment_deck">Investment Deck</option>
                            <option value="accounts">Accounts</option>
                            <option value="press_releases">Press Releases</option>
                            <option value="other">Other Documents</option>
                        </select>
                    </div>
                    {issuerId && (
                        <DocumentUpload
                            category={selectedCategory}
                            issuerId={issuerId}
                            onUploadComplete={() => {
                                setShowUpload(false);
                                // We'll add document refresh logic in the next update
                            }}
                        />
                    )}
                </div>
            )}

            {/* Document list will be added in next update */}
        </div>
    );
} 