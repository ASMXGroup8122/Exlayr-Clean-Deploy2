import { NextRequest, NextResponse } from 'next/server';
import { getSectionContext } from '@/lib/ai/context/getSectionContext';

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, listingId, currentFieldKey } = await request.json();

    if (!listingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: listingId' },
        { status: 400 }
      );
    }

    const context = await getSectionContext(
      userPrompt || '',
      listingId,
      currentFieldKey
    );

    return NextResponse.json({ context });

  } catch (error) {
    console.error('Error in get-section-context:', error);
    return NextResponse.json(
      { error: 'Failed to get section context' },
      { status: 500 }
    );
  }
} 