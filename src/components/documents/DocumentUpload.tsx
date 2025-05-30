import { useState, useEffect } from 'react';
import { Upload, File, X, Check, Edit, CheckCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

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
    maxFileSize = 20 * 1024 * 1024
}: DocumentUploadProps) {
    const supabase = getSupabaseClient();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'failed' | 'success'>('idle');
    const [retryCount, setRetryCount] = useState(0);
    const [isOnline, setIsOnline] = useState(true);

    // Monitor network connectivity
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Initialize with current status
        setIsOnline(navigator.onLine);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Note: Now using API route for uploads instead of direct Supabase storage
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        
        // Clear any previous errors
        setError(null);
        
        // Validate files before adding them to the list
        const validFiles: File[] = [];
        for (const file of files) {
            console.log(`Validating file: ${file.name}, size: ${file.size}, type: ${file.type}`);
            
            // Check file size
            if (file.size > maxFileSize) {
                const errorMsg = `File ${file.name} exceeds ${maxFileSize/1024/1024}MB limit`;
                console.error(errorMsg);
                setError(errorMsg);
                continue;
            }

            // Check file type - normalize extensions
            const extension = file.name.split('.').pop()?.toLowerCase();
            const normalizedAllowedTypes = allowedFileTypes.map(type => type.replace('.', '').toLowerCase());
            
            console.log(`File extension: ${extension}, allowed types: ${normalizedAllowedTypes.join(', ')}`);
            
            if (!extension || !normalizedAllowedTypes.includes(extension)) {
                const errorMsg = `Invalid file type for ${file.name}. Allowed: ${allowedFileTypes.join(', ')}`;
                console.error(errorMsg);
                setError(errorMsg);
                continue;
            }
            
            console.log(`File ${file.name} passed validation, adding to validFiles`);
            validFiles.push(file);
        }
        
        console.log(`Valid files count: ${validFiles.length}`);
        
        // Add valid files to the list
        if (validFiles.length > 0) {
            setSelectedFiles(prev => {
                const newFiles = [...prev, ...validFiles];
                console.log(`Updated selectedFiles count: ${newFiles.length}`);
                return newFiles;
            });
        } else {
            console.warn('No valid files to add');
        }
    };



    const uploadFiles = async () => {
        console.log('🚀 UPLOAD FUNCTION CALLED!', { 
            selectedFilesCount: selectedFiles.length, 
            category, 
            organizationId, 
            issuerId 
        });
        
        if (selectedFiles.length === 0) {
            setError("No files selected.");
            return;
        }

        if (!isOnline) {
            setError("No internet connection. Please check your connection and try again.");
            setUploadStatus('failed');
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress(0);
        setCurrentFileIndex(0);
        setUploadStatus('uploading');
        
        // Basic validation - let server handle authentication
        console.log("Upload configuration:", { category, organizationId, issuerId });
        
        if (!organizationId && !issuerId) {
            setError("Organization ID or Issuer ID is missing. Cannot proceed with upload.");
            setUploading(false);
            setUploadStatus('failed');
            console.error("Upload halted: Missing organizationId and issuerId.");
            return;
        }

        for (let i = 0; i < selectedFiles.length; i++) {
            setCurrentFileIndex(i);
            const file = selectedFiles[i];
            const fileName = `${organizationId || issuerId || 'unknown_entity'}/${category}/${file.name}`;
            
            // Use a more descriptive console group for each file
            console.group(`Uploading file ${i + 1}/${selectedFiles.length}: ${file.name}`);

            try {
                // Check if still online before each file upload
                if (!navigator.onLine) {
                    throw new Error("Network connection lost during batch upload.");
                }

                console.log("Attempting to upload via API:", { fileName: file.name, fileSize: file.size, category });
                
                // Use API route upload for better reliability and error handling
                console.log(`Uploading ${file.name} via API route...`);
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', category);
                formData.append('organizationId', organizationId || '');
                if (issuerId) formData.append('issuerId', issuerId.toString());
                
                // Add timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds
                
                console.log('🌐 Making fetch request to /api/documents/upload...');
                console.log('📦 FormData contents:', {
                    file: file.name,
                    category,
                    organizationId,
                    issuerId
                });
                
                const response = await fetch('/api/documents/upload', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
                
                console.log('📡 Fetch response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server responded with ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`File ${file.name} uploaded successfully via API:`, data);
                
                setUploadProgress(((i + 1) / selectedFiles.length) * 100);

            } catch (err: any) {
                console.error(`Error uploading ${file.name}:`, err);
                
                let errorMessage = err.message;
                if (err.name === 'AbortError') {
                    errorMessage = 'Upload timed out after 15 seconds. Please check your connection and try again.';
                }
                
                setError(`Failed to upload ${file.name}: ${errorMessage}`);
                setUploadStatus('failed');
                setRetryCount(prev => prev + 1); // Increment retry count on failure
                
                // Add a small delay before logging the group end to ensure all async logs within are captured
                await new Promise(resolve => setTimeout(resolve, 100));
                console.groupEnd(); // End file-specific group
                console.groupEnd(); // End main diagnostic group
                setUploading(false);
                return; // Stop uploading further files on error
            }
            // Add a small delay before logging the group end
            await new Promise(resolve => setTimeout(resolve, 100));
            console.groupEnd(); // End file-specific group
        }
        
        console.log("All files processed.");
        console.groupEnd(); // End main diagnostic group

        setUploading(false);
        setUploadStatus('success');
        setSelectedFiles([]); // Clear selected files on successful upload of all
        if (onUploadComplete) {
            onUploadComplete();
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => {
            const updated = [...prev];
            updated.splice(index, 1);
            return updated;
        });
    };

    // Add a retry function
    const retryUpload = () => {
        setError(null);
        setUploadStatus('idle');
        setRetryCount(count => count + 1);
        uploadFiles();
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

            {!isOnline && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                    <p className="font-semibold">⚠️ You are currently offline</p>
                    <p>Please check your internet connection before uploading.</p>
                </div>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="space-y-3">
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
                    </div>

                    {/* Upload Button - Always visible when files are selected */}
                    <div className="pt-2 border-t border-gray-200">
                        <button
                            onClick={() => {
                                console.log('🔥 UPLOAD BUTTON CLICKED!', { 
                                    selectedFiles: selectedFiles.length, 
                                    uploading, 
                                    isOnline, 
                                    category, 
                                    organizationId 
                                });
                                uploadFiles();
                            }}
                            disabled={uploading || !isOnline}
                            className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                                uploading || !isOnline
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
                            ) : !isOnline ? (
                                'You are offline'
                            ) : (
                                'Upload Files'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {uploading && (
                <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                        {currentFileIndex + 1}/{selectedFiles.length} - {Math.round(uploadProgress)}%
                    </p>
                </div>
            )}

            {error && (
                <div className="space-y-3">
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                        <p className="font-semibold">Upload Failed</p>
                        <p>{error}</p>
                    </div>
                    <button
                        onClick={retryUpload}
                        disabled={!isOnline}
                        className="w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        Retry Upload
                    </button>
                </div>
            )}
            
            {uploadStatus === 'success' && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
                    <p className="font-semibold">Upload Completed Successfully</p>
                </div>
            )}
        </div>
    );
} 
