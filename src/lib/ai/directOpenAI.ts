import OpenAI from 'openai';
import { AgentType, AgentRequest, AgentResponse, agentDefinitions } from './agents';
import { AIAnalysisResult, AIMessage } from './config';

// Initialize the OpenAI client with a function to get the API key
let openaiClient: OpenAI | null = null;

/**
 * Gets or creates an OpenAI client instance
 */
async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) {
    return openaiClient;
  }

  try {
    // Use the environment variable directly
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not set in environment variables');
    }
    
    // Create a new client
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Allow usage in browser environment
    });
    
    return openaiClient;
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    throw error;
  }
}

/**
 * Calls the OpenAI API directly to execute an agent
 * @param request The agent request
 * @returns The agent response
 */
export async function callDirectOpenAI(request: AgentRequest): Promise<AgentResponse> {
  try {
    // Get the OpenAI client
    const openai = await getOpenAIClient();
    
    // Get the agent instructions based on the agent type
    const instructions = getAgentInstructions(request.agentType);
    
    // Prepare the messages for the OpenAI API
    const messages = [
      { role: 'system' as const, content: instructions },
      ...request.messages
    ];
    
    // Add document context if provided
    if (request.documentContext) {
      messages.push({
        role: 'user' as const,
        content: `I'm reviewing the following document section:
        
Section Title: ${request.documentContext.sectionTitle}
Section Content:
${request.documentContext.sectionContent}

Please analyze this section based on your expertise.`
      });
    }
    
    // Add previous agent outputs if provided
    if (request.previousAgentOutputs) {
      const previousOutputsStr = JSON.stringify(request.previousAgentOutputs, null, 2);
      messages.push({
        role: 'user' as const,
        content: `Here are the outputs from previous agents in the pipeline:
        
${previousOutputsStr}

Please consider this information in your analysis.`
      });
    }
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages as any,
    });
    
    // Extract the response content
    const responseContent = response.choices[0].message.content || '';
    
    // Create the response message
    const responseMessage: AIMessage = {
      role: 'assistant',
      content: responseContent
    };
    
    // Parse the response based on agent type
    let analysis: AIAnalysisResult | undefined;
    let structuredOutput: any = undefined;
    
    switch (request.agentType) {
      case AgentType.RULE_COMPLIANCE:
        if (request.documentContext) {
      analysis = parseRuleComplianceResponse(responseContent);
        }
        break;
      case AgentType.CONTEXT_EXTRACTION:
        structuredOutput = extractJsonFromResponse(responseContent);
        break;
      case AgentType.RULE_FILTERING:
        structuredOutput = extractJsonFromResponse(responseContent);
        break;
      case AgentType.TARGETED_SUMMARIZATION:
        structuredOutput = parseTargetedSummarizationResponse(responseContent);
        break;
      case AgentType.USER_FEEDBACK_INTEGRATION:
        structuredOutput = parseUserFeedbackResponse(responseContent);
        break;
      case AgentType.QUALITY_ASSURANCE:
        structuredOutput = parseQualityAssuranceResponse(responseContent);
        break;
      case AgentType.CONTEXTUAL_RELEVANCE:
        structuredOutput = parseContextualRelevanceResponse(responseContent);
        break;
      case AgentType.ITERATIVE_REFINEMENT:
        structuredOutput = parseIterativeRefinementResponse(responseContent);
        break;
    }
    
    return {
      messages: [...request.messages, responseMessage],
      analysis,
      structuredOutput
    };
  } catch (error) {
    console.error('Error calling OpenAI API directly:', error);
    
    // Return a fallback response
    return {
      messages: [
        ...request.messages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please check if your OpenAI API key is set correctly.',
        },
      ],
    };
  }
}

/**
 * Get the instructions for a specific agent type
 */
function getAgentInstructions(agentType: AgentType): string {
  // Use the instructions from agentDefinitions
  return agentDefinitions[agentType]?.instructions || '';
}

/**
 * Extract JSON from a response string
 */
function extractJsonFromResponse(content: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find JSON without the markdown code block
    const jsonRegex = /\{[\s\S]*\}/;
    const jsonMatch2 = content.match(jsonRegex);
    if (jsonMatch2) {
      return JSON.parse(jsonMatch2[0]);
    }
    
    console.warn('Could not extract JSON from response:', content);
    return null;
  } catch (error) {
    console.error('Error extracting JSON from response:', error);
    return null;
  }
}

/**
 * Parse the response from the targeted summarization agent
 */
function parseTargetedSummarizationResponse(content: string): any {
  try {
    // First try to extract JSON
    const jsonOutput = extractJsonFromResponse(content);
    if (jsonOutput) return jsonOutput;
    
    // Otherwise, parse the text format
    const summary = content.split('\n\n')[0] || '';
    
    // Extract recommendations
    const recommendations: string[] = [];
    if (content.toLowerCase().includes('recommendations:')) {
      const recommendationsSection = content.split(/recommendations:/i)[1].split(/examples:|summary:/i)[0];
      const recommendationLines = recommendationsSection.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of recommendationLines) {
        recommendations.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    // Extract examples
    const examples: string[] = [];
    if (content.toLowerCase().includes('examples:')) {
      const examplesSection = content.split(/examples:/i)[1].split(/recommendations:|summary:/i)[0];
      const exampleLines = examplesSection.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of exampleLines) {
        examples.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    return {
      summary,
      recommendations,
      examples
    };
  } catch (error) {
    console.error('Error parsing targeted summarization response:', error);
    return null;
  }
}

/**
 * Parse the response from the user feedback integration agent
 */
function parseUserFeedbackResponse(content: string): any {
  try {
    // First try to extract JSON
    const jsonOutput = extractJsonFromResponse(content);
    if (jsonOutput) return jsonOutput;
    
    // Otherwise, parse the text format
    const adjustedRecommendations: string[] = [];
    if (content.toLowerCase().includes('adjusted recommendations:')) {
      const section = content.split(/adjusted recommendations:/i)[1].split(/confidence score:|areas of disagreement:/i)[0];
      const lines = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of lines) {
        adjustedRecommendations.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    // Extract confidence score
    let confidenceScore = 0;
    if (content.toLowerCase().includes('confidence score:')) {
      const scoreMatch = content.match(/confidence score:[\s]*([0-9.]+)/i);
      if (scoreMatch && scoreMatch[1]) {
        confidenceScore = parseFloat(scoreMatch[1]);
      }
    }
    
    return {
      adjustedRecommendations,
      confidenceScore,
      fullResponse: content
    };
  } catch (error) {
    console.error('Error parsing user feedback response:', error);
    return null;
  }
}

/**
 * Parse the response from the quality assurance agent
 */
function parseQualityAssuranceResponse(content: string): any {
  try {
    // First try to extract JSON
    const jsonOutput = extractJsonFromResponse(content);
    if (jsonOutput) return jsonOutput;
    
    // Otherwise, parse the text format
    const issues: string[] = [];
    if (content.toLowerCase().includes('issues:')) {
      const section = content.split(/issues:|potential issues:/i)[1].split(/consistency:|clarity score:/i)[0];
      const lines = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of lines) {
        issues.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    // Extract clarity score
    let clarityScore = 0;
    if (content.toLowerCase().includes('clarity score:')) {
      const scoreMatch = content.match(/clarity score:[\s]*([0-9.]+)/i);
      if (scoreMatch && scoreMatch[1]) {
        clarityScore = parseFloat(scoreMatch[1]);
      }
    }
    
    return {
      issues,
      clarityScore,
      fullResponse: content
    };
  } catch (error) {
    console.error('Error parsing quality assurance response:', error);
    return null;
  }
}

/**
 * Parse the response from the contextual relevance evaluator
 */
function parseContextualRelevanceResponse(content: string): any {
  try {
    // First try to extract JSON
    const jsonOutput = extractJsonFromResponse(content);
    if (jsonOutput) return jsonOutput;
    
    // Otherwise, parse the text format
    const contradictions: string[] = [];
    if (content.toLowerCase().includes('contradictions:')) {
      const section = content.split(/contradictions:|inconsistencies:/i)[1].split(/alignment:|recommendations:/i)[0];
      const lines = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of lines) {
        contradictions.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    // Extract adjusted recommendations
    const adjustedRecommendations: string[] = [];
    if (content.toLowerCase().includes('adjusted recommendations:')) {
      const section = content.split(/adjusted recommendations:/i)[1].split(/contradictions:|alignment:/i)[0];
      const lines = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of lines) {
        adjustedRecommendations.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    return {
      contradictions,
      adjustedRecommendations,
      fullResponse: content
    };
  } catch (error) {
    console.error('Error parsing contextual relevance response:', error);
    return null;
  }
}

/**
 * Parse the response from the iterative refinement agent
 */
function parseIterativeRefinementResponse(content: string): any {
  try {
    // First try to extract JSON
    const jsonOutput = extractJsonFromResponse(content);
    if (jsonOutput) return jsonOutput;
    
    // Otherwise, parse the text format
    const refinedRecommendations: string[] = [];
    if (content.toLowerCase().includes('refined recommendations:')) {
      const section = content.split(/refined recommendations:/i)[1].split(/future improvements:|version:/i)[0];
      const lines = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of lines) {
        refinedRecommendations.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    // Extract future improvements
    const futureImprovements: string[] = [];
    if (content.toLowerCase().includes('future improvements:')) {
      const section = content.split(/future improvements:/i)[1].split(/refined recommendations:|version:/i)[0];
      const lines = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      
      for (const line of lines) {
        futureImprovements.push(line.replace(/^-|\d+\./, '').trim());
      }
    }
    
    return {
      refinedRecommendations,
      futureImprovements,
      fullResponse: content
    };
  } catch (error) {
    console.error('Error parsing iterative refinement response:', error);
    return null;
  }
}

/**
 * Parse the response from the rule compliance agent
 */
function parseRuleComplianceResponse(content: string): AIAnalysisResult {
  const lowerContent = content.toLowerCase();
  
  // Determine compliance status
  let compliance: 'compliant' | 'non-compliant' | 'partially-compliant' = 'compliant';
  if (lowerContent.includes('non-compliant') || lowerContent.includes('not compliant')) {
    compliance = 'non-compliant';
  } else if (lowerContent.includes('partially') || lowerContent.includes('partial')) {
    compliance = 'partially-compliant';
  }
  
  // Extract issues
  const issues: { rule: string; description: string; severity: 'high' | 'medium' | 'low' }[] = [];
  if (lowerContent.includes('issues:') || lowerContent.includes('key issues:')) {
    try {
      const issuesSection = lowerContent.split('issues:')[1].split('suggestions:')[0];
      const issueLines = issuesSection.split('\n').filter(line => line.trim().startsWith('-'));
      
      for (const issue of issueLines.slice(0, 3)) {
        issues.push({
          rule: 'Listing Rule',
          description: issue.replace('-', '').trim(),
          severity: 'medium'
        });
      }
    } catch (error) {
      console.error('Error extracting issues:', error);
    }
  }
  
  // Extract suggestions
  const suggestions: string[] = [];
  if (lowerContent.includes('suggestions:') || lowerContent.includes('improvements:')) {
    try {
      let suggestionsSection = '';
      if (lowerContent.includes('suggestions:') && lowerContent.includes('explanation:')) {
        suggestionsSection = lowerContent.split('suggestions:')[1].split('explanation:')[0];
      } else if (lowerContent.includes('suggestions:')) {
        suggestionsSection = lowerContent.split('suggestions:')[1];
      }
      
      const suggestionLines = suggestionsSection.split('\n').filter(line => line.trim().startsWith('-'));
      for (const suggestion of suggestionLines.slice(0, 5)) {
        suggestions.push(suggestion.replace('-', '').trim());
      }
    } catch (error) {
      console.error('Error extracting suggestions:', error);
    }
  }
  
  // Extract explanation
  let explanation = 'Analysis based on the document content and relevant listing rules.';
  if (lowerContent.includes('explanation:')) {
    try {
      explanation = lowerContent.split('explanation:')[1].trim();
    } catch (error) {
      console.error('Error extracting explanation:', error);
    }
  }
  
  return {
    compliance,
    issues,
    suggestions,
    explanation
  };
} 