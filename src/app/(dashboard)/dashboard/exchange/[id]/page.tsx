'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import RouteGuard from '@/components/RouteGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ExchangeDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const exchangeId = params.id as string;
  const [exchange, setExchange] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchExchangeDetails();
  }, [exchangeId]);

  const fetchExchangeDetails = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the database
      // For now, using mock data
      const mockExchange = {
        id: exchangeId,
        name: 'Global Securities Exchange',
        description: 'A leading exchange for technology and growth companies',
        status: 'active',
        created_at: '2023-01-15T00:00:00Z',
        stats: {
          listings: 142,
          pendingIPOs: 15,
          marketCap: '$2.4T',
          dailyVolume: '$85M'
        }
      };
      
      setExchange(mockExchange);
      setError(null);
    } catch (err) {
      console.error('Error fetching exchange details:', err);
      setError('Failed to load exchange details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    {
      title: 'Document Review',
      description: 'Review and approve listing documents submitted by sponsors',
      link: `/dashboard/exchange/${exchangeId}/documents`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      title: 'Member Management',
      description: 'Approve and manage exchange members',
      link: `/dashboard/exchange/${exchangeId}/members`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      title: 'Compliance Reports',
      description: 'Generate and view compliance reports',
      link: `/dashboard/exchange/${exchangeId}/compliance`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      )
    },
    {
      title: 'Market Surveillance',
      description: 'Monitor market activity and alerts',
      link: `/dashboard/exchange/${exchangeId}/surveillance`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-6">
        {error}
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="text-center p-6">
        Exchange not found.
      </div>
    );
  }

  return (
    <RouteGuard allowedTypes={['exchange']}>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{exchange.name}</h1>
          <p className="text-gray-500">{exchange.description}</p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-gray-500">Active Listings</h3>
                <p className="text-2xl font-bold">{exchange.stats.listings}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-gray-500">Pending IPOs</h3>
                <p className="text-2xl font-bold">{exchange.stats.pendingIPOs}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-gray-500">Market Cap</h3>
                <p className="text-2xl font-bold">{exchange.stats.marketCap}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-gray-500">Daily Volume</h3>
                <p className="text-2xl font-bold">{exchange.stats.dailyVolume}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tools */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Exchange Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tools.map((tool, index) => (
              <Link href={tool.link} key={index}>
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="p-3 bg-blue-50 rounded-full">
                        {tool.icon}
                      </div>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Pending Reviews */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Reviews</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg border p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Tech Corp Ltd - IPO Application</h3>
                    <p className="text-sm text-gray-500">Submitted by Goldman Sachs on Feb 15, 2024</p>
                  </div>
                  <Link 
                    href={`/dashboard/exchange/${exchangeId}/documents?document=1`}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Review
                  </Link>
                </div>
                <div className="rounded-lg border p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Green Energy Co - Direct Listing</h3>
                    <p className="text-sm text-gray-500">Submitted by JP Morgan on Feb 10, 2024</p>
                  </div>
                  <Link 
                    href={`/dashboard/exchange/${exchangeId}/documents?document=2`}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RouteGuard>
  );
} 