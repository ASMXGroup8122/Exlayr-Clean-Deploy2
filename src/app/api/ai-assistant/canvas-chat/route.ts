import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/ai/config';
import { getSectionContext } from '@/lib/ai/context/getSectionContext';
import { composePrompt, createSystemMessage } from '@/lib/ai/prompts/promptComposer';

export async function POST(request: Request) {
  try {
    // Get raw body text first for debugging
    const bodyText = await request.text();
    console.log('🎯 Raw request body:', bodyText);
    
    // Parse JSON manually with better error handling
    let requestData;
    try {
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('🚨 JSON Parse Error:', parseError);
      console.error('🚨 Body that failed to parse:', bodyText);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userPrompt, listingId, fieldId, mode } = requestData;

    // Validate input
    if (!userPrompt || !listingId) {
      console.log('🚨 Missing parameters:', { userPrompt: !!userPrompt, listingId: !!listingId, fieldId: !!fieldId });
      return NextResponse.json(
        { error: 'Missing required parameters: userPrompt, listingId' },
        { status: 400 }
      );
    }

    // Use general_inquiry if no fieldId provided
    const effectiveFieldId = fieldId || 'general_inquiry';

    console.log(`🎯 CANVAS MODE ENDPOINT CALLED - Field: ${effectiveFieldId}, Listing: ${listingId}, Mode: ${mode}`);
    console.log(`🎯 User prompt: "${userPrompt}"`);
    console.log('🎯 This is the NEW context-aware endpoint, not the generic /api/ai/chat');

    // Get the OpenAI client
    const openai = getOpenAI();

    // Load section context using our context-aware system
    const sectionContext = await getSectionContext(
      userPrompt,
      listingId,
      effectiveFieldId
    );

    // Compose enhanced prompt using our context-aware system
    const promptComposition = composePrompt(userPrompt, sectionContext);
    
    // Create enhanced system message based on detected mode
    const systemMessage = createSystemMessage(sectionContext.mode);

    console.log(`Canvas Mode Context - Field: ${effectiveFieldId}, Mode: ${sectionContext.mode}, Sources: ${sectionContext.source_trace.join(', ')}`);

    // Call OpenAI API with enhanced context-aware prompt
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: promptComposition.prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Extract the assistant's message
    const aiMessage = response.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No response generated from OpenAI');
    }

    // Return enhanced response with context metadata
    return NextResponse.json({
      message: aiMessage,
      context: {
        mode: sectionContext.mode,
        field_key: sectionContext.field_key,
        section_label: sectionContext.section_label,
        sources: sectionContext.source_trace,
        missing_data: sectionContext.missing_flags,
        upload_recommendation: promptComposition.upload_recommendation,
        has_structured_data: Object.keys(sectionContext.structured_data).length > 0,
        has_uploads: sectionContext.upload_matches.length > 0
      }
    });

  } catch (error: any) {
    console.error('Error in Canvas Mode AI API:', error);

    // Return appropriate error response
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An error occurred with the Canvas Mode AI service' },
      { status: 500 }
    );
  }
} 