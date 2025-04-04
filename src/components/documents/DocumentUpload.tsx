import { useState } from 'react';
import { Upload, File, X, Check, Edit, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

// Define which categories can have text content
const TEXT_CONTENT_CATEGORIES = [
    'memorandum_articles',
    'business_plan',
    'press_releases'
];

interface DocumentUploadProps {
    category: DocumentCategory;
    organizationId?: string;
    issuerId?: number;
    onUploadComplete?: () => void;
    allowedFileTypes?: string[];
    maxFileSize?: number;
}

export function DocumentUpload({
    category,
    organizationId,
    issuerId,
    onUploadComplete,
    allowedFileTypes = ['pdf', 'doc', 'docx'],
    maxFileSize = 5 * 1024 * 1024
}: DocumentUploadProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        
        // Validate files before adding them to the list
        const validFiles = files.filter(file => {
            if (file.size > maxFileSize) {
                setError(`File ${file.name} exceeds ${maxFileSize/1024/1024}MB limit`);
                return false;
            }

            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!allowedFileTypes.map(type => type.replace('.', '')).includes(extension || '')) {
                setError(`Invalid file type for ${file.name}. Allowed: ${allowedFileTypes.join(', ')}`);
                return false;
            }
            return true;
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const uploadFiles = async () => {
        setUploading(true);
        setError(null);

        try {
            for (const file of selectedFiles) {
                // Upload file to storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${category}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                // Save document metadata to database
                const { error: dbError } = await supabase
                    .from('knowledge_vault_documents')
                    .insert({
                        name: file.name,
                        category,
                        url: publicUrl,
                        organization_id: organizationId,
                        issuer_id: issuerId,
                        size: file.size,
                        type: fileExt
                    });

                if (dbError) throw dbError;
            }

            setSelectedFiles([]);
            onUploadComplete?.();
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload files. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => {
            const updated = [...prev];
            updated.splice(index, 1);
            return updated;
        });
    };

    return (
        <div className="space-y-4">
            <label className="block">
                <div className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
                    <div className="flex flex-col items-center space-y-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="font-medium text-gray-600">
                            Drop files to Attach, or browse
                        </span>
                        <span className="text-xs text-gray-500">
                            {allowedFileTypes.join(', ')} up to {maxFileSize/1024/1024}MB
                        </span>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept={allowedFileTypes.map(type => `.${type}`).join(',')}
                        onChange={handleFileChange}
                        multiple
                    />
                </div>
            </label>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center space-x-3">
                                <File className="h-5 w-5 text-blue-500" />
                                <div>
                                    <span className="text-sm text-gray-900">{file.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                            >
                                Remove
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={uploadFiles}
                        disabled={uploading}
                        className={`w-full py-2 px-4 rounded-md text-white ${
                            uploading 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading...
                            </span>
                        ) : (
                            'Upload Files'
                        )}
                    </button>
                </div>
            )}

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                </div>
            )}
        </div>
    );
} 