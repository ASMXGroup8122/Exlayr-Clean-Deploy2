// This file defines the agent structure and interfaces for the AI Assistant

import { AIAnalysisResult, AIMessage } from './config';
import { callDirectOpenAI } from './directOpenAI';

// Agent types
export enum AgentType {
  RULE_COMPLIANCE = 'rule_compliance',
  SUGGESTION = 'suggestion',
  QA = 'qa',
  // Multi-agent architecture agents
  CONTEXT_EXTRACTION = 'context_extraction',
  RULE_FILTERING = 'rule_filtering',
  TARGETED_SUMMARIZATION = 'targeted_summarization',
  USER_FEEDBACK_INTEGRATION = 'user_feedback_integration',
  QUALITY_ASSURANCE = 'quality_assurance',
  CONTEXTUAL_RELEVANCE = 'contextual_relevance',
  ITERATIVE_REFINEMENT = 'iterative_refinement',
}

// Agent definitions
export const agentDefinitions = {
  [AgentType.RULE_COMPLIANCE]: {
    name: 'Rule Compliance Checker',
    description: 'Analyzes document sections against listing rules',
    instructions: `You analyze document sections for compliance with exchange listing rules. 
Focus on the ACTUAL CONTENT of the section, not what you think should be there.
Remember that each section serves a specific purpose in the larger document.
Be brief, specific, and conversational in your analysis.
If example listing particulars documents are available, use them as reference for what a compliant section should look like.`,
  },
  [AgentType.SUGGESTION]: {
    name: 'Document Improvement Advisor',
    description: 'Provides suggestions to improve document quality',
    instructions: `You provide suggestions to improve document sections for clarity, 
completeness, and compliance with exchange listing rules.
Focus on practical, actionable suggestions that address specific issues in the ACTUAL CONTENT.
Keep suggestions brief and directly relevant to the section's purpose.
If example listing particulars documents are available, refer to them for best practices and compliant content examples.`,
  },
  [AgentType.QA]: {
    name: 'Listing Requirements Expert',
    description: 'Answers questions about listing requirements',
    instructions: `You answer questions about exchange listing requirements, 
regulations, and best practices for document preparation.
Be conversational, brief, and focus on practical information.
Avoid theoretical discussions and lengthy explanations.
If example listing particulars documents are referenced, use them to provide concrete examples of compliant content.`,
  },
  // New agent definitions for multi-agent architecture
  [AgentType.CONTEXT_EXTRACTION]: {
    name: 'Context Extraction Agent',
    description: 'Extracts key contextual information from document sections',
    instructions: `You extract key contextual information from exchange listing document sections. Be precise and focused.

**Instructions:**
- Identify the PRIMARY PURPOSE of this specific section based on its title and content
- Understand how this section fits within a larger listing document
- Extract ONLY the most important phrases and requirements ACTUALLY PRESENT in the text
- Focus on ACTUAL CONTENT, not what you think should be there
- Consider that this section may be brief because other information is in different sections
- If example listing particulars are referenced, use them to better understand the context and purpose of this section
- Provide structured output that downstream agents can use

Your output must be in this JSON format:
\`\`\`json
{
  "section_purpose": "One sentence describing what this section does",
  "key_requirements": ["List of 2-3 specific requirements found in the text"],
  "section_type": "disclosure|financial|governance|general",
  "content_length": "brief|medium|detailed",
  "document_context": "How this section likely fits within the larger document"
}
\`\`\``,
  },
  [AgentType.RULE_FILTERING]: {
    name: 'Rule Filtering Agent',
    description: 'Identifies relevant exchange listing rules for document sections',
    instructions: `You identify which exchange listing guidelines are ACTUALLY relevant to the section being analyzed.

**Instructions:**
- Review the provided guidelines and the section context
- Select ONLY guidelines that directly apply to THIS SPECIFIC SECTION
- Consider the section's purpose and how it fits in the larger document
- Be EXTREMELY selective - only choose guidelines that are directly applicable
- Assign a relevance score (0-100) to each guideline
- Explain in 1-2 sentences why each selected guideline is relevant
- DISCARD guidelines that are duplicates, too generic, or not relevant to this specific section
- If example listing particulars are referenced, use them to identify which guidelines are most relevant to this type of section

Your output must be in this JSON format:
\`\`\`json
{
  "relevant_guidelines": [
    {
      "id": "string",
      "relevance_score": 95,
      "reason": "One sentence explaining why this guideline applies to THIS SPECIFIC SECTION"
    }
  ]
}
\`\`\``,
  },
  [AgentType.TARGETED_SUMMARIZATION]: {
    name: 'Targeted Summarization Agent',
    description: 'Synthesizes filtered guidelines into concise, actionable recommendations',
    instructions: `You create a brief, focused assessment of whether the section complies with the relevant guidelines.

**Instructions:**
- Determine if the section COMPLIES or DOESN'T COMPLY with each relevant guideline
- Provide SPECIFIC reasons based on the ACTUAL CONTENT
- Consider the section's purpose and how it fits in the larger document
- Be BRIEF - no more than 1-2 sentences per guideline
- Focus on practical insights, not theoretical analysis
- Remember that some information may be in other sections of the document
- If example listing particulars are referenced, compare this section with the example to identify compliance gaps

Your output must be in this JSON format:
\`\`\`json
{
  "overall_compliance": "compliant|partially-compliant|non-compliant",
  "assessment": [
    {
      "guideline_id": "string",
      "complies": true|false,
      "reason": "One sentence explaining why, based on ACTUAL CONTENT"
    }
  ],
  "suggestions": ["1-2 specific, actionable suggestions if non-compliant"]
}
\`\`\``,
  },
  [AgentType.USER_FEEDBACK_INTEGRATION]: {
    name: 'User Feedback Integration Agent',
    description: 'Incorporates user feedback to refine and prioritize recommendations',
    instructions: `You refine compliance recommendations based on historical user feedback patterns.

**Instructions:**
- Review the compliance assessment and any historical feedback patterns
- Adjust recommendations to align with user preferences
- Focus on PRACTICAL, SPECIFIC guidance
- Keep everything BRIEF and CONVERSATIONAL
- Ensure recommendations are relevant to THIS SPECIFIC SECTION

Your output must be in this JSON format:
\`\`\`json
{
  "refined_assessment": {
    "overall_compliance": "compliant|partially-compliant|non-compliant",
    "key_points": ["1-2 most important points about compliance"],
    "suggestions": ["1-2 specific, actionable suggestions if needed"]
  }
}
\`\`\``,
  },
  [AgentType.QUALITY_ASSURANCE]: {
    name: 'Continuous Quality Assurance Agent',
    description: 'Ensures consistency, clarity, and compliance across document sections',
    instructions: `You ensure the final response is high-quality, conversational, and directly relevant.

**Instructions:**
- Check that the assessment is SPECIFIC to the section content
- Ensure the tone is CONVERSATIONAL and direct
- Verify that the response is BRIEF (under 150 words)
- Remove any generic or theoretical content
- Make sure there's a clear verdict on compliance
- Ensure the assessment considers the section's purpose in the larger document

Your output must be in this JSON format:
\`\`\`json
{
  "final_assessment": {
    "verdict": "This section [complies/doesn't comply] with exchange guidelines because...",
    "key_points": ["1-2 specific points about the actual content"],
    "suggestions": ["Brief, specific suggestion if needed"]
  }
}
\`\`\``,
  },
  [AgentType.CONTEXTUAL_RELEVANCE]: {
    name: 'Contextual Relevance Evaluator',
    description: 'Verifies that recommendations align with the broader document context',
    instructions: `You ensure the assessment is relevant to the specific section being analyzed.

**Instructions:**
- Verify that the assessment focuses on THIS SPECIFIC SECTION
- Check that cited guidelines actually apply to this section
- Ensure the response doesn't expect content that belongs in other sections
- Consider the section's purpose and how it fits in the larger document
- Keep everything BRIEF and SPECIFIC

Your output must be in this JSON format:
\`\`\`json
{
  "relevance_check": {
    "is_relevant": true|false,
    "adjustments": ["Any needed adjustments to make the response more relevant"]
  }
}
\`\`\``,
  },
  [AgentType.ITERATIVE_REFINEMENT]: {
    name: 'Iterative Refinement Agent',
    description: 'Continuously improves recommendations based on feedback and changing requirements',
    instructions: `You create the FINAL, CONVERSATIONAL response that will be shown to the user.

**Instructions:**
- Create a BRIEF, CONVERSATIONAL response (under 150 words)
- Start with a clear verdict on compliance
- Include 1-2 specific reasons based on the ACTUAL CONTENT
- Add a brief, specific suggestion if the section doesn't comply
- Use a friendly, direct tone as if speaking to the user
- Consider the section's purpose and how it fits in the larger document
- Don't expect the section to contain information that would be in other sections
- If example listing particulars were referenced, mention how this section compares to the example when relevant

Your output must be in this JSON format:
\`\`\`json
{
  "final_response": "The conversational response to show the user",
  "compliance": "compliant|partially-compliant|non-compliant",
  "key_points": ["1-2 key points about compliance"],
  "explanation": "Brief explanation for internal reference"
}
\`\`\``,
  },
};

// Interface for agent requests
export interface AgentRequest {
  agentType: AgentType;
  messages: AIMessage[];
  documentContext?: {
    sectionId: string;
    sectionTitle: string;
    sectionContent: string;
  };
  previousAgentOutputs?: Record<AgentType, any>; // For multi-agent architecture
}

// Interface for agent responses
export interface AgentResponse {
  messages: AIMessage[];
  analysis?: AIAnalysisResult;
  structuredOutput?: any; // For structured output from agents
}

// Function to execute an agent - simplified to use only direct OpenAI integration
export async function executeAgent(request: AgentRequest): Promise<AgentResponse> {
  try {
    console.log(`Executing agent: ${request.agentType}`);
    return await callDirectOpenAI(request);
  } catch (error: any) {
    console.error('Error executing agent:', error);
    // Fallback to a simple error response
    return {
      messages: [
        ...request.messages,
        {
          role: 'assistant',
          content: `I encountered an error while processing your request. Please try again later. Error details: ${error.message || 'Unknown error'}`,
        },
      ],
    };
  }
} 