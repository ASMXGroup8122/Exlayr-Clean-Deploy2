import { openai, AI_CONFIG, AIMessage, AIAnalysisResult } from './config';
import { AgentType, executeAgent, AgentResponse } from './agents';
import { findRelevantRules, ListingRule } from './vectorSearch';
import { deduplicateRules } from './ruleUtils';

// Interface for the assistant service
export interface AssistantService {
  analyzeSection(sectionId: string, sectionTitle: string, sectionContent: string): Promise<AIAnalysisResult>;
  getSuggestions(sectionId: string, sectionTitle: string, sectionContent: string): Promise<string[]>;
  answerQuestion(question: string, conversationHistory: AIMessage[]): Promise<AIMessage>;
  getRelevantRules(sectionContent: string, knowledgeBase?: string, isTrainingMode?: boolean, sectionTitle?: string): Promise<ListingRule[]>;
  processMessage(message: string, conversationHistory: any[], knowledgeBase?: string, isTrainingMode?: boolean): Promise<string>;
  analyzeSectionWithMultiAgent(sectionId: string, sectionTitle: string, sectionContent: string): Promise<AIAnalysisResult>;
  isUserQuestion(message: string): boolean;
  extractPotentialTitle(message: string): string | undefined;
  analyzeEntireDocument(documentId: string, sections: Array<{id: string, title: string, content: string}>): Promise<Array<{sectionId: string, compliance: 'compliant' | 'non-compliant' | 'partially-compliant', suggestion: string | null}>>;
  analyze(sectionTitle: string, sectionContent: string): Promise<SectionAnalysisResult>;
}

// Implementation of the assistant service
export const assistantService: AssistantService = {
  // Analyze a document section against listing rules
  async analyzeSection(sectionId: string, sectionTitle: string, sectionContent: string): Promise<AIAnalysisResult> {
    try {
      // Find relevant rules for this section
      const relevantRules = await this.getRelevantRules(sectionContent, undefined, undefined, sectionTitle);
      
      // Create a prompt that includes the section content and relevant rules
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: AI_CONFIG.systemPrompt,
        },
        {
          role: 'user',
          content: `Please analyze the following document section against these listing rules:
          
Section Title: ${sectionTitle}
Section Content:
${sectionContent}

Relevant Rules:
${relevantRules.map(rule => `- ${rule.title}: ${rule.description}`).join('\n')}

Note: An example listing particulars have been embedded in the exchangedocs index on pinecone. Please review these examples when analyzing this section to determine if it meets the standards of a compliant document.

Provide a brief analysis of any compliance issues, any suggestions for improvement, and an overall compliance assessment. Do not mention example documents in the user feedback.`,
        },
      ];
      
      // Execute the rule compliance agent
      const response = await executeAgent({
        agentType: AgentType.RULE_COMPLIANCE,
        messages,
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
      });
      
      // Return the analysis result
      return response.analysis || {
        compliance: 'partially-compliant',
        issues: [],
        suggestions: [],
        explanation: 'Analysis could not be completed.',
      };
    } catch (error) {
      console.error('Error analyzing section:', error);
      // Return a fallback analysis result in case of error
      return {
        compliance: 'partially-compliant',
        issues: [],
        suggestions: ['Could not complete analysis due to an error.'],
        explanation: 'An error occurred during the analysis process.'
      };
    }
  },
  
  // Get suggestions for improving a document section
  async getSuggestions(sectionId: string, sectionTitle: string, sectionContent: string): Promise<string[]> {
    try {
      // Find relevant rules for this section
      const relevantRules = await findRelevantRules(sectionContent);
      
      // Create a prompt that includes the section content and relevant rules
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: AI_CONFIG.systemPrompt,
        },
        {
          role: 'user',
          content: `Please provide suggestions to improve the following document section:
          
Section Title: ${sectionTitle}
Section Content:
${sectionContent}

Relevant Rules:
${relevantRules.map(rule => `- ${rule.title}: ${rule.description}`).join('\n')}

Focus on clarity, completeness, and compliance with exchange listing rules.`,
        },
      ];
      
      // Execute the suggestion agent
      const response = await executeAgent({
        agentType: AgentType.SUGGESTION,
        messages,
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
      });
      
      // Extract suggestions from the response
      const lastMessage = response.messages[response.messages.length - 1];
      const suggestions = lastMessage.content
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());
      
      return suggestions.length > 0 ? suggestions : ['No specific suggestions available.'];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      throw error;
    }
  },
  
  // Answer a question about listing requirements
  async answerQuestion(question: string, conversationHistory: AIMessage[] = []): Promise<AIMessage> {
    try {
      // Create a prompt that includes the question and conversation history
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: AI_CONFIG.systemPrompt,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: question,
        },
      ];
      
      // Execute the QA agent
      const response = await executeAgent({
        agentType: AgentType.QA,
        messages,
      });
      
      // Return the last message from the agent
      return response.messages[response.messages.length - 1];
    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  },
  
  // Get relevant rules for a document section
  async getRelevantRules(
    sectionContent: string, 
    knowledgeBase?: string,
    isTrainingMode?: boolean,
    sectionTitle?: string
  ): Promise<ListingRule[]> {
    try {
      console.log(`Getting relevant rules for section with knowledge base: ${knowledgeBase || 'default'}`);
      console.log(`Training mode: ${isTrainingMode ? 'enabled' : 'disabled'}`);
      
      // Pass the training mode flag and section title to the vector search
      return await findRelevantRules(sectionContent, 5, knowledgeBase, isTrainingMode, sectionTitle);
    } catch (error) {
      console.error('Error getting relevant rules:', error);
      throw error;
    }
  },

  /**
   * Process a message from the user, considering training mode
   * @param message The user's message
   * @param conversationHistory The conversation history
   * @param knowledgeBase Optional knowledge base name to use
   * @param isTrainingMode Whether the request is in training mode
   * @returns The assistant's response
   */
  async processMessage(
    message: string,
    conversationHistory: any[] = [],
    knowledgeBase?: string,
    isTrainingMode?: boolean
  ): Promise<string> {
    try {
      console.log(`Processing message with knowledge base: ${knowledgeBase || 'default'}`);
      console.log(`Training mode: ${isTrainingMode ? 'enabled' : 'disabled'}`);
      
      // Determine if this is a question or a document section to analyze
      const isQuestion = this.isUserQuestion(message);
      console.log(`Message detected as: ${isQuestion ? 'question' : 'document section'}`);
      
      // Extract potential section title from the message
      const potentialTitle = this.extractPotentialTitle(message);
      
      if (isQuestion) {
        // Handle as a regular question
        // Get relevant rules for the message
        const relevantRules = await this.getRelevantRules(message, knowledgeBase, isTrainingMode, potentialTitle);
        
        // Format relevant rules as text
        let relevantRulesText = '';
        if (relevantRules.length > 0) {
          relevantRulesText = '\n\nRelevant listing rules:\n';
          relevantRules.forEach((rule, index) => {
            relevantRulesText += `${index + 1}. ${rule.title}: ${rule.description} (${rule.category}, ${rule.severity})\n`;
          });
        }
        
        // Combine the message with relevant rules and reference to example document
        const fullMessage = `${message}${relevantRulesText}\n\nNote: An example listing particulars document has been embedded in the system. Please reference this example document when answering questions about compliance standards.`;
        
        // Get response from the assistant
        const response = await this.answerQuestion(fullMessage, 
          conversationHistory.filter(msg => msg.role !== 'system')
        );
        
        return response.content;
      } else {
        // If it appears to be a document section analysis request but doesn't have proper context,
        // treat it as a question instead
        const response = await this.answerQuestion(message, 
          conversationHistory.filter(msg => msg.role !== 'system')
        );
        
        return response.content;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return "I'm sorry, I encountered an error while processing your message. Please try again or contact support if the issue persists.";
    }
  },
  
  /**
   * Extract a potential section title from a message
   * @param message The message to extract from
   * @returns The potential section title or undefined
   */
  extractPotentialTitle(message: string): string | undefined {
    // Look for section title patterns
    const titlePatterns = [
      /Section Title:\s*([^\n]+)/i,
      /Title:\s*([^\n]+)/i,
      /Section:\s*([^\n]+)/i,
      /^#\s+([^\n]+)/m,  // Markdown heading
      /^##\s+([^\n]+)/m  // Markdown subheading
    ];
    
    for (const pattern of titlePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no explicit title found, try to extract the first line if it's short
    const lines = message.split('\n');
    if (lines.length > 0 && lines[0].length < 100 && lines[0].length > 3) {
      return lines[0].trim();
    }
    
    return undefined;
  },

  /**
   * Determine if a message is a question rather than a document section to analyze
   * @param message The message to check
   * @returns True if the message is likely a question
   */
  isUserQuestion(message: string): boolean {
    // Check if the message ends with a question mark
    if (message.trim().endsWith('?')) {
      return true;
    }
    
    // Check if the message starts with question words
    const questionStarters = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does'];
    const firstWord = message.trim().toLowerCase().split(/\s+/)[0];
    if (questionStarters.includes(firstWord)) {
      return true;
    }
    
    // Check if the message contains phrases like "please explain" or "tell me about"
    const questionPhrases = ['please explain', 'tell me about', 'explain', 'describe', 'elaborate on', 'what is', 'how to'];
    if (questionPhrases.some(phrase => message.toLowerCase().includes(phrase))) {
      return true;
    }
    
    // Check if the message is short (likely a question rather than a document section)
    if (message.split(/\s+/).length < 20) {
      return true;
    }
    
    // Check if the message contains specific analysis instructions (indicating it's not a question)
    const analysisInstructions = ['analyze this section', 'review this section', 'check compliance', 'assess this content'];
    if (analysisInstructions.some(instruction => message.toLowerCase().includes(instruction))) {
      return false;
    }
    
    // Default to treating as a question if uncertain
    return true;
  },

  /**
   * Analyze a document section using the multi-agent architecture
   * @param sectionId The ID of the section
   * @param sectionTitle The title of the section
   * @param sectionContent The content of the section
   * @returns The analysis result
   */
  async analyzeSectionWithMultiAgent(
    sectionId: string, 
    sectionTitle: string, 
    sectionContent: string
  ): Promise<AIAnalysisResult> {
    try {
      console.log('Starting multi-agent analysis for section:', sectionTitle);
      
      // Initialize agent outputs storage
      const agentOutputs: Record<AgentType, any> = {} as Record<AgentType, any>;
      
      // Step 1: Context Extraction
      console.log('Step 1: Context Extraction');
      const contextExtractionResponse = await executeAgent({
        agentType: AgentType.CONTEXT_EXTRACTION,
        messages: [
          {
            role: 'user',
            content: `Please extract the context from this document section:
            
Section Title: ${sectionTitle}
Section Content:
${sectionContent}

Note: An example listing particulars document has been embedded in the system. Please reference this example document to better understand the context and purpose of this type of section.

Your task is to identify the primary purpose, key themes, and implicit requirements of this section.
Focus on understanding what this section is trying to accomplish within the larger document.`
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
      });
      
      // Store the context extraction output
      agentOutputs[AgentType.CONTEXT_EXTRACTION] = contextExtractionResponse.structuredOutput;
      console.log('Context extraction complete:', agentOutputs[AgentType.CONTEXT_EXTRACTION]);
      
      // Step 2: Rule Filtering
      console.log('Step 2: Rule Filtering');
      // Get relevant rules from the vector database
      const relevantRules = await this.getRelevantRules(sectionContent, undefined, undefined, sectionTitle);
      
      // Deduplicate rules based on content similarity
      const uniqueRules = deduplicateRules(relevantRules);
      console.log(`Deduplicated rules: ${uniqueRules.length} (from ${relevantRules.length} original rules)`);
      
      // Create a message with the context profile and relevant rules
      const ruleFilteringMessage = `Please identify the most relevant guidelines for this document section based on the extracted context:
      
Section Title: ${sectionTitle}
Context Profile: ${JSON.stringify(agentOutputs[AgentType.CONTEXT_EXTRACTION], null, 2)}

Available Guidelines:
${uniqueRules.map((rule, index) => `${index + 1}. ${rule.title}: ${rule.description} (${rule.category}, ${rule.severity})`).join('\n')}

Note: An example listing particulars document has been embedded in the system. Please reference this example document to identify which guidelines are most relevant to this type of section.

Your task is to filter these guidelines to only those that are directly relevant to this section.
For each guideline, assign a relevance score (0-100) and explain why it's relevant.`;
      
      const ruleFilteringResponse = await executeAgent({
        agentType: AgentType.RULE_FILTERING,
        messages: [
          {
            role: 'user',
            content: ruleFilteringMessage
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
        previousAgentOutputs: agentOutputs,
      });
      
      // Store the rule filtering output
      agentOutputs[AgentType.RULE_FILTERING] = ruleFilteringResponse.structuredOutput;
      console.log('Rule filtering complete:', agentOutputs[AgentType.RULE_FILTERING]);
      
      // Step 3: Targeted Summarization
      console.log('Step 3: Targeted Summarization');
      const targetedSummarizationResponse = await executeAgent({
        agentType: AgentType.TARGETED_SUMMARIZATION,
        messages: [
          {
            role: 'user',
            content: `Please provide a concise summary of the compliance requirements for this document section:
            
Section Title: ${sectionTitle}
Section Content:
${sectionContent}

Context Profile:
${JSON.stringify(agentOutputs[AgentType.CONTEXT_EXTRACTION], null, 2)}

Filtered Guidelines:
${JSON.stringify(agentOutputs[AgentType.RULE_FILTERING], null, 2)}

Note: An example listing particulars document has been embedded in the system. Please reference this example document to compare this section with compliant examples and identify any compliance gaps.

Your task is to synthesize these filtered guidelines into clear, actionable recommendations.
Focus on what the issuer needs to do to comply with these guidelines.`
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
        previousAgentOutputs: agentOutputs,
      });
      
      // Store the targeted summarization output
      agentOutputs[AgentType.TARGETED_SUMMARIZATION] = targetedSummarizationResponse.structuredOutput;
      console.log('Targeted summarization complete:', agentOutputs[AgentType.TARGETED_SUMMARIZATION]);
      
      // Step 4: User Feedback Integration
      console.log('Step 4: User Feedback Integration');
      const userFeedbackIntegrationResponse = await executeAgent({
        agentType: AgentType.USER_FEEDBACK_INTEGRATION,
        messages: [
          {
            role: 'user',
            content: `Please refine the recommendations based on historical user feedback:
            
Section Title: ${sectionTitle}
Summarized Recommendations:
${JSON.stringify(agentOutputs[AgentType.TARGETED_SUMMARIZATION], null, 2)}

Your task is to incorporate patterns from historical user feedback to improve these recommendations.
Consider how users have previously modified or disputed similar recommendations.`
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
        previousAgentOutputs: agentOutputs,
      });
      
      // Store the user feedback integration output
      agentOutputs[AgentType.USER_FEEDBACK_INTEGRATION] = userFeedbackIntegrationResponse.structuredOutput;
      console.log('User feedback integration complete:', agentOutputs[AgentType.USER_FEEDBACK_INTEGRATION]);
      
      // Step 5: Quality Assurance
      console.log('Step 5: Quality Assurance');
      const qualityAssuranceResponse = await executeAgent({
        agentType: AgentType.QUALITY_ASSURANCE,
        messages: [
          {
            role: 'user',
            content: `Please ensure the quality and consistency of these recommendations:
            
Section Title: ${sectionTitle}
Refined Recommendations:
${JSON.stringify(agentOutputs[AgentType.USER_FEEDBACK_INTEGRATION], null, 2)}`
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
        previousAgentOutputs: agentOutputs,
      });
      
      // Store the quality assurance output
      agentOutputs[AgentType.QUALITY_ASSURANCE] = qualityAssuranceResponse.structuredOutput;
      console.log('Quality assurance complete:', agentOutputs[AgentType.QUALITY_ASSURANCE]);
      
      // Step 6: Contextual Relevance
      console.log('Step 6: Contextual Relevance');
      const contextualRelevanceResponse = await executeAgent({
        agentType: AgentType.CONTEXTUAL_RELEVANCE,
        messages: [
          {
            role: 'user',
            content: `Please verify that these recommendations align with the broader document context:
            
Section Title: ${sectionTitle}
Quality-Verified Recommendations:
${JSON.stringify(agentOutputs[AgentType.QUALITY_ASSURANCE], null, 2)}`
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
        previousAgentOutputs: agentOutputs,
      });
      
      // Store the contextual relevance output
      agentOutputs[AgentType.CONTEXTUAL_RELEVANCE] = contextualRelevanceResponse.structuredOutput;
      console.log('Contextual relevance complete:', agentOutputs[AgentType.CONTEXTUAL_RELEVANCE]);
      
      // Step 7: Iterative Refinement
      console.log('Step 7: Iterative Refinement');
      const iterativeRefinementResponse = await executeAgent({
        agentType: AgentType.ITERATIVE_REFINEMENT,
        messages: [
          {
            role: 'user',
            content: `Please provide the final refined recommendations for this document section:
            
Section Title: ${sectionTitle}
Section Content:
${sectionContent}

Contextually Validated Recommendations:
${JSON.stringify(agentOutputs[AgentType.CONTEXTUAL_RELEVANCE], null, 2)}

Note: An example listing particulars document has been embedded in the system. Please reference this example document when creating your final response and mention how this section compares to the example when relevant.

Remember to create a brief, conversational response that directly addresses whether this section complies with guidelines.
Focus on the ACTUAL CONTENT of the section, not what you think should be there.
Consider that this section is part of a larger document and may not need to contain all information.`
          }
        ],
        documentContext: {
          sectionId,
          sectionTitle,
          sectionContent,
        },
        previousAgentOutputs: agentOutputs,
      });
      
      // Store the iterative refinement output
      agentOutputs[AgentType.ITERATIVE_REFINEMENT] = iterativeRefinementResponse.structuredOutput;
      console.log('Iterative refinement complete:', agentOutputs[AgentType.ITERATIVE_REFINEMENT]);
      
      // Convert the final output to AIAnalysisResult format
      const finalOutput = agentOutputs[AgentType.ITERATIVE_REFINEMENT];
      
      // Use the final response directly if available
      if (finalOutput && finalOutput.final_response) {
        // Extract compliance status
        let compliance: 'compliant' | 'non-compliant' | 'partially-compliant' = 'partially-compliant';
        if (finalOutput.compliance) {
          compliance = finalOutput.compliance;
        }
        
        // Create a simple issues array with the key points
        const issues: Array<{ rule: string; description: string; severity: 'high' | 'medium' | 'low' }> = [];
        if (finalOutput.key_points) {
          finalOutput.key_points.forEach((point: string) => {
            issues.push({
              rule: 'Exchange Guideline',
              description: point,
              severity: 'medium'
            });
          });
        }
        
        // Extract suggestions if available
        const suggestions: string[] = finalOutput.suggestions || [];
        
        // Use the final response as the explanation
        const explanation = finalOutput.final_response;
        
        // Return the analysis result
        return {
          compliance,
          issues,
          suggestions,
          explanation
        };
      }
      
      // Fallback to the previous approach if the final response is not available
      let compliance: 'compliant' | 'non-compliant' | 'partially-compliant' = 'partially-compliant';
      if (finalOutput && finalOutput.compliance) {
        compliance = finalOutput.compliance;
      } else if (finalOutput && finalOutput.refinedRecommendations && finalOutput.refinedRecommendations.length === 0) {
        compliance = 'compliant';
      } else if (finalOutput && finalOutput.refinedRecommendations && finalOutput.refinedRecommendations.length > 3) {
        compliance = 'non-compliant';
      }
      
      // Extract issues from the final output
      const issues: Array<{ rule: string; description: string; severity: 'high' | 'medium' | 'low' }> = [];
      if (finalOutput && finalOutput.issues) {
        finalOutput.issues.forEach((issue: any) => {
          issues.push({
            rule: issue.rule || 'Listing Rule',
            description: issue.description || issue,
            severity: issue.severity || 'medium'
          });
        });
      } else if (finalOutput && finalOutput.refinedRecommendations) {
        finalOutput.refinedRecommendations.forEach((recommendation: string, index: number) => {
          if (index < 3) { // Limit to 3 issues
            issues.push({
              rule: 'Listing Rule',
              description: recommendation,
              severity: 'medium'
            });
          }
        });
      }
      
      // Extract suggestions from the final output
      const suggestions: string[] = [];
      if (finalOutput && finalOutput.suggestions) {
        suggestions.push(...finalOutput.suggestions);
      } else if (finalOutput && finalOutput.refinedRecommendations) {
        suggestions.push(...finalOutput.refinedRecommendations);
      } else if (finalOutput && finalOutput.recommendations) {
        suggestions.push(...finalOutput.recommendations);
      }
      
      // Create explanation from the final output
      let explanation = 'Analysis based on the document content and relevant listing rules.';
      if (finalOutput && finalOutput.explanation) {
        explanation = finalOutput.explanation;
      } else if (finalOutput && finalOutput.summary) {
        explanation = finalOutput.summary;
      } else if (finalOutput && finalOutput.fullResponse) {
        explanation = finalOutput.fullResponse;
      }
      
      // Return the analysis result
      return {
        compliance,
        issues,
        suggestions,
        explanation
      };
    } catch (error) {
      console.error('Error analyzing section with multi-agent architecture:', error);
      // Return a fallback analysis result
      return {
        compliance: 'partially-compliant',
        issues: [],
        suggestions: ['Could not complete analysis due to an error.'],
        explanation: 'An error occurred during the multi-agent analysis process.'
      };
    }
  },

  /**
   * Analyze an entire document at once and generate brief AI suggestions for non-compliant sections
   * @param documentId The ID of the document
   * @param sections Array of document sections with id, title, and content
   * @returns Array of section compliance results with brief suggestions for non-compliant sections
   */
  async analyzeEntireDocument(
    documentId: string,
    sections: Array<{id: string, title: string, content: string}>
  ): Promise<Array<{sectionId: string, compliance: 'compliant' | 'non-compliant' | 'partially-compliant', suggestion: string | null}>> {
    try {
      console.log(`Starting analysis of entire document: ${documentId} with ${sections.length} sections`);
      
      // Import the server-compatible logger
      const { aiLogger } = require('./logger');
      
      // Log the start of document analysis
      aiLogger.logActivity('process', `Starting detailed analysis of document: ${documentId}`);
      aiLogger.logActivity('process', `Document contains ${sections.length} sections to analyze`);
      
      // Create a document context that will be shared across all section analyses
      const documentContext = {
        documentId,
        sectionCount: sections.length,
        sectionTitles: sections.map(section => section.title),
        // Create a map of section titles to their content for cross-referencing
        sectionMap: sections.reduce((map, section) => {
          map[section.title] = section.content;
          return map;
        }, {} as Record<string, string>)
      };
      
      console.log('Document context created for cross-section analysis');
      aiLogger.logActivity('process', 'Document context created for cross-section analysis');
      
      // Process each section with document-wide context
      const results = await Promise.all(sections.map(async (section, index) => {
        try {
          console.log(`Analyzing section: ${section.title}`);
          aiLogger.logActivity('process', `Analyzing section ${index + 1}/${sections.length}: "${section.title}"`);
          
          // Get relevant rules for this section
          const relevantRules = await this.getRelevantRules(section.content, undefined, undefined, section.title);
          
          aiLogger.logActivity('search', `Found ${relevantRules.length} relevant rules for section "${section.title}"`, {
            ruleCount: relevantRules.length,
            ruleTitles: relevantRules.map(rule => rule.title)
          });
          
          // Create a prompt that includes the section content, relevant rules, and document context
          const messages: AIMessage[] = [
            {
              role: 'system',
              content: AI_CONFIG.systemPrompt,
            },
            {
              role: 'user',
              content: `Please analyze the following document section against these listing rules:
              
Section Title: ${section.title}
Section Content:
${section.content}

Relevant Rules:
${relevantRules.map(rule => `- ${rule.title}: ${rule.description}`).join('\n')}

Document Context:
This section is part of a larger document with ${sections.length} sections.
Other sections in the document include: ${sections.map(s => s.title).filter(t => t !== section.title).slice(0, 5).join(', ')}${sections.length > 6 ? '...' : ''}

Note: An example listing particulars document has been embedded in the system. Please reference this example document when analyzing this section.

Your task:
1. Determine if this section COMPLIES or DOESN'T COMPLY with exchange guidelines
2. If it doesn't comply, provide ONE ultra-brief suggestion (15-25 words max) starting with "Add:", "Remove:", "Clarify:", or "Expand:"
3. Focus ONLY on the most critical issue if multiple exist
4. Consider the section's role in the larger document context`
            },
          ];
          
          aiLogger.logActivity('process', `Sending section "${section.title}" to AI for compliance analysis`);
          
          // Execute the rule compliance agent
          const response = await executeAgent({
            agentType: AgentType.RULE_COMPLIANCE,
            messages,
            documentContext: {
              sectionId: section.id,
              sectionTitle: section.title,
              sectionContent: section.content,
            },
          });
          
          // Extract compliance status and suggestion
          const analysis = response.analysis || {
            compliance: 'partially-compliant',
            issues: [],
            suggestions: [],
            explanation: 'Analysis could not be completed.',
          };
          
          // Create a brief suggestion for non-compliant sections
          let briefSuggestion: string | null = null;
          
          if (analysis.compliance !== 'compliant' && analysis.suggestions && analysis.suggestions.length > 0) {
            // Get the first suggestion and make it ultra-brief
            const suggestion = analysis.suggestions[0];
            
            // Determine the appropriate prefix based on the suggestion content
            let prefix = 'Add:';
            if (suggestion.toLowerCase().includes('remov') || suggestion.toLowerCase().includes('delet')) {
              prefix = 'Remove:';
            } else if (suggestion.toLowerCase().includes('clarif') || suggestion.toLowerCase().includes('specif')) {
              prefix = 'Clarify:';
            } else if (suggestion.toLowerCase().includes('expand') || suggestion.toLowerCase().includes('elaborat')) {
              prefix = 'Expand:';
            }
            
            // Create a brief version of the suggestion
            const words = suggestion.split(/\s+/);
            if (words.length > 20) {
              // Truncate to about 15-20 words
              briefSuggestion = `${prefix} ${words.slice(0, 15).join(' ')}...`;
            } else {
              briefSuggestion = `${prefix} ${suggestion}`;
            }
            
            // Ensure the suggestion is not too long (max 100 characters)
            if (briefSuggestion.length > 100) {
              briefSuggestion = briefSuggestion.substring(0, 97) + '...';
            }
          }
          
          aiLogger.logActivity('search', `Analysis complete for section "${section.title}"`, {
            isCompliant: analysis.compliance === 'compliant',
            score: analysis.score,
            suggestions: analysis.suggestions || []
          });
          
          return {
            sectionId: section.id,
            compliance: analysis.compliance,
            suggestion: briefSuggestion
          };
        } catch (sectionError) {
          console.error(`Error analyzing section ${section.id}:`, sectionError);
          
          aiLogger.logActivity('process', `Error analyzing section "${section.title}": ${sectionError instanceof Error ? sectionError.message : "Unknown error"}`, { error: sectionError });
          
          return {
            sectionId: section.id,
            compliance: 'partially-compliant' as const,
            suggestion: 'Error analyzing this section.'
          };
        }
      }));
      
      console.log(`Completed analysis of entire document: ${documentId}`);
      
      const compliantCount = results.filter(r => r.compliance === 'compliant').length;
      const partialCount = results.filter(r => r.compliance === 'partially-compliant').length;
      const nonCompliantCount = results.filter(r => r.compliance === 'non-compliant').length;
      
      aiLogger.logActivity('complete', `Completed analysis of document ${documentId}`, {
        totalSections: sections.length,
        compliantSections: compliantCount,
        partiallyCompliantSections: partialCount,
        nonCompliantSections: nonCompliantCount,
        analysisTime: new Date().toISOString()
      });
      
      return results;
    } catch (error) {
      console.error('Error analyzing entire document:', error);
      throw error;
    }
  },

  async analyze(sectionTitle: string, sectionContent: string): Promise<SectionAnalysisResult> {
    // 1. Get examples and actually use them
    const matches = await findRelevantRules(sectionContent, 5, 'exchangedocs');
    const bestMatch = matches?.matches?.[0];

    // 2. If we have a good match (>0.6 is good!), content is probably fine
    if (bestMatch?.score > 0.6) {
      // Don't suggest changes unless there's something materially better
      const meaningful_diff = this.findMeaningfulDifference(sectionContent, bestMatch.metadata.content);
      if (!meaningful_diff) {
        return {
          isCompliant: true,
          score: bestMatch.score * 100,
          suggestions: [] // Shut up if it's fine
        };
      }

      // Only suggest if examples clearly do something better
      return {
        isCompliant: true, // Still compliant!
        score: bestMatch.score * 100,
        suggestions: [
          `Similar sections in successful listings ${meaningful_diff.improvement}`,
          `For example: "${meaningful_diff.example}"`
        ]
      };
    }

    // 3. If no good matches, be honest about why
    return {
      isCompliant: false,
      score: 40,
      suggestions: [
        `This section's content differs significantly from examples. `,
        `Consider reviewing similar sections in the example documents.`
      ]
    };
  },
};