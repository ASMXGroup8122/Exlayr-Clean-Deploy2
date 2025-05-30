import { AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SharedDocumentExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Share Link Expired
          </h1>
          
          <p className="text-gray-600 mb-6">
            This shared document link has expired and is no longer accessible. 
            Please contact the document owner to request a new share link.
          </p>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Share links have expiration dates for security purposes.
            </p>
            
            <Button asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 
