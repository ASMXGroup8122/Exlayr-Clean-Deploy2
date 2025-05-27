import MemoryClient from 'mem0ai';

// Types for Mem0 integration
export interface MemoryEntry {
  id?: string;
  memory: string;
  metadata?: {
    issuer_id?: string;
    listing_id?: string;
    section_key?: string;
    type?: 'section_final' | 'entity_fact' | 'tone_reference' | 'prior_attempt';
    user_id?: string;
    created_at?: string;
  };
}

export interface MemorySearchResult {
  id: string;
  memory: string;
  score: number;
  metadata?: any;
}

export interface MemorySearchOptions {
  limit?: number;
  filters?: Record<string, any>;
  user_id?: string;
}

// Singleton Mem0 client
let mem0Client: MemoryClient | null = null;

/**
 * Initialize Mem0 client with API key
 */
function initializeMem0Client(): MemoryClient {
  if (!mem0Client) {
    const apiKey = process.env.MEM0_API_KEY;
    
    if (!apiKey) {
      throw new Error('MEM0_API_KEY environment variable is required');
    }

    mem0Client = new MemoryClient({
      apiKey: apiKey,
    });
  }
  
  return mem0Client;
}

/**
 * Store a memory entry in Mem0
 */
export async function storeMemory(entry: MemoryEntry): Promise<string | null> {
  try {
    const client = initializeMem0Client();
    
    // Convert memory string to message format
    const messages = [{ role: 'user' as const, content: entry.memory }];
    
    const response = await client.add(messages, {
      user_id: entry.metadata?.user_id || 'system',
      metadata: entry.metadata || {},
    });

    console.log('✅ Mem0: Stored memory entry:', response);
    return response?.[0]?.id || null;
  } catch (error) {
    console.error('❌ Mem0: Error storing memory:', error);
    return null;
  }
}

/**
 * Search for relevant memories in Mem0
 */
export async function searchMemories(
  query: string, 
  options: MemorySearchOptions = {}
): Promise<MemorySearchResult[]> {
  try {
    const client = initializeMem0Client();
    
    const response = await client.search(query, {
      user_id: options.user_id || 'system',
      limit: options.limit || 10,
      filters: options.filters || {},
    });

    console.log('🔍 Mem0: Search results:', response);
    
    return response.map((result: any) => ({
      id: result.id,
      memory: result.memory,
      score: result.score || 0,
      metadata: result.metadata || {},
    }));
  } catch (error) {
    console.error('❌ Mem0: Error searching memories:', error);
    return [];
  }
}

/**
 * Get all memories for a specific user/context
 */
export async function getMemories(
  userId: string = 'system',
  filters?: Record<string, any>
): Promise<MemorySearchResult[]> {
  try {
    const client = initializeMem0Client();
    
    const response = await client.getAll({
      user_id: userId,
      filters: filters || {},
    });

    console.log('📋 Mem0: Retrieved memories:', response);
    
    return response.map((result: any) => ({
      id: result.id,
      memory: result.memory,
      score: 1.0, // No score for getAll
      metadata: result.metadata || {},
    }));
  } catch (error) {
    console.error('❌ Mem0: Error retrieving memories:', error);
    return [];
  }
}

/**
 * Delete a specific memory entry
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  try {
    const client = initializeMem0Client();
    
    await client.delete(memoryId);
    console.log('🗑️ Mem0: Deleted memory:', memoryId);
    return true;
  } catch (error) {
    console.error('❌ Mem0: Error deleting memory:', error);
    return false;
  }
}

/**
 * Store a finalized section completion in Mem0
 */
export async function storeSectionCompletion(
  issuerId: string,
  listingId: string,
  sectionKey: string,
  content: string,
  userId: string = 'system'
): Promise<string | null> {
  const memory = `Section ${sectionKey} completed for listing ${listingId}: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
  
  return await storeMemory({
    memory,
    metadata: {
      issuer_id: issuerId,
      listing_id: listingId,
      section_key: sectionKey,
      type: 'section_final',
      user_id: userId,
      created_at: new Date().toISOString(),
    },
  });
}

/**
 * Store an entity fact for reuse across sections
 */
export async function storeEntityFact(
  issuerId: string,
  fact: string,
  userId: string = 'system'
): Promise<string | null> {
  return await storeMemory({
    memory: fact,
    metadata: {
      issuer_id: issuerId,
      type: 'entity_fact',
      user_id: userId,
      created_at: new Date().toISOString(),
    },
  });
}

/**
 * Store a tone reference for consistency
 */
export async function storeToneReference(
  issuerId: string,
  toneContent: string,
  userId: string = 'system'
): Promise<string | null> {
  return await storeMemory({
    memory: toneContent,
    metadata: {
      issuer_id: issuerId,
      type: 'tone_reference',
      user_id: userId,
      created_at: new Date().toISOString(),
    },
  });
}

/**
 * Search for relevant memories for a specific section
 */
export async function searchSectionMemories(
  issuerId: string,
  sectionKey: string,
  query: string,
  userId: string = 'system'
): Promise<MemorySearchResult[]> {
  return await searchMemories(query, {
    user_id: userId,
    limit: 5,
    filters: {
      issuer_id: issuerId,
      section_key: sectionKey,
    },
  });
}

/**
 * Search for entity facts for an issuer
 */
export async function searchEntityFacts(
  issuerId: string,
  query: string,
  userId: string = 'system'
): Promise<MemorySearchResult[]> {
  return await searchMemories(query, {
    user_id: userId,
    limit: 10,
    filters: {
      issuer_id: issuerId,
      type: 'entity_fact',
    },
  });
}

/**
 * Get tone references for an issuer
 */
export async function getToneReferences(
  issuerId: string,
  userId: string = 'system'
): Promise<MemorySearchResult[]> {
  return await getMemories(userId, {
    issuer_id: issuerId,
    type: 'tone_reference',
  });
}

/**
 * Check if Mem0 is properly configured
 */
export function isMem0Configured(): boolean {
  return !!process.env.MEM0_API_KEY;
}

/**
 * Test Mem0 connection
 */
export async function testMem0Connection(): Promise<boolean> {
  try {
    if (!isMem0Configured()) {
      console.log('⚠️ Mem0: API key not configured');
      return false;
    }

    const client = initializeMem0Client();
    
    // Try to store and retrieve a test memory
    const testMessages = [{ role: 'user' as const, content: 'Test memory for connection verification' }];
    const response = await client.add(testMessages, {
      user_id: 'test',
      metadata: { type: 'connection_test' },
    });

    if (response?.[0]?.id) {
      // Clean up test memory
      await client.delete(response[0].id);
      console.log('✅ Mem0: Connection test successful');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Mem0: Connection test failed:', error);
    return false;
  }
} 