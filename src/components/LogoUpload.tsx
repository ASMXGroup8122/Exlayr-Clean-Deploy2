import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Check } from 'lucide-react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { supabase } from '@/lib/supabase';

interface LogoUploadProps {
    issuerId: number;
    onUploadComplete: (url: string) => void;
    maxFileSize?: number;
}

export const LogoUpload = ({
    issuerId,
    onUploadComplete,
    maxFileSize = 2
}: LogoUploadProps) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
    });
    const [isCropping, setIsCropping] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const validateImage = (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Check dimensions (min 200x200, max 2000x2000)
                if (img.width < 200 || img.height < 200) {
                    setError('Image must be at least 200x200 pixels');
                    resolve(false);
                } else if (img.width > 2000 || img.height > 2000) {
                    setError('Image must be no larger than 2000x2000 pixels');
                    resolve(false);
                } else {
                    resolve(true);
                }
            };
            img.onerror = () => {
                setError('Invalid image file');
                resolve(false);
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const getCroppedImg = (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) throw new Error('Canvas is empty');
                resolve(blob);
            }, 'image/png');
        });
    };

    const handleCropComplete = async () => {
        if (!imageRef.current || !crop.width || !crop.height) return;

        try {
            const croppedBlob = await getCroppedImg(imageRef.current, crop);
            const file = new File([croppedBlob], 'cropped-logo.png', { type: 'image/png' });
            
            setUploading(true);
            const filePath = `${issuerId}/logo/logo.png`;
            const { error: uploadError } = await supabase.storage
                .from('company-logos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('company-logos')
                .getPublicUrl(filePath);

            onUploadComplete(publicUrl);
            setIsCropping(false);
            setPreview(URL.createObjectURL(croppedBlob));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset states
        setError(null);
        setPreview(null);

        // Validate file
        if (file.size > maxFileSize * 1024 * 1024) {
            setError(`File size must be less than ${maxFileSize}MB`);
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError('File must be an image');
            return;
        }

        const isValid = await validateImage(file);
        if (!isValid) return;

        // Show cropping interface
        setPreview(URL.createObjectURL(file));
        setIsCropping(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-center">
                {isCropping ? (
                    <div className="space-y-4">
                        <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            aspect={1}
                            className="max-w-md mx-auto"
                        >
                            <img
                                ref={imageRef}
                                src={preview!}
                                alt="Crop preview"
                                className="max-w-full"
                            />
                        </ReactCrop>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setPreview(null);
                                    setIsCropping(false);
                                }}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropComplete}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                <Check className="w-4 h-4" />
                                Apply Crop
                            </button>
                        </div>
                    </div>
                ) : preview ? (
                    <div className="relative">
                        <img 
                            src={preview} 
                            alt="Logo preview" 
                            className="w-32 h-32 object-contain rounded-lg border border-gray-200"
                        />
                        <button
                            onClick={() => setPreview(null)}
                            className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
                        {uploading ? (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                                <span className="text-xs text-gray-500 mt-2">Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                                <span className="text-xs text-gray-500 mt-2">Upload Logo</span>
                            </>
                        )}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                </div>
            )}

            <p className="text-xs text-gray-500">
                Recommended size: 500x500 pixels (PNG or JPG, max {maxFileSize}MB)
            </p>
        </div>
    );
}; 