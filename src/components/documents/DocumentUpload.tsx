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

    // Helper function to do chunked uploads if files are large
    const uploadFileWithRetry = async (bucket: string, path: string, file: File): Promise<any> => {
        console.log(`Starting upload for ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
        
        // Check network connectivity before starting
        if (!navigator.onLine) {
            throw new Error("Network connection lost. Please check your internet connection and try again.");
        }
        
        // For files under 5MB, use standard upload
        if (file.size < 5 * 1024 * 1024) {
            console.log('Using standard upload (file < 5MB)');
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });
                
            if (error) throw error;
            return data;
        }
        
        // For larger files, retry up to 5 times with delay
        console.log('Using chunked upload strategy for large file');
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            attempts++;
            try {
                // Check if we're still online
                if (!navigator.onLine) {
                    throw new Error("Network connection lost during upload attempt.");
                }
                
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: true
                    });
                    
                if (error) throw error;
                console.log(`Upload successful on attempt ${attempts}`);
                return data;
            } catch (err) {
                console.error(`Upload attempt ${attempts} failed:`, err);
                
                // If we lost connection, wait for it to return
                if (!navigator.onLine) {
                    console.log('Waiting for network connection to return...');
                    await new Promise<void>(resolve => {
                        const checkConnection = () => {
                            if (navigator.onLine) {
                                window.removeEventListener('online', checkConnection);
                                resolve();
                            }
                        };
                        window.addEventListener('online', checkConnection);
                    });
                    console.log('Network connection restored, retrying...');
                }
                
                if (attempts >= maxAttempts) throw err;
                
                // Wait before retrying (increasing delay with each attempt)
                const delay = Math.min(attempts * 3000, 15000); // Cap at 15 seconds
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Failed to upload after ${maxAttempts} attempts`);
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        
        // Clear any previous errors
        setError(null);
        
        // Validate files before adding them to the list
        const validFiles: File[] = [];
        for (const file of files) {
            // Check file size
            if (file.size > maxFileSize) {
                setError(`File ${file.name} exceeds ${maxFileSize/1024/1024}MB limit`);
                continue;
            }

            // Check file type
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!allowedFileTypes.map(type => type.replace('.', '')).includes(extension || '')) {
                setError(`Invalid file type for ${file.name}. Allowed: ${allowedFileTypes.join(', ')}`);
                continue;
            }
            
            // Additional validation - check if file is corrupted
            try {
                // For images, we can check if they load properly
                if (file.type.startsWith('image/')) {
                    await new Promise<void>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error('Image appears to be corrupted'));
                        img.src = URL.createObjectURL(file);
                    });
                }
                
                validFiles.push(file);
            } catch (err) {
                setError(`File ${file.name} appears to be corrupted`);
            }
        }
        
        // Add valid files to the list
        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
    };

    // Try uploading via the server-side API route
    const uploadViaApiRoute = async (file: File, fileName: string): Promise<string> => {
        console.log(`Uploading ${file.name} via API route`);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            formData.append('organizationId', organizationId || '');
            if (issuerId) formData.append('issuerId', issuerId.toString());
            
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server responded with ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API upload successful:', data);
            return data.document.url;
        } catch (err: any) {
            console.error('API upload failed:', err);
            throw new Error(`API upload failed: ${err.message}`);
        }
    };
    
    const uploadWithDataUrl = async (file: File): Promise<string> => {
        try {
            console.log(`Reading file ${file.name} as data URL`);
            
            // Create a data URL from the file
            const reader = new FileReader();
            const fileData = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
            
            // Generate a random ID
            const fileId = Math.random().toString(36).substring(2);
            const fileExt = file.name.split('.').pop();
            
            // Save to database with data URL
            const { error: dbError, data: documentData } = await supabase
                .from('knowledge_vault_documents')
                .insert({
                    id: fileId,
                    name: file.name,
                    category,
                    url: fileData, // Store the data URL
                    organization_id: organizationId,
                    issuer_id: issuerId,
                    size: file.size,
                    type: fileExt,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select('url');
            
            if (dbError) throw dbError;
            
            return documentData?.[0]?.url || fileData;
        } catch (err: any) {
            console.error('Data URL upload failed:', err);
            throw new Error(`Failed to save with data URL: ${err.message}`);
        }
    };

    const uploadFiles = async () => {
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
        
        // --- START OF CRITICAL DIAGNOSTIC BLOCK ---
        console.groupCollapsed(`Document Upload Diagnostics / Pre-Upload Check (${new Date().toISOString()})`);
        try {
            console.log("Supabase client object:", supabase);
            // @ts-ignore
            console.log("Supabase client URL:", supabase?.supabaseUrl);
            // @ts-ignore
            console.log("Supabase client Anon Key:", supabase?.supabaseKey);

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error("getSession() error:", sessionError);
                setError("Critical error: Could not retrieve user session before upload. Please try logging out and back in.");
            } else if (session) {
                console.log("Active session retrieved:", session);
                console.log("User from session:", session.user);
            } else {
                console.warn("No active session found by getSession().");
                setError("Critical error: No active user session before upload. Please log in again.");
            }

            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.error("getUser() error:", userError);
            } else if (userData?.user) {
                console.log("User from getUser():", userData.user);
            } else {
                console.warn("No user found by getUser().");
            }
            
            console.log("Provided organizationId:", organizationId);
            console.log("Provided issuerId:", issuerId);
            console.log("Selected category:", category);
        } catch (diagError) {
            console.error("Error during pre-upload diagnostic logging:", diagError);
            setError("An internal error occurred while preparing the upload. Please try again.");
        }
        console.groupEnd(); // End of "Document Upload Diagnostics / Pre-Upload Check"
        // --- END OF CRITICAL DIAGNOSTIC BLOCK ---

        // Ensure critical IDs are present before proceeding
        if (!organizationId && !issuerId) {
            setError("Critical error: Organization ID or Issuer ID is missing. Cannot proceed with upload.");
            setUploading(false);
            setUploadStatus('failed');
            console.error("Upload halted: Missing organizationId and issuerId.");
            return;
        }
        
        // Ensure user is actually logged in before attempting file operations
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("Critical error: No authenticated user found. Please log in and try again.");
            setUploading(false);
            setUploadStatus('failed');
            console.error("Upload halted: No authenticated user.");
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

                console.log("Attempting to upload:", { bucket: 'knowledge_vault_documents', path: fileName, fileSize: file.size });
                
                // Option 1: Try direct upload with retry (current implementation)
                // const data = await uploadFileWithRetry('knowledge_vault_documents', fileName, file);
                
                // Option 2: Try API route upload
                // const publicUrl = await uploadViaApiRoute(file, fileName);
                
                // Option 3: Try Data URL upload (for small files or as fallback)
                // This was part of a previous strategy and might be too large for DB
                // if (file.size < 1 * 1024 * 1024) { // e.g., 1MB limit for data URL
                //    const dataUrl = await uploadWithDataUrl(file);
                //    console.log(`File ${file.name} stored as data URL.`);
                // } else {
                //    throw new Error(`File ${file.name} is too large for data URL storage.`);
                // }


                // Fallback to original uploadFileWithRetry logic for now.
                // We need to decide on a consistent strategy.
                const data = await uploadFileWithRetry('knowledge_vault_documents', fileName, file);


                if (!data || !data.path) {
                    throw new Error('Upload successful but path is missing in response.');
                }
                
                const publicUrl = supabase.storage.from('knowledge_vault_documents').getPublicUrl(data.path).data.publicUrl;

                console.log(`File ${file.name} uploaded successfully. Public URL: ${publicUrl}`);

                const { error: dbError } = await supabase
                    .from('knowledge_vault_documents')
                    .insert({
                        name: file.name,
                        category,
                        url: publicUrl,
                        organization_id: organizationId,
                        issuer_id: issuerId,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        size: file.size,
                        type: file.type,
                        // Add other metadata as needed
                    });

                if (dbError) {
                    console.error(`Error saving document metadata for ${file.name}:`, dbError);
                    // Attempt to delete the orphaned file from storage
                    const { error: deleteError } = await supabase.storage.from('knowledge_vault_documents').remove([fileName]);
                    if (deleteError) {
                        console.error(`Failed to delete orphaned file ${fileName} from storage:`, deleteError);
                    }
                    throw new Error(`Failed to save document metadata: ${dbError.message}`);
                }
                console.log(`Metadata for ${file.name} saved to database.`);
                setUploadProgress(((i + 1) / selectedFiles.length) * 100);

            } catch (err: any) {
                console.error(`Error uploading ${file.name}:`, err);
                setError(`Failed to upload ${file.name}: ${err.message}`);
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
                        disabled={uploading || !isOnline}
                        className={`w-full py-2 px-4 rounded-md text-white ${
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