'use client';

import { useState, useEffect } from 'react';

interface OpenAIKeyInputProps {
  onKeySet: () => void;
}

export default function OpenAIKeyInput({ onKeySet }: OpenAIKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if an API key is already set
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch('/api/openai/set-api-key');
        const data = await response.json();
        setHasKey(data.hasApiKey);
      } catch (error) {
        console.error('Error checking API key:', error);
      }
    };

    checkApiKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai/set-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasKey(true);
        setApiKey('');
        onKeySet();
      } else {
        setError(data.message || 'Failed to set API key');
      }
    } catch (error) {
      setError('An error occurred while setting the API key');
      console.error('Error setting API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasKey) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
        <p className="text-green-700">OpenAI API key is set. You can now use the AI assistant.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
      <h3 className="text-lg font-medium mb-2">Set OpenAI API Key</h3>
      <p className="mb-4 text-gray-700">
        To use the AI assistant, you need to provide an OpenAI API key. This key will be stored only for this session.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenAI API key"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isLoading ? 'Setting...' : 'Set API Key'}
          </button>
        </div>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </form>
    </div>
  );
} 