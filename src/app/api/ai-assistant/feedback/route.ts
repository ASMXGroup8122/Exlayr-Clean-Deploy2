import { NextResponse } from 'next/server';
import { upsertFeedbackToVectorDB } from '@/lib/ai/vectorSearch';

export async function POST(request: Request) {
  console.log('Received request to /api/ai-assistant/feedback');
  
  try {
    const { 
      originalQuery, 
      assistantResponse, 
      userFeedback, 
      improvedResponse, 
      isTrainingMode, 
      knowledgeBase 
    } = await request.json();
    
    // Validate required fields
    if (!originalQuery || !assistantResponse || !userFeedback) {
      return NextResponse.json({ 
        success: false, 
        error: 'Original query, assistant response, and user feedback are required' 
      }, { status: 400 });
    }
    
    // Validate training mode
    if (!isTrainingMode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Feedback collection is only allowed in training mode' 
      }, { status: 403 });
    }
    
    console.log(`Processing feedback for knowledge base: ${knowledgeBase || 'default'}`);
    console.log(`Feedback type: ${userFeedback}, has improved response: ${!!improvedResponse}`);
    
    // Only upsert if feedback is positive or an improved response is provided
    if (userFeedback === 'positive' || improvedResponse) {
      // Determine what to upsert
      const responseToUpsert = improvedResponse || assistantResponse;
      
      // Upsert the feedback to the vector database
      try {
        const success = await upsertFeedbackToVectorDB({
          originalQuery,
          improvedResponse: responseToUpsert,
          knowledgeBase,
          metadata: {
            feedbackType: userFeedback,
            originalResponse: assistantResponse,
            hasImprovedResponse: !!improvedResponse,
            timestamp: new Date().toISOString(),
            type: 'user_feedback'
          }
        });
        
        if (success) {
          return NextResponse.json({ 
            success: true, 
            message: 'Feedback collected and stored successfully'
          });
        } else {
          throw new Error('Failed to upsert feedback to vector database');
        }
      } catch (upsertError) {
        console.error('Error upserting feedback:', upsertError);
        return NextResponse.json({ 
          success: false, 
          error: upsertError instanceof Error ? upsertError.message : 'Failed to upsert feedback' 
        }, { status: 500 });
      }
    } else {
      // For negative feedback without improvement, just log it but don't upsert
      console.log('Negative feedback received without improvement, not upserting to vector database');
      return NextResponse.json({ 
        success: true, 
        message: 'Feedback collected successfully (not stored in vector database)'
      });
    }
    
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
} 