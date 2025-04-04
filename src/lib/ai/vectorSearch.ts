import { openai, pinecone, AI_CONFIG } from './config';
import { Pinecone } from '@pinecone-database/pinecone';
import { extractRuleFromText } from './ruleUtils';
import { aiLogger } from './logger';

// Interface for section analysis result
export interface SectionAnalysisResult {
  isCompliant: boolean;
  suggestions?: string[];
  matchedExample?: string;
  score: number;
  metadata?: {
    blobType?: string;
    data_type?: string;
    document_type?: string;
    [key: string]: any;
  };
}

// Interface for listing rules (kept for backward compatibility)
/** @deprecated Use SectionAnalysisResult instead */
export interface ListingRule {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
}

// Function to generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: AI_CONFIG.embeddingModel,
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Add helper functions for category and severity determination
/** @deprecated */
function determineCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('financial') || lowerText.includes('report') || lowerText.includes('audit')) {
    return 'financial';
  } else if (lowerText.includes('governance') || lowerText.includes('board') || lowerText.includes('director')) {
    return 'governance';
  } else if (lowerText.includes('disclosure') || lowerText.includes('risk') || lowerText.includes('inform')) {
    return 'disclosure';
  } else if (lowerText.includes('compliance') || lowerText.includes('regulation') || lowerText.includes('law')) {
    return 'compliance';
  }
  
  return 'general';
}

/** @deprecated */
function determineSeverity(text: string): 'high' | 'medium' | 'low' {
  const lowerText = text.toLowerCase();
  
  // Check for high severity indicators
  if (
    lowerText.includes('must') || 
    lowerText.includes('required') || 
    lowerText.includes('mandatory') ||
    lowerText.includes('critical') ||
    lowerText.includes('essential')
  ) {
    return 'high';
  }
  
  // Check for low severity indicators
  if (
    lowerText.includes('may') || 
    lowerText.includes('optional') || 
    lowerText.includes('recommended') ||
    lowerText.includes('consider')
  ) {
    return 'low';
  }
  
  // Default to medium
  return 'medium';
}

/**
 * Find relevant examples and check compliance for a document section
 * @param sectionContent The content of the document section
 * @param limit The maximum number of examples to compare against
 * @param knowledgeBase Optional knowledge base name to query (defaults to environment variable)
 * @param isTrainingMode Whether the request is in training mode
 * @param sectionTitle Optional section title for context
 * @returns Analysis result with compliance status and suggestions
 */
export async function findRelevantRules(
  sectionContent: string,
  limit: number = 5,
  knowledgeBase?: string,
  isTrainingMode?: boolean,
  sectionTitle?: string
): Promise<SectionAnalysisResult> {
  console.log('Using Pinecone for vector search');
  console.log(`Training mode: ${isTrainingMode ? 'enabled' : 'disabled'}`);
  
  // Check if running in a browser environment
  if (typeof window !== 'undefined') {
    console.error('Cannot perform vector search in browser environment');
    aiLogger.logActivity('error', 'Cannot perform vector search in browser environment', {
      isCompliant: false,
      score: 0,
      suggestions: ['Unable to perform analysis in browser environment']
    });
    return {
      isCompliant: false,
      suggestions: ['Unable to perform analysis in browser environment'],
      score: 0
    };
  }
  
  try {
    aiLogger.logActivity('analysis', 'Generating embeddings for content...');
    const embedding = await generateEmbedding(sectionContent);
    
    // Get the Pinecone index name from the environment or use the provided knowledgeBase
    const indexName = knowledgeBase || process.env.PINECONE_INDEX || AI_CONFIG.pineconeIndex;
    
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    
    // Ensure indexName is never undefined
    const index = pinecone.Index(indexName || '');
    
    aiLogger.logActivity('analysis', 'Querying Pinecone index...');
    const queryResponse = await index.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true
    });
    
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      aiLogger.logActivity('analysis', 'No similar examples found for comparison', {
        isCompliant: false,
        score: 0,
        suggestions: ['No similar examples found for comparison']
      });
      return {
        isCompliant: false,
        suggestions: ['No similar examples found for comparison'],
        score: 0
      };
    }
    
    // Get the best matching examples
    const matches = queryResponse.matches;
    const bestMatch = matches[0];
    const score = bestMatch.score || 0;
    const metadata = bestMatch.metadata as any;
    
    // Only store if in training mode
    if (isTrainingMode && score > 0.8) {
      await upsertFeedbackToVectorDB({
        originalQuery: sectionContent,
        improvedResponse: metadata.text || '',
        metadata: {
          ...metadata,
          source: 'training_mode'
        }
      });
    }
    
    // Semantic analysis of content
    const suggestions: string[] = [];
    let isCompliant = true;
    
    // Check for required elements based on section type
    if (sectionTitle) {
      const sectionType = sectionTitle.toLowerCase();
      
      // Risk sections should discuss potential risks
      if (sectionType.includes('risk')) {
        aiLogger.logActivity('analysis', `Analyzing risk section: ${sectionTitle}`);
        if (!sectionContent.toLowerCase().includes('risk') && 
            !sectionContent.toLowerCase().includes('potential') && 
            !sectionContent.toLowerCase().includes('may') && 
            !sectionContent.toLowerCase().includes('could')) {
          suggestions.push('Consider adding discussion of potential risks and their impact');
          isCompliant = false;
        }
        aiLogger.logActivity('analysis', `Risk analysis complete for section: ${sectionTitle}`, {
          isCompliant,
          score,
          suggestionCount: suggestions.length
        });
      }
      
      // Financial sections should include numbers and key metrics
      if (sectionType.includes('financial')) {
        aiLogger.logActivity('analysis', `Analyzing financial section: ${sectionTitle}`);
        if (!sectionContent.match(/\d+/) || 
            (!sectionContent.toLowerCase().includes('revenue') && 
             !sectionContent.toLowerCase().includes('profit') && 
             !sectionContent.toLowerCase().includes('expense'))) {
          suggestions.push('Consider adding key financial metrics and numerical data');
          isCompliant = false;
        }
        aiLogger.logActivity('analysis', `Financial analysis complete for section: ${sectionTitle}`, {
          isCompliant,
          score,
          suggestionCount: suggestions.length
        });
      }
    }
    
    // Add suggestions based on vector search results
    if (score < 0.7) {
      suggestions.push('Content may need improvement to better match listing requirements');
      isCompliant = false;
    }
    
    // Return analysis result
    const result: SectionAnalysisResult = {
      isCompliant,
      suggestions,
      score,
      matchedExample: metadata.text,
      metadata
    };
    
    aiLogger.logActivity('analysis', 'Vector search analysis complete', {
      isCompliant,
      score,
      suggestionCount: suggestions.length
    });
    
    return result;
    
  } catch (error) {
    console.error('Error finding relevant examples:', error);
    aiLogger.logActivity('error', 'Error occurred during analysis', {
      isCompliant: false,
      score: 0,
      suggestions: ['Error occurred during analysis']
    });
    return {
      isCompliant: false,
      suggestions: ['Error occurred during analysis'],
      score: 0
    };
  }
}

/** @deprecated */
function extractKeyTermsFromSection(sectionContent: string, sectionTitle?: string): string[] {
  // Combine title and content, giving more weight to the title
  const combinedText = sectionTitle ? `${sectionTitle} ${sectionTitle} ${sectionContent}` : sectionContent;
  
  // Convert to lowercase and remove punctuation
  const cleanText = combinedText.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'at', 'from', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'of', 'in', 'on', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'will',
    'this', 'that', 'these', 'those', 'they', 'them', 'their', 'there',
    'here', 'where', 'when', 'why', 'how', 'all', 'any', 'both', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very'
  ]);
  
  // Split into words, filter out stop words and short words
  const words = cleanText.split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  // Count word frequencies
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Sort by frequency and take top terms
  const sortedTerms = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
  
  // Add section-specific terms if title is available
  if (sectionTitle) {
    // Extract section type from title
    const sectionType = extractSectionType(sectionTitle);
    if (sectionType) {
      sortedTerms.unshift(sectionType);
    }
  }
  
  return sortedTerms;
}

/** @deprecated */
function extractSectionType(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  
  // Common section types in listing documents
  const sectionTypes = {
    'risk': ['risk', 'risks', 'risk factor', 'risk factors'],
    'financial': ['financial', 'finance', 'financials', 'financial statement', 'balance sheet', 'income statement'],
    'governance': ['governance', 'board', 'director', 'management', 'corporate governance'],
    'disclosure': ['disclosure', 'disclosures', 'information', 'statement'],
    'listing': ['listing', 'particulars', 'prospectus', 'offering'],
    'purpose': ['purpose', 'objective', 'goal', 'mission'],
    'securities': ['securities', 'shares', 'stock', 'equity', 'offering'],
    'general': ['general', 'overview', 'introduction', 'about']
  };
  
  // Check if title contains any section type
  for (const [type, keywords] of Object.entries(sectionTypes)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return type;
    }
  }
  
  return null;
}

/** @deprecated */
function filterRulesByRelevance(rules: ListingRule[], keyTerms: string[], sectionTitle?: string): ListingRule[] {
  // Calculate relevance score for each rule
  const scoredRules = rules.map(rule => {
    const ruleText = `${rule.title} ${rule.description}`.toLowerCase();
    
    // Count how many key terms appear in the rule
    let termMatches = 0;
    for (const term of keyTerms) {
      if (ruleText.includes(term)) {
        termMatches++;
      }
    }
    
    // Calculate score based on term matches and rule quality
    let score = termMatches / keyTerms.length;
    
    // Boost score for rules with proper IDs (not extracted)
    if (!rule.id.startsWith('extracted-')) {
      score += 0.2;
    }
    
    // Boost score for rules with matching category if section type is known
    if (sectionTitle) {
      const sectionType = extractSectionType(sectionTitle);
      if (sectionType && rule.category.toLowerCase() === sectionType) {
        score += 0.3;
      }
    }
    
    return { rule, score };
  });
  
  // Sort by score and filter out low-scoring rules
  return scoredRules
    .filter(item => item.score > 0.2) // Only keep rules with some relevance
    .sort((a, b) => b.score - a.score)
    .map(item => item.rule);
}

/** @deprecated Use upsertFeedbackToVectorDB with training mode instead */
export async function initializePineconeWithRules(rules: ListingRule[]): Promise<void> {
  try {
    console.log('Initializing Pinecone with listing rules...');
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.error('Cannot initialize Pinecone from browser environment');
      throw new Error('Pinecone initialization must be done server-side');
    }
    
    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      console.error('PINECONE_API_KEY is not set in environment variables');
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }
    
    // Check if Pinecone index name is set
    if (!process.env.PINECONE_INDEX) {
      console.error('PINECONE_INDEX is not set in environment variables');
      throw new Error('PINECONE_INDEX is not set in environment variables');
    }
    
    // Get the Pinecone index
    console.log(`Using Pinecone index: ${AI_CONFIG.pineconeIndex}`);
    const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    
    const index = pineconeClient.Index(AI_CONFIG.pineconeIndex || '');
    
    // Verify the index exists by checking stats
    try {
      console.log('Verifying Pinecone index exists...');
      const indexStats = await index.describeIndexStats();
      console.log('Pinecone index stats:', JSON.stringify(indexStats, null, 2));
    } catch (statsError) {
      console.error('Error getting Pinecone index stats:', statsError);
      throw new Error(`Pinecone index ${AI_CONFIG.pineconeIndex} may not exist or is inaccessible`);
    }
    
    // Generate embeddings for all rules
    console.log(`Initializing ${rules.length} rules in Pinecone`);
    
    // First, delete any existing vectors with the same IDs
    try {
      console.log('Deleting existing rule vectors...');
      const ruleIds = rules.map(rule => rule.id);
      await index.deleteMany(ruleIds);
      console.log('Existing rule vectors deleted successfully');
    } catch (deleteError) {
      console.error('Error deleting existing rule vectors:', deleteError);
      // Continue with initialization even if deletion fails
    }
    
    // Create vectors with proper metadata
    for (const rule of rules) {
      try {
        console.log(`Processing rule: ${rule.id} - ${rule.title}`);
        
        // Generate embedding for the rule
        const ruleText = `${rule.title}: ${rule.description}`;
        const embedding = await generateEmbedding(ruleText);
        console.log(`Generated embedding for rule: ${rule.id}`);
        
        // Create metadata object with all required fields
        const metadata = {
          id: rule.id,
          title: rule.title,
          description: rule.description,
          category: rule.category,
          severity: rule.severity,
          text: ruleText, // Include the full text as a fallback
          type: 'listing_rule' // Add a type field to identify these vectors
        };
        
        // Upsert the embedding and metadata to Pinecone
        await index.upsert([{
          id: rule.id,
          values: embedding,
          metadata: metadata
        }]);
        
        console.log(`Successfully upserted rule: ${rule.id} - ${rule.title}`);
      } catch (error) {
        console.error(`Error upserting rule ${rule.id}:`, error);
      }
    }
    
    console.log('Pinecone initialized successfully with listing rules.');
    
    // Verify initialization by querying for a rule
    try {
      if (rules.length > 0) {
        console.log('Verifying Pinecone initialization...');
        const testRule = rules[0];
        const testEmbedding = await generateEmbedding(`${testRule.title}: ${testRule.description}`);
        
        const queryResponse = await index.query({
          vector: testEmbedding,
          topK: 1,
          includeMetadata: true
        });
        
        if (queryResponse.matches && queryResponse.matches.length > 0) {
          console.log('Verification successful: Pinecone is working correctly');
          console.log(`Found match: ${JSON.stringify(queryResponse.matches[0].metadata)}`);
          
          // Verify metadata structure
          const metadata = queryResponse.matches[0].metadata as any;
          if (metadata.id && metadata.title && metadata.description) {
            console.log('Metadata structure is correct');
          } else {
            console.warn('Metadata structure is not as expected:', metadata);
          }
        } else {
          console.log('Verification failed: No matches found in Pinecone');
          throw new Error('Verification failed: No matches found in Pinecone after initialization');
        }
      } else {
        console.log('No rules to verify with');
      }
    } catch (verifyError) {
      console.error('Error verifying Pinecone initialization:', verifyError);
      throw new Error('Failed to verify Pinecone initialization');
    }
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
}

/**
 * Upsert feedback or training examples to the vector database
 * @param originalQuery The original query or section content
 * @param improvedResponse The improved or example response
 * @param knowledgeBase Optional knowledge base name to use
 * @param metadata Optional additional metadata to store with the vector
 * @returns Boolean indicating success or failure
 */
export async function upsertFeedbackToVectorDB({ 
  originalQuery, 
  improvedResponse,
  knowledgeBase,
  metadata = {}
}: {
  originalQuery: string;
  improvedResponse: string;
  knowledgeBase?: string;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  try {
    // Generate a unique ID for this entry
    const feedbackId = `example-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(originalQuery);
    
    // Create metadata
    const baseMetadata = {
      id: metadata.id || feedbackId,
      text: improvedResponse,
      type: metadata.type || 'example_document',
      timestamp: new Date().toISOString(),
      source: metadata.source || 'training',
      requirements: metadata.requirements || '',
      blobType: metadata.blobType,
      data_type: metadata.data_type,
      document_type: metadata.document_type
    };
    
    // Merge base metadata with any additional metadata provided
    const combinedMetadata = {
      ...baseMetadata,
      ...metadata
    };
    
    // Get the Pinecone index
    const indexName = knowledgeBase || process.env.PINECONE_INDEX;
    const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    
    // Ensure indexName is never undefined
    const index = pineconeClient.Index(indexName || '');
    
    // Upsert the feedback
    await index.upsert([{
      id: combinedMetadata.id,
      values: queryEmbedding,
      metadata: combinedMetadata
    }]);
    
    console.log(`Successfully upserted to vector database: ${combinedMetadata.id}`);
    return true;
  } catch (error) {
    console.error('Error upserting to vector database:', error);
    return false;
  }
} 