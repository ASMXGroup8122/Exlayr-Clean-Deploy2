import { NextResponse } from 'next/server';
import { pinecone, AI_CONFIG } from '@/lib/ai/config';

export async function GET() {
  try {
    console.log('Checking Pinecone status...');
    
    // Check if Pinecone is configured
    if (!process.env.PINECONE_API_KEY) {
      console.log('Pinecone API key is not set');
      return NextResponse.json({ 
        status: 'error', 
        message: 'Pinecone API key is not set',
        initialized: false 
      });
    }
    
    if (!process.env.PINECONE_INDEX && !AI_CONFIG.pineconeIndex) {
      console.log('Pinecone index name is not set');
      return NextResponse.json({ 
        status: 'error', 
        message: 'Pinecone index name is not set',
        initialized: false 
      });
    }
    
    // Get the Pinecone index
    const indexName = process.env.PINECONE_INDEX || AI_CONFIG.pineconeIndex;
    const index = pinecone.index(indexName);
    console.log(`Using Pinecone index: ${indexName}`);
    
    // Check if the index exists and has vectors
    try {
      const stats = await index.describeIndexStats();
      console.log(`Pinecone index stats: ${JSON.stringify(stats, null, 2)}`);
      
      const totalVectorCount = stats.totalRecordCount || 0;
      const isInitialized = totalVectorCount > 0;
      
      return NextResponse.json({
        status: 'success',
        initialized: isInitialized,
        vectorCount: totalVectorCount,
        namespaces: stats.namespaces,
        dimensions: stats.dimension
      });
    } catch (error) {
      console.error('Error checking Pinecone index:', error);
      return NextResponse.json({ 
        status: 'error', 
        message: `Error checking Pinecone index: ${error instanceof Error ? error.message : String(error)}`,
        initialized: false 
      });
    }
  } catch (error) {
    console.error('Error checking Pinecone status:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: `Error checking Pinecone status: ${error instanceof Error ? error.message : String(error)}`,
      initialized: false 
    });
  }
} 