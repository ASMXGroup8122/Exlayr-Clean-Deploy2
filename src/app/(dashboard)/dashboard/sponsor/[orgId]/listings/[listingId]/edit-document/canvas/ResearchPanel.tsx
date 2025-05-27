import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, X, Plus, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { DocumentUpload } from '@/components/documents/DocumentUpload';

interface ResearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  organizationId: string;
  activeFieldId?: string;
  activeFieldTitle?: string;
  onInsertContent: (content: string) => void;
  suggestedCategory?: string; // Category suggested by Smart Agent
  suggestedLabel?: string; // Label suggested by Smart Agent (e.g., "accounts", "financial statements")
}

interface KnowledgeDocument {
  id: string;
  name: string;
  category: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
  organization_id: string;
  issuer_id?: string;
}

// Document categories for Knowledge Vault
const DOCUMENT_CATEGORIES = [
  { value: 'accounts', label: 'Accounts & Financial Statements' },
  { value: 'business_plan', label: 'Business Plan' },
  { value: 'memorandum_articles', label: 'Memorandum & Articles' },
  { value: 'director_cvs', label: 'Directors\' CVs' },
  { value: 'director_contracts', label: 'Directors\' Contracts' },
  { value: 'material_contracts', label: 'Material Contracts' },
  { value: 'investment_deck', label: 'Investment Deck' },
  { value: 'press_releases', label: 'Press Releases' },
  { value: 'compliance_docs', label: 'Compliance Documents' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'other', label: 'Other Documents' }
];

export function ResearchPanel({
  isOpen,
  onClose,
  listingId,
  organizationId,
  activeFieldId,
  activeFieldTitle,
  onInsertContent,
  suggestedCategory,
  suggestedLabel
}: ResearchPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState(suggestedCategory || 'other');
  const [customLabel, setCustomLabel] = useState(suggestedLabel || '');
  const [isUploading, setIsUploading] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<KnowledgeDocument[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const supabase = getSupabaseClient();

  // Load recent documents
  useEffect(() => {
    const loadRecentDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('knowledge_vault_documents')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setRecentDocuments(data || []);
      } catch (error) {
        console.error('Error loading recent documents:', error);
      }
    };

    if (isOpen && organizationId) {
      loadRecentDocuments();
    }
  }, [isOpen, organizationId, supabase]);

  // Set suggested category when provided
  useEffect(() => {
    if (suggestedCategory) {
      setSelectedCategory(suggestedCategory);
    }
    if (suggestedLabel) {
      setCustomLabel(suggestedLabel);
    }
  }, [suggestedCategory, suggestedLabel]);

  const handleUploadComplete = useCallback(() => {
    setIsUploading(false);
    setShowUploadForm(false);
    toast({
      title: "Upload Complete",
      description: "Documents have been uploaded and are being processed for AI search.",
    });
    
    // Refresh recent documents
    const loadRecentDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('knowledge_vault_documents')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setRecentDocuments(data || []);
      } catch (error) {
        console.error('Error loading recent documents:', error);
      }
    };
    
    loadRecentDocuments();
  }, [organizationId, supabase]);

  const getCategoryLabel = (value: string) => {
    return DOCUMENT_CATEGORIES.find(cat => cat.value === value)?.label || value;
  };

  // Debug logging
  console.log('🔍 ResearchPanel render:', {
    isOpen,
    suggestedCategory,
    suggestedLabel,
    activeFieldTitle,
    organizationId
  });

  if (!isOpen) {
    console.log('🔍 ResearchPanel: Not rendering because isOpen is false');
    return null;
  }

  console.log('🔍 ResearchPanel: Rendering modal...');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Knowledge Vault Upload</h2>
            <p className="text-sm text-gray-500 mt-1">
              {suggestedLabel ? 
                `Upload ${suggestedLabel} documents for AI analysis` : 
                'Upload documents to your Knowledge Vault for AI-powered research'
              }
            </p>
            {activeFieldTitle && (
              <Badge variant="outline" className="mt-2">
                For: {activeFieldTitle}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <Tabs defaultValue="upload" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Documents</TabsTrigger>
              <TabsTrigger value="recent">Recent Uploads</TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="flex-1 mt-4 space-y-4 overflow-y-auto pb-4">
              {/* Category Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {DOCUMENT_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {suggestedCategory && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✨ Suggested by Smart Agent based on your request
                    </p>
                  )}
                </div>

                {/* Custom Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Label (Optional)
                  </label>
                  <Input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g., 2023 Annual Accounts, Q3 Financial Report"
                    className="w-full"
                  />
                  {suggestedLabel && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✨ Suggested label: "{suggestedLabel}"
                    </p>
                  )}
                </div>
              </div>

              {/* Upload Component */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <DocumentUpload
                  category={selectedCategory as any}
                  organizationId={organizationId}
                  onUploadComplete={handleUploadComplete}
                  allowedFileTypes={['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx']}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                />
              </div>

              {/* Upload Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Documents are automatically processed and embedded for AI search</li>
                      <li>• Smart Agent will use these documents to answer your questions</li>
                      <li>• Proper categorization improves search accuracy</li>
                      <li>• Supported formats: PDF, Word, Text, CSV, Excel</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Recent Uploads Tab */}
            <TabsContent value="recent" className="flex-1 mt-4 overflow-y-auto">
              {recentDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Upload your first document to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Recently Uploaded Documents
                  </h3>
                  {recentDocuments.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {doc.name}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {getCategoryLabel(doc.category)} • {(doc.size / 1024 / 1024).toFixed(1)}MB
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Documents will be available to Smart Agent immediately after upload
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 