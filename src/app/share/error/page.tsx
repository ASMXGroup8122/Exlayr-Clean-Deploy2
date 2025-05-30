'use client';

import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SharedDocumentErrorPage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Access Document
          </h1>
          
          <p className="text-gray-600 mb-6">
            We encountered an error while trying to load this shared document. 
            The link may be invalid or the document may no longer be available.
          </p>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Please check the link and try again, or contact the document owner.
            </p>
            
            <div className="flex gap-2">
              <button 
                onClick={handleRefresh}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Try Again
              </button>
              
              <Button asChild className="flex-1">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Homepage
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
