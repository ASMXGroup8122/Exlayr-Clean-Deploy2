import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { AIMessage } from './types';

// Create singleton instances that are only initialized when needed
let openaiInstance: OpenAI | null = null;
let pineconeInstance: Pinecone | null = null;

/**
 * Get the OpenAI client - lazy initialization
 * Only creates the client when actually needed
 */
export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    console.log('Initializing OpenAI client on first use');
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

/**
 * Get the Pinecone client - lazy initialization
 * Only creates the client when actually needed
 */
export function getPinecone(): Pinecone {
  if (!pineconeInstance) {
    console.log('Initializing Pinecone client on first use');
    
    if (!process.env.PINECONE_API_KEY) {
      console.error('PINECONE_API_KEY is not set in environment variables');
      // Return a dummy instance to prevent crashes
      return new Pinecone({
        apiKey: 'dummy-key-for-fallback',
      });
    }
    
    try {
      pineconeInstance = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY as string,
        // Pinecone no longer requires region in the latest SDK version
      });
      console.log('Pinecone client initialized successfully');
    } catch (error) {
      console.error('Error initializing Pinecone client:', error);
      // Return a dummy instance to prevent crashes
      return new Pinecone({
        apiKey: 'dummy-key-for-fallback',
      });
    }
  }
  return pineconeInstance;
}

// Provide backwards compatibility for existing code
// These proxy objects ensure lazy initialization
export const openai = {
  get embeddings() { return getOpenAI().embeddings; },
  get chat() { return getOpenAI().chat; },
  get completions() { return getOpenAI().completions; },
  // Add other properties as needed for compatibility
};

export const pinecone = {
  index: (indexName?: string) => {
    const client = getPinecone();
    return client.index(indexName || process.env.PINECONE_INDEX || 'exchangedocs');
  }
};

// Constants for AI configuration
export const AI_CONFIG = {
  // OpenAI model configuration
  model: 'gpt-4-turbo-preview',
  embeddingModel: 'text-embedding-3-small',
  
  // Pinecone configuration
  pineconeIndex: process.env.PINECONE_INDEX || 'exchangedocs',
  
  // Agent configuration
  systemPrompt: `You are a helpful, conversational AI assistant specialized in exchange document review. 
Your role is to analyze INDIVIDUAL SECTIONS of listing documents against relevant exchange listing guidelines.

IMPORTANT INSTRUCTIONS:
1. Be BRIEF and DIRECT - no lengthy explanations or generic information.
2. Match your response length to the section length - short sections get short responses.
3. Use a CONVERSATIONAL TONE - speak directly to the user as if in a conversation.
4. For each section, provide a CLEAR VERDICT: either it complies or it doesn't.
5. Give SPECIFIC REASONS for compliance/non-compliance based on the ACTUAL CONTENT.
6. Focus ONLY on the content and requirements for the specific section you are reviewing.
7. Use ONLY the specific exchange listing guidelines provided in the "Relevant Rules" section.
8. If the provided guidelines appear incomplete or duplicated, focus on the most coherent ones.
9. DO NOT make up guidelines that weren't provided to you.
10. DO NOT provide generic analysis that could apply to any document.
11. REMEMBER that the section you're analyzing is part of a larger document - don't expect it to contain everything.
12. UNDERSTAND the purpose of the specific section within the document before analyzing it.
13. CONSIDER the section title as a strong indicator of what the section is meant to contain.
14. When example listing particulars documents are referenced, use them as a benchmark for compliance.

RESPONSE FORMAT:
- Start with a brief verdict: "This section [complies/doesn't comply] with exchange guidelines."
- Give 1-2 specific reasons why, citing the ACTUAL CONTENT of the section
- If non-compliant, provide a brief, specific suggestion for improvement
- If example documents were referenced, mention how this section compares to the example
- Keep your entire response under 150 words unless the section is extremely complex

Remember: Be specific, brief, and conversational. The user wants practical insights, not a lecture.`,
}; 