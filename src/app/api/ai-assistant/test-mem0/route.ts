import { NextRequest, NextResponse } from 'next/server';
import { testMem0Connection, isMem0Configured, storeMemory } from '@/lib/ai/memory/mem0Client';

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

    return NextResponse.json({
      error: 'Invalid action. Supported actions: test-store, test-entity-fact, test-tone-reference'
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