'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Brain, MessageSquare, Settings, FileText, Zap, Cpu } from 'lucide-react';

interface TrainingDocument {
    id: string;
    title: string;
    category: string;
    status: string;
}

const mockDocuments: TrainingDocument[] = [
    {
        id: '1',
        title: 'RNS Guidelines 2024',
        category: 'Compliance',
        status: 'ai-enabled'
    },
    {
        id: '2',
        title: 'Market Rules',
        category: 'Market Rules',
        status: 'ai-enabled'
    }
];

export default function CreateBotPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = use(params);
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [botConfig, setBotConfig] = useState({
        name: '',
        description: '',
        personality: 'professional',
        language: 'en',
        documents: [] as string[],
        advancedSettings: {
            temperature: 0.7,
            maxTokens: 2000,
            contextWindow: 4000,
            responseStyle: 'concise',
            enableCitations: true,
            enableFollowUpQuestions: true
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Creating bot with config:', botConfig);
        router.push(`/dashboard/${role}/knowledge-vault`);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Create AI Chatbot</h1>

            <div className="bg-white shadow rounded-lg p-6">
                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        <div className="w-full absolute top-1/2 h-0.5 bg-gray-200" />
                        <div className="relative flex justify-between w-full">
                            {[1, 2, 3].map((s) => (
                                <div 
                                    key={s}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-sm">Basic Info</span>
                        <span className="text-sm">Training Data</span>
                        <span className="text-sm">Configuration</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Basic Information */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Chatbot Name
                                </label>
                                <input
                                    type="text"
                                    value={botConfig.name}
                                    onChange={(e) => setBotConfig({...botConfig, name: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    value={botConfig.description}
                                    onChange={(e) => setBotConfig({...botConfig, description: e.target.value})}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Personality
                                </label>
                                <select
                                    value={botConfig.personality}
                                    onChange={(e) => setBotConfig({...botConfig, personality: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="technical">Technical</option>
                                    <option value="concise">Concise</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Training Data */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-4">Select Training Documents</h3>
                                <div className="space-y-3">
                                    {mockDocuments.map((doc) => (
                                        <label key={doc.id} className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={botConfig.documents.includes(doc.id)}
                                                onChange={(e) => {
                                                    const newDocs = e.target.checked
                                                        ? [...botConfig.documents, doc.id]
                                                        : botConfig.documents.filter(id => id !== doc.id);
                                                    setBotConfig({...botConfig, documents: newDocs});
                                                }}
                                                className="form-checkbox text-indigo-600 h-5 w-5"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{doc.title}</p>
                                                <p className="text-xs text-gray-500">{doc.category}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Advanced Configuration */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Temperature
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={botConfig.advancedSettings.temperature}
                                        onChange={(e) => setBotConfig({
                                            ...botConfig,
                                            advancedSettings: {
                                                ...botConfig.advancedSettings,
                                                temperature: parseFloat(e.target.value)
                                            }
                                        })}
                                        className="mt-1 block w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>More Focused</span>
                                        <span>More Creative</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Response Style
                                    </label>
                                    <select
                                        value={botConfig.advancedSettings.responseStyle}
                                        onChange={(e) => setBotConfig({
                                            ...botConfig,
                                            advancedSettings: {
                                                ...botConfig.advancedSettings,
                                                responseStyle: e.target.value
                                            }
                                        })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="concise">Concise</option>
                                        <option value="detailed">Detailed</option>
                                        <option value="conversational">Conversational</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={botConfig.advancedSettings.enableCitations}
                                        onChange={(e) => setBotConfig({
                                            ...botConfig,
                                            advancedSettings: {
                                                ...botConfig.advancedSettings,
                                                enableCitations: e.target.checked
                                            }
                                        })}
                                        className="form-checkbox text-indigo-600 h-5 w-5"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Enable Citations</span>
                                        <p className="text-xs text-gray-500">Bot will reference source documents in responses</p>
                                    </div>
                                </label>

                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={botConfig.advancedSettings.enableFollowUpQuestions}
                                        onChange={(e) => setBotConfig({
                                            ...botConfig,
                                            advancedSettings: {
                                                ...botConfig.advancedSettings,
                                                enableFollowUpQuestions: e.target.checked
                                            }
                                        })}
                                        className="form-checkbox text-indigo-600 h-5 w-5"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Enable Follow-up Questions</span>
                                        <p className="text-xs text-gray-500">Bot will suggest relevant follow-up questions</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-6">
                        <button
                            type="button"
                            onClick={() => setStep(Math.max(1, step - 1))}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            disabled={step === 1}
                        >
                            Previous
                        </button>
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep(Math.min(3, step + 1))}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Create Chatbot
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
} 