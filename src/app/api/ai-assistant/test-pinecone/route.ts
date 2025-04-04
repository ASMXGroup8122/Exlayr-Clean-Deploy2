import { NextResponse } from 'next/server';
import { pinecone, AI_CONFIG, openai } from '@/lib/ai/config';

export async function POST() {
  try {
    console.log('Testing Pinecone connection...');
    
    // Log environment variables for debugging (redacted for security)
    console.log('Pinecone Environment Variables:');
    console.log('- PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'Set (redacted)' : 'Not set');
    console.log('- PINECONE_INDEX:', process.env.PINECONE_INDEX || AI_CONFIG.pineconeIndex);
    
    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'PINECONE_API_KEY is not set in environment variables',
        message: 'Pinecone API key is missing'
      }, { status: 500 });
    }
    
    // Check if Pinecone index name is set
    const indexName = process.env.PINECONE_INDEX || AI_CONFIG.pineconeIndex;
    if (!indexName) {
      return NextResponse.json({ 
        success: false, 
        error: 'PINECONE_INDEX is not set in environment variables or AI_CONFIG',
        message: 'Pinecone index name is missing'
      }, { status: 500 });
    }
    
    // Get the Pinecone index
    const index = pinecone.index(indexName);
    
    // Test 1: Describe index stats
    console.log('Getting Pinecone index stats...');
    const indexStats = await index.describeIndexStats();
    console.log('Pinecone index stats:', indexStats);
    
    // Test 2: Generate embedding and query
    console.log('Generating test embedding...');
    const testText = 'Test query for Pinecone';
    
    // Generate embedding for the test text
    const embeddingResponse = await openai.embeddings.create({
      model: AI_CONFIG.embeddingModel,
      input: testText,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    console.log('Embedding generated successfully');
    
    // Query Pinecone with the embedding
    console.log('Querying Pinecone...');
    const queryResponse = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true
    });
    
    console.log('Pinecone query response:', queryResponse);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pinecone connection successful',
      stats: indexStats,
      queryResponse: queryResponse,
      config: {
        indexName: indexName,
        apiKeySet: !!process.env.PINECONE_API_KEY,
        vectorCount: indexStats.totalRecordCount || 0,
        hasVectors: (indexStats.totalRecordCount || 0) > 0
      }
    });
  } catch (error) {
    console.error('Error testing Pinecone connection:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to connect to Pinecone',
      config: {
        indexName: process.env.PINECONE_INDEX || AI_CONFIG.pineconeIndex,
        apiKeySet: !!process.env.PINECONE_API_KEY
      }
    }, { status: 500 });
  }
} 