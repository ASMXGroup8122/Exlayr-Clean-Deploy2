import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, X, File, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { DocumentUpload } from './DocumentUpload';

// Import the DocumentCategory type from DocumentUpload
type DocumentCategory = 
    | 'memorandum_articles'
    | 'director_cvs'
    | 'director_contracts'
    | 'material_contracts'
    | 'business_plan'
    | 'investment_deck'
    | 'accounts'
    | 'press_releases'
    | 'sponsor_guidelines'
    | 'compliance_docs'
    | 'due_diligence'
    | 'templates'
    | 'procedures'
    | 'regulations'
    | 'training'
    | 'other';

// Field-specific document categories mapping
const FIELD_CATEGORY_MAP: Record<string, DocumentCategory> = {
  'sec1_boardofdirectors': 'director_cvs',
  'sec1_corporateadvisors': 'compliance_docs',
  'sec1_generalinfo': 'memorandum_articles',
  'sec3_generalinfoissuer': 'memorandum_articles',
  'sec3_issuerprinpactivities': 'business_plan',
  'sec3_issuerfinanposition': 'accounts',
  'sec3_financialstatements': 'accounts',
  'sec4_riskfactors1': 'due_diligence',
  'sec4_riskfactors2': 'due_diligence',
  'sec4_riskfactors3': 'due_diligence',
  'sec4_riskfactors4': 'due_diligence',
  'sec5_informaboutsecurts1': 'templates',
  'sec5_informaboutsecurts2': 'templates',
  'sec6_sponsoradvisorfees': 'material_contracts',
  'sec6_accountingandlegalfees': 'material_contracts',
};

// Category display names
const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  'memorandum_articles': 'Memorandum & Articles of Association',
  'director_cvs': 'Director CVs & Biographies',
  'director_contracts': 'Director Contracts & Agreements',
  'material_contracts': 'Material Contracts & Agreements',
  'business_plan': 'Business Plans & Strategy Documents',
  'investment_deck': 'Investment Presentations & Decks',
  'accounts': 'Financial Statements & Accounts',
  'press_releases': 'Press Releases & Announcements',
  'sponsor_guidelines': 'Sponsor Guidelines & Procedures',
  'compliance_docs': 'Compliance & Regulatory Documents',
  'due_diligence': 'Due Diligence & Risk Assessment',
  'templates': 'Document Templates & Forms',
  'procedures': 'Operational Procedures',
  'regulations': 'Regulatory Requirements',
  'training': 'Training Materials',
  'other': 'Other Supporting Documents'
};

interface CanvasUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldId?: string;
  fieldTitle?: string;
  missingData?: string[];
  uploadRecommendation?: string;
  organizationId: string;
  listingId: string;
  onUploadComplete: () => void;
}

export function CanvasUploadModal({
  isOpen,
  onClose,
  fieldId,
  fieldTitle,
  missingData = [],
  uploadRecommendation,
  organizationId,
  listingId,
  onUploadComplete
}: CanvasUploadModalProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
  const [customDescription, setCustomDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Auto-select category based on field
  React.useEffect(() => {
    if (fieldId && FIELD_CATEGORY_MAP[fieldId]) {
      setSelectedCategory(FIELD_CATEGORY_MAP[fieldId]);
    } else {
      setSelectedCategory('other');
    }
  }, [fieldId]);

  const handleUploadComplete = useCallback(() => {
    setIsUploading(false);
    toast({
      title: "Upload Successful",
      description: "Documents have been uploaded and will be available for AI analysis shortly.",
    });
    onUploadComplete();
    onClose();
  }, [onUploadComplete, onClose, toast]);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setCustomDescription('');
      onClose();
    }
  }, [isUploading, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95%] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Upload Supporting Documents
          </DialogTitle>
          <DialogDescription>
            {fieldTitle && (
              <span>
                Upload documents to support the completion of <strong>"{fieldTitle}"</strong>
              </span>
            )}
            {!fieldTitle && "Upload documents to provide additional context for the AI Assistant"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Missing Data Context */}
          {missingData.length > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-orange-800 mb-2">Missing Information Detected</h4>
                  <div className="space-y-1">
                    {missingData.map((item, index) => (
                      <Badge key={index} variant="outline" className="mr-2 mb-1 text-orange-700 border-orange-300">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Recommendation */}
          {uploadRecommendation && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Recommended Documents</h4>
                  <p className="text-sm text-blue-700">{uploadRecommendation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Document Category Selection */}
          <div className="space-y-3">
            <Label htmlFor="category">Document Category</Label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isUploading}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              This helps the AI Assistant understand the context and relevance of your documents.
            </p>
          </div>

          {/* Custom Description */}
          <div className="space-y-3">
            <Label htmlFor="description">Additional Context (Optional)</Label>
            <Textarea
              id="description"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Provide any additional context about these documents that might help the AI Assistant..."
              className="min-h-[80px] resize-none"
              disabled={isUploading}
            />
          </div>

          {/* Document Upload Component */}
          <div className="border rounded-lg p-4">
            <DocumentUpload
              category={selectedCategory}
              organizationId={organizationId}
              onUploadComplete={handleUploadComplete}
              allowedFileTypes={['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx']}
              maxFileSize={50 * 1024 * 1024} // 50MB
            />
          </div>

          {/* Upload Status */}
          {isUploading && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <div>
                <p className="font-medium text-blue-800">Uploading Documents...</p>
                <p className="text-sm text-blue-600">Please wait while your documents are processed and indexed.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 