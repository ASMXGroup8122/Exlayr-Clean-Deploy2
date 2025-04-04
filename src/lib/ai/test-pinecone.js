// Test script for Pinecone connectivity
// Run with: node src/lib/ai/test-pinecone.js

// Load environment variables from .env file
require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

// Log environment variables (redacted for security)
console.log('Environment Variables:');
console.log('- PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'Set (redacted)' : 'Not set');
console.log('- PINECONE_INDEX:', process.env.PINECONE_INDEX || 'Not set');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (redacted)' : 'Not set');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
let pinecone;
try {
  if (!process.env.PINECONE_API_KEY) {
    console.error('ERROR: PINECONE_API_KEY is not set in environment variables');
    process.exit(1);
  }
  
  pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  
  console.log('Pinecone client initialized successfully');
} catch (error) {
  console.error('ERROR initializing Pinecone client:', error);
  process.exit(1);
}

// Function to generate embeddings
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('ERROR generating embedding:', error);
    throw error;
  }
}

// Test Pinecone connectivity
async function testPineconeConnectivity() {
  try {
    // Check if index name is set
    const indexName = process.env.PINECONE_INDEX;
    if (!indexName) {
      console.error('ERROR: PINECONE_INDEX is not set in environment variables');
      process.exit(1);
    }
    
    console.log(`Using Pinecone index: ${indexName}`);
    
    // Get the Pinecone index
    const index = pinecone.index(indexName);
    
    // Test 1: Describe index stats
    console.log('\nTEST 1: Describe index stats');
    try {
      const indexStats = await index.describeIndexStats();
      console.log('SUCCESS: Index stats retrieved');
      console.log('Index stats:', JSON.stringify(indexStats, null, 2));
      
      // Check if index has vectors
      const vectorCount = indexStats.totalVectorCount || 0;
      console.log(`Vector count: ${vectorCount}`);
      if (vectorCount === 0) {
        console.log('WARNING: Index has no vectors. You may need to initialize it.');
      }
    } catch (error) {
      console.error('ERROR getting index stats:', error);
      console.log('This may indicate that the index does not exist or is inaccessible');
      return;
    }
    
    // Test 2: Generate embedding and query
    console.log('\nTEST 2: Generate embedding and query');
    try {
      const testText = 'Test query for Pinecone';
      console.log(`Generating embedding for: "${testText}"`);
      
      const embedding = await generateEmbedding(testText);
      console.log('Embedding generated successfully');
      
      // Query Pinecone
      console.log('Querying Pinecone...');
      const queryResponse = await index.query({
        vector: embedding,
        topK: 3,
        includeMetadata: true
      });
      
      console.log('Query response:', JSON.stringify(queryResponse, null, 2));
      
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        console.log('SUCCESS: Found matches in Pinecone');
      } else {
        console.log('WARNING: No matches found in Pinecone. The index may be empty or the query did not match any vectors.');
      }
    } catch (error) {
      console.error('ERROR querying Pinecone:', error);
    }
    
    console.log('\nPinecone connectivity test completed');
  } catch (error) {
    console.error('ERROR testing Pinecone connectivity:', error);
  }
}

// Run the test
testPineconeConnectivity(); 