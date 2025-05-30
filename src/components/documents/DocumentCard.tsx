'use client';

interface Document {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  sponsor?: string;
  listing_type?: string;
  feedback_count?: number;
  sections_reviewed?: number;
  total_sections?: number;
  analysis_status?: 'pending' | 'in_progress' | 'completed';
}

interface DocumentCardProps {
  document: Document;
  onSelect: () => void;
  isDragging?: boolean;
}

export function DocumentCard({ document, onSelect, isDragging }: DocumentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'in_review':
        return 'bg-blue-100 text-blue-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'listed':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'in_review':
        return 'In Review';
      case 'approved':
        return 'Approved';
      case 'listed':
        return 'Listed';
      default:
        return status;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`
        bg-white p-4 rounded-lg shadow-sm border 
        ${isDragging ? 'border-blue-400 shadow-lg' : 'border-gray-200 hover:border-blue-500'} 
        cursor-pointer transition-all duration-200
      `}
    >
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {document.title}
      </h4>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(document.status)}`}>
            {getStatusText(document.status)}
          </span>
          {document.listing_type && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              {document.listing_type}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Updated {formatDate(document.updated_at)}</span>
          {document.sponsor && (
            <span className="text-xs text-gray-500">
              {document.sponsor}
            </span>
          )}
        </div>
        {(document.sections_reviewed !== undefined && document.total_sections !== undefined) && (
          <div className="mt-2">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ 
                  width: `${(document.sections_reviewed / document.total_sections) * 100}%` 
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {document.sections_reviewed} of {document.total_sections} sections reviewed
              </span>
              {document.feedback_count !== undefined && (
                <span className="text-xs text-gray-500">
                  {document.feedback_count} feedback{document.feedback_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
