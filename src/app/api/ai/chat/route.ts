import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/ai/config';
import { createClient } from '@/utils/supabase/server';

interface SmartAgentResponse {
  message: string;
  missingDocuments?: {
    category: string;
    label: string;
    reason: string;
  }[];
  foundDocuments?: {
    name: string;
    category: string;
    relevance: string;
  }[];
  shouldTriggerUpload?: boolean;
  uploadSuggestion?: {
    category: string;
    label: string;
    message: string;
  };
}

export async function POST(request: Request) {
  try {
    const { messages, orgId, mode } = await request.json();

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get the last user message for Smart Agent analysis
    const lastUserMessage = messages[messages.length - 1];
    const userQuery = lastUserMessage?.content || '';

    console.log(`Processing AI chat request for orgId: ${orgId}, mode: ${mode}`);

    // Initialize Supabase client for Knowledge Vault search
    const supabase = await createClient();

    let smartAgentResponse: SmartAgentResponse = {
      message: '',
      shouldTriggerUpload: false
    };

    // Smart Agent Mode: Enhanced logic for knowledge vault integration
    if (mode === 'agent_mode') {
      console.log('🤖 Smart Agent: Analyzing user request for knowledge vault needs');
      
      // Step 1: Search Knowledge Vault for relevant documents
      const { data: knowledgeDocs, error: kbError } = await supabase
        .from('knowledge_vault_documents')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (kbError) {
        console.error('Error searching knowledge vault:', kbError);
      }

      // Step 2: Analyze user query to determine document needs
      const documentAnalysis = await analyzeDocumentNeeds(userQuery, knowledgeDocs || []);
      
      // Step 3: Check if we have sufficient documents
      if (documentAnalysis.missingDocuments.length > 0) {
        console.log('🤖 Smart Agent: Missing documents detected:', documentAnalysis.missingDocuments);
        
        // Generate response suggesting upload
        const openai = getOpenAI();
        const uploadSuggestionResponse = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a Smart Agent that helps users with document analysis. When documents are missing, you should:
1. Explain what documents are needed and why
2. Be helpful and specific about what to upload
3. Keep the tone professional but friendly
4. Suggest the most relevant document category`
            },
            {
              role: 'user',
              content: `User request: "${userQuery}"
              
Missing documents: ${JSON.stringify(documentAnalysis.missingDocuments)}
Available documents: ${JSON.stringify(documentAnalysis.foundDocuments)}

Please explain what documents are needed and suggest uploading them.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const uploadMessage = uploadSuggestionResponse.choices[0]?.message?.content || 
          'I need additional documents to help you with this request. Please upload the relevant documents to your Knowledge Vault.';

        smartAgentResponse = {
          message: uploadMessage,
          missingDocuments: documentAnalysis.missingDocuments,
          foundDocuments: documentAnalysis.foundDocuments,
          shouldTriggerUpload: true,
          uploadSuggestion: documentAnalysis.missingDocuments[0] ? {
            category: documentAnalysis.missingDocuments[0].category,
            label: documentAnalysis.missingDocuments[0].label,
            message: documentAnalysis.missingDocuments[0].reason
          } : undefined
        };

      } else {
        console.log('🤖 Smart Agent: Sufficient documents found, proceeding with analysis');
        
        // We have documents, proceed with normal AI processing
        const contextualMessages = [
          {
            role: 'system',
            content: `You are a Smart Agent with access to the user's Knowledge Vault. Available documents: ${
              documentAnalysis.foundDocuments.map(doc => `${doc.name} (${doc.category})`).join(', ')
            }. Use this context to provide comprehensive responses.`
          },
          ...messages
        ];

        const openai = getOpenAI();
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: contextualMessages,
          temperature: 0.7,
          max_tokens: 1000,
        });

        const aiMessage = response.choices[0]?.message?.content;
        if (!aiMessage) {
          throw new Error('No response generated from OpenAI');
        }

        smartAgentResponse = {
          message: aiMessage,
          foundDocuments: documentAnalysis.foundDocuments,
          shouldTriggerUpload: false
        };
      }

      return NextResponse.json(smartAgentResponse);
    }

    // Standard AI Chat Mode (non-Smart Agent)
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiMessage = response.choices[0]?.message?.content;
    if (!aiMessage) {
      throw new Error('No response generated from OpenAI');
    }

    return NextResponse.json({ message: aiMessage });

  } catch (error: any) {
    console.error('Error in AI chat API:', error);

    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An error occurred with the AI service' },
      { status: 500 }
    );
  }
}

/**
 * Analyze user query to determine what documents are needed
 */
async function analyzeDocumentNeeds(userQuery: string, availableDocs: any[]) {
  const query = userQuery.toLowerCase();
  
  // Document category mappings based on common requests
  const documentNeeds = [
    {
      keywords: ['financial', 'accounts', 'revenue', 'profit', 'loss', 'balance sheet', 'income statement', 'complete', 'section', 'position', 'forecasts', 'cash flow', 'assets', 'liabilities', 'equity'],
      category: 'accounts',
      label: 'Financial Statements & Accounts',
      reason: 'Financial analysis and section completion requires access to accounts and financial statements'
    },
    {
      keywords: ['business plan', 'strategy', 'business model', 'operations', 'market analysis', 'competitive', 'swot'],
      category: 'business_plan',
      label: 'Business Plan',
      reason: 'Business analysis requires access to the business plan and strategy documents'
    },
    {
      keywords: ['director', 'management', 'board', 'executive', 'cv', 'biography', 'leadership', 'team'],
      category: 'director_cvs',
      label: 'Directors\' CVs',
      reason: 'Management analysis requires access to directors\' CVs and biographies'
    },
    {
      keywords: ['contract', 'agreement', 'material', 'supplier', 'customer', 'partnership', 'licensing'],
      category: 'material_contracts',
      label: 'Material Contracts',
      reason: 'Contract analysis requires access to material agreements and contracts'
    },
    {
      keywords: ['memorandum', 'articles', 'incorporation', 'constitution', 'governance', 'bylaws'],
      category: 'memorandum_articles',
      label: 'Memorandum & Articles',
      reason: 'Governance analysis requires access to constitutional documents'
    },
    {
      keywords: ['investment', 'deck', 'presentation', 'pitch', 'investor', 'funding', 'valuation'],
      category: 'investment_deck',
      label: 'Investment Deck',
      reason: 'Investment analysis requires access to investor presentations and decks'
    },
    {
      keywords: ['press', 'news', 'announcement', 'media', 'release', 'public', 'communication'],
      category: 'press_releases',
      label: 'Press Releases',
      reason: 'Market analysis requires access to press releases and announcements'
    }
  ];

  const missingDocuments = [];
  const foundDocuments = [];

  console.log('🔍 Smart Agent: Analyzing query for document needs:', query);

  // Check each document need against the query
  for (const need of documentNeeds) {
    const isNeeded = need.keywords.some(keyword => query.includes(keyword));
    
    if (isNeeded) {
      console.log(`🔍 Smart Agent: Query matches ${need.label} category`);
      
      // Check if we have documents in this category
      const categoryDocs = availableDocs.filter(doc => 
        doc.category === need.category || 
        doc.name.toLowerCase().includes(need.keywords[0]) ||
        need.keywords.some(keyword => doc.name.toLowerCase().includes(keyword))
      );

      if (categoryDocs.length === 0) {
        console.log(`❌ Smart Agent: No documents found for ${need.label}`);
        missingDocuments.push({
          category: need.category,
          label: need.label,
          reason: need.reason
        });
      } else {
        console.log(`✅ Smart Agent: Found ${categoryDocs.length} documents for ${need.label}`);
        foundDocuments.push(...categoryDocs.map(doc => ({
          name: doc.name,
          category: doc.category,
          relevance: `Relevant for ${need.label.toLowerCase()}`
        })));
      }
    }
  }

  console.log('🔍 Smart Agent: Analysis complete:', {
    missingDocuments: missingDocuments.length,
    foundDocuments: foundDocuments.length
  });

  return {
    missingDocuments,
    foundDocuments
  };
} 