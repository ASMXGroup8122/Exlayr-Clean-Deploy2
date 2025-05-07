/**
 * Type definitions for AI-related functionality
 */

/**
 * Interface for listing rules
 */
export interface ListingRule {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  sourceDoc?: string;
}

/**
 * Interface for section analysis result
 */
export interface SectionAnalysisResult {
  isCompliant: boolean;
  score: number;
  suggestions: string[];
  matchedExample?: string;
  metadata?: any;
}

// AI configuration and type definitions

// Types for AI responses
export interface AIAnalysisResult {
  compliance: 'compliant' | 'non-compliant' | 'partially-compliant';
  issues: Array<{
    rule: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  suggestions: string[];
  explanation: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConversation {
  messages: AIMessage[];
  documentContext?: {
    sectionId: string;
    sectionTitle: string;
    sectionContent: string;
  };
} 