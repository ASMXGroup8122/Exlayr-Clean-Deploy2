import { NextRequest, NextResponse } from 'next/server';
import { 
  storeSectionCompletion, 
  storeEntityFact, 
  storeToneReference,
  isMem0Configured 
} from '@/lib/ai/memory/mem0Client';

export async function POST(request: NextRequest) {
  try {
    const { 
      type, 
      issuerId, 
      listingId, 
      sectionKey, 
      content, 
      userId = 'system' 
    } = await request.json();

    // Validate input
    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: type, content' },
        { status: 400 }
      );
    }

    // Check if Mem0 is configured
    if (!isMem0Configured()) {
      return NextResponse.json(
        { error: 'Mem0 is not configured. Please set MEM0_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    let memoryId: string | null = null;

    // Store memory based on type
    switch (type) {
      case 'section_completion':
        if (!issuerId || !listingId || !sectionKey) {
          return NextResponse.json(
            { error: 'Missing required fields for section completion: issuerId, listingId, sectionKey' },
            { status: 400 }
          );
        }
        memoryId = await storeSectionCompletion(issuerId, listingId, sectionKey, content, userId);
        break;

      case 'entity_fact':
        if (!issuerId) {
          return NextResponse.json(
            { error: 'Missing required field for entity fact: issuerId' },
            { status: 400 }
          );
        }
        memoryId = await storeEntityFact(issuerId, content, userId);
        break;

      case 'tone_reference':
        if (!issuerId) {
          return NextResponse.json(
            { error: 'Missing required field for tone reference: issuerId' },
            { status: 400 }
          );
        }
        memoryId = await storeToneReference(issuerId, content, userId);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid memory type: ${type}. Supported types: section_completion, entity_fact, tone_reference` },
          { status: 400 }
        );
    }

    if (memoryId) {
      console.log(`✅ Memory stored successfully: ${memoryId} (type: ${type})`);
      return NextResponse.json({
        success: true,
        memoryId,
        type,
        message: 'Memory stored successfully'
      });
    } else {
      console.error('❌ Failed to store memory');
      return NextResponse.json(
        { error: 'Failed to store memory in Mem0' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in store-memory API:', error);
    return NextResponse.json(
      { error: 'Internal server error while storing memory' },
      { status: 500 }
    );
  }
} 