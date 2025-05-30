'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface DocumentSectionStatus {
  id: string;
  document_id: string;
  section_id: string;
  section_title: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  updated_by: string;
  updated_at: string;
  comment: string | null;
}

interface SponsorDocumentStatusProps {
  documentId: string;
}

export default function SponsorDocumentStatus({ documentId }: SponsorDocumentStatusProps) {
  const [sectionStatuses, setSectionStatuses] = useState<DocumentSectionStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = getSupabaseClient();
  
  useEffect(() => {
    fetchSectionStatuses();
    
    // Set up real-time subscription for status updates
    const channel = supabase
      .channel('document_section_status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_section_status',
          filter: `document_id=eq.${documentId}`
        },
        (payload) => {
          const newStatus = payload.new as DocumentSectionStatus;
          setSectionStatuses(prev => {
            // Check if we already have a status for this section
            const existingIndex = prev.findIndex(s => s.section_id === newStatus.section_id);
            if (existingIndex >= 0) {
              // Replace the existing status
              const updated = [...prev];
              updated[existingIndex] = newStatus;
              return updated;
            } else {
              // Add the new status
              return [...prev, newStatus];
            }
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);
  
  const fetchSectionStatuses = async () => {
    setLoading(true);
    try {
      // Fetch the latest status for each section
      const { data, error } = await supabase
        .from('document_section_status')
        .select('*')
        .eq('document_id', documentId)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching section statuses:', error);
        setError('Failed to load section statuses');
        return;
      }
      
      // Group by section_id and take the latest status for each section
      const latestStatuses = data.reduce((acc, status) => {
        if (!acc[status.section_id] || new Date(status.updated_at) > new Date(acc[status.section_id].updated_at)) {
          acc[status.section_id] = status;
        }
        return acc;
      }, {} as Record<string, DocumentSectionStatus>);
      
      setSectionStatuses(Object.values(latestStatuses));
      setError(null);
    } catch (error) {
      console.error('Error in fetchSectionStatuses:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (status: DocumentSectionStatus['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'needs_revision':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusText = (status: DocumentSectionStatus['status']) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'needs_revision':
        return 'Needs Revision';
      default:
        return 'Pending';
    }
  };
  
  const getStatusClass = (status: DocumentSectionStatus['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_revision':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading section statuses...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }
  
  if (sectionStatuses.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No section statuses available yet. The exchange will review your document sections and provide feedback.
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b">
        <h3 className="text-lg font-medium text-gray-900">Document Section Status</h3>
        <p className="mt-1 text-sm text-gray-500">
          Review the status of each section in your document and address any revision requests.
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {sectionStatuses.map((status) => (
          <div key={status.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(status.status)}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{status.section_title}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(status.status)}`}>
                    {getStatusText(status.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Updated {formatDate(status.updated_at)}
                </p>
                
                {status.comment && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                    <p className="font-medium text-xs text-gray-500 mb-1">Reviewer Comment:</p>
                    {status.comment}
                  </div>
                )}
                
                {status.status === 'needs_revision' && (
                  <div className="mt-3">
                    <a
                      href={`/dashboard/sponsor/listings/${documentId}/document?section=${status.section_id}&action=edit`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit Section
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
