import Link from 'next/link';
import { ExternalLink, AlertCircle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ElevenLabsConnectionHelperProps {
  organizationId: string;
}

export default function ElevenLabsConnectionHelper({ organizationId }: ElevenLabsConnectionHelperProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-2">
          <h3 className="font-medium text-amber-800">ElevenLabs Connection Required</h3>
          <p className="text-sm text-amber-700">
            To use the podcast feature, you need to connect your ElevenLabs account. 
            This allows us to access voices and generate audio with ElevenLabs API.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link href={`/dashboard/sponsor/${organizationId}/settings#connections`} passHref>
              <Button variant="outline" className="bg-white hover:bg-amber-100 border-amber-300 text-amber-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect ElevenLabs Account
              </Button>
            </Link>
            
            <Link href={`/dashboard/sponsor/${organizationId}/campaigns/podcast-debug`} passHref>
              <Button variant="outline" size="sm" className="bg-white text-gray-600 border-gray-300 hover:bg-gray-100">
                <Bug className="h-3 w-3 mr-1.5" />
                Troubleshoot
              </Button>
            </Link>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Note: You'll need an ElevenLabs account with API access. After connecting, 
            return to this page to create podcasts.
          </p>
        </div>
      </div>
    </div>
  );
} 