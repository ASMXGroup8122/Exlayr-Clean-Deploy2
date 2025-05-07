import { getOpenAI, getPinecone, AI_CONFIG } from './config';
import { Pinecone } from '@pinecone-database/pinecone';
import { extractRuleFromText } from './ruleUtils';
import { aiLogger } from './logger';
import { ListingRule } from './types';

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

// Function to generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await getOpenAI().embeddings.create({
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
 * Find the most relevant rules for a given section of text
 * @param text The section text to find rules for
 * @param limit The maximum number of rules to return (default: 5)
 * @param knowledgeBase The name of the knowledge base to search (default: based on AI_CONFIG)
 * @param isTrainingMode Whether to return example documents in training mode
 * @param sectionTitle Optional section title for better context
 * @returns A list of relevant rules
 */
export async function findRelevantRules(
  text: string,
  limit = 5,
  knowledgeBase?: string,
  isTrainingMode?: boolean,
  sectionTitle?: string
): Promise<ListingRule[]> {
  try {
    console.log('Finding relevant rules with knowledge base:', knowledgeBase || AI_CONFIG.pineconeIndex);
    
    // Add the section title to the query if provided
    const queryText = sectionTitle ? `${sectionTitle}:\n${text}` : text;
    
    // Get embeddings for the text using OpenAI API
    const openai = getOpenAI();
    const embeddings = await openai.embeddings.create({
      model: AI_CONFIG.embeddingModel,
      input: queryText.slice(0, 8000), // Limit input to prevent token limits
      encoding_format: 'float',
    });
    
    // Parameters for vector search
    const indexName = knowledgeBase || AI_CONFIG.pineconeIndex;
    
    // Get the index from Pinecone
    const pinecone = getPinecone();
    const index = pinecone.index(indexName);
    
    // Perform vector search to find relevant rules or examples
    // Default namespace is "rules"
    // In training mode, we also include example documents (namespace "examples")
    let matchesPromise;
    
    if (isTrainingMode) {
      console.log('Searching both rules and examples in training mode');
      matchesPromise = index.query({
        vector: embeddings.data[0].embedding,
        topK: limit,
        includeMetadata: true,
        includeValues: false,
      });
    } else {
      matchesPromise = index.query({
        vector: embeddings.data[0].embedding,
        topK: limit,
        includeMetadata: true,
        includeValues: false,
        filter: { category: "rule" } // Only include rules, not examples
      });
    }
    
    // Debug logging
    console.log(`Search operation started on index: ${indexName}`);
    
    // Execute the search
    const matches = await matchesPromise;
    
    // Debug logging: log the number of matches
    console.log(`Found ${matches.matches?.length || 0} matches for relevance search`);
    
    // Return results, mapped to rule structures
    return (matches.matches || []).map(match => ({
      id: match.id,
      title: match.metadata?.title as string || 'Untitled Rule',
      description: match.metadata?.description as string || 'No description available',
      category: match.metadata?.category as string || 'general',
      severity: match.metadata?.severity as string || 'medium',
      sourceDoc: match.metadata?.sourceDoc as string || undefined
    }));
  } catch (error) {
    console.error('Error finding relevant rules:', error);
    return [];
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
    
    // Get the Pinecone index using the lazy-loaded client
    console.log(`Using Pinecone index: ${AI_CONFIG.pineconeIndex}`);
    const pinecone = getPinecone();
    const index = pinecone.index(AI_CONFIG.pineconeIndex || '');
    
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
    
    // Get the Pinecone index using the lazy-loaded client
    const indexName = knowledgeBase || process.env.PINECONE_INDEX;
    const pinecone = getPinecone();
    const index = pinecone.index(indexName || '');
    
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