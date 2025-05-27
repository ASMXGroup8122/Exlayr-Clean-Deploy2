import { NextRequest, NextResponse } from 'next/server';
import { testMem0Connection, isMem0Configured, storeMemory, getMemories } from '@/lib/ai/memory/mem0Client';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Mem0 connection...');

    // Check if Mem0 is configured
    const isConfigured = isMem0Configured();
    
    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        configured: false,
        connected: false,
        message: 'Mem0 is not configured. Please set MEM0_API_KEY environment variable.',
        error: 'MEM0_API_KEY not found'
      });
    }

    // Test the connection
    const isConnected = await testMem0Connection();

    if (isConnected) {
      return NextResponse.json({
        success: true,
        configured: true,
        connected: true,
        message: 'Mem0 connection successful! Ready to store and retrieve memories.',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        configured: true,
        connected: false,
        message: 'Mem0 is configured but connection test failed. Please check your API key and network connectivity.',
        error: 'Connection test failed'
      });
    }

  } catch (error) {
    console.error('❌ Error testing Mem0 connection:', error);
    
    return NextResponse.json({
      success: false,
      configured: isMem0Configured(),
      connected: false,
      message: 'Error testing Mem0 connection',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'test-store') {
      console.log('🧪 Testing MEM0 memory storage...');
      
      // Test storing a memory directly using our client
      const testMemoryId = await storeMemory({
        memory: 'Test memory for Canvas Mode integration - Financial overview section completed with revenue of $10M and growth rate of 15%',
        metadata: {
          issuer_id: 'test-issuer-123',
          listing_id: 'test-listing-456',
          section_key: 'sec3prompt_financialoverview',
          type: 'section_final',
          user_id: 'system',
          created_at: new Date().toISOString(),
        },
      });

      if (testMemoryId) {
        console.log('✅ MEM0: Successfully stored test memory with ID:', testMemoryId);
        
        return NextResponse.json({
          success: true,
          action: 'test-store',
          memoryId: testMemoryId,
          message: 'Successfully stored test memory in Mem0',
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ MEM0: Failed to store test memory');
        
        return NextResponse.json({
          success: false,
          action: 'test-store',
          message: 'Failed to store test memory in Mem0',
          error: 'Memory storage returned null',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    if (action === 'test-entity-fact') {
      console.log('🧪 Testing MEM0 entity fact storage...');
      
      const testMemoryId = await storeMemory({
        memory: 'Exlayr Technologies is a fintech company specializing in AI-powered regulatory compliance solutions for capital markets',
        metadata: {
          issuer_id: 'test-issuer-123',
          type: 'entity_fact',
          user_id: 'system',
          created_at: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: !!testMemoryId,
        action: 'test-entity-fact',
        memoryId: testMemoryId,
        message: testMemoryId ? 'Successfully stored entity fact' : 'Failed to store entity fact',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'test-tone-reference') {
      console.log('🧪 Testing MEM0 tone reference storage...');
      
      const testMemoryId = await storeMemory({
        memory: 'Professional, regulatory-compliant tone with clear financial metrics and forward-looking statements appropriately qualified',
        metadata: {
          issuer_id: 'test-issuer-123',
          type: 'tone_reference',
          user_id: 'system',
          created_at: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: !!testMemoryId,
        action: 'test-tone-reference',
        memoryId: testMemoryId,
        message: testMemoryId ? 'Successfully stored tone reference' : 'Failed to store tone reference',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'test-multiple-memories') {
      console.log('🧪 Testing multiple distinct memory storage...');
      
      const memories = [
        {
          memory: 'Financial Overview: Company reported revenue of $50M in Q3 2024 with 25% YoY growth',
          metadata: {
            issuer_id: 'test-issuer-123',
            listing_id: 'test-listing-456',
            section_key: 'sec3prompt_financialoverview',
            type: 'section_final' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'TechCorp Inc is a leading software company specializing in enterprise solutions',
          metadata: {
            issuer_id: 'test-issuer-123',
            type: 'entity_fact' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'Professional regulatory tone with clear metrics and forward-looking statements',
          metadata: {
            issuer_id: 'test-issuer-123',
            type: 'tone_reference' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'Risk Factors: Market volatility and competitive pressures identified as primary risks',
          metadata: {
            issuer_id: 'test-issuer-123',
            listing_id: 'test-listing-456',
            section_key: 'sec5prompt_riskfactors',
            type: 'section_final' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'Business Model: SaaS platform with subscription-based revenue model',
          metadata: {
            issuer_id: 'test-issuer-123',
            listing_id: 'test-listing-456',
            section_key: 'sec2prompt_businessmodel',
            type: 'section_final' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        }
      ];

      const results = [];
      
      for (let i = 0; i < memories.length; i++) {
        try {
          const memoryId = await storeMemory(memories[i]);
          results.push({
            index: i + 1,
            success: !!memoryId,
            memoryId: memoryId,
            content: memories[i].memory.substring(0, 50) + '...',
            type: memories[i].metadata.type
          });
          
          // Add a small delay between stores to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.push({
            index: i + 1,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            content: memories[i].memory.substring(0, 50) + '...',
            type: memories[i].metadata.type
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      return NextResponse.json({
        success: successCount > 0,
        action: 'test-multiple-memories',
        totalAttempted: memories.length,
        successCount: successCount,
        results: results,
        message: `Successfully stored ${successCount} out of ${memories.length} memories`,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'test-distinct-memories') {
      console.log('🧪 Testing very distinct memory storage...');
      
      const distinctMemories = [
        {
          memory: 'The user prefers spicy Indian food, especially vindaloo curry',
          metadata: {
            issuer_id: 'test-issuer-123',
            type: 'entity_fact' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'Company operates in the renewable energy sector with solar panel manufacturing',
          metadata: {
            issuer_id: 'test-issuer-456',
            type: 'entity_fact' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'Financial performance shows 25% revenue growth in Q3 2024',
          metadata: {
            issuer_id: 'test-issuer-789',
            listing_id: 'test-listing-abc',
            section_key: 'sec3prompt_financialoverview',
            type: 'section_final' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'User prefers formal, regulatory tone with detailed metrics and compliance language',
          metadata: {
            issuer_id: 'test-issuer-999',
            type: 'tone_reference' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        },
        {
          memory: 'Technology stack includes React, Node.js, and PostgreSQL database',
          metadata: {
            issuer_id: 'test-issuer-555',
            type: 'entity_fact' as const,
            user_id: 'system',
            created_at: new Date().toISOString(),
          },
        }
      ];

      const results = [];
      
      for (let i = 0; i < distinctMemories.length; i++) {
        try {
          const memoryId = await storeMemory(distinctMemories[i]);
          results.push({
            index: i + 1,
            success: !!memoryId,
            memoryId: memoryId,
            content: distinctMemories[i].memory.substring(0, 60) + '...',
            type: distinctMemories[i].metadata.type,
            issuerId: distinctMemories[i].metadata.issuer_id
          });
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.push({
            index: i + 1,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            content: distinctMemories[i].memory.substring(0, 60) + '...',
            type: distinctMemories[i].metadata.type
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      return NextResponse.json({
        success: successCount > 0,
        action: 'test-distinct-memories',
        totalAttempted: distinctMemories.length,
        successCount: successCount,
        results: results,
        message: `Successfully stored ${successCount} out of ${distinctMemories.length} distinct memories`,
        note: 'MEM0 has built-in deduplication - similar memories may be merged or updated instead of creating duplicates',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'get-all-memories') {
      console.log('🧪 Retrieving all memories from MEM0...');
      
      try {
        const memories = await getMemories('system');
        
        return NextResponse.json({
          success: true,
          action: 'get-all-memories',
          totalMemories: memories.length,
          memories: memories.map(m => ({
            id: m.id,
            content: m.memory.substring(0, 100) + (m.memory.length > 100 ? '...' : ''),
            metadata: m.metadata,
            score: m.score
          })),
          message: `Retrieved ${memories.length} memories from MEM0`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          action: 'get-all-memories',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to retrieve memories from MEM0',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: 'Invalid action. Supported actions: test-store, test-entity-fact, test-tone-reference, test-multiple-memories, get-all-memories, test-distinct-memories'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in Mem0 test POST:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 