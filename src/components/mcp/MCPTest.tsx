'use client';

import { useState, useEffect } from 'react';

// The MCP function is provided by Cursor directly
declare function mcp_supabase_query(params: { sql: string }): Promise<any>;

export default function MCPTest() {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function testMCP() {
      try {
        setStatus('Testing MCP connection...');
        
        const result = await mcp_supabase_query({
          sql: `SELECT instrumentname, instrumentticker FROM listing LIMIT 1`
        });

        if (!result) {
          throw new Error('No result from query');
        }

        setResult(result);
        setStatus('Success! MCP is connected to Supabase.');
        setError(null);

      } catch (err) {
        console.error('MCP Test Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setStatus('Error');
      }
    }

    testMCP();
  }, []);

  return (
    <div className="p-4 border rounded-lg m-4 bg-white">
      <h2 className="text-lg font-semibold mb-2">MCP Test</h2>
      <div className="mb-2">
        <strong>Status:</strong> {status}
      </div>
      {error && (
        <div className="text-red-500">
          <strong>Error:</strong> {error}
        </div>
      )}
      {result && (
        <div className="mt-2">
          <strong>Result:</strong>
          <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 
