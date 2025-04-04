import { ListingRule } from './vectorSearch';

// Add an interface for the normalized rule
interface NormalizedRule extends ListingRule {
  normalizedTitle: string;
  normalizedDesc: string;
}

/**
 * Helper function to deduplicate rules based on content similarity
 * @param rules Array of listing rules
 * @returns Deduplicated array of rules
 */
export function deduplicateRules(rules: ListingRule[]): ListingRule[] {
  if (!rules || rules.length <= 1) {
    return rules;
  }
  
  // First, normalize all rules
  const normalizedRules: NormalizedRule[] = rules.map(rule => ({
    ...rule,
    normalizedTitle: rule.title.toLowerCase().trim(),
    normalizedDesc: rule.description.toLowerCase().trim()
  }));
  
  // Group by exact duplicates first (same title and description)
  const exactDuplicateGroups: Record<string, NormalizedRule[]> = {};
  
  normalizedRules.forEach(rule => {
    // Create a key for exact matching
    const exactKey = `${rule.normalizedTitle}|${rule.normalizedDesc}`;
    
    if (!exactDuplicateGroups[exactKey]) {
      exactDuplicateGroups[exactKey] = [];
    }
    
    exactDuplicateGroups[exactKey].push(rule);
  });
  
  // Take the best rule from each exact duplicate group
  const exactDeduplicated = Object.values(exactDuplicateGroups).map(group => {
    // Sort by quality (prefer rules with proper IDs, not extracted)
    return group.sort((a, b) => {
      // Prefer rules with non-extracted IDs
      if (a.id.startsWith('extracted-') && !b.id.startsWith('extracted-')) return 1;
      if (!a.id.startsWith('extracted-') && b.id.startsWith('extracted-')) return -1;
      
      // Prefer rules with longer titles (but not too long)
      const aTitleScore = Math.min(a.title.length, 100);
      const bTitleScore = Math.min(b.title.length, 100);
      
      return bTitleScore - aTitleScore;
    })[0]; // Take the best one
  });
  
  // Now check for similar content
  const uniqueRules: NormalizedRule[] = [];
  const processedKeys = new Set<string>();
  
  for (const rule of exactDeduplicated) {
    // Create a simplified key for the rule (first 50 chars of title + first 50 chars of desc)
    const simpleKey = `${rule.normalizedTitle.substring(0, 50)}|${rule.normalizedDesc.substring(0, 50)}`;
    
    // Skip if we've already processed this exact key
    if (processedKeys.has(simpleKey)) continue;
    
    // Check for high similarity with existing rules
    let isDuplicate = false;
    
    for (const existingRule of uniqueRules) {
      const existingTitle = existingRule.normalizedTitle;
      const existingDesc = existingRule.normalizedDesc;
      
      // Check for title similarity
      const titleSimilarity = calculateSimilarity(rule.normalizedTitle, existingTitle);
      
      // Check for description similarity - more important than title
      const descSimilarity = calculateSimilarity(rule.normalizedDesc, existingDesc);
      
      // More aggressive similarity threshold (0.6 instead of 0.8)
      if ((titleSimilarity > 0.6 && descSimilarity > 0.5) || descSimilarity > 0.7) {
        isDuplicate = true;
        break;
      }
      
      // Also check if one description contains the other completely
      if (rule.normalizedDesc.includes(existingDesc) || existingDesc.includes(rule.normalizedDesc)) {
        // Keep the longer description
        if (rule.normalizedDesc.length > existingDesc.length) {
          // Replace the existing rule with this one
          uniqueRules.splice(uniqueRules.indexOf(existingRule), 1);
          isDuplicate = false; // Not a duplicate, we're replacing
        } else {
          isDuplicate = true;
        }
        break;
      }
      
      // Check for title containment
      if (rule.normalizedTitle.includes(existingTitle) || existingTitle.includes(rule.normalizedTitle)) {
        // If titles are similar and descriptions have some overlap, consider it a duplicate
        if (calculateSimilarity(rule.normalizedDesc, existingDesc) > 0.3) {
          // Keep the one with the more detailed description
          if (rule.normalizedDesc.length > existingDesc.length * 1.5) {
            // Replace the existing rule with this one
            uniqueRules.splice(uniqueRules.indexOf(existingRule), 1);
            isDuplicate = false; // Not a duplicate, we're replacing
          } else {
            isDuplicate = true;
          }
          break;
        }
      }
      
      // Check for keyword overlap in both title and description
      const titleKeywords = extractKeywords(rule.normalizedTitle);
      const existingTitleKeywords = extractKeywords(existingTitle);
      const descKeywords = extractKeywords(rule.normalizedDesc);
      const existingDescKeywords = extractKeywords(existingDesc);
      
      const titleKeywordOverlap = calculateKeywordOverlap(titleKeywords, existingTitleKeywords);
      const descKeywordOverlap = calculateKeywordOverlap(descKeywords, existingDescKeywords);
      
      // If both title and description have significant keyword overlap
      if (titleKeywordOverlap > 0.7 && descKeywordOverlap > 0.5) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueRules.push(rule);
      processedKeys.add(simpleKey);
    }
  }
  
  // Clean up the normalized fields before returning
  return uniqueRules.map(({ normalizedTitle, normalizedDesc, ...cleanRule }) => cleanRule);
}

/**
 * Calculate similarity between two strings (simple implementation)
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Simple implementation using Jaccard similarity of word sets
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3));
  
  // Calculate intersection size
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  
  // Calculate union size
  const union = new Set([...words1, ...words2]);
  
  // Return Jaccard similarity
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Improve rule extraction from text
 * @param text The text to extract rules from
 * @param index The index of the rule
 * @returns Extracted rule or null if not a valid rule
 */
export function extractRuleFromText(text: string, index: number): ListingRule | null {
  if (!text) {
    return null;
  }
  
  // Check if the text contains a prompt (template)
  if (text.includes('prompt') || text.includes('ai_instructions')) {
    // This is likely a template, not a rule - skip it
    console.log('Skipping template content:', text.substring(0, 100) + '...');
    return null;
  }
  
  // Try to extract a title and description from the text
  let title = '';
  let description = '';
  
  // Extract title and description from text using improved logic
  const lines = text.split('\n').filter(Boolean);
  
  // Check if the text has a clear structure with multiple lines
  if (lines.length > 1) {
    // Look for a clear heading or title in the first few lines
    // Titles are often shorter than descriptions and may end with a colon
    const potentialTitleLines = lines.slice(0, Math.min(3, lines.length));
    
    // Find the best title line - prefer shorter lines that look like headings
    let titleLineIndex = 0;
    let bestTitleScore = -1;
    
    potentialTitleLines.forEach((line, idx) => {
      const lineLength = line.length;
      const endsWithColon = line.trim().endsWith(':');
      const hasCapitalLetters = /[A-Z]/.test(line);
      const wordCount = line.split(/\s+/).length;
      
      // Calculate a score for how likely this is to be a title
      // Lower score is better for a title
      const titleScore = lineLength - (endsWithColon ? 10 : 0) + (hasCapitalLetters ? -5 : 0) + (wordCount > 10 ? 20 : 0);
      
      if (bestTitleScore === -1 || titleScore < bestTitleScore) {
        bestTitleScore = titleScore;
        titleLineIndex = idx;
      }
    });
    
    // Use the best line as title, ensuring it's not too long
    const rawTitle = lines[titleLineIndex].trim();
    title = rawTitle.length > 100 ? rawTitle.substring(0, 97) + '...' : rawTitle;
    
    // Use the remaining lines as description, excluding the title line
    const descriptionLines = [...lines.slice(0, titleLineIndex), ...lines.slice(titleLineIndex + 1)];
    description = descriptionLines.join(' ').trim();
    
    // If the description is empty, use the lines after the title
    if (!description && lines.length > titleLineIndex + 1) {
      description = lines.slice(titleLineIndex + 1).join(' ').trim();
    }
  } else if (lines.length === 1) {
    // If there's only one line, try to split it intelligently
    const text = lines[0];
    
    // Look for common separators like colons, dashes, or periods
    const separators = [':', ' - ', '. '];
    let splitIndex = -1;
    
    for (const separator of separators) {
      const idx = text.indexOf(separator);
      if (idx > 0 && idx < 100) {  // Ensure the title isn't too long
        splitIndex = idx + separator.length - 1;
        break;
      }
    }
    
    if (splitIndex > 0) {
      // Split at the separator
      title = text.substring(0, splitIndex).trim();
      description = text.substring(splitIndex + 1).trim();
    } else if (text.length > 100) {
      // If no good separator found and text is long, use first 100 chars as title
      title = text.substring(0, 100).trim();
      description = text.substring(100).trim();
    } else {
      // If text is short, use it all as title
      title = text.trim();
      description = '';
    }
  }
  
  // Ensure title and description are not duplicates or fragments
  if (title && description) {
    // If description starts with the title, remove that part
    if (description.startsWith(title)) {
      description = description.substring(title.length).trim();
      // Remove leading punctuation if any
      description = description.replace(/^[:\-.,;]+\s*/, '');
    }
    
    // If title is just the start of the description, make it more distinct
    if (description.length > 0 && title === description.substring(0, title.length)) {
      // Find a good breakpoint for the title
      const breakpoints = ['. ', ': ', ' - ', '; '];
      let newTitleLength = title.length;
      
      for (const bp of breakpoints) {
        const bpIndex = title.indexOf(bp);
        if (bpIndex > 0) {
          newTitleLength = bpIndex + bp.length;
          break;
        }
      }
      
      // Update title and description
      title = description.substring(0, newTitleLength).trim();
      description = description.substring(newTitleLength).trim();
    }
  }
  
  // If we still don't have a good title or description, use fallbacks
  if (!title) {
    title = 'Exchange Listing Guideline';
  }
  
  if (!description) {
    description = text;
  }
  
  // Ensure title ends with proper punctuation if it's a sentence
  if (title.length > 20 && !title.endsWith('.') && !title.endsWith(':') && !title.endsWith('?')) {
    title = title + '.';
  }
  
  // Determine category and severity
  const category = determineCategory(text);
  const severity = determineSeverity(text);
  
  return {
    id: `extracted-rule-${index}`,
    title,
    description,
    category,
    severity,
  };
}

/**
 * Determine the category of a rule based on its content
 * @param text The rule text
 * @returns The determined category
 */
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

/**
 * Determine the severity of a rule based on its content
 * @param text The rule text
 * @returns The determined severity
 */
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
 * Extract keywords from text by removing common words
 * @param text The text to extract keywords from
 * @returns Array of keywords
 */
function extractKeywords(text: string): string[] {
  // Common words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'at', 'from', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'of', 'in', 'on', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'will'
  ]);
  
  // Split text into words, filter out stop words and short words
  return text.split(/\s+/)
    .map(word => word.toLowerCase().replace(/[^\w]/g, ''))
    .filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Calculate overlap between two sets of keywords
 * @param keywords1 First set of keywords
 * @param keywords2 Second set of keywords
 * @returns Overlap score between 0 and 1
 */
function calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0;
  }
  
  // Count matching keywords
  const matches = keywords1.filter(keyword => keywords2.includes(keyword)).length;
  
  // Calculate overlap as proportion of the smaller set that matches
  return matches / Math.min(keywords1.length, keywords2.length);
} 