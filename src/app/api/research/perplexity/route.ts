import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Check if Perplexity API key is configured
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      console.log('Perplexity API key not configured, returning mock results');
      
      // Return mock results when API key is not configured
      const mockResults = [
        {
          title: "Exchange Listing Requirements Guide",
          url: "https://example.com/listing-guide",
          snippet: "Comprehensive guide to exchange listing requirements including financial disclosure, governance standards, and regulatory compliance for public companies.",
          source: "Exchange Documentation"
        },
        {
          title: "Financial Disclosure Standards for Listed Companies",
          url: "https://example.com/financial-disclosure",
          snippet: "Detailed requirements for financial reporting, auditing standards, and transparency obligations for companies seeking public listing.",
          source: "Regulatory Authority"
        },
        {
          title: "Corporate Governance Best Practices",
          url: "https://example.com/governance",
          snippet: "Best practices for board composition, executive compensation disclosure, and shareholder rights in publicly traded companies.",
          source: "Industry Standards"
        }
      ];

      return NextResponse.json({
        success: true,
        results: mockResults,
        query,
        source: 'mock'
      });
    }

    // Make request to Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant helping with regulatory and financial document preparation. Provide accurate, up-to-date information with proper citations.'
          },
          {
            role: 'user',
            content: `Research the following topic for a listing document: ${query}${context ? ` Context: ${context}` : ''}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_domain_filter: ["gov", "edu", "org"],
        search_recency_filter: "month"
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
    }

    const data = await perplexityResponse.json();
    
    // Extract citations and format results
    const content = data.choices[0]?.message?.content || '';
    const citations = data.citations || [];
    
    // Parse the response to extract structured information
    const results = citations.map((citation: any, index: number) => ({
      title: citation.title || `Research Result ${index + 1}`,
      url: citation.url || '#',
      snippet: citation.text || content.substring(0, 200) + '...',
      source: citation.domain || 'Web Source'
    }));

    // If no citations, create a single result from the content
    if (results.length === 0 && content) {
      results.push({
        title: `Research: ${query}`,
        url: '#',
        snippet: content.substring(0, 300) + '...',
        source: 'Perplexity AI'
      });
    }

    return NextResponse.json({
      success: true,
      results,
      query,
      source: 'perplexity'
    });

  } catch (error: any) {
    console.error('Error in Perplexity research:', error);
    
    // Return mock results on error
    const mockResults = [
      {
        title: "Research Error - Mock Result",
        url: "#",
        snippet: `Unable to fetch live results for "${(await request.json()).query}". This is a placeholder result. Please check your Perplexity API configuration.`,
        source: "Error Fallback"
      }
    ];

    return NextResponse.json({
      success: false,
      results: mockResults,
      error: error.message,
      source: 'error_fallback'
    });
  }
} 