'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
    Building2, 
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    Search,
    Filter,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// Mock Data
const MOCK_ISSUERS = [
    { id: '1', issuer_name: 'TechCorp Solutions' },
    { id: '2', issuer_name: 'Green Energy Ltd' },
    { id: '3', issuer_name: 'Digital Innovations Inc' }
];

const MOCK_DIRECTORS = [
    { 
        id: '1',
        name: 'John Smith',
        position: 'CEO',
        appointment_date: '2023-01-15'
    },
    {
        id: '2',
        name: 'Sarah Johnson',
        position: 'CFO',
        appointment_date: '2023-03-20'
    },
    {
        id: '3',
        name: 'Michael Brown',
        position: 'CTO',
        appointment_date: '2023-02-10'
    }
];

const AI_MODELS = [
    { id: 'openai', name: 'OpenAI GPT-4', provider: 'OpenAI' },
    { id: 'claude', name: 'Anthropic Claude', provider: 'Anthropic' },
    { id: 'perplexity', name: 'Perplexity', provider: 'Perplexity' },
    { id: 'gemini', name: 'Google Gemini', provider: 'Google' }
];

const CHECK_TYPES = [
    { id: 'adverse_media', label: 'Adverse Media' },
    { id: 'directorships', label: 'Directorships' },
    { id: 'bankruptcies', label: 'Bankruptcies' },
    { id: 'regulatory_actions', label: 'Regulatory Actions' },
    { id: 'criminal_records', label: 'Criminal Records' },
    { id: 'sanctions', label: 'Sanctions' },
    { id: 'pep_screening', label: 'PEP Screening' },
    { id: 'social_media', label: 'Social Media' }
];

export default function PersonnelDueDiligencePage() {
    const params = useParams();
    const orgId = params?.orgId as string;
    
    const [selectedIssuer, setSelectedIssuer] = useState('');
    const [selectedDirector, setSelectedDirector] = useState('');
    const [selectedModel, setSelectedModel] = useState('openai');
    const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
    const [checkResults, setCheckResults] = useState<any[]>([]);

    const handleRunAnalysis = () => {
        if (!selectedDirector || selectedChecks.length === 0) return;

        setCheckResults(
            selectedChecks.map(check => ({
                id: Math.random().toString(),
                type: check,
                status: 'pending',
                result: 'Analysis in progress...'
            }))
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1800px] mx-auto p-6">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-6 rounded-t-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Personnel Due Diligence</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Conduct AI-powered due diligence checks on directors and key personnel
                            </p>
                        </div>
                        <Link
                            href={`/dashboard/sponsor/${orgId}`}
                            className="text-sm text-gray-600 hover:text-gray-900 flex items-center">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                <div className="flex divide-x divide-gray-200">
                    {/* Left Panel - Director Selection */}
                    <div className="w-1/4 bg-white p-6 min-h-[calc(100vh-12rem)] rounded-bl-xl border-b border-l">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Issuer
                            </label>
                            <select
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={selectedIssuer}
                                onChange={(e) => setSelectedIssuer(e.target.value)}
                            >
                                <option value="">Select an issuer</option>
                                {MOCK_ISSUERS.map(issuer => (
                                    <option key={issuer.id} value={issuer.id}>
                                        {issuer.issuer_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedIssuer && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Directors</h3>
                                <div className="space-y-3">
                                    {MOCK_DIRECTORS.map(director => (
                                        <button
                                            key={director.id}
                                            onClick={() => setSelectedDirector(director.id)}
                                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                                selectedDirector === director.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <h4 className="font-medium text-gray-900">{director.name}</h4>
                                            <p className="text-sm text-gray-600">{director.position}</p>
                                            <div className="mt-1 text-xs text-gray-500">
                                                Appointed: {new Date(director.appointment_date).toLocaleDateString()}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Middle Panel - Analysis Results */}
                    <div className="w-1/2 bg-white p-6 min-h-[calc(100vh-12rem)] border-b">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Due Diligence Analysis</h2>
                            <p className="text-sm text-gray-600">AI-powered analysis results</p>
                        </div>

                        {checkResults.length > 0 ? (
                            <div className="space-y-6">
                                {checkResults.map(check => (
                                    <div key={check.id} className="p-4 rounded-lg border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-gray-900">{check.type}</h3>
                                            <div className="flex items-center">
                                                {check.status === 'completed' && (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                )}
                                                {check.status === 'pending' && (
                                                    <Clock className="h-5 w-5 text-yellow-500" />
                                                )}
                                                {check.status === 'failed' && (
                                                    <XCircle className="h-5 w-5 text-red-500" />
                                                )}
                                                <span className="ml-2 text-sm text-gray-600">
                                                    {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            {check.result}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                Select a director and check types to run analysis
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Configuration */}
                    <div className="w-1/4 bg-white p-6 min-h-[calc(100vh-12rem)] rounded-br-xl border-b border-r">
                        <div className="mb-8">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                                Select AI Model
                            </h3>
                            <div className="space-y-3">
                                {AI_MODELS.map(model => (
                                    <label key={model.id} className="flex items-center">
                                        <input
                                            type="radio"
                                            name="ai_model"
                                            value={model.id}
                                            checked={selectedModel === model.id}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-900">{model.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                                Select Checks
                            </h3>
                            <div className="space-y-3">
                                {CHECK_TYPES.map(check => (
                                    <label key={check.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            value={check.id}
                                            checked={selectedChecks.includes(check.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedChecks([...selectedChecks, check.id]);
                                                } else {
                                                    setSelectedChecks(selectedChecks.filter(id => id !== check.id));
                                                }
                                            }}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-900">{check.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleRunAnalysis}
                                disabled={!selectedDirector || selectedChecks.length === 0}
                                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Run Analysis
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 