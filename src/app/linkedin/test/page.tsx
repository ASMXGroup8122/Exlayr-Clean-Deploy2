'use client';

import { useState, useEffect } from 'react';

export default function LinkedInTestPage() {
  // State management
  const [mounted, setMounted] = useState(false);
  const [organizationId, setOrganizationId] = useState('c0d082bf-6b79-46c8-8d16-c19453c09f41');
  const [message, setMessage] = useState('Test post from Exlayr API!');
  const [linkedinId, setLinkedinId] = useState('');
  const [linkedinOrgId, setLinkedinOrgId] = useState('');
  const [needsLinkedinId, setNeedsLinkedinId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Only render client-side to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div>Loading...</div>;
  }

  /**
   * Handle form submission to post to LinkedIn
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!organizationId) {
      setError('Organization ID is required');
      return;
    }
    
    if (!message) {
      setError('Message is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Call the LinkedIn post API
      const response = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          message,
          ...(linkedinId ? { linkedinId } : {}),
          ...(linkedinOrgId ? { linkedinOrgId } : {})
        }),
      });
      
      // Parse response
      const data = await response.json();
      
      // Handle case where we need LinkedIn ID
      if (response.status === 400 && data.needsManualId) {
        setNeedsLinkedinId(true);
        setError(data.message);
        return;
      }
      
      // Handle connection missing error
      if (response.status === 404 && data.needsConnection) {
        setError(
          `${data.error} ${data.details || ''}`
        );
        return;
      }
      
      // Handle other errors
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post to LinkedIn');
      }
      
      // Set success result
      setResult(data);
    } catch (err: any) {
      // Handle and display error
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        LinkedIn Post Test
      </h1>
      
      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '0.5rem', border: '1px solid #cce5ff' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Instructions</h2>
        <p style={{ marginBottom: '0.5rem' }}>
          The LinkedIn Organization ID is critical for posting. Find it from your LinkedIn company page URL:
        </p>
        <ul style={{ marginLeft: '1.5rem', listStyleType: 'disc' }}>
          <li>Go to your LinkedIn company page</li>
          <li>Look at the URL: <code>https://www.linkedin.com/company/12345678</code></li>
          <li>The number at the end (12345678) is your Organization ID</li>
          <li>Enter this number in the "LinkedIn Organization ID" field below</li>
        </ul>
      </div>
      
      {/* Connection section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '0.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Connect LinkedIn Account
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1 }}>
            <label
              htmlFor="connectionOrgId"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
            >
              LinkedIn Organization ID for Connection:
            </label>
            <input
              id="connectionOrgId"
              type="text"
              value={linkedinOrgId}
              onChange={(e) => setLinkedinOrgId(e.target.value)}
              placeholder="Enter LinkedIn organization ID for connection"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
              }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
              Providing this during connection will help automatically identify your LinkedIn organization
            </p>
          </div>
          <button
            onClick={() => {
              const authUrl = `/api/auth/linkedin/authorize?organizationId=${organizationId}${linkedinOrgId ? `&linkedinOrgId=${linkedinOrgId}` : ''}`;
              const width = 600;
              const height = 700;
              const left = window.screen.width / 2 - width / 2;
              const top = window.screen.height / 2 - height / 2;
              
              window.open(
                authUrl,
                'LinkedIn Authorization',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
              );
            }}
            style={{
              backgroundColor: '#0077B5',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.75rem 1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Connect to LinkedIn
          </button>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="organizationId" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            Organization ID (Exlayr):
          </label>
          <input
            id="organizationId"
            type="text"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
            }}
          />
        </div>
        
        {needsLinkedinId && (
          <div style={{ marginBottom: '1rem' }}>
            <label 
              htmlFor="linkedinId" 
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
            >
              LinkedIn User ID:
            </label>
            <input
              id="linkedinId"
              type="text"
              value={linkedinId}
              onChange={(e) => setLinkedinId(e.target.value)}
              placeholder="Enter your LinkedIn user ID"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
              }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
              Find your LinkedIn ID in your profile URL: linkedin.com/in/username
            </p>
          </div>
        )}
        
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="linkedinOrgId" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            LinkedIn Organization ID (optional):
          </label>
          <input
            id="linkedinOrgId"
            type="text"
            value={linkedinOrgId}
            onChange={(e) => setLinkedinOrgId(e.target.value)}
            placeholder="Enter LinkedIn organization ID (numbers only)"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
            }}
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            Find in company page URL: linkedin.com/company/12345678
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="message" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            Message:
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
              fontFamily: 'inherit',
            }}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: '#0077B5',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            padding: '0.75rem 1rem',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Posting...' : 'Post to LinkedIn'}
        </button>
      </form>
      
      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#FEE2E2',
            borderRadius: '0.25rem',
            color: '#B91C1C',
          }}
        >
          {error}
        </div>
      )}
      
      {/* Success Result */}
      {result && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#ECFDF5',
            borderRadius: '0.25rem',
            color: '#065F46',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Success!
          </h2>
          <p>{result.message}</p>
          {result.postUrl && (
            <p style={{ marginTop: '0.5rem' }}>
              <a 
                href={result.postUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0077B5', textDecoration: 'underline' }}
              >
                View post on LinkedIn
              </a>
            </p>
          )}
          
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Response Details
            </summary>
            <pre style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              backgroundColor: '#F3F4F6',
              borderRadius: '0.25rem',
              overflowX: 'auto'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
} 