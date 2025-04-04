import { NextResponse } from 'next/server';
import { assistantService } from '@/lib/ai/assistantService';
import { findRelevantRules } from '@/lib/ai/vectorSearch';

export async function POST(request: Request) {
  console.log('Received request to /api/ai-assistant/message');
  
  try {
    const { messages, knowledgeBase, isTrainingMode } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Messages array is required' 
      }, { status: 400 });
    }
    
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json({ 
        success: false, 
        error: 'No user message found' 
      }, { status: 400 });
    }
    
    console.log(`Processing message with knowledge base: ${knowledgeBase || 'default'}`);
    console.log(`Training mode: ${isTrainingMode ? 'enabled' : 'disabled'}`);
    
    // Get relevant rules for the section content if provided
    let relevantRulesText = '';
    if (lastUserMessage.content) {
      try {
        // Pass the knowledgeBase parameter to findRelevantRules
        const relevantRules = await findRelevantRules(lastUserMessage.content, 5, knowledgeBase);
        
        if (relevantRules.length > 0) {
          relevantRulesText = `\n\nRelevant rules:\n${relevantRules
            .map(rule => `- ${rule.title}: ${rule.description}`)
            .join('\n')}`;
        }
      } catch (ruleError) {
        console.error('Error fetching relevant rules:', ruleError);
        // Continue without rules if there's an error
      }
    }
    
    // Combine the message with relevant rules
    const fullMessage = `${lastUserMessage.content}${relevantRulesText}`;
    
    // Get response from the assistant service
    const response = await assistantService.processMessage(fullMessage, messages, knowledgeBase, isTrainingMode);
    
    return NextResponse.json({ 
      success: true, 
      response,
      knowledgeBase,
      isTrainingMode
    });
    
  } catch (error) {
    console.error('Error in message API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
} 