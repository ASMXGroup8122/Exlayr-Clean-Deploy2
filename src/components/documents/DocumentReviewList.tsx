'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '@/styles/document-list.css';

// Types
interface Document {
  id: string;
  title: string;
  sponsor: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  updated_at: string;
  listing_id: string;
  listing_type?: string; // Make it optional for backward compatibility
}

interface DocumentReviewListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
}

export default function DocumentReviewList({
  documents,
  selectedDocumentId,
  onSelectDocument
}: DocumentReviewListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  
  // Load collapsed state from localStorage on component mount
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('documentListCollapsed');
    if (savedCollapsedState !== null) {
      setCollapsed(savedCollapsedState === 'true');
    }
  }, []);
  
  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('documentListCollapsed', String(collapsed));
  }, [collapsed]);
  
  // Sort documents
  const sortedDocuments = [...documents].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });
  
  // Filter documents based on search term
  const filteredDocuments = sortedDocuments.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.sponsor.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Status badge styling
  const getStatusBadgeClass = (status: Document['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`flex flex-col h-full relative transition-all duration-300 ${collapsed ? 'document-list-collapsed' : 'document-list-expanded'}`}>
      {/* Collapse toggle button */}
      <button
        onClick={toggleCollapsed}
        className="toggle-button"
        title={collapsed ? "Expand document list" : "Collapse document list"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {!collapsed ? (
        <>
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            
            {/* Search and Sort Controls */}
            <div className="flex flex-col space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <input
                  type="text"
                  className="pl-10 w-full rounded-md border border-gray-300 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-1 text-xs rounded-md ${
                    sortBy === 'date' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Sort by Date
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-3 py-1 text-xs rounded-md ${
                    sortBy === 'name' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Sort by Name
                </button>
              </div>
            </div>
          </div>
          
          {/* Document List */}
          <div className="flex-1 overflow-y-auto">
            {filteredDocuments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No documents match your search criteria.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <li 
                    key={doc.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedDocumentId === doc.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectDocument(doc.id)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(doc.status)}`}>
                          {doc.status.replace('_', ' ').charAt(0).toUpperCase() + doc.status.replace('_', ' ').slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">{formatDate(doc.updated_at)}</span>
                      </div>
                      <h3 className="font-medium mt-2 text-gray-900 truncate">{doc.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Sponsor: {doc.sponsor}</p>
                      {doc.listing_type && (
                        <p className="text-xs text-gray-500 mt-1">Type: {doc.listing_type}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        /* Collapsed view - just show status indicators for selected document */
        <div className="flex flex-col h-full items-center pt-4 border-r border-gray-200">
          {selectedDocumentId && filteredDocuments.find(doc => doc.id === selectedDocumentId) && (
            <div className="flex items-center mb-4">
              <span className="vertical-text">
                {filteredDocuments.find(doc => doc.id === selectedDocumentId)?.title}
              </span>
            </div>
          )}
          <div className="flex flex-col space-y-2 items-center mt-4">
            {filteredDocuments.map((doc) => (
              <div 
                key={doc.id}
                className={`document-indicator w-6 h-6 rounded-full cursor-pointer border-2 ${
                  selectedDocumentId === doc.id 
                    ? 'border-blue-500' 
                    : 'border-transparent'
                } ${getStatusBadgeClass(doc.status)}`}
                onClick={() => onSelectDocument(doc.id)}
                title={doc.title}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
