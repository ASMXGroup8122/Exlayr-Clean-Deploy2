'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, File, Lock, Globe, Brain } from 'lucide-react';

export default function UploadDocumentPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = use(params);
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [settings, setSettings] = useState({
        category: '',
        status: 'private',
        enableAI: false
    });

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        
        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles([...files, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle upload logic here
        console.log('Uploading files:', files);
        console.log('Settings:', settings);
        router.push(`/dashboard/${role}/knowledge-vault`);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Upload Documents</h1>

            <div className="bg-white shadow rounded-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Drop Zone */}
                    <div 
                        className={`border-2 border-dashed rounded-lg p-10 text-center ${
                            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                    >
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                            Drag and drop your files here, or{' '}
                            <button
                                type="button"
                                className="text-blue-600 hover:text-blue-500"
                                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                            >
                                browse
                            </button>
                        </p>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && setFiles([...files, ...Array.from(e.target.files)])}
                        />
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <File className="h-5 w-5 text-gray-400" />
                                        <span className="ml-2 text-sm text-gray-900">{file.name}</span>
                                        <span className="ml-2 text-sm text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Category
                            </label>
                            <select
                                value={settings.category}
                                onChange={(e) => setSettings({...settings, category: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Select a category</option>
                                <option value="compliance">Compliance</option>
                                <option value="operations">Operations</option>
                                <option value="market-rules">Market Rules</option>
                                <option value="procedures">Procedures</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Access Level
                            </label>
                            <div className="mt-2 space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="private"
                                        checked={settings.status === 'private'}
                                        onChange={(e) => setSettings({...settings, status: e.target.value})}
                                        className="form-radio text-indigo-600"
                                    />
                                    <Lock className="ml-2 h-4 w-4 text-gray-400" />
                                    <span className="ml-2">Private</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="public"
                                        checked={settings.status === 'public'}
                                        onChange={(e) => setSettings({...settings, status: e.target.value})}
                                        className="form-radio text-indigo-600"
                                    />
                                    <Globe className="ml-2 h-4 w-4 text-gray-400" />
                                    <span className="ml-2">Public</span>
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={settings.enableAI}
                                    onChange={(e) => setSettings({...settings, enableAI: e.target.checked})}
                                    className="form-checkbox text-indigo-600 h-5 w-5"
                                />
                                <span className="text-sm font-medium text-gray-700">Enable AI Processing</span>
                                <Brain className="h-5 w-5 text-purple-600" />
                            </label>
                            <p className="mt-1 text-sm text-gray-500">
                                Allow AI to analyze and learn from these documents for chatbots and search
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={files.length === 0}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300"
                        >
                            Upload Files
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 