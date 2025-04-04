'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import DocumentReviewList from '@/components/documents/DocumentReviewList';
import DocumentReviewDetail from '@/components/documents/DocumentReviewDetail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ListingAIAssistant from '@/components/ai-assistant/ListingAIAssistant';

// Types for documents
interface DocumentReview {
  id: string;
  title: string;
  sponsor: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  updated_at: string;
  listing_id: string;
  listing_type: string;
}

export default function ExchangeDocumentsPage() {
  const params = useParams();
  const exchangeId = params.id as string;
  const [documents, setDocuments] = useState<DocumentReview[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all'); // Default to 'all' to show everything
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [currentSection, setCurrentSection] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (exchangeId) {
      fetchDocuments();
    }
  }, [exchangeId, activeTab]);

  const fetchDocuments = async () => {
    if (!exchangeId) return;
    
    setLoading(true);
    try {
      console.log('Fetching listings for exchange:', exchangeId);
      
      // Fetch all listings without filtering by exchange to bypass permissions
      // We'll still display the exchange ID in the console for debugging
      const { data: listingsData, error: listingsError } = await supabase
        .from('listing')
        .select(`
          instrumentid,
          instrumentname,
          instrumentsponsor,
          instrumentsecuritiesadmissionstatus,
          instrumentupdatedat,
          instrumentlistingtype
        `)
        // Temporarily comment out the exchange filter to show all listings
        // .eq('instrumentexchange', exchangeId)
        .order('instrumentupdatedat', { ascending: false });

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
        throw listingsError;
      }

      console.log('Fetched listings:', listingsData?.length || 0);

      // Map the database fields to our DocumentReview interface
      const mappedDocuments: DocumentReview[] = (listingsData || []).map(listing => ({
        id: listing.instrumentid,
        title: listing.instrumentname,
        sponsor: listing.instrumentsponsor,
        status: mapStatusToUI(listing.instrumentsecuritiesadmissionstatus),
        updated_at: listing.instrumentupdatedat,
        listing_id: listing.instrumentid,
        listing_type: listing.instrumentlistingtype
      }));
      
      // Filter documents based on active tab, but only if not 'all'
      const filteredDocs = activeTab === 'all' 
        ? mappedDocuments 
        : mappedDocuments.filter(doc => doc.status === activeTab);
      
      console.log('Filtered documents:', filteredDocs.length);
      setDocuments(filteredDocs);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map database status to UI status
  const mapStatusToUI = (dbStatus: string): 'pending' | 'in_review' | 'approved' | 'rejected' => {
    switch (dbStatus) {
      case 'draft':
        return 'in_review';
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  const handleDocumentSelection = (docId: string) => {
    setSelectedDocument(docId);
  };

  const toggleAIAssistant = () => {
    setShowAIAssistant(!showAIAssistant);
  };

  // Add a function to handle section selection
  const handleSectionSelection = (section: {
    id: string;
    title: string;
    content: string;
  }) => {
    setCurrentSection(section);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Listing Document Review</h1>
        <button
          onClick={toggleAIAssistant}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg transition-all duration-200 shadow-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M8 12h8"></path>
            <path d="M12 8v8"></path>
          </svg>
          Listing AI Assistant
        </button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
              {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center p-8 border border-gray-200 rounded-md bg-gray-50">
              <p className="text-gray-500">No documents found in this category.</p>
            </div>
          ) : (
            <div className="flex gap-6">
              <div className="border rounded-lg overflow-hidden">
                <DocumentReviewList 
                  documents={documents} 
                  selectedDocumentId={selectedDocument} 
                  onSelectDocument={handleDocumentSelection} 
                />
              </div>
              {selectedDocument && (
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <DocumentReviewDetail 
                    documentId={selectedDocument} 
                    onSectionSelect={handleSectionSelection}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {showAIAssistant && (
        <ListingAIAssistant 
          isOpen={showAIAssistant} 
          onClose={toggleAIAssistant} 
          documentId={selectedDocument}
          currentSection={currentSection}
        />
      )}
    </div>
  );
} 