import { NextResponse } from 'next/server';
import { upsertFeedbackToVectorDB } from '@/lib/ai/vectorSearch';

export async function POST(request: Request) {
  console.log('Received request to /api/ai-assistant/regenerate-rule');
  
  try {
    const { ruleId, updatedRule, isTrainingMode, knowledgeBase } = await request.json();
    
    // Validate required fields
    if (!ruleId || !updatedRule) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule ID and updated rule are required' 
      }, { status: 400 });
    }
    
    // Validate training mode
    if (!isTrainingMode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule regeneration is only allowed in training mode' 
      }, { status: 403 });
    }
    
    console.log(`Regenerating rule ${ruleId} in knowledge base: ${knowledgeBase || 'default'}`);
    
    // Validate the updated rule structure
    if (!updatedRule.title || !updatedRule.description || !updatedRule.category || !updatedRule.severity) {
      return NextResponse.json({ 
        success: false, 
        error: 'Updated rule must include title, description, category, and severity' 
      }, { status: 400 });
    }
    
    // Create a unique ID for the regenerated rule
    const timestamp = Date.now();
    const regeneratedRuleId = `${ruleId}-regenerated-${timestamp}`;
    
    // Create the rule object to upsert
    const regeneratedRule = {
      id: regeneratedRuleId,
      title: updatedRule.title,
      description: updatedRule.description,
      category: updatedRule.category,
      severity: updatedRule.severity,
      originalRuleId: ruleId,
      regeneratedAt: new Date().toISOString(),
      source: 'user_regenerated'
    };
    
    // Upsert the regenerated rule to the vector database
    try {
      // Format the rule as a query and response for the upsert function
      const success = await upsertFeedbackToVectorDB({
        originalQuery: `${regeneratedRule.category} rule about ${regeneratedRule.title}`,
        improvedResponse: `${regeneratedRule.title}: ${regeneratedRule.description}`,
        knowledgeBase,
        metadata: {
          id: regeneratedRuleId,
          title: regeneratedRule.title,
          description: regeneratedRule.description,
          category: regeneratedRule.category,
          severity: regeneratedRule.severity,
          originalRuleId: ruleId,
          type: 'listing_rule',
          source: 'user_regenerated'
        }
      });
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Rule regenerated successfully',
          regeneratedRule
        });
      } else {
        throw new Error('Failed to upsert regenerated rule to vector database');
      }
    } catch (upsertError) {
      console.error('Error upserting regenerated rule:', upsertError);
      return NextResponse.json({ 
        success: false, 
        error: upsertError instanceof Error ? upsertError.message : 'Failed to upsert regenerated rule' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in regenerate-rule API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
} 