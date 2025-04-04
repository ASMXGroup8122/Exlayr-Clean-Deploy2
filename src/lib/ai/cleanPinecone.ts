import { Pinecone } from '@pinecone-database/pinecone';
import { AI_CONFIG } from './config';

/**
 * Utility function to clean up mock rules from the Pinecone database
 * This should be run once to remove any previously uploaded mock rules
 */
export async function cleanupMockRulesFromPinecone(): Promise<void> {
  try {
    console.log('Starting cleanup of mock rules from Pinecone...');
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.error('Cannot clean Pinecone from browser environment');
      throw new Error('Pinecone cleanup must be done server-side');
    }
    
    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      console.error('PINECONE_API_KEY is not set in environment variables');
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }
    
    // Check if Pinecone index name is set
    const indexName = process.env.PINECONE_INDEX || AI_CONFIG.pineconeIndex;
    if (!indexName) {
      console.error('PINECONE_INDEX is not set in environment variables');
      throw new Error('PINECONE_INDEX is not set in environment variables');
    }
    
    console.log(`Using Pinecone index: ${indexName}`);
    
    // Initialize Pinecone client
    const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    
    const index = pineconeClient.Index(indexName);
    
    // Define the IDs of mock rules to delete
    const mockRuleIds = [];
    for (let i = 1; i <= 15; i++) {
      mockRuleIds.push(`rule-${i}`);
    }
    
    console.log(`Attempting to delete ${mockRuleIds.length} mock rules with IDs:`, mockRuleIds);
    
    // Delete the mock rules
    try {
      await index.deleteMany(mockRuleIds);
      console.log('Successfully deleted mock rules from Pinecone');
    } catch (deleteError) {
      console.error('Error deleting mock rules:', deleteError);
      throw deleteError;
    }
    
    // Verify the deletion by querying for the first mock rule ID
    try {
      console.log('Verifying deletion...');
      
      // Query for vectors with metadata filter for type: 'listing_rule'
      const queryResponse = await index.query({
        topK: 100,
        includeMetadata: true,
        filter: {
          type: { $eq: 'listing_rule' }
        }
      });
      
      // Check if any of the mock rules still exist
      const remainingMockRules = queryResponse.matches?.filter(match => 
        mockRuleIds.includes(match.id)
      ) || [];
      
      if (remainingMockRules.length > 0) {
        console.warn(`${remainingMockRules.length} mock rules still exist in the database:`, 
          remainingMockRules.map(rule => rule.id));
      } else {
        console.log('Verification successful: No mock rules found in the database');
      }
      
      // Log the total number of listing rules remaining
      const totalListingRules = queryResponse.matches?.filter(match => 
        (match.metadata as any)?.type === 'listing_rule'
      ).length || 0;
      
      console.log(`Total listing rules remaining in database: ${totalListingRules}`);
      
    } catch (verifyError) {
      console.error('Error verifying deletion:', verifyError);
    }
    
    console.log('Pinecone cleanup completed');
    
  } catch (error) {
    console.error('Error cleaning up Pinecone:', error);
    throw error;
  }
}

// Export a function to run the cleanup
export async function runCleanup(): Promise<void> {
  try {
    await cleanupMockRulesFromPinecone();
    console.log('Cleanup process completed successfully');
  } catch (error) {
    console.error('Cleanup process failed:', error);
  }
}

// Allow direct execution of this script
if (require.main === module) {
  runCleanup()
    .then(() => console.log('Cleanup script finished'))
    .catch(err => console.error('Cleanup script failed:', err));
} 